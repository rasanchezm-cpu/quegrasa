// Catálogo completo de QueGrasa — estilo Grasa MID:
// búsqueda sticky + chips + ordenamiento + contador, grid 2/3.
// Filtros y orden en URL (?q= &cat= &sort=) — compartible y SEO.
import Link from "next/link";
import { Search, SearchX } from "lucide-react";
import { prisma } from "@/lib/db";
import { getLatestRate } from "@/lib/exchange";
import { PillNav } from "@/components/catalog/pill-nav";
import { SiteFooter } from "@/components/catalog/site-footer";
import ProductCard, { type CatalogProduct } from "@/components/catalog/product-card";
import PageTheme from "@/components/page-theme";
import { BagButton } from "@/components/catalog/bag";

export const dynamic = "force-dynamic";

const SORTS = {
  newest: { label: "Más nuevos", orderBy: { createdAt: "desc" as const } },
  "price-asc": { label: "Precio: menor a mayor", orderBy: { price: "asc" as const } },
  "price-desc": { label: "Precio: mayor a menor", orderBy: { price: "desc" as const } },
  "title-asc": { label: "Nombre: A-Z", orderBy: { name: "asc" as const } },
};

type SearchParams = Promise<{ q?: string; cat?: string; sort?: string }>;

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q = "", cat = "", sort = "newest" } = await searchParams;
  const sortKey = sort in SORTS ? sort : "newest";

  const store = await prisma.store.findFirst({ orderBy: { createdAt: "asc" } });
  if (!store) {
    return (
      <div className="min-h-dvh bg-background">
        <PageTheme color="#060606" />
        <p className="p-10 text-center text-muted-foreground">
          Catálogo en preparación. Vuelve pronto.
        </p>
      </div>
    );
  }

  const [categories, rateInfo] = await Promise.all([
    prisma.category.findMany({
      where: { storeId: store.id, isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    getLatestRate(),
  ]);

  const activeCategory = categories.find((c) => c.slug === cat);

  const rows = await prisma.product.findMany({
    where: {
      storeId: store.id,
      isActive: true,
      name: q ? { contains: q, mode: "insensitive" } : undefined,
      productCategories: activeCategory
        ? { some: { categoryId: activeCategory.id } }
        : undefined,
      variants: { some: { stock: { gt: 0 } } },
    },
    orderBy: SORTS[sortKey as keyof typeof SORTS].orderBy,
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      variants: {
        where: { stock: { gt: 0 } },
        include: { size: { select: { name: true } } },
        orderBy: { size: { sortOrder: "asc" } },
      },
    },
  });

  const products: CatalogProduct[] = rows.map((p) => ({
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
      <PageTheme color="#060606" />
      <PillNav items={[{ label: "Inicio", href: "/" }]} />

      <main className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 lg:px-8">
        <header className="py-8">
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.3em] text-gold">
            Tienda online
          </p>
          <h1 className="font-heading text-5xl leading-none tracking-wider text-primary sm:text-6xl">
            EL CATÁLOGO <span className="text-gold">COMPLETO</span>
          </h1>
        </header>

        {/* Búsqueda sticky */}
        <div className="sticky top-10 z-20 -mx-4 border-b border-border bg-background/95 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <form action="/catalogo" className="flex items-stretch" role="search">
            {cat && <input type="hidden" name="cat" value={cat} />}
            {sortKey !== "newest" && (
              <input type="hidden" name="sort" value={sortKey} />
            )}
            <label htmlFor="catalog-search" className="sr-only">
              Buscar prendas por nombre
            </label>
            <input
              id="catalog-search"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Buscar prendas…"
              autoComplete="off"
              enterKeyHint="search"
              className="h-12 w-full border border-border bg-card pl-4 pr-10 text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            <button
              type="submit"
              aria-label="Buscar"
              className="flex h-12 w-14 items-center justify-center bg-gold text-black transition-colors hover:bg-gold-dark"
            >
              <Search className="h-5 w-5" aria-hidden="true" />
            </button>
          </form>

          {/* Chips de categoría */}
          <div
            className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="group"
            aria-label="Filtrar por categoría"
          >
            <Link
              href={q ? `/catalogo?q=${encodeURIComponent(q)}` : "/catalogo"}
              className={`h-9 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors ${
                !activeCategory
                  ? "border-gold bg-gold text-black"
                  : "border-border bg-card text-primary hover:border-gold/50"
              }`}
            >
              Todo
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/catalogo?cat=${c.slug}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className={`h-9 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors ${
                  activeCategory?.id === c.id
                    ? "border-gold bg-gold text-black"
                    : "border-border bg-card text-primary hover:border-gold/50"
                }`}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Contador + orden */}
        <div className="flex items-center justify-between gap-4 py-5">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {products.length} {products.length === 1 ? "prenda disponible" : "prendas disponibles"}
          </p>
          <form className="flex items-center gap-2 text-sm text-muted-foreground">
            {q && <input type="hidden" name="q" value={q} />}
            {cat && <input type="hidden" name="cat" value={cat} />}
            <label htmlFor="sort" className="hidden sm:inline">
              Ordenar por
            </label>
            <select
              id="sort"
              name="sort"
              defaultValue={sortKey}
              className="h-9 border border-border bg-card px-3 text-primary focus:border-gold focus:outline-none"
            >
              {Object.entries(SORTS).map(([value, s]) => (
                <option key={value} value={value}>
                  {s.label}
                </option>
              ))}
            </select>
          </form>
        </div>

        {/* Grid */}
        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 pb-14 lg:grid-cols-3 lg:gap-5">
            {products.map((p, i) => (
              <ProductCard
                key={p.id}
                product={p}
                index={i}
                rate={rateInfo?.rate ?? null}
                rateDate={rateInfo?.date ?? null}
              />
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-border py-20 text-center">
            <SearchX className="mx-auto mb-2 text-muted-foreground" size={24} aria-hidden="true" />
            <p className="font-heading text-2xl tracking-widest text-primary">SIN RESULTADOS</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Prueba con otro nombre o cambia de categoría.
            </p>
            <Link
              href="/catalogo"
              className="mt-4 inline-block border border-gold px-6 py-2.5 text-sm font-semibold text-gold transition-colors hover:bg-gold hover:text-black"
            >
              Ver todo
            </Link>
          </div>
        )}
      </main>

      <SiteFooter />
      <BagButton
        rate={rateInfo?.rate ?? null}
        whatsapp={store.whatsappNumber}
      />
    </div>
  );
}
