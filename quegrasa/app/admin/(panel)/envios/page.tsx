// "Envíos" — pendientes (la cola de MRW) + historial de entregados a la agencia.
import Link from "next/link";
import { prisma } from "@/lib/db";
import AgencyButton from "@/components/admin/agency-button";

export const dynamic = "force-dynamic";

export default async function EnviosPage() {
  const store = await prisma.store.findFirst({ orderBy: { createdAt: "asc" } });
  if (!store) {
    return (
      <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
        No hay tienda configurada.
      </p>
    );
  }

  const include = {
    items: {
      include: {
        variant: {
          include: {
            product: { select: { name: true } },
            size: { select: { name: true } },
          },
        },
      },
    },
  };

  const [pending, sent] = await Promise.all([
    prisma.shipment.findMany({
      where: { storeId: store.id, status: "PENDING" },
      orderBy: { createdAt: "asc" }, // el más viejo primero: FIFO de la cola
      include,
    }),
    prisma.shipment.findMany({
      where: { storeId: store.id, status: "AT_AGENCY" },
      orderBy: { updatedAt: "desc" },
      take: 30,
      include,
    }),
  ]);

  return (
    <div>
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500"
      >
        ← Volver
      </Link>
      <h1 className="mb-1 text-lg font-semibold tracking-tight text-zinc-900">Envíos</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Lo pendiente es lo que hay que llevar a la agencia MRW. Toca "En agencia" al
        entregarlo.
      </p>

      {/* Pendientes */}
      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
          Pendientes ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="mb-6 rounded-xl bg-emerald-50 px-4 py-5 text-center text-sm text-emerald-700">
            ✓ Todo al día — no hay envíos pendientes.
          </p>
        ) : (
          <div className="mb-6 space-y-3">
            {pending.map((s) => (
              <article
                key={s.id}
                className="rounded-2xl bg-white p-3 ring-1 ring-amber-200"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{s.customerName}</p>
                    {s.customerPhone && (
                      <p className="text-xs text-zinc-500">{s.customerPhone}</p>
                    )}
                    {s.note && (
                      <p className="text-xs italic text-zinc-400">{s.note}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-[10px] text-zinc-400">
                    {s.createdAt.toLocaleDateString("es-VE", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
                <ul className="mb-3 space-y-0.5">
                  {s.items.map((it) => (
                    <li key={it.id} className="text-sm text-zinc-600">
                      · {it.variant.product.name} — talla {it.variant.size.name} ×
                      {it.qty}
                    </li>
                  ))}
                </ul>
                <AgencyButton shipmentId={s.id} />
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Historial */}
      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
          Entregados a la agencia
        </h2>
        {sent.length === 0 ? (
          <p className="rounded-xl bg-zinc-100 px-4 py-5 text-center text-sm text-zinc-500">
            Aún no hay envíos entregados.
          </p>
        ) : (
          <div className="space-y-2">
            {sent.map((s) => (
              <article
                key={s.id}
                className="rounded-xl bg-zinc-50 p-3 text-sm ring-1 ring-black/5"
              >
                <p className="font-semibold text-zinc-700">
                  {s.customerName}{" "}
                  <span className="font-normal text-zinc-400">
                    · {s.updatedAt.toLocaleDateString("es-VE", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </p>
                <p className="text-xs text-zinc-500">
                  {s.items
                    .map(
                      (it) =>
                        `${it.variant.product.name} ${it.variant.size.name} ×${it.qty}`,
                    )
                    .join(", ")}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
