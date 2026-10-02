"use client";

// Acciones del detalle: elegir talla y añadir al carrito (estética editorial).
import { useState } from "react";
import { addToBag } from "@/components/catalog/bag";
import { Check, ShoppingBag } from "lucide-react";

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
  variants: DetailVariant[]; // agotadas con stock 0 para mostrarlas tachadas
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
    <div className="mt-6">
      {/* Selector de tallas */}
      <div>
        <p className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">
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
                className={`min-w-12 border px-3 py-2.5 text-sm font-semibold transition-colors ${
                  agotada
                    ? "cursor-not-allowed border-border/50 text-muted-foreground/40 line-through"
                    : sel
                      ? "border-gold bg-gold text-black"
                      : "border-border bg-card text-primary hover:border-primary"
                }`}
              >
                {v.sizeName}
              </button>
            );
          })}
        </div>
      </div>

      {/* Añadir al carrito */}
      <button
        type="button"
        onClick={onAdd}
        disabled={!size}
        className={`font-heading mt-6 flex w-full items-center justify-center gap-2 bg-gold py-4 text-lg tracking-widest text-black transition-colors hover:bg-gold-dark active:scale-[0.98] disabled:opacity-40 ${added ? "anim-pop" : ""}`}
      >
        {added ? (
          <>
            <Check size={17} strokeWidth={3} />
            ¡AGREGADO!
          </>
        ) : (
          <>
            <ShoppingBag size={17} strokeWidth={2.5} />
            AÑADIR AL CARRITO
          </>
        )}
      </button>
      <p className="mt-2 text-center text-[10px] text-muted-foreground">
        Sin cuenta ni registro: tu pedido va directo por WhatsApp
      </p>
    </div>
  );
}
