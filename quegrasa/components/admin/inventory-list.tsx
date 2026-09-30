"use client";

// Lista de inventario (spec §5.2): agrupada por categoría, stock por talla
// con botones +/−, búsqueda y edición de precios/oferta inline.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adjustStock, updateProductPrices } from "@/lib/actions/products";
import { formatBs, usdToBs } from "@/lib/money";

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

  // ---------- Ajuste de stock ----------

  const onAdjust = (product: InventoryProduct, variant: InventoryVariant, delta: number) => {
    setError(null);
    startTransition(async () => {
      const res = await adjustStock(variant.id, delta);
      if (!res.ok) {
        setError(res.error ?? "No se pudo ajustar");
        return;
      }
      // Actualización local del stock (fluida; la BD ya quedó actualizada)
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
        setFlash(`${product.name} talla ${variant.sizeName} quedó agotada`);
        setTimeout(() => setFlash(null), 2500);
      }
    });
  };

  // ---------- Edición de precios ----------

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
      setFlash("Precios actualizados");
      setTimeout(() => setFlash(null), 2000);
      router.refresh();
    });
  };

  const rateNum = rate ?? 0;

  return (
    <div>
      {/* Búsqueda */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar prenda o categoría…"
        className="mb-5 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base outline-none focus:border-emerald-500"
      />

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {flash && (
        <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {flash}
        </p>
      )}

      {byCategory.length === 0 && (
        <p className="rounded-xl bg-neutral-100 px-4 py-6 text-center text-sm text-neutral-500">
          No hay prendas que coincidan con la búsqueda.
        </p>
      )}

      {byCategory.map(([category, items]) => (
        <section key={category} className="mb-7">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-400">
            {category}
          </h2>
          <div className="space-y-3">
            {items.map((p) => {
              const total = p.variants.reduce((s, v) => s + v.stock, 0);
              const price = p.salePrice ?? p.price;
              return (
                <article
                  key={p.id}
                  className={`rounded-2xl bg-white p-3 ring-1 ring-black/5 ${!p.isActive ? "opacity-50" : ""}`}
                >
                  <div className="flex gap-3">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageUrl}
                        alt=""
                        className="h-20 w-20 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-2xl">
                        👕
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{p.name}</p>
                      <p className="text-sm">
                        <span className={p.salePrice ? "text-neutral-400 line-through" : ""}>
                          ${p.price.toFixed(2)}
                        </span>
                        {p.salePrice && (
                          <span className="ml-1.5 font-bold text-rose-600">
                            ${p.salePrice.toFixed(2)}
                          </span>
                        )}
                        {rateNum > 0 && (
                          <span className="ml-1 text-xs text-neutral-400">
                            ≈ {formatBs(usdToBs(price, rateNum))}
                          </span>
                        )}
                      </p>
                      {!p.isActive && (
                        <span className="mt-1 inline-block rounded bg-neutral-200 px-1.5 text-[10px] font-semibold uppercase text-neutral-600">
                          Oculta del catálogo
                        </span>
                      )}
                      {total === 0 && (
                        <span className="mt-1 ml-1 inline-block rounded bg-red-100 px-1.5 text-[10px] font-semibold uppercase text-red-700">
                          Agotada
                        </span>
                      )}

                      {/* Tallas con stock */}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {p.variants.map((v) => (
                          <div
                            key={v.id}
                            className={`flex items-center gap-1 rounded-lg px-1.5 py-1 text-sm ring-1 ${
                              v.stock === 0
                                ? "bg-neutral-50 text-neutral-400 ring-neutral-200"
                                : "bg-emerald-50 ring-emerald-200"
                            }`}
                          >
                            <span className="font-semibold">{v.sizeName}</span>
                            <span
                              className="flex h-5 w-5 items-center justify-center rounded text-xs font-bold text-neutral-500 hover:bg-black/5"
                              role="button"
                              aria-label={`Quitar stock de ${p.name} talla ${v.sizeName}`}
                              onClick={() => onAdjust(p, v, -1)}
                            >
                              −
                            </span>
                            <span className="w-5 text-center font-bold">{v.stock}</span>
                            <span
                              className="flex h-5 w-5 items-center justify-center rounded text-xs font-bold text-neutral-500 hover:bg-black/5"
                              role="button"
                              aria-label={`Agregar stock de ${p.name} talla ${v.sizeName}`}
                              onClick={() => onAdjust(p, v, +1)}
                            >
                              +
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Editar precios */}
                  <details className="group mt-2">
                    <summary className="cursor-pointer list-none text-xs font-semibold text-neutral-400 group-open:hidden">
                      ⚙️ Editar precios
                    </summary>
                    <form
                      action={(fd) => onPriceSubmit(p.id, fd)}
                      className="mt-2 flex flex-wrap items-end gap-2 rounded-xl bg-neutral-50 p-2.5"
                    >
                      <input type="hidden" name="productId" value={p.id} />
                      <label className="text-xs text-neutral-500">
                        Precio $
                        <input
                          name="price"
                          type="number"
                          step="0.01"
                          min="0.01"
                          defaultValue={p.price}
                          className="ml-1 w-20 rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm"
                        />
                      </label>
                      <label className="text-xs text-neutral-500">
                        Oferta $
                        <input
                          name="salePrice"
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="—"
                          defaultValue={p.salePrice ?? ""}
                          className="ml-1 w-20 rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm"
                        />
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-neutral-500">
                        <input
                          type="checkbox"
                          name="isActive"
                          value="true"
                          defaultChecked={p.isActive}
                          className="h-4 w-4 accent-emerald-600"
                        />
                        Visible en catálogo
                      </label>
                      <button
                        type="submit"
                        disabled={savingId === p.id || busy}
                        className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
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
