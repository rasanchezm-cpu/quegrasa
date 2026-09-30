// "Subir prenda" — carga categorías, tallas sugeridas y la tasa BCV
// del día para alimentar el formulario.
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getLatestRate } from "@/lib/exchange";
import ProductForm from "@/components/admin/product-form";

export const dynamic = "force-dynamic";

export default async function SubirPage() {
  const store = await prisma.store.findFirst({ orderBy: { createdAt: "asc" } });
  if (!store) {
    return (
      <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
        No hay tienda configurada. Corre el seed: <code>npx prisma db seed</code>
      </p>
    );
  }

  const [categories, sizes, rateInfo] = await Promise.all([
    prisma.category.findMany({
      where: { storeId: store.id, isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    prisma.size.findMany({
      where: { storeId: store.id },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    getLatestRate(),
  ]);

  return (
    <div>
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500"
      >
        ← Volver
      </Link>
      <h1 className="mb-1 text-2xl font-bold tracking-tight">➕ Subir prenda</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Completa los datos y la prenda queda publicada en el catálogo.
      </p>
      <ProductForm
        categories={categories}
        sizes={sizes}
        rate={rateInfo?.rate ?? null}
      />
    </div>
  );
}
