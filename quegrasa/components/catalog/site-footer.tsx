// Footer público — identidad editorial QueGrasa.
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="font-heading text-3xl tracking-widest text-primary">
            QUE<span className="text-gold">GRASA</span>
          </p>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Barquisimeto, Venezuela
          </p>
          <nav className="flex items-center gap-5 text-sm" aria-label="Enlaces">
            <Link href="/catalogo" className="transition-colors hover:text-gold">
              Catálogo
            </Link>
            <a
              href="https://wa.me/584245476224"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-gold"
            >
              WhatsApp
            </a>
            <Link href="/admin" className="transition-colors hover:text-gold">
              Panel
            </Link>
          </nav>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} QueGrasa · Precios en Bs a tasa BCV del día ·
            Stock actualizado al momento
          </p>
        </div>
      </div>
    </footer>
  );
}
