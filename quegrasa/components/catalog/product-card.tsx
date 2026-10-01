"use client";

// Tarjeta de prenda del catálogo — patrón Mercado Libre adaptado:
// imagen cuadrada, título, precio $ grande (Bs pequeño), tallas
// clicables que agregan directo al carrito sin salir del catálogo.
import Link from "next/link";
import { useState } from "react";
import { addToBag } from "@/components/catalog/bag";
import { usdToBs, formatRateDate } from "@/lib/money";
import { Check, ShoppingBag } from "lucide-react";

export type CatalogVariant = { sizeName: string; stock: number };
export type CatalogProduct = {
  id: string;
  name: string;
  price: number;
  salePrice: number | null;
  imageUrl: string | null;
  variants: CatalogVariant[];
};

export default function ProductCard({
  product,
  rate,
  rateDate,
}: {
  product: CatalogProduct;
  rate: number | null;
  rateDate?: Date | null;
}) {
  const price = product.salePrice ?? product.price;
  const sizes = product.variants; // solo llegan las tallas con stock
  const rateNum = rate ?? 0;
  const [added, setAdded] = useState<string | null>(null);

  // Tocar una talla = añadir al carrito y seguir navegando
  const tapTalla = (sizeName: string) => {
    addToBag({ productId: product.id, name: product.name, sizeName, price });
    setAdded(sizeName);
    setTimeout(() => setAdded(null), 1500);
  };

  return (
    <div className="overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-zinc-800">
      {/* Zona informativa → toca para ver el detalle */}
      <Link href={`/producto/${product.id}`} className="block">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="aspect-square w-full object-cover"
          />
        ) : (
          <div className="aspect-square w-full bg-zinc-800" />
        )}

        <div className="p-2.5 pb-2">
          <p className="truncate text-sm font-semibold text-zinc-100">
            {product.name}
          </p>

          {/* Precio: $ grande, Bs pequeño */}
          <p className="mt-0.5 text-base font-bold tabular-nums text-gold">
            ${price.toFixed(2)}
            {product.salePrice != null && (
              <span className="ml-1.5 text-[10px] font-normal text-zinc-500 line-through">
                ${product.price.toFixed(2)}
              </span>
            )}
          </p>
          {rateNum > 0 && (
            <p className="text-[10px] tabular-nums text-zinc-500">
              Bs {(usdToBs(price, rateNum)).toLocaleString("es-VE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              {rateDate && (
                <span className="text-zinc-600"> · BCV {formatRateDate(rateDate)}</span>
              )}
            </p>
          )}
          {product.salePrice != null && (
            <p className="mt-1">
              <span className="rounded bg-gold/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-gold">
                Oferta
              </span>
            </p>
          )}
        </div>
      </Link>

      {/* Tallas clicables: añadir al carrito sin salir del catálogo */}
      <div className="border-t border-zinc-800 px-2.5 pb-2.5 pt-2">
        <p className="flex items-center gap-1 text-[9px] font-medium uppercase tracking-wide text-zinc-500">
          <ShoppingBag size={9} strokeWidth={2.5} />
          Toca tu talla
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {sizes.map((v) => {
            const esAgregada = added === v.sizeName;
            return (
              <button
                key={v.sizeName}
                type="button"
                onClick={() => tapTalla(v.sizeName)}
                aria-label={`Añadir ${product.name} talla ${v.sizeName} al carrito`}
                className={`flex min-w-9 items-center justify-center gap-0.5 rounded-md px-2 py-1.5 text-[11px] font-bold transition active:scale-90 ${
                  esAgregada
                    ? "bg-gold text-zinc-950"
                    : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                }`}
              >
                {esAgregada && <Check size={9} strokeWidth={3.5} />}
                {v.sizeName}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
