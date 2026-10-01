"use client";

// Acciones del detalle: elegir talla y agregar a la bolsa de pedido.
import { useState } from "react";
import { addToBag } from "@/components/catalog/bag";
import { ShoppingBag, Check } from "lucide-react";

export type DetailVariant = { sizeName: string; stock: number };

export default function ProductActions({
  productId,
  name,
  price,
  variants,
}: {
  productId: string;
  name: string;
  price: number;
  variants: DetailVariant[]; // las agotadas llegan con stock 0 para mostrarlas tachadas
}) {
  const [size, setSize] = useState<string | null>(
    variants.find((v) => v.stock > 0)?.sizeName ?? null,
  );
  const [added, setAdded] = useState(false);

  const onAdd = () => {
    if (!size) return;
    addToBag({ productId, name, sizeName: size, price });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div className="mt-5">
      {/* Selector de tallas */}
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Talla
        </p>
        <div className="flex flex-wrap gap-2">
          {variants.map((v) => {
            const agotada = v.stock === 0;
            const sel = size === v.sizeName;
            return (
              <button
                key={v.sizeName}
                type="button"
                disabled={agotada}
                onClick={() => setSize(v.sizeName)}
                className={`min-w-12 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  agotada
                    ? "cursor-not-allowed bg-zinc-900 text-zinc-600 line-through"
                    : sel
                      ? "bg-gold text-zinc-950"
                      : "bg-zinc-900 text-zinc-200 ring-1 ring-zinc-700 hover:ring-zinc-500"
                }`}
              >
                {v.sizeName}
              </button>
            );
          })}
        </div>
      </div>

      {/* Agregar al pedido */}
      <button
        type="button"
        onClick={onAdd}
        disabled={!size}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3.5 text-sm font-bold text-zinc-950 transition hover:bg-gold-dark active:scale-[0.98] disabled:opacity-40"
      >
        {added ? (
          <>
            <Check size={16} strokeWidth={2.5} />
            ¡Agregado!
          </>
        ) : (
          <>
            <ShoppingBag size={16} strokeWidth={2.5} />
            Agregar a mi pedido
          </>
        )}
      </button>
      <p className="mt-2 text-center text-[10px] text-zinc-500">
        Sin cuenta ni registro: tu pedido va directo por WhatsApp
      </p>
    </div>
  );
}
