// Detalle de prenda del catálogo: carrusel de fotos, precio dual,
// tallas (agotadas tachadas), descripción y agregar al pedido.
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { getLatestRate } from "@/lib/exchange";
import { usdToBs, formatRateDate } from "@/lib/money";
import ProductActions from "@/components/catalog/product-actions";
import { BagButton } from "@/components/catalog/bag";

export const dynamic = "force-dynamic";

const bigImage = (url: string) =>
  url.replace("/upload/", "/upload/c_fill,w_900,h_900,f_auto,q_auto/");

export default async function ProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product, rateInfo, store] = await Promise.all([
    prisma.product.findFirst({
      where: {
        id,
        isActive: true,
        variants: { some: { stock: { gt: 0 } } }, // sin stock no existe en el catálogo
      },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        variants: {
          include: { size: { select: { name: true } } },
          orderBy: { size: { sortOrder: "asc" } },
        },
        category: { select: { name: true } },
      },
    }),
    getLatestRate(),
    prisma.store.findFirst({ select: { whatsappNumber: true } }),
  ]);

  if (!product) notFound();

  const price =
    product.salePrice != null ? Number(product.salePrice) : Number(product.price);
  const rate = rateInfo?.rate ?? null;

  return (
    <main className="min-h-dvh bg-zinc-950 pb-10 text-zinc-100">
      {/* Header mínimo */}
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-3xl items-center gap-3 px-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition hover:text-zinc-100"
          >
            <ArrowLeft size={15} strokeWidth={2} />
            Catálogo
          </Link>
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">
            {product.category.name}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4">
        {/* Carrusel de fotos (swipe horizontal) */}
        <div className="mt-4 flex snap-x snap-mandatory gap-2 overflow-x-auto rounded-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(product.images.length > 0
            ? product.images
            : [{ url: "", publicId: null }]
          ).map((img, i) => (
            <div
              key={i}
              className="w-full shrink-0 snap-center overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-zinc-800"
            >
              {img.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bigImage(img.url)}
                  alt={product.name}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center text-4xl text-zinc-700">
                  👕
                </div>
              )}
            </div>
          ))}
        </div>
        {product.images.length > 1 && (
          <p className="mt-1.5 text-center text-[10px] text-zinc-600">
            Desliza para ver más fotos →
          </p>
        )}

        {/* Info */}
        <h1 className="mt-4 text-lg font-semibold leading-snug text-zinc-100">
          {product.name}
        </h1>

        <div className="mt-1.5">
          <p className="text-2xl font-bold tabular-nums text-gold">
            ${price.toFixed(2)}
          </p>
          {rate && rate > 0 && (
            <p className="text-xs tabular-nums text-zinc-400">
              Bs{" "}
              {(usdToBs(price, rate)).toLocaleString("es-VE", {
                minimumFractionDigits: 2,
              })}
              {rateInfo && (
                <span className="text-zinc-600">
                  {" "}
                  · tasa BCV {formatRateDate(rateInfo.date)}
                </span>
              )}
            </p>
          )}
          {product.salePrice != null && (
            <p className="mt-0.5 text-[11px] text-zinc-500">
              Antes{" "}
              <span className="line-through tabular-nums">
                ${Number(product.price).toFixed(2)}
              </span>
              <span className="ml-1.5 rounded bg-gold/15 px-1.5 py-0.5 font-bold uppercase text-gold">
                Oferta
              </span>
            </p>
          )}
        </div>

        {product.description && (
          <p className="mt-4 whitespace-pre-line text-xs leading-relaxed text-zinc-400">
            {product.description}
          </p>
        )}

        {/* Tallas + agregar (agotadas tachadas, regla del spec) */}
        <ProductActions
          productId={product.id}
          name={product.name}
          price={price}
          variants={product.variants.map((v) => ({
            sizeName: v.size.name,
            stock: v.stock,
          }))}
        />
      </div>

      <BagButton rate={rate} whatsapp={store?.whatsappNumber ?? "584245476224"} />
    </main>
  );
}
