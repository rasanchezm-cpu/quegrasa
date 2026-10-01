// Tarjeta de prenda del catálogo público — patrón Mercado Libre adaptado:
// imagen cuadrada, título, precio $ grande (Bs pequeño), tallas disponibles
// visibles en pequeño debajo de la imagen (decisión del dueño).
import Link from "next/link";
import { formatBs, usdToBs, formatRateDate } from "@/lib/money";

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
  const sizes = product.variants; // solo llegan las tallas con stock (regla del catálogo)
  const rateNum = rate ?? 0;

  return (
    <Link
      href={`/producto/${product.id}`}
      className="block overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-zinc-800 transition active:scale-[0.97]"
    >
      {/* Imagen cuadrada */}
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

      <div className="p-2.5">
        {/* Tallas disponibles — pequeñas, debajo de la imagen */}
        <div className="mb-1.5 flex flex-wrap gap-1">
          {sizes.map((v) => (
            <span
              key={v.sizeName}
              className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-zinc-300"
            >
              {v.sizeName}
            </span>
          ))}
        </div>

        <p className="truncate text-xs text-zinc-400">{product.name}</p>

        {/* Precio: $ grande, Bs pequeño (patrón ML: el precio manda) */}
        <p className="mt-1 text-base font-bold tabular-nums text-gold">
          ${price.toFixed(2)}
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
          <p className="mt-0.5">
            <span className="rounded bg-gold/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-gold">
              Oferta
            </span>
          </p>
        )}
      </div>
    </Link>
  );
}
