// "Inventario": lista por categoría con stock por talla, ajustes +/−
// y edición de precios/ofertas inline.
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getLatestRate } from "@/lib/exchange";
import InventoryList, { type InventoryProduct } from "@/components/admin/inventory-list";

export const dynamic = "force-dynamic";

export default async function InventarioPage() {
  const store = await prisma.store.findFirst({ orderBy: { createdAt: "asc" } });
  if (!store) {
    return (
      <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
        No hay tienda configurada. Corre el seed.
      </p>
    );
  }

  const [rows, rateInfo] = await Promise.all([
    prisma.product.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { name: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        variants: {
          include: { size: { select: { name: true } } },
          orderBy: { size: { sortOrder: "asc" } },
        },
      },
    }),
    getLatestRate(),
  ]);

  // A URL lista para miniatura (Cloudinary transforma y comprime al vuelo)
  const thumb = (url: string) =>
    url.replace("/upload/", "/upload/c_fill,w_160,h_160,f_auto,q_auto/");

  const products: InventoryProduct[] = rows.map((p) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price),
    salePrice: p.salePrice != null ? Number(p.salePrice) : null,
    isActive: p.isActive,
    imageUrl: p.images[0] ? thumb(p.images[0].url) : null,
    categoryName: p.category.name,
    variants: p.variants.map((v) => ({
      id: v.id,
      sizeName: v.size.name,
      stock: v.stock,
    })),
  }));

  return (
    <div>
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500"
      >
        ← Volver
      </Link>
      <h1 className="mb-1 text-2xl font-bold tracking-tight">📋 Inventario</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Toca − cuando se vende o daña una pieza, + cuando llega mercancía.
      </p>
      <InventoryList products={products} rate={rateInfo?.rate ?? null} />
    </div>
  );
}
