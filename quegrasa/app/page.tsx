// Home editorial de QueGrasa — estilo Grasa MID:
// hero cinematográfico + marquee dorado + ÚLTIMAS PIEZAS + CTA al catálogo.
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { HeroSection } from "@/components/catalog/hero-section";
import { GoldMarquee } from "@/components/catalog/gold-marquee";
import { PillNav } from "@/components/catalog/pill-nav";
import { SiteFooter } from "@/components/catalog/site-footer";
import ProductCard, { type CatalogProduct } from "@/components/catalog/product-card";
import PageTheme from "@/components/page-theme";
import { BagButton } from "@/components/catalog/bag";

export const dynamic = "force-dynamic";

export default async function HomeEditorial() {
  const store = await prisma.store.findFirst({ orderBy: { createdAt: "asc" } });

  const rows = store
    ? await prisma.product.findMany({
        where: {
          storeId: store.id,
          isActive: true,
          variants: { some: { stock: { gt: 0 } } },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          variants: {
            where: { stock: { gt: 0 } },
            include: { size: { select: { name: true } } },
            orderBy: { size: { sortOrder: "asc" } },
          },
        },
      })
    : [];

  const latest: CatalogProduct[] = rows.map((p) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price),
    salePrice: p.salePrice != null ? Number(p.salePrice) : null,
    imageUrl: p.images[0]
      ? p.images[0].url.replace("/upload/", "/upload/c_fill,w_500,h_667,f_auto,q_auto/")
      : null,
    variants: p.variants.map((v) => ({ sizeName: v.size.name, stock: v.stock })),
  }));

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <PageTheme color="#000000" />
      <PillNav />

      <main className="pt-10">
        <HeroSection />

        <div className="overflow-hidden py-6">
          <GoldMarquee />
        </div>

        <section className="py-14 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-end justify-between lg:mb-12">
              <div>
                <p className="mb-2 text-sm font-medium uppercase tracking-[0.3em] text-gold">
                  Recién llegadas
                </p>
                <h2 className="font-heading text-5xl leading-none tracking-wider text-primary lg:text-7xl">
                  ÚLTIMAS <span className="text-gold">PIEZAS</span>
                </h2>
              </div>
              <Link
                href="/catalogo"
                className="font-heading hidden items-center gap-2 text-lg tracking-widest text-primary transition-colors hover:text-gold sm:flex"
              >
                VER CATÁLOGO
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            {latest.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
                {latest.map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} />
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-border py-20 text-center">
                <p className="font-heading mb-2 text-2xl tracking-widest text-primary">
                  AÚN NO HAY PRENDAS
                </p>
                <p className="text-sm text-muted-foreground">
                  Cuando la tienda suba su mercancía, aparecerán aquí.
                </p>
              </div>
            )}

            <div className="mt-10 flex justify-center">
              <Link
                href="/catalogo"
                className="font-heading flex items-center bg-gold px-10 py-4 text-lg tracking-widest text-black transition-colors hover:bg-gold-dark"
              >
                VER TODO EL CATÁLOGO
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
      <BagButton
        rate={null}
        whatsapp={store?.whatsappNumber ?? "584245476224"}
      />
    </div>
  );
}
