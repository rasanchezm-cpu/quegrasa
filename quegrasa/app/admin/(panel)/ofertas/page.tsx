// "Ofertas": panel rápido de promociones (spec §5.2).
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getLatestRate } from "@/lib/exchange";
import OffersList, { type OfferProduct } from "@/components/admin/offers-list";

export const dynamic = "force-dynamic";

export default async function OfertasPage() {
  const store = await prisma.store.findFirst({ orderBy: { createdAt: "asc" } });
  if (!store) {
    return (
      <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
        No hay tienda configurada.
      </p>
    );
  }

  const [rows, rateInfo] = await Promise.all([
    prisma.product.findMany({
      where: { storeId: store.id, isActive: true },
      orderBy: [{ salePrice: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        price: true,
        salePrice: true,
        isActive: true,
      },
    }),
    getLatestRate(),
  ]);

  const products: OfferProduct[] = rows.map((p) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price),
    salePrice: p.salePrice != null ? Number(p.salePrice) : null,
    isActive: p.isActive,
    rate: rateInfo?.rate ?? null,
  }));

  return (
    <div>
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500"
      >
        ← Volver
      </Link>
      <h1 className="mb-1 text-2xl font-bold tracking-tight">🏷️ Ofertas</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Pon el precio de oferta y la prenda sale tachada en el catálogo.
      </p>
      <OffersList products={products} />
    </div>
  );
}
