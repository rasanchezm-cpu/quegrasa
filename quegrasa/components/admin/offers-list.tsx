"use client";

// "Ofertas": lista rápida para poner/quitar el precio de oferta (spec §5.2).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProductPrices } from "@/lib/actions/products";
import { formatBs, usdToBs } from "@/lib/money";
import { Tag, X } from "lucide-react";

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

  const apply = (p: OfferProduct, salePrice: number | null) => {
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
    <div className="space-y-2">
      {error && (
        <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
          {error}
        </p>
      )}

      {list.length === 0 && (
        <p className="rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-10 text-center text-xs text-zinc-400">
          Aún no hay prendas cargadas.
        </p>
      )}

      {list.map((p) => (
        <article
          key={p.id}
          className={`rounded-xl border bg-white p-3 ${
            p.salePrice ? "border-amber-300 bg-amber-50/30" : "border-zinc-200"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-900">{p.name}</p>
              <p className="text-xs tabular-nums text-zinc-500">
                ${p.price.toFixed(2)}
                {p.rate != null && p.rate > 0 && (
                  <span className="ml-1.5 text-zinc-400">
                    · {formatBs(usdToBs(p.price, p.rate))}
                  </span>
                )}
              </p>
              {p.salePrice != null && (
                <p className="mt-0.5 text-xs font-semibold tabular-nums text-amber-700">
                  En oferta: ${p.salePrice.toFixed(2)}
                  {p.rate != null && p.rate > 0 && (
                    <span className="ml-1.5 font-normal text-amber-600/70">
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
                className="flex shrink-0 items-center gap-1.5"
              >
                <input
                  name="salePrice"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="$"
                  className="w-20 rounded-md border border-zinc-300 px-2 py-1.5 text-xs tabular-nums outline-none focus:border-zinc-900"
                  required
                />
                <button
                  type="submit"
                  disabled={savingId === p.id || busy}
                  className="flex items-center gap-1 rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:opacity-40"
                >
                  <Tag size={12} strokeWidth={2.5} />
                  Ofertar
                </button>
              </form>
            ) : (
              <button
                onClick={() => apply(p, null)}
                disabled={savingId === p.id || busy}
                className="flex shrink-0 items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-40"
              >
                <X size={12} strokeWidth={2.5} />
                Quitar
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
