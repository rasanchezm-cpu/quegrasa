// "Vendido" — la operación diaria: buscar, tap en talla, descuento.
import Link from "next/link";
import { prisma } from "@/lib/db";
import SellScreen, { type SellProduct } from "@/components/admin/sell-screen";

export const dynamic = "force-dynamic";

export default async function VendidoPage() {
  const store = await prisma.store.findFirst({ orderBy: { createdAt: "asc" } });
  if (!store) {
    return (
      <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
        No hay tienda configurada.
      </p>
    );
  }

  const rows = await prisma.product.findMany({
    where: { storeId: store.id, isActive: true },
    orderBy: { createdAt: "desc" },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      variants: {
        where: { stock: { gt: 0 } }, // solo tallas con stock: las agotadas no se venden
        include: { size: { select: { name: true } } },
        orderBy: { size: { sortOrder: "asc" } },
      },
    },
  });

  const thumb = (url: string) =>
    url.replace("/upload/", "/upload/c_fill,w_112,h_112,f_auto,q_auto/");

  const products: SellProduct[] = rows
    .filter((p) => p.variants.length > 0)
    .map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      salePrice: p.salePrice != null ? Number(p.salePrice) : null,
      imageUrl: p.images[0] ? thumb(p.images[0].url) : null,
      variants: p.variants.map((v) => ({
        id: v.id,
        sizeName: v.size.name,
        stock: v.stock,
      })),
    }));

  return (
    <div className="pb-28">
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 transition hover:text-zinc-900"
      >
        ← Volver
      </Link>
      <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
        Vendido
      </h1>
      <p className="mt-0.5 mb-5 text-sm text-zinc-500">
        Busca la prenda y toca la talla que se vendió — 2 toques.
      </p>
      <SellScreen products={products} />
    </div>
  );
}
