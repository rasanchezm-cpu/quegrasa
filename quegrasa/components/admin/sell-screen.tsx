"use client";

// "Vendí" (spec §5.2): buscar → tap en la talla vendida → descuento.
// Modo venta: acumula la sesión; al cerrar puede marcarse como envío.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sellVariant, createShipment } from "@/lib/actions/sales";
import { Check, Undo2, PackageCheck, SearchX } from "lucide-react";

export type SellVariant = {
  id: string;
  sizeName: string;
  stock: number;
};
export type SellProduct = {
  id: string;
  name: string;
  price: number;
  salePrice: number | null;
  imageUrl: string | null;
  variants: SellVariant[];
};
type SoldItem = {
  key: string;
  variantId: string;
  productName: string;
  sizeName: string;
  price: number;
  qty: number;
};

export default function SellScreen({ products }: { products: SellProduct[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [list, setList] = useState(products);
  const [sold, setSold] = useState<SoldItem[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  // Panel "envío online"
  const [shipping, setShipping] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shipBusy, setShipBusy] = useState(false);
  const [shipDone, setShipDone] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list.slice(0, 12);
    return list.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 20);
  }, [list, query]);

  const tapTalla = (p: SellProduct, v: SellVariant) => {
    if (v.stock <= 0) return;
    setError(null);
    startTransition(async () => {
      const res = await sellVariant(v.id, 1);
      if (!res.ok) {
        setError(res.error ?? "No se pudo registrar");
        return;
      }
      setList((prev) =>
        prev.map((x) =>
          x.id !== p.id
            ? x
            : {
                ...x,
                variants: x.variants.map((y) =>
                  y.id === v.id ? { ...y, stock: res.stock ?? y.stock } : y,
                ),
              },
        ),
      );
      const price = p.salePrice ?? p.price;
      setSold((prev) => {
        const key = `${v.id}`;
        const existing = prev.find((s) => s.key === key);
        if (existing) {
          return prev.map((s) => (s.key === key ? { ...s, qty: s.qty + 1 } : s));
        }
        return [
          ...prev,
          { key, variantId: v.id, productName: p.name, sizeName: v.sizeName, price, qty: 1 },
        ];
      });
      setFlash(`${p.name} · ${v.sizeName}`);
      setTimeout(() => setFlash(null), 1400);
      router.refresh();
    });
  };

  const undoLast = () => {
    const last = sold[sold.length - 1];
    if (!last) return;
    startTransition(async () => {
      const { adjustStock } = await import("@/lib/actions/products");
      const res = await adjustStock(last.variantId, last.qty, "Corrección de venta");
      if (!res.ok) {
        setError("No se pudo revertir: ajusta el stock manualmente en Inventario");
        return;
      }
      setSold((prev) => prev.filter((s) => s.key !== last.key));
      router.refresh();
    });
  };

  const confirmShipping = () => {
    setShipBusy(true);
    setError(null);
    startTransition(async () => {
      const res = await createShipment({
        customerName,
        customerPhone: customerPhone || undefined,
        items: sold.map((s) => ({ variantId: s.variantId, qty: s.qty })),
      });
      setShipBusy(false);
      if (!res.ok) {
        setError(res.error ?? "No se pudo crear el envío");
        return;
      }
      setSold([]);
      setCustomerName("");
      setCustomerPhone("");
      setShipping(false);
      setShipDone(true);
      setTimeout(() => setShipDone(false), 5000);
      router.refresh();
    });
  };

  const finishLocal = () => {
    setSold([]);
    setFlash(null);
  };

  const totalUsd = sold.reduce((s, x) => s + x.price * x.qty, 0);

  return (
    <div>
      {/* Buscador */}
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar prenda por nombre…"
        className="mb-4 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
      />

      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
          {error}
        </p>
      )}
      {shipDone && (
        <p className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-700">
          <PackageCheck size={14} strokeWidth={2} />
          Envío creado — está en la lista de pendientes de Envíos.
        </p>
      )}
      {flash && (
        <p className="mb-3 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-700">
          <Check size={14} strokeWidth={2.5} />
          {flash} — registrado
        </p>
      )}

      {/* Resultados */}
      <div className="space-y-2">
        {results.map((p) => {
          const total = p.variants.reduce((s, v) => s + v.stock, 0);
          if (total === 0) return null;
          return (
            <article
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-2.5"
            >
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.imageUrl}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="h-14 w-14 shrink-0 rounded-lg bg-zinc-100" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900">{p.name}</p>
                <p className="text-xs tabular-nums text-zinc-500">
                  ${(p.salePrice ?? p.price).toFixed(2)}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {p.variants.map((v) => {
                    const elegida = sold.some((s) => s.variantId === v.id);
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={v.stock === 0 || busy}
                        onClick={() => tapTalla(p, v)}
                        title={v.stock === 0 ? "Agotada" : `Toca para vender — quedan ${v.stock}`}
                        className={`flex min-w-11 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold transition active:scale-95 ${
                          v.stock === 0
                            ? "cursor-not-allowed bg-zinc-50 text-zinc-300 line-through"
                            : elegida
                              ? "bg-zinc-300 text-zinc-500"
                              : "bg-gold text-zinc-950 hover:bg-gold-dark"
                        }`}
                      >
                        {elegida && <Check size={10} strokeWidth={3} className="shrink-0" />}
                        <span>{v.sizeName}</span>
                        <span
                          className={`tabular-nums text-[10px] font-bold ${
                            v.stock <= 1 ? "text-red-600" : elegida ? "text-zinc-400" : "text-zinc-600"
                          }`}
                        >
                          {v.stock}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </article>
          );
        })}
        {results.length === 0 && (
          <p className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-10 text-center text-xs text-zinc-400">
            <SearchX size={20} strokeWidth={1.5} />
            Sin resultados. Prueba otro nombre o revisa el stock en Inventario.
          </p>
        )}
      </div>

      {/* Barra de sesión de venta (fija abajo) */}
      {sold.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white p-3">
          <div className="mx-auto max-w-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Sesión de venta
              </p>
              <p className="text-sm font-semibold tabular-nums text-zinc-900">
                ${totalUsd.toFixed(2)}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sold.map((s) => (
                <span
                  key={s.key}
                  className="rounded-md bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-700"
                >
                  {s.productName} {s.sizeName}
                  {s.qty > 1 && ` ×${s.qty}`}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={undoLast}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 py-2.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
              >
                <Undo2 size={14} strokeWidth={2} />
                Revertir
              </button>
              <button
                type="button"
                onClick={() => setShipping(true)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gold bg-white py-2.5 text-xs font-bold text-gold-dark transition hover:bg-gold-soft active:scale-[0.98]"
              >
                <PackageCheck size={14} strokeWidth={2} />
                Enviar por MRW
              </button>
              <button
                type="button"
                onClick={finishLocal}
                className="flex-1 rounded-lg bg-gold py-2.5 text-xs font-bold text-zinc-950 transition hover:bg-gold-dark active:scale-[0.98]"
              >
                Vendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel de envío */}
      {shipping && (
        <div className="fixed inset-0 z-30 flex items-end bg-zinc-900/40 p-3">
          <div className="mx-auto w-full max-w-lg space-y-3 rounded-xl bg-white p-4 shadow-xl">
            <h3 className="text-sm font-semibold text-zinc-900">
              Enviar por MRW
            </h3>
            <p className="text-xs text-zinc-500">
              {sold.reduce((s, x) => s + x.qty, 0)} pieza(s) quedarán pendientes
              para llevar a la agencia.
            </p>
            <input
              autoFocus
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nombre del cliente (para MRW)"
              className="w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
            />
            <input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Teléfono (opcional)"
              className="w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShipping(false)}
                className="flex-1 rounded-lg border border-zinc-200 py-2.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmShipping}
                disabled={shipBusy || customerName.trim().length < 2}
                className="flex-1 rounded-lg bg-gold py-2.5 text-xs font-bold text-zinc-950 transition hover:bg-gold-dark disabled:opacity-40"
              >
                {shipBusy ? "Creando…" : "Crear envío"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
