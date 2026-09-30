// Inicio del panel: 6 botones grandes (especificación §5.2).
// Vendí, Envíos y Collage se activan en el Sprint 3/5.
import Link from "next/link";

type Btn = {
  href: string | null;
  emoji: string;
  label: string;
  soon?: boolean;
  color: string;
};

const BUTTONS: Btn[] = [
  { href: null, emoji: "🛒", label: "Vendí", soon: true, color: "bg-sky-50 text-sky-600" },
  { href: null, emoji: "📦", label: "Envíos", soon: true, color: "bg-amber-50 text-amber-600" },
  { href: "/admin/inventario", emoji: "📋", label: "Inventario", color: "bg-emerald-50 text-emerald-600" },
  { href: "/admin/subir", emoji: "➕", label: "Subir prenda", color: "bg-violet-50 text-violet-600" },
  { href: "/admin/ofertas", emoji: "🏷️", label: "Ofertas", color: "bg-rose-50 text-rose-600" },
  { href: null, emoji: "🖼️", label: "Collage", soon: true, color: "bg-indigo-50 text-indigo-600" },
];

export default function AdminHome() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
        Hola 👋
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        ¿Qué vas a hacer hoy?
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {BUTTONS.map((b) => {
          const inner = (
            <div
              className={`flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl transition active:scale-[0.97] ${
                b.soon
                  ? "bg-neutral-100 text-neutral-400"
                  : `${b.color} ${b.color.includes("emerald") ? "ring-emerald-600/20" : ""} shadow-sm ring-1 ring-black/5`
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
        💡 <b>Inventario</b>: ve y ajusta el stock de cada talla.{" "}
        <b>Subir prenda</b>: publica una nueva con fotos. <b>Ofertas</b>: pon o
        quita precios rebajados.
      </p>
    </div>
  );
}
