"use server";

// Server Actions de inventario (Sprint 2).
// Reglas del spec que se cumplen aquí:
//  - Toda acción verifica sesión por sí misma (los POST anónimos existen).
//  - Toda variación de stock genera un StockMovement.
//  - Tallas nuevas se crean una sola vez (diccionario por tienda).
//  - Precios en USD; salePrice >= price se rechaza.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";

// ---------- Esquemas ----------

const ProductSchema = z.object({
  name: z.string().trim().min(2, "El nombre es obligatorio").max(80),
  categories: z
    .array(z.string().min(1))
    .min(1, "Elige al menos una categoría")
    .max(4, "Máximo 4 categorías"),
  price: z.coerce.number().positive("El precio debe ser mayor a 0"),
  salePrice: z.coerce
    .number()
    .positive()
    .optional()
    .nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  images: z
    .array(
      z.object({
        url: z.string().url(),
        publicId: z.string().min(1),
      }),
    )
    .min(1, "Agrega al menos una foto")
    .max(5, "Máximo 5 fotos"),
  variants: z
    .array(
      z.object({
        sizeName: z.string().trim().min(1).max(10),
        stock: z.coerce.number().int().min(0).max(999),
      }),
    )
    .min(1, "Agrega al menos una talla"),
});

export type ProductFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

// ---------- Helpers ----------

/** La tienda activa del MVP: la primera tienda (spec §4). */
async function getStore() {
  const store = await prisma.store.findFirst({ orderBy: { createdAt: "asc" } });
  if (!store) throw new Error("No hay tienda configurada");
  return store;
}

/** Diccionario de tallas: devuelve el id, creándola si no existe. */
async function getOrCreateSizeId(storeId: string, name: string) {
  const existing = await prisma.size.findUnique({
    where: { storeId_name: { storeId, name } },
  });
  if (existing) return existing.id;
  const last = await prisma.size.findFirst({
    where: { storeId },
    orderBy: { sortOrder: "desc" },
  });
  const created = await prisma.size.create({
    data: { storeId, name, sortOrder: (last?.sortOrder ?? 0) + 1 },
  });
  return created.id;
}

// ---------- Acciones ----------

/**
 * Crear una prenda completa: producto + fotos + variantes (talla+stock)
 * + movimiento NEW por variante. Todo en una transacción.
 */
export async function createProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const session = await requireSession();

  let parsed: z.infer<typeof ProductSchema>;
  try {
    parsed = ProductSchema.parse({
      name: formData.get("name"),
      categories: JSON.parse(String(formData.get("categories") ?? "[]")),
      price: formData.get("price"),
      salePrice:
        formData.get("salePrice") === "" || formData.get("salePrice") === null
          ? null
          : formData.get("salePrice"),
      description: formData.get("description") || null,
      images: JSON.parse(String(formData.get("images") ?? "[]")),
      variants: JSON.parse(String(formData.get("variants") ?? "[]")),
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of e.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return { fieldErrors, error: "Revisa los campos marcados" };
    }
    throw e;
  }

  if (
    parsed.salePrice != null &&
    parsed.salePrice >= parsed.price
  ) {
    return {
      fieldErrors: { salePrice: "La oferta debe ser menor al precio normal" },
      error: "El precio de oferta debe ser menor al precio normal",
    };
  }

  const store = await getStore();

  // Todas las categorías deben pertenecer a la tienda
  const validCategories = await prisma.category.findMany({
    where: { storeId: store.id, isActive: true, id: { in: parsed.categories } },
  });
  if (validCategories.length !== parsed.categories.length) {
    return { error: "Categoría inválida" };
  }

  await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        storeId: store.id,
        name: parsed.name,
        description: parsed.description || null,
        price: parsed.price,
        salePrice: parsed.salePrice ?? null,
        productCategories: {
          // el orden de selección se conserva: la primera es la primaria
          create: parsed.categories.map((categoryId, i) => ({
            categoryId,
            sortOrder: i,
          })),
        },
        images: {
          create: parsed.images.map((img, i) => ({
            url: img.url,
            publicId: img.publicId,
            sortOrder: i,
          })),
        },
      },
    });

    for (const v of parsed.variants) {
      const sizeId = await getOrCreateSizeId(store.id, v.sizeName);
      // uniq por producto+talla: dedup aquí por si el form mandó repetidas
      const variant = await tx.productVariant.upsert({
        where: { productId_sizeId: { productId: product.id, sizeId } },
        update: { stock: { increment: v.stock } },
        create: { productId: product.id, sizeId, stock: v.stock },
      });
      await tx.stockMovement.create({
        data: {
          variantId: variant.id,
          userId: session.userId,
          type: "NEW",
          quantity: v.stock,
          note: "Prenda creada",
        },
      });
    }
  });

  revalidatePath("/admin/inventario");
  revalidatePath("/");
  return { success: true };
}

/** Ajuste de stock +/− (también sirve para reabasto). */
export async function adjustStock(
  variantId: string,
  delta: number,
  note?: string,
): Promise<{ ok: boolean; error?: string; stock?: number }> {
  const session = await requireSession();
  if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 999) {
    return { ok: false, error: "Cantidad inválida" };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
      });
      if (!variant) throw new Error("La talla no existe");

      const newStock = variant.stock + delta;
      if (newStock < 0) {
        return { blocked: true as const, stock: variant.stock };
      }

      const updated = await tx.productVariant.update({
        where: { id: variantId },
        data: { stock: newStock },
      });
      await tx.stockMovement.create({
        data: {
          variantId,
          userId: session.userId,
          type: delta > 0 ? "RESTOCK" : "ADJUST",
          quantity: delta,
          note:
            note ??
            (delta > 0 ? "Reabasto desde inventario" : "Ajuste desde inventario"),
        },
      });
      return { blocked: false as const, stock: updated.stock };
    });

    if (result.blocked) {
      return { ok: false, error: "El stock no puede quedar negativo", stock: result.stock };
    }
    revalidatePath("/admin/inventario");
    return { ok: true, stock: result.stock };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error inesperado";
    return { ok: false, error: msg };
  }
}

/** Editar precios/oferta de una prenda (y activar/desactivar). */
export async function updateProductPrices(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireSession();

  const id = String(formData.get("productId") ?? "");
  const price = Number(formData.get("price"));
  const rawSale = String(formData.get("salePrice") ?? "").trim();
  const salePrice = rawSale === "" ? null : Number(rawSale);
  const isActive = formData.get("isActive") === "true";

  if (!id || !Number.isFinite(price) || price <= 0) {
    return { error: "Precio inválido" };
  }
  if (salePrice != null && (!Number.isFinite(salePrice) || salePrice <= 0)) {
    return { error: "Precio de oferta inválido" };
  }
  if (salePrice != null && salePrice >= price) {
    return { error: "La oferta debe ser menor al precio normal" };
  }

  await prisma.product.update({
    where: { id },
    data: { price, salePrice, isActive },
  });

  revalidatePath("/admin/inventario");
  revalidatePath("/admin/ofertas");
  revalidatePath("/");
  return {};
}

/**
 * Agregar una talla a una prenda existente (o sumar cantidad si ya existe).
 * Decisión del dueño: gestionar tallas desde el inventario.
 */
export async function addVariantToProduct(
  productId: string,
  sizeName: string,
  stock: number,
): Promise<{ ok: boolean; error?: string; variantId?: string; stock?: number }> {
  const session = await requireSession();

  const name = sizeName.trim().slice(0, 10);
  const qty = Number(stock);
  if (!name) return { ok: false, error: "Escribe la talla" };
  if (!Number.isInteger(qty) || qty < 1 || qty > 999) {
    return { ok: false, error: "Cantidad inválida (1-999)" };
  }

  const store = await prisma.store.findFirst({ orderBy: { createdAt: "asc" } });
  if (!store) return { ok: false, error: "No hay tienda configurada" };

  // la prenda debe ser de la tienda
  const product = await prisma.product.findFirst({
    where: { id: productId, storeId: store.id },
  });
  if (!product) return { ok: false, error: "La prenda no existe" };

  const sizeId = await getOrCreateSizeId(store.id, name);

  const variant = await prisma.productVariant.upsert({
    where: { productId_sizeId: { productId, sizeId } },
    update: { stock: { increment: qty } },
    create: { productId, sizeId, stock: qty },
  });

  await prisma.stockMovement.create({
    data: {
      variantId: variant.id,
      userId: session.userId,
      type: "NEW",
      quantity: qty,
      note: "Talla agregada desde inventario",
    },
  });

  revalidatePath("/admin/inventario");
  revalidatePath("/");
  return { ok: true, variantId: variant.id, stock: variant.stock };
}

/**
 * Eliminar una prenda POR COMPLETO (decisión del dueño, 01-oct-2026):
 * producto, fotos, tallas con su stock, movimientos e ítems de envíos
 * viejos que la referencian. Cascada en BD. Las imágenes de Cloudinary
 * quedan huérfanas (no afectan funcionamiento ni cuota gratuita).
 * Confirmación en la UI; la acción no se puede deshacer.
 */
export async function deleteProduct(
  productId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireSession();

  if (!productId) return { ok: false, error: "Prenda inválida" };

  try {
    await prisma.product.delete({ where: { id: productId } });
  } catch {
    return { ok: false, error: "No se pudo eliminar, intenta de nuevo" };
  }

  revalidatePath("/admin/inventario");
  revalidatePath("/admin/vendido");
  revalidatePath("/admin/ofertas");
  revalidatePath("/");
  return { ok: true };
}
