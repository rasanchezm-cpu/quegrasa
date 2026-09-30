// "Movimientos" — la bitácora auditable de todo cambio de stock (spec §4).
import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, { label: string; cls: string }> = {
  SALE: { label: "Venta", cls: "bg-sky-50 text-sky-700" },
  RESTOCK: { label: "Reabasto", cls: "bg-emerald-50 text-emerald-700" },
  ADJUST: { label: "Ajuste", cls: "bg-amber-50 text-amber-700" },
  NEW: { label: "Nueva", cls: "bg-violet-50 text-violet-700" },
};

export default async function MovimientosPage() {
  const store = await prisma.store.findFirst({ orderBy: { createdAt: "asc" } });
  if (!store) {
    return (
      <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
        No hay tienda configurada.
      </p>
    );
  }

  const movements = await prisma.stockMovement.findMany({
    where: { variant: { product: { storeId: store.id } } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { name: true } },
      variant: {
        include: {
          product: { select: { name: true } },
          size: { select: { name: true } },
        },
      },
    },
  });

  return (
    <div>
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500"
      >
        ← Volver
      </Link>
      <h1 className="mb-1 text-2xl font-bold tracking-tight">🧾 Movimientos</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Últimos {movements.length} cambios de stock — quién, cuándo y qué.
      </p>

      <div className="space-y-1.5">
        {movements.map((m) => {
          const t = TYPE_LABEL[m.type];
          return (
            <article
              key={m.id}
              className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 ring-1 ring-black/5"
            >
              <span
                className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${t.cls}`}
              >
                {t.label}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {m.variant.product.name} · {m.variant.size.name}
                </p>
                <p className="text-xs text-neutral-400">
                  {m.createdAt.toLocaleString("es-VE", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  — {m.user.name}
                  {m.note ? ` · ${m.note}` : ""}
                </p>
              </div>
              <span
                className={`shrink-0 text-sm font-bold ${
                  m.quantity > 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
              </span>
            </article>
          );
        })}
        {movements.length === 0 && (
          <p className="rounded-xl bg-neutral-100 px-4 py-6 text-center text-sm text-neutral-500">
            Sin movimientos todavía.
          </p>
        )}
      </div>
    </div>
  );
}
