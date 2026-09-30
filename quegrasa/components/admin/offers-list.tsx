"use client";

// "Ofertas": lista rápida para poner/quitar el precio de oferta (spec §5.2).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProductPrices } from "@/lib/actions/products";
import { formatBs, usdToBs } from "@/lib/money";

export type OfferProduct = {
  id: string;
  name: string;
  price: number;
  salePrice: number | null;
  isActive: boolean;
  rate: number | null;
};

export default function OffersList({ products }: { products: OfferProduct[] }) {
  const router = useRouter();
  const [list, setList] = useState(products);
  const [busy, startTransition] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apply = (
    p: OfferProduct,
    salePrice: number | null,
  ) => {
    setError(null);
    setSavingId(p.id);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("productId", p.id);
      fd.set("price", String(p.price));
      fd.set("salePrice", salePrice != null ? String(salePrice) : "");
      fd.set("isActive", "true");
      const res = await updateProductPrices({}, fd);
      setSavingId(null);
      if (res.error) {
        setError(res.error);
        return;
      }
      setList((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, salePrice } : x)),
      );
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {list.length === 0 && (
        <p className="rounded-xl bg-neutral-100 px-4 py-6 text-center text-sm text-neutral-500">
          Aún no hay prendas cargadas.
        </p>
      )}

      {list.map((p) => (
        <article
          key={p.id}
          className={`rounded-2xl bg-white p-3 ring-1 ${p.salePrice ? "ring-rose-200" : "ring-black/5"}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">{p.name}</p>
              <p className="text-sm text-neutral-500">
                Normal: ${p.price.toFixed(2)}
                {p.rate != null && p.rate > 0 && (
                  <span className="text-xs">
                    {" "}
                    · {formatBs(usdToBs(p.price, p.rate))}
                  </span>
                )}
              </p>
              {p.salePrice != null && (
                <p className="text-sm font-bold text-rose-600">
                  En oferta: ${p.salePrice.toFixed(2)}
                  {p.rate != null && p.rate > 0 && (
                    <span className="text-xs font-normal">
                      {" "}
                      · {formatBs(usdToBs(p.salePrice, p.rate))}
                    </span>
                  )}
                </p>
              )}
            </div>

            {p.salePrice == null ? (
              <form
                action={(fd) => {
                  const val = String(fd.get("salePrice") ?? "");
                  const num = Number(val);
                  if (val !== "" && num > 0) apply(p, num);
                  else setError("Escribe el precio de oferta");
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  name="salePrice"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="$"
                  className="w-20 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
                  required
                />
                <button
                  type="submit"
                  disabled={savingId === p.id || busy}
                  className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                >
                  {savingId === p.id ? "…" : "Ofertar"}
                </button>
              </form>
            ) : (
              <button
                onClick={() => apply(p, null)}
                disabled={savingId === p.id || busy}
                className="rounded-lg bg-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 disabled:opacity-40"
              >
                {savingId === p.id ? "…" : "Quitar oferta"}
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
