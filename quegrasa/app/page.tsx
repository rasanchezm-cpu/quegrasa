// Catálogo público de QueGrasa — vitrina estilo Mercado Libre (negro/dorado).
// Reglas del spec §6: solo prendas activas con stock; tallas agotadas fuera.
// Filtros y búsqueda por URL (?cat=&q=) → se puede compartir y limpiar.
import Link from "next/link";
import { Suspense } from "react";
import { Search, SearchX } from "lucide-react";
import { prisma } from "@/lib/db";
import { getLatestRate } from "@/lib/exchange";
import ProductCard, { type CatalogProduct } from "@/components/catalog/product-card";
import { BagButton } from "@/components/catalog/bag";
import PageTheme from "@/components/page-theme";

export const dynamic = "force-dynamic";

const thumb = (url: string) =>
  url.replace("/upload/", "/upload/c_fill,w_500,h_500,f_auto,q_auto/");

type SearchParams = Promise<{ q?: string; cat?: string }>;

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q = "", cat = "" } = await searchParams;

  const store = await prisma.store.findFirst({ orderBy: { createdAt: "asc" } });
  if (!store) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-zinc-950 px-6 text-center text-zinc-400">
        <p>Catálogo en preparación. Vuelve pronto.</p>
      </main>
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
      variants: { some: { stock: { gt: 0 } } }, // regla: solo con stock
    },
    orderBy: { createdAt: "desc" },
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
    imageUrl: p.images[0] ? thumb(p.images[0].url) : null,
    variants: p.variants.map((v) => ({ sizeName: v.size.name, stock: v.stock })),
  }));

  return (
    <main className="min-h-dvh bg-zinc-950 pb-10 text-zinc-100">
      {/* Fondo del documento = negro (fix bordes blancos en iPhone) */}
      <PageTheme color="#09090b" />

      {/* h1 semántico para lectores de pantalla y SEO */}
      <h1 className="sr-only">Catálogo de QueGrasa</h1>
      {/* ---------- Header: logo + buscador (patrón ML) ---------- */}
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 pt-3.5 pb-3">
          <div className="flex items-center gap-3">
            {/* Logo real de la marca */}
            <Link href="/" className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.jpg"
                alt="QueGrasa"
                className="h-9 w-9 rounded-full ring-1 ring-gold/40"
              />
            </Link>
            <form action="/" className="flex-1">
              {cat && <input type="hidden" name="cat" value={cat} />}
              <div className="flex overflow-hidden rounded-full bg-zinc-900 ring-1 ring-zinc-800">
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Buscar prendas…"
                  aria-label="Buscar prendas"
                  autoComplete="off"
                  enterKeyHint="search"
                  className="w-full bg-transparent px-4 py-2.5 text-sm outline-none placeholder:text-zinc-500"
                />
                <button
                  type="submit"
                  aria-label="Buscar"
                  className="flex items-center bg-gold px-4 text-zinc-950 transition hover:bg-gold-dark"
                >
                  <Search size={16} strokeWidth={2} />
                </button>
              </div>
            </form>
          </div>

          {/* Chips de categorías (filtro por tipo de prenda) */}
          <nav className="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link
              href={q ? `/?q=${encodeURIComponent(q)}` : "/"}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                !activeCategory
                  ? "bg-gold text-zinc-950"
                  : "bg-zinc-900 text-zinc-400 ring-1 ring-zinc-800 hover:text-zinc-200"
              }`}
            >
              Todo
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/?cat=${c.slug}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  activeCategory?.id === c.id
                    ? "bg-gold text-zinc-950"
                    : "bg-zinc-900 text-zinc-400 ring-1 ring-zinc-800 hover:text-zinc-200"
                }`}
              >
                {c.name}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* ---------- Contenido ---------- */}
      <div className="mx-auto max-w-3xl px-4">
        <p className="mt-3 text-[11px] text-zinc-500">
          {products.length > 0
            ? `${products.length} ${products.length === 1 ? "prenda disponible" : "prendas disponibles"}`
            : ""}
          {q && <span className="text-zinc-400"> · búsqueda: “{q}”</span>}
        </p>

        {/* Grid estilo ML */}
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {products.map((p, i) => (
            <ProductCard
              key={p.id}
              product={p}
              rate={rateInfo?.rate ?? null}
              rateDate={rateInfo?.date ?? null}
              index={i}
            />
          ))}
        </div>

        {products.length === 0 && (
          <div className="mt-10 flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-800 px-4 py-12 text-center text-xs text-zinc-500">
            <SearchX size={22} strokeWidth={1.5} />
            {q || activeCategory
              ? "No hay prendas con ese criterio. Prueba limpiar los filtros."
              : "Aún no hay prendas publicadas. Vuelve pronto."}
            {(q || activeCategory) && (
              <Link
                href="/"
                className="mt-2 rounded-full bg-gold px-4 py-1.5 text-[11px] font-bold text-zinc-950"
              >
                Ver todo
              </Link>
            )}
          </div>
        )}

        {/* Footer: transparencia de la tasa (regla del spec §5.1) */}
        {rateInfo && (
          <p className="mt-8 border-t border-zinc-800 pt-4 text-center text-[10px] leading-relaxed text-zinc-600">
            Precios en bolívares calculados a tasa BCV del{" "}
            {rateInfo.date.toLocaleDateString("es-VE", {
              day: "numeric",
              month: "short",
            })}
            . Stock actualizado al momento.
          </p>
        )}
      </div>

      {/* Bolsa de pedido (flotante, WhatsApp) */}
      <BagButton
        rate={rateInfo?.rate ?? null}
        whatsapp={store.whatsappNumber}
      />
    </main>
  );
}
