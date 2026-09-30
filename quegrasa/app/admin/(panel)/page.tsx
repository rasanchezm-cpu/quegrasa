// Inicio del panel: 6 botones grandes (especificación §5.2).
// Vendí/Envíos activos desde S3; el badge muestra los envíos pendientes.
import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Btn = {
  href: string | null;
  emoji: string;
  label: string;
  soon?: boolean;
  color: string;
  badge?: number;
};

export default async function AdminHome() {
  const store = await prisma.store.findFirst({ orderBy: { createdAt: "asc" } });
  const pendingShipments = store
    ? await prisma.shipment.count({
        where: { storeId: store.id, status: "PENDING" },
      })
    : 0;

  const BUTTONS: Btn[] = [
    { href: "/admin/vendi", emoji: "🛒", label: "Vendí", color: "bg-sky-50 text-sky-600" },
    { href: "/admin/envios", emoji: "📦", label: "Envíos", color: "bg-amber-50 text-amber-600", badge: pendingShipments },
    { href: "/admin/inventario", emoji: "📋", label: "Inventario", color: "bg-emerald-50 text-emerald-600" },
    { href: "/admin/subir", emoji: "➕", label: "Subir prenda", color: "bg-violet-50 text-violet-600" },
    { href: "/admin/ofertas", emoji: "🏷️", label: "Ofertas", color: "bg-rose-50 text-rose-600" },
    { href: null, emoji: "🖼️", label: "Collage", soon: true, color: "bg-indigo-50 text-indigo-600" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
        Hola 👋
      </h1>
      <p className="mt-1 text-sm text-neutral-500">¿Qué vas a hacer hoy?</p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {BUTTONS.map((b) => {
          const inner = (
            <div
              className={`relative flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl transition active:scale-[0.97] ${
                b.soon
                  ? "bg-neutral-100 text-neutral-400"
                  : `${b.color} shadow-sm ring-1 ring-black/5`
              }`}
            >
              <span className="text-4xl">{b.emoji}</span>
              <span className="px-2 text-center text-sm font-semibold leading-tight">
                {b.label}
              </span>
              {b.soon && (
                <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                  Pronto
                </span>
              )}
              {b.badge != null && b.badge > 0 && (
                <span className="absolute right-2.5 top-2.5 flex h-7 min-w-7 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white shadow">
                  {b.badge}
                </span>
              )}
            </div>
          );

          return b.soon ? (
            <div key={b.label} className="cursor-not-allowed select-none">
              {inner}
            </div>
          ) : (
            <Link key={b.label} href={b.href!}>
              {inner}
            </Link>
          );
        })}
      </div>

      <p className="mt-6 rounded-xl bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-800">
        💡 <b>Vendí</b>: toca la talla que se vendió (2 toques, funciona en modo
        venta seguida). <b>Envíos</b>: lo pendiente para llevar a MRW, con botón
        "En agencia ✓".
      </p>

      <p className="mt-4 text-center">
        <Link
          href="/admin/movimientos"
          className="text-xs font-medium text-neutral-400 underline underline-offset-2"
        >
          🧾 Ver historial de movimientos
        </Link>
      </p>
    </div>
  );
}
