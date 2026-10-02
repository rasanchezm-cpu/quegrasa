"use client";

// Inventario (spec §5.2 + decisión del dueño 01-oct-2026):
// - Cuadrícula de prendas por secciones (categoría) para navegar de un vistazo.
// - Tocar un cuadro abre el detalle (tallas +/−, precios, visibilidad).
// - La X en la esquina elimina la prenda por completo, con confirmación.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adjustStock,
  updateProductPrices,
  deleteProduct,
  addVariantToProduct,
} from "@/lib/actions/products";
import { formatBs, usdToBs } from "@/lib/money";
import { X, SearchX, Trash2, Plus } from "lucide-react";

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
  categoryNames: string[];
  variants: InventoryVariant[];
};

export default function InventoryList({
  products,
  rate,
  allSizes = [],
}: {
  products: InventoryProduct[];
  rate: number | null;
  allSizes?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [list, setList] = useState(products);
  const [busy, startTransition] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  // hoja de detalle y confirmación de borrado
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // agregar talla/cantidad a una prenda existente
  const [showAddSize, setShowAddSize] = useState(false);
  const [addSizeName, setAddSizeName] = useState("");
  const [addSizeQty, setAddSizeQty] = useState(1);
  const [addingSize, setAddingSize] = useState(false);

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

  const open = openId ? list.find((p) => p.id === openId) : null;
  const confirmTarget = confirmId ? list.find((p) => p.id === confirmId) : null;

  const total = (p: InventoryProduct) =>
    p.variants.reduce((s, v) => s + v.stock, 0);

  // ---------- Acciones ----------

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
      router.refresh();
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

  const onDelete = (p: InventoryProduct) => {
    setConfirmId(null);
    setError(null);
    startTransition(async () => {
      const res = await deleteProduct(p.id);
      if (!res.ok) {
        setError(res.error ?? "No se pudo eliminar");
        return;
      }
      setList((prev) => prev.filter((x) => x.id !== p.id));
      setOpenId(null);
      setFlash(`"${p.name}" eliminada`);
      setTimeout(() => setFlash(null), 2500);
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

      {/* Secciones con cuadrícula */}
      {byCategory.map(([category, items]) => (
        <section key={category} className="mb-6">
          <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            {category}
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {items.map((p) => {
              const t = total(p);
              const price = p.salePrice ?? p.price;
              return (
                <div key={p.id} className="relative">
                  {/* La X de eliminar */}
                  <button
                    type="button"
                    aria-label={`Eliminar ${p.name}`}
                    onClick={() => setConfirmId(p.id)}
                    className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-zinc-500 shadow-sm backdrop-blur transition hover:bg-white hover:text-red-600 active:scale-90"
                  >
                    <X size={14} strokeWidth={2.5} />
                  </button>

                  {/* El cuadro de la prenda: toca para abrir el detalle */}
                  <button
                    type="button"
                    onClick={() => setOpenId(p.id)}
                    className={`block w-full overflow-hidden rounded-xl border bg-white text-left transition active:scale-[0.97] ${
                      t === 0 || !p.isActive
                        ? "border-zinc-200 opacity-60"
                        : "border-zinc-200"
                    }`}
                  >
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="aspect-square w-full object-cover"
                      />
                    ) : (
                      <div className="aspect-square w-full bg-zinc-100" />
                    )}
                    <div className="p-2">
                      <p className="truncate text-xs font-medium text-zinc-900">
                        {p.name}
                      </p>
                      {p.categoryNames.length > 1 && (
                        <p className="truncate text-[9px] text-zinc-400">
                          {p.categoryNames.join(" · ")}
                        </p>
                      )}
                      <div className="mt-0.5 flex items-center justify-between">
                        <span
                          className={`text-xs font-semibold tabular-nums ${
                            p.salePrice ? "text-red-600" : "text-zinc-900"
                          }`}
                        >
                          ${price.toFixed(2)}
                        </span>
                        {t === 0 ? (
                          <span className="text-[9px] font-bold uppercase text-red-500">
                            Agotada
                          </span>
                        ) : !p.isActive ? (
                          <span className="text-[9px] font-bold uppercase text-zinc-400">
                            Oculta
                          </span>
                        ) : (
                          <span className="text-[10px] tabular-nums text-zinc-400">
                            {t} pz
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* ---------- Hoja de detalle ---------- */}
      {open && (
        <div
          className="fixed inset-0 z-30 flex items-end bg-zinc-900/40 p-0"
          onClick={(e) => e.target === e.currentTarget && setOpenId(null)}
        >
          <div className="max-h-[85dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-4">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-200" />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-zinc-900">
                  {open.name}
                </h3>
                <p className="text-sm tabular-nums text-zinc-500">
                  ${(open.salePrice ?? open.price).toFixed(2)}
                  {rateNum > 0 && (
                    <span className="ml-1.5 text-xs text-zinc-400">
                      · {formatBs(usdToBs(open.salePrice ?? open.price, rateNum))}
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpenId(null);
                  setShowAddSize(false);
                }}
                className="rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-100"
                aria-label="Cerrar"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            {/* Tallas con stock */}
            <div className="mt-4">
              <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Tallas — toca − al vender, + al reabastecer
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {open.variants.map((v) => (
                  <div
                    key={v.id}
                    className={`flex items-center overflow-hidden rounded-md border text-xs tabular-nums ${
                      v.stock === 0
                        ? "border-zinc-100 text-zinc-300"
                        : "border-zinc-200 text-zinc-700"
                    }`}
                  >
                    <span className="px-2 py-1.5 font-semibold">{v.sizeName}</span>
                    <span
                      role="button"
                      aria-label={`Quitar stock de ${open.name} talla ${v.sizeName}`}
                      onClick={() => onAdjust(open, v, -1)}
                      className="flex w-7 items-center justify-center border-l border-zinc-100 py-1.5 text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-700"
                    >
                      −
                    </span>
                    <span className="flex w-8 items-center justify-center border-l border-zinc-100 py-1.5 text-xs font-bold">
                      {v.stock}
                    </span>
                    <span
                      role="button"
                      aria-label={`Agregar stock de ${open.name} talla ${v.sizeName}`}
                      onClick={() => onAdjust(open, v, +1)}
                      className="flex w-7 items-center justify-center border-l border-zinc-100 py-1.5 text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-700"
                    >
                      +
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Agregar talla nueva o más cantidad */}
            <div className="mt-3">
              {!showAddSize ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSize(true);
                    setAddSizeName("");
                    setAddSizeQty(1);
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-500 transition hover:border-gold hover:text-gold-dark"
                >
                  <Plus size={13} strokeWidth={2.5} />
                  Agregar talla o cantidad
                </button>
              ) : (
                <div className="rounded-lg bg-zinc-50 p-3">
                  <p className="mb-2 text-[10px] uppercase tracking-wide text-zinc-400">
                    Toca una talla del listado o escribe una nueva — si la talla ya
                    existe, suma cantidad
                  </p>
                  <div className="mb-2.5 flex flex-wrap gap-1.5">
                    {allSizes.map((s) => {
                      const yaEsta = open.variants.some(
                        (v) => v.sizeName.toLowerCase() === s.name.toLowerCase(),
                      );
                      const sel = addSizeName === s.name;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setAddSizeName(s.name)}
                          className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold transition ${
                            sel
                              ? "border-zinc-900 bg-zinc-900 text-white"
                              : yaEsta
                                ? "border-zinc-200 bg-white text-zinc-400"
                                : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500"
                          }`}
                          title={yaEsta ? `Ya existe — sumará cantidad` : "Talla nueva"}
                        >
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-end gap-2">
                    <input
                      value={addSizeName}
                      onChange={(e) => setAddSizeName(e.target.value)}
                      placeholder="Otra talla…"
                      className="w-24 rounded-md border border-zinc-300 bg-white px-2.5 py-2 text-xs outline-none focus:border-zinc-900"
                    />
                    <label className="text-[10px] uppercase tracking-wide text-zinc-400">
                      Cant.
                      <input
                        type="number"
                        min={1}
                        max={999}
                        value={addSizeQty}
                        onChange={(e) => setAddSizeQty(Number(e.target.value) || 1)}
                        className="ml-1 w-16 rounded-md border border-zinc-300 bg-white px-2 py-2 text-xs tabular-nums text-zinc-900 outline-none focus:border-zinc-900"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={addingSize || !addSizeName.trim()}
                      onClick={() => {
                        setAddingSize(true);
                        setError(null);
                        startTransition(async () => {
                          const res = await addVariantToProduct(
                            open.id,
                            addSizeName,
                            addSizeQty,
                          );
                          setAddingSize(false);
                          if (!res.ok) {
                            setError(res.error ?? "No se pudo agregar");
                            return;
                          }
                          // actualizar el estado local
                          setList((prev) =>
                            prev.map((p) => {
                              if (p.id !== open.id) return p;
                              const existe = p.variants.find(
                                (v) =>
                                  v.sizeName.toLowerCase() ===
                                  addSizeName.trim().toLowerCase(),
                              );
                              if (existe) {
                                return {
                                  ...p,
                                  variants: p.variants.map((v) =>
                                    v.sizeName.toLowerCase() ===
                                    addSizeName.trim().toLowerCase()
                                      ? { ...v, stock: v.stock + addSizeQty }
                                      : v,
                                  ),
                                };
                              }
                              return {
                                ...p,
                                variants: [
                                  ...p.variants,
                                  {
                                    id: `nueva-${Date.now()}`,
                                    sizeName: addSizeName.trim(),
                                    stock: addSizeQty,
                                  },
                                ],
                              };
                            }),
                          );
                          setShowAddSize(false);
                          setFlash(
                            `Talla ${addSizeName.trim()} actualizada (+${addSizeQty})`,
                          );
                          setTimeout(() => setFlash(null), 2500);
                          router.refresh();
                        });
                      }}
                      className="mb-0.5 rounded-md bg-zinc-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-zinc-800 disabled:opacity-40"
                    >
                      {addingSize ? "Agregando…" : "Agregar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddSize(false)}
                      className="mb-0.5 rounded-md border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Editar precios */}
            <details className="group mt-4">
              <summary className="cursor-pointer list-none text-[11px] font-medium text-zinc-400 transition hover:text-zinc-700">
                Editar precios y visibilidad
              </summary>
              <form
                action={(fd) => onPriceSubmit(open.id, fd)}
                className="mt-2 flex flex-wrap items-end gap-2 rounded-lg bg-zinc-50 p-2.5"
              >
                <input type="hidden" name="productId" value={open.id} />
                {total(open) === 0 && (
                  <input
                    type="hidden"
                    name="isActive"
                    value={open.isActive ? "true" : "false"}
                  />
                )}
                <label className="text-[10px] uppercase tracking-wide text-zinc-400">
                  Precio ($)
                  <input
                    name="price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    defaultValue={open.price}
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
                    defaultValue={open.salePrice ?? ""}
                    className="mt-1 w-20 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs tabular-nums text-zinc-900"
                  />
                </label>
                {total(open) === 0 ? (
                  <p className="max-w-44 pb-1.5 text-[10px] leading-snug text-zinc-400">
                    Sin stock no aparece en el catálogo. Al subir stock regresa
                    sola.
                  </p>
                ) : (
                  <label className="flex items-center gap-1.5 pb-2 text-xs text-zinc-600">
                    <input
                      type="checkbox"
                      name="isActive"
                      value="true"
                      defaultChecked={open.isActive}
                      className="h-3.5 w-3.5 accent-zinc-900"
                    />
                    Visible en catálogo
                  </label>
                )}
                <button
                  type="submit"
                  disabled={savingId === open.id || busy}
                  className="mb-0.5 rounded-md bg-gold px-3 py-1.5 text-xs font-bold text-zinc-950 transition hover:bg-gold-dark disabled:opacity-40"
                >
                  {savingId === open.id ? "Guardando…" : "Guardar"}
                </button>
              </form>
            </details>

            {/* Eliminar */}
            <button
              type="button"
              onClick={() => setConfirmId(open.id)}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 py-2.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
            >
              <Trash2 size={13} strokeWidth={2} />
              Eliminar prenda
            </button>
          </div>
        </div>
      )}

      {/* ---------- Confirmación de borrado ---------- */}
      {confirmTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-900/50 px-6">
          <div className="w-full max-w-xs rounded-xl bg-white p-5 text-center shadow-xl">
            <Trash2 size={24} strokeWidth={1.5} className="mx-auto text-red-500" />
            <p className="mt-3 text-sm font-semibold text-zinc-900">
              ¿Eliminar "{confirmTarget.name}"?
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
              Se borra para siempre: su stock, fotos y todo su historial. No se
              puede deshacer.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmId(null)}
                className="flex-1 rounded-lg border border-zinc-200 py-2.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onDelete(confirmTarget)}
                className="flex-1 rounded-lg bg-red-600 py-2.5 text-xs font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
              >
                {busy ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
