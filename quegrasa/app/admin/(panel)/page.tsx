// Inicio del panel: menú principal (especificación §5.2).
// Diseño sobrio de herramienta: lista vertical, iconos de línea,
// grafito como acento, semántica solo donde importa.
import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  ShoppingCart,
  Package,
  ClipboardList,
  PlusCircle,
  Tag,
  ChevronRight,
  History,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const store = await prisma.store.findFirst({ orderBy: { createdAt: "asc" } });
  const pendingShipments = store
    ? await prisma.shipment.count({
        where: { storeId: store.id, status: "PENDING" },
      })
    : 0;

  const items: {
    href: string;
    icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
    label: string;
    desc: string;
    badge?: number;
  }[] = [
    {
      href: "/admin/vendido",
      icon: ShoppingCart,
      label: "Vendido",
      desc: "Descuenta una venta en dos toques",
    },
    {
      href: "/admin/envios",
      icon: Package,
      label: "Envíos",
      desc: "Pendientes de llevar a la agencia MRW",
      badge: pendingShipments,
    },
    {
      href: "/admin/inventario",
      icon: ClipboardList,
      label: "Inventario",
      desc: "Stock por talla, precios y visibilidad",
    },
    {
      href: "/admin/subir",
      icon: PlusCircle,
      label: "Subir prenda",
      desc: "Publica en el catálogo con fotos",
    },
    {
      href: "/admin/ofertas",
      icon: Tag,
      label: "Ofertas",
      desc: "Pon o quita precios rebajados",
    },
  ];

  return (
    <div>
      <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
        Panel de tienda
      </h1>
      <p className="mt-0.5 text-sm text-zinc-500">¿Qué vas a hacer hoy?</p>

      <nav className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        {items.map((it, i) => {
          const Icon = it.icon;
          const soon = it.badge === -1;
          const inner = (
            <div
              className={`flex items-center gap-3.5 px-4 py-3.5 ${
                i > 0 ? "border-t border-zinc-100" : ""
              } ${soon ? "opacity-45" : ""}`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-950 text-gold">
                <Icon size={18} strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-zinc-900">
                  {it.label}
                </span>
                <span className="block truncate text-xs text-zinc-400">
                  {it.desc}
                </span>
              </span>
              {soon ? (
                <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                  Pronto
                </span>
              ) : (
                <>
                  {it.badge != null && it.badge > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-gold px-1.5 text-[11px] font-bold tabular-nums text-zinc-950">
                      {it.badge}
                    </span>
                  )}
                  <ChevronRight
                    size={16}
                    strokeWidth={2}
                    className="shrink-0 text-zinc-300"
                  />
                </>
              )}
            </div>
          );

          return soon ? (
            <div key={it.label} className="cursor-not-allowed select-none">
              {inner}
            </div>
          ) : (
            <Link key={it.label} href={it.href} className="block transition hover:bg-zinc-50 active:bg-zinc-100">
              {inner}
            </Link>
          );
        })}
      </nav>

      <p className="mt-4 text-center">
        <Link
          href="/admin/movimientos"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition hover:text-zinc-700"
        >
          <History size={13} strokeWidth={2} />
          Ver historial de movimientos
        </Link>
      </p>
    </div>
  );
}
