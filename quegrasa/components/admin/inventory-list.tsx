"use client";

// Lista de inventario (spec §5.2): agrupada por categoría, stock por talla
// con botones +/−, búsqueda y edición de precios/oferta inline.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adjustStock, updateProductPrices } from "@/lib/actions/products";
import { formatBs, usdToBs } from "@/lib/money";
import { Minus, Plus, SearchX } from "lucide-react";

export type InventoryVariant = {
  id: string;
  sizeName: string;
  stock: number;
};
export type InventoryProduct = {
  id: string;
  name: string;
  price: number;
  salePrice: number | null;
  isActive: boolean;
  imageUrl: string | null;
  categoryName: string;
  variants: InventoryVariant[];
};

export default function InventoryList({
  products,
  rate,
}: {
  products: InventoryProduct[];
  rate: number | null;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [list, setList] = useState(products);
  const [busy, startTransition] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q),
    );
  }, [list, query]);

  const byCategory = useMemo(() => {
    const groups = new Map<string, InventoryProduct[]>();
    for (const p of filtered) {
      const arr = groups.get(p.categoryName) ?? [];
      arr.push(p);
      groups.set(p.categoryName, arr);
    }
    return [...groups.entries()];
  }, [filtered]);

  const onAdjust = (product: InventoryProduct, variant: InventoryVariant, delta: number) => {
    setError(null);
    startTransition(async () => {
      const res = await adjustStock(variant.id, delta);
      if (!res.ok) {
        setError(res.error ?? "No se pudo ajustar");
        return;
      }
      setList((prev) =>
        prev.map((p) =>
          p.id !== product.id
            ? p
            : {
                ...p,
                variants: p.variants.map((v) =>
                  v.id === variant.id ? { ...v, stock: res.stock ?? v.stock } : v,
                ),
              },
        ),
      );
      if ((res.stock ?? 0) === 0) {
        setFlash(`${product.name} · ${variant.sizeName} agotada`);
        setTimeout(() => setFlash(null), 2500);
      }
    });
  };

  const onPriceSubmit = (productId: string, formData: FormData) => {
    setError(null);
    setSavingId(productId);
    startTransition(async () => {
      const res = await updateProductPrices({}, formData);
      setSavingId(null);
      if (res.error) {
        setError(res.error);
        return;
      }
      const price = Number(formData.get("price"));
      const rawSale = String(formData.get("salePrice") ?? "").trim();
      const salePrice = rawSale === "" ? null : Number(rawSale);
      const isActive = formData.get("isActive") === "true";
      setList((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, price, salePrice, isActive } : p,
        ),
      );
      setFlash("Cambios guardados");
      setTimeout(() => setFlash(null), 2000);
      router.refresh();
    });
  };

  const rateNum = rate ?? 0;

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar prenda o categoría…"
        className="mb-5 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
      />

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
          {error}
        </p>
      )}
      {flash && (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-700">
          {flash}
        </p>
      )}

      {byCategory.length === 0 && (
        <p className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-10 text-center text-xs text-zinc-400">
          <SearchX size={20} strokeWidth={1.5} />
          No hay prendas que coincidan con la búsqueda.
        </p>
      )}

      {byCategory.map(([category, items]) => (
        <section key={category} className="mb-6">
          <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            {category}
          </h2>
          <div className="space-y-2">
            {items.map((p) => {
              const total = p.variants.reduce((s, v) => s + v.stock, 0);
              const price = p.salePrice ?? p.price;
              return (
                <article
                  key={p.id}
                  className={`rounded-xl border border-zinc-200 bg-white p-3 ${!p.isActive ? "opacity-50" : ""}`}
                >
                  <div className="flex gap-3">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageUrl}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-16 w-16 shrink-0 rounded-lg bg-zinc-100" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {p.name}
                        </p>
                        <div className="flex shrink-0 flex-col items-end">
                          {p.salePrice && (
                            <span className="text-[11px] tabular-nums text-zinc-400 line-through">
                              ${p.price.toFixed(2)}
                            </span>
                          )}
                          <span
                            className={`text-sm font-semibold tabular-nums ${
                              p.salePrice ? "text-red-600" : "text-zinc-900"
                            }`}
                          >
                            ${price.toFixed(2)}
                          </span>
                          {rateNum > 0 && (
                            <span className="text-[10px] tabular-nums text-zinc-400">
                              Bs {usdToBs(price, rateNum).toLocaleString("es-VE", { minimumFractionDigits: 0 })}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {!p.isActive && (
                          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-400">
                            Oculta
                          </span>
                        )}
                        {total === 0 && (
                          <span className="rounded bg-red-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-red-600">
                            Agotada
                          </span>
                        )}
                        {rateNum > 0 && p.salePrice == null && (
                          <span className="text-[10px] tabular-nums text-zinc-400">
                            {formatBs(usdToBs(price, rateNum))}
                          </span>
                        )}
                      </div>

                      {/* Tallas con stock */}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {p.variants.map((v) => (
                          <div
                            key={v.id}
                            className={`flex items-center overflow-hidden rounded-md border text-xs tabular-nums ${
                              v.stock === 0
                                ? "border-zinc-100 text-zinc-300"
                                : "border-zinc-200 text-zinc-700"
                            }`}
                          >
                            <span className="px-2 py-1 font-semibold">
                              {v.sizeName}
                            </span>
                            <span
                              role="button"
                              aria-label={`Quitar stock de ${p.name} talla ${v.sizeName}`}
                              onClick={() => onAdjust(p, v, -1)}
                              className="flex h-full w-6 items-center justify-center border-l border-zinc-100 text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-700"
                            >
                              <Minus size={11} strokeWidth={2.5} />
                            </span>
                            <span className="flex h-full w-7 items-center justify-center border-l border-zinc-100 text-xs font-bold">
                              {v.stock}
                            </span>
                            <span
                              role="button"
                              aria-label={`Agregar stock de ${p.name} talla ${v.sizeName}`}
                              onClick={() => onAdjust(p, v, +1)}
                              className="flex h-full w-6 items-center justify-center border-l border-zinc-100 text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-700"
                            >
                              <Plus size={11} strokeWidth={2.5} />
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Editar precios */}
                  <details className="group mt-2.5">
                    <summary className="cursor-pointer list-none text-[11px] font-medium text-zinc-400 transition hover:text-zinc-700">
                      Editar precios y visibilidad
                    </summary>
                    <form
                      action={(fd) => onPriceSubmit(p.id, fd)}
                      className="mt-2 flex flex-wrap items-end gap-2 rounded-lg bg-zinc-50 p-2.5"
                    >
                      <input type="hidden" name="productId" value={p.id} />
                      <label className="text-[10px] uppercase tracking-wide text-zinc-400">
                        Precio ($)
                        <input
                          name="price"
                          type="number"
                          step="0.01"
                          min="0.01"
                          defaultValue={p.price}
                          className="mt-1 w-20 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs tabular-nums text-zinc-900"
                        />
                      </label>
                      <label className="text-[10px] uppercase tracking-wide text-zinc-400">
                        Oferta ($)
                        <input
                          name="salePrice"
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="—"
                          defaultValue={p.salePrice ?? ""}
                          className="mt-1 w-20 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs tabular-nums text-zinc-900"
                        />
                      </label>
                      <label className="flex items-center gap-1.5 pb-2 text-xs text-zinc-600">
                        <input
                          type="checkbox"
                          name="isActive"
                          value="true"
                          defaultChecked={p.isActive}
                          className="h-3.5 w-3.5 accent-zinc-900"
                        />
                        Visible en catálogo
                      </label>
                      <button
                        type="submit"
                        disabled={savingId === p.id || busy}
                        className="mb-0.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:opacity-40"
                      >
                        {savingId === p.id ? "Guardando…" : "Guardar"}
                      </button>
                    </form>
                  </details>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
