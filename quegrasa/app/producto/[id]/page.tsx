// Detalle de prenda — estética editorial Grasa MID.
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { getLatestRate } from "@/lib/exchange";
import { usdToBs, formatRateDate } from "@/lib/money";
import ProductActions from "@/components/catalog/product-actions";
import { BagButton } from "@/components/catalog/bag";
import { PillNav } from "@/components/catalog/pill-nav";
import { SiteFooter } from "@/components/catalog/site-footer";
import PageTheme from "@/components/page-theme";

export const dynamic = "force-dynamic";

const bigImage = (url: string) =>
  url.replace("/upload/", "/upload/c_fill,w_900,h_1200,f_auto,q_auto/");

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
        variants: { some: { stock: { gt: 0 } } },
      },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        variants: {
          include: { size: { select: { name: true } } },
          orderBy: { size: { sortOrder: "asc" } },
        },
        productCategories: {
          orderBy: { sortOrder: "asc" },
          include: { category: { select: { name: true } } },
        },
      },
    }),
    getLatestRate(),
    prisma.store.findFirst({ select: { whatsappNumber: true } }),
  ]);

  if (!product) notFound();

  const price =
    product.salePrice != null ? Number(product.salePrice) : Number(product.price);
  const rate = rateInfo?.rate ?? null;
  const discount =
    product.salePrice != null
      ? Math.round((1 - Number(product.salePrice) / Number(product.price)) * 100)
      : 0;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <PageTheme color="#000000" />
      <PillNav />

      <main className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 lg:px-8">
        <Link
          href="/catalogo"
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
          Catálogo
        </Link>

        <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
          {/* Galería */}
          <div className="anim-fade-in">
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {(product.images.length > 0
                ? product.images
                : [{ url: "", publicId: null }]
              ).map((img, i) => (
                <div
                  key={i}
                  className="relative aspect-[3/4] w-full shrink-0 snap-center overflow-hidden border border-border bg-secondary sm:w-auto sm:flex-1"
                >
                  {img.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={bigImage(img.url)}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-6xl text-muted-foreground">
                      🖤
                    </div>
                  )}
                  {discount > 0 && i === 0 && (
                    <span className="absolute left-3 top-3 bg-gold px-2 py-1 text-xs font-bold text-black">
                      -{discount}%
                    </span>
                  )}
                </div>
              ))}
            </div>
            {product.images.length > 1 && (
              <p className="mt-1.5 text-center text-[10px] text-muted-foreground sm:text-left">
                Desliza para ver más fotos →
              </p>
            )}
          </div>

          {/* Info */}
          <div className="anim-fade-in">
            <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              {product.productCategories.map((pc) => pc.category.name).join(" · ")}
            </p>

            <h1 className="font-heading text-pretty mt-1 text-5xl leading-[0.95] tracking-wider text-primary">
              {product.name}
            </h1>

            <div className="mt-4 flex items-baseline gap-3">
              <p className="font-heading text-4xl tabular-nums text-gold">
                ${price.toFixed(2)}
              </p>
              {product.salePrice != null && (
                <p className="text-lg tabular-nums text-muted-foreground line-through">
                  ${Number(product.price).toFixed(2)}
                </p>
              )}
            </div>
            {rate && rate > 0 && (
              <p className="text-xs tabular-nums text-muted-foreground">
                Bs{" "}
                {(usdToBs(price, rate)).toLocaleString("es-VE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                {rateInfo && (
                  <span className="text-muted-foreground/60">
                    {" "}
                    · tasa BCV {formatRateDate(rateInfo.date)}
                  </span>
                )}
              </p>
            )}

            {product.description && (
              <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            )}

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
        </div>
      </main>

      <SiteFooter />
      <BagButton rate={rate} whatsapp={store?.whatsappNumber ?? "584245476224"} />
    </div>
  );
}
