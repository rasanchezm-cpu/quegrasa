// Tarjeta de prenda — estilo Grasa MID: bordes rectos, imagen retrato 3/4,
// hover con zoom, badge de %, precio $ grande + Bs pequeño, tallas de un toque.
"use client";
import Link from "next/link";
import { useState } from "react";
import { addToBag } from "@/components/catalog/bag";
import { usdToBs } from "@/lib/money";
import { Check, Shirt, ShoppingBag } from "lucide-react";

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
  index = 0,
}: {
  product: CatalogProduct;
  rate?: number | null;
  rateDate?: Date | null;
  index?: number;
}) {
  const price = product.salePrice ?? product.price;
  const rateNum = rate ?? 0;
  const sizes = product.variants; // solo tallas con stock
  const [added, setAdded] = useState<string | null>(null);
  const discount =
    product.salePrice != null
      ? Math.round((1 - product.salePrice / product.price) * 100)
      : 0;

  const tapTalla = (sizeName: string) => {
    addToBag({ productId: product.id, name: product.name, sizeName, price });
    setAdded(sizeName);
    setTimeout(() => setAdded(null), 1500);
  };

  return (
    <article
      className="anim-card-in group flex flex-col border border-border bg-card transition-colors hover:border-gold/60"
      style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
    >
      <Link href={`/producto/${product.id}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden bg-secondary">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.name}
              loading={index < 4 ? "eager" : "lazy"}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ShoppingBag className="h-12 w-12" aria-hidden="true" />
            </div>
          )}

          {discount > 0 && (
            <span className="absolute left-3 top-3 bg-gold px-2 py-1 text-xs font-bold text-black">
              -{discount}%
            </span>
          )}
        </div>

        <div className="space-y-1 px-4 pb-3 pt-4">
          <h3 className="line-clamp-1 font-semibold text-primary transition-colors group-hover:text-gold">
            {product.name}
          </h3>
          <div className="flex items-baseline gap-2">
            <p className="text-lg font-semibold tabular-nums text-gold">
              ${price.toFixed(2)}
            </p>
            {product.salePrice != null && (
              <p className="text-sm tabular-nums text-muted-foreground line-through">
                ${product.price.toFixed(2)}
              </p>
            )}
          </div>
          {rateNum > 0 && (
            <p className="text-[11px] tabular-nums text-muted-foreground">
              Bs{" "}
              {(usdToBs(price, rateNum)).toLocaleString("es-VE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          )}
        </div>
      </Link>

      {/* Tallas de un toque */}
      {sizes.length > 0 && (
        <div className="mt-auto border-t border-border px-4 py-3">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
            <Shirt className="h-3.5 w-3.5" aria-hidden="true" />
            Toca tu talla
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sizes.map((v) => {
              const esAgregada = added === v.sizeName;
              return (
                <button
                  key={v.sizeName}
                  type="button"
                  onClick={() => tapTalla(v.sizeName)}
                  aria-label={`Añadir ${product.name} talla ${v.sizeName} al carrito`}
                  className={`flex min-w-10 items-center justify-center gap-0.5 border px-2.5 py-2 text-sm font-semibold transition-colors active:scale-90 ${
                    esAgregada
                      ? "border-gold bg-gold text-black"
                      : "border-border bg-secondary text-primary hover:border-primary hover:bg-primary hover:text-black"
                  }`}
                >
                  {esAgregada && <Check size={11} strokeWidth={3} aria-hidden="true" />}
                  {v.sizeName}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </article>
  );
}
