"use client";

// "Vendí" (spec §5.2): buscar → tap en la talla vendida → ✓.
// Modo venta: acumula lo vendido en la sesión; al cerrar puede
// marcarlo como envío online (crea el Shipment PENDING).

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sellVariant, createShipment } from "@/lib/actions/sales";

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
  const [flash, setFlash] = useState<{ id: string; text: string } | null>(null);
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
      // Actualiza el stock local
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
      // Modo venta: acumula la sesión
      const price = p.salePrice ?? p.price;
      setSold((prev) => {
        const key = `${v.id}`;
        const existing = prev.find((s) => s.key === key);
        if (existing) {
          return prev.map((s) => (s.key === key ? { ...s, qty: s.qty + 1 } : s));
        }
        return [
          ...prev,
          {
            key,
            variantId: v.id,
            productName: p.name,
            sizeName: v.sizeName,
            price,
            qty: 1,
          },
        ];
      });
      // Feedback instantáneo
      setFlash({ id: v.id, text: `${p.name} ${v.sizeName} ✓` });
      setTimeout(() => setFlash(null), 1200);
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
      setTimeout(() => setShipDone(false), 4000);
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
      {/* Buscador siempre arriba */}
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="¿Qué vendió? Escribe el nombre…"
        className="mb-4 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3.5 text-base outline-none focus:border-sky-500"
      />

      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
      {shipDone && (
        <p className="mb-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          📦 Envío creado — lo verás en la lista de pendientes de "Envíos".
        </p>
      )}
      {flash && (
        <p className="mb-3 rounded-lg bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700">
          ✓ {flash.text}
        </p>
      )}

      {/* Resultados */}
      <div className="space-y-2">
        {results.map((p) => {
          const total = p.variants.reduce((s, v) => s + v.stock, 0);
          if (total === 0) return null; // agotada no aparece
          return (
            <article
              key={p.id}
              className="flex items-center gap-3 rounded-2xl bg-white p-2.5 ring-1 ring-black/5"
            >
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.imageUrl}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-xl">
                  👕
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                <p className="text-xs text-neutral-500">
                  ${(p.salePrice ?? p.price).toFixed(2)}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {p.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      disabled={v.stock === 0 || busy}
                      onClick={() => tapTalla(p, v)}
                      className={`min-w-11 rounded-lg px-2.5 py-2 text-sm font-bold transition active:scale-90 ${
                        v.stock === 0
                          ? "cursor-not-allowed bg-neutral-100 text-neutral-300 line-through"
                          : "bg-sky-600 text-white hover:bg-sky-700"
                      }`}
                      title={v.stock === 0 ? "Agotada" : `Quedan ${v.stock}`}
                    >
                      {v.sizeName}
                    </button>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
        {results.length === 0 && (
          <p className="rounded-xl bg-neutral-100 px-4 py-6 text-center text-sm text-neutral-500">
            Sin resultados. Escribe otra cosa o revisa que la prenda tenga stock.
          </p>
        )}
      </div>

      {/* Barra de sesión de venta (fija abajo) */}
      {sold.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/95 p-3 backdrop-blur">
          <div className="mx-auto max-w-lg space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Vendiste en esta sesión · ${totalUsd.toFixed(2)}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {sold.map((s) => (
                <span
                  key={s.key}
                  className="rounded-lg bg-sky-50 px-2 py-1 text-xs font-medium text-sky-800 ring-1 ring-sky-200"
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
                className="flex-1 rounded-xl bg-neutral-100 py-3 text-sm font-semibold text-neutral-700 disabled:opacity-50"
              >
                ↩︎ Revertir última
              </button>
              <button
                type="button"
                onClick={() => setShipping(true)}
                className="flex-1 rounded-xl bg-amber-500 py-3 text-sm font-semibold text-white"
              >
                📦 Enviar por MRW
              </button>
              <button
                type="button"
                onClick={finishLocal}
                className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white"
              >
                ✓ Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel de envío */}
      {shipping && (
        <div className="fixed inset-0 z-30 flex items-end bg-black/40 p-3">
          <div className="mx-auto w-full max-w-lg space-y-3 rounded-2xl bg-white p-4">
            <h3 className="font-bold">📦 Enviar por MRW</h3>
            <p className="text-xs text-neutral-500">
              Las {sold.reduce((s, x) => s + x.qty, 0)} pieza(s) vendidas quedarán en la
              lista de pendientes para llevar a la agencia.
            </p>
            <input
              autoFocus
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nombre del cliente (para MRW)"
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-amber-500"
            />
            <input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Teléfono (opcional)"
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-amber-500"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShipping(false)}
                className="flex-1 rounded-xl bg-neutral-100 py-3 text-sm font-semibold text-neutral-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmShipping}
                disabled={shipBusy || customerName.trim().length < 2}
                className="flex-1 rounded-xl bg-amber-500 py-3 text-sm font-semibold text-white disabled:opacity-40"
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
