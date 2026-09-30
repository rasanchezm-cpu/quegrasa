"use server";

// Server Actions de ventas y envíos (Sprint 3).
// Reglas del spec:
//  - Vender = tocar la talla: descuenta stock YA y registra el movimiento.
//  - Todo envío es una venta: se descuenta al crearlo, con priceSnapshot.
//  - Envíos: solo 2 estados, PENDING -> AT_AGENCY (un toque).
//  - Nunca stock negativo; nunca sin bitácora.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";

// ============================================================
// Vender en tienda física: "Vendí" (2 toques)
// ============================================================

const SellSchema = z.object({
  variantId: z.string().min(1),
  qty: z.coerce.number().int().min(1).max(99).default(1),
});

export type SellResult = {
  ok: boolean;
  error?: string;
  stock?: number;
};

/** Descuenta piezas de una talla y registra la venta. */
export async function sellVariant(
  variantId: string,
  qty = 1,
): Promise<SellResult> {
  const session = await requireSession();

  const parsed = SellSchema.safeParse({ variantId, qty });
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({
        where: { id: parsed.data.variantId },
      });
      if (!variant) throw new Error("La talla no existe");

      if (variant.stock < parsed.data.qty) {
        return { blocked: true as const, stock: variant.stock };
      }

      const updated = await tx.productVariant.update({
        where: { id: variant.id },
        data: { stock: { decrement: parsed.data.qty } },
      });
      await tx.stockMovement.create({
        data: {
          variantId: variant.id,
          userId: session.userId,
          type: "SALE",
          quantity: -parsed.data.qty,
          note: "Venta en tienda",
        },
      });
      return { blocked: false as const, stock: updated.stock };
    });

    if (result.blocked) {
      return { ok: false, error: "No hay suficiente stock", stock: result.stock };
    }

    revalidatePath("/admin/vendi");
    revalidatePath("/admin/inventario");
    revalidatePath("/");
    return { ok: true, stock: result.stock };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

// ============================================================
// Envíos online (MRW)
// ============================================================

const ShipmentSchema = z.object({
  customerName: z.string().trim().min(2, "Escribe el nombre del cliente").max(80),
  customerPhone: z.string().trim().max(20).optional().nullable(),
  note: z.string().trim().max(200).optional().nullable(),
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        qty: z.coerce.number().int().min(1).max(99),
      }),
    )
    .min(1, "El envío no tiene prendas"),
});

export type ShipmentResult = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  shipmentId?: string;
};

/**
 * Crear envío desde el modo venta: NO toca el stock — los taps de "Vendí"
 * ya descontaron cada pieza y generaron sus movimientos SALE. Esta acción
 * solo registra el despacho (Shipment + ítems con priceSnapshot) para
 * saber qué llevar a la agencia MRW.
 */
export async function createShipment(input: {
  customerName: string;
  items: { variantId: string; qty: number }[];
  customerPhone?: string;
  note?: string;
}): Promise<ShipmentResult> {
  const session = await requireSession();

  const parsed = ShipmentSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, fieldErrors, error: "Revisa los datos del envío" };
  }

  const store = await prisma.store.findFirst({ orderBy: { createdAt: "asc" } });
  if (!store) return { ok: false, error: "No hay tienda configurada" };

  try {
    const shipmentId = await prisma.$transaction(async (tx) => {
      // Capturar el precio vigente como snapshot (para reportes futuros)
      const prepared: { variantId: string; qty: number; price: number }[] = [];
      for (const item of parsed.data.items) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          include: { product: { select: { price: true, salePrice: true } } },
        });
        if (!variant) throw new Error("Una de las prendas ya no existe");
        prepared.push({
          variantId: variant.id,
          qty: item.qty,
          price: Number(variant.product.salePrice ?? variant.product.price),
        });
      }

      const shipment = await tx.shipment.create({
        data: {
          storeId: store.id,
          customerName: parsed.data.customerName,
          customerPhone: parsed.data.customerPhone || null,
          note: parsed.data.note || null,
          createdById: session.userId,
          status: "PENDING",
        },
      });

      for (const item of prepared) {
        await tx.shipmentItem.create({
          data: {
            shipmentId: shipment.id,
            variantId: item.variantId,
            qty: item.qty,
            priceSnapshot: item.price,
          },
        });
      }

      return shipment.id;
    });

    revalidatePath("/admin/envios");
    revalidatePath("/admin/vendi");
    return { ok: true, shipmentId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

/** Marcar "En agencia ✓" — el toggle de un toque. */
export async function markShipmentAtAgency(
  shipmentId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireSession();

  const updated = await prisma.shipment.updateMany({
    where: { id: shipmentId, status: "PENDING" },
    data: { status: "AT_AGENCY" },
  });

  if (updated.count === 0) {
    return { ok: false, error: "El envío ya no está pendiente" };
  }

  revalidatePath("/admin/envios");
  return { ok: true };
}
