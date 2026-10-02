"use client";

// PillNav — navegación estilo "Grasa MID": pastillas con círculo que crece
// al hover y labels que intercambian. Versión CSS pura del efecto GSAP.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";

export type NavItem = { label: string; href: string };

export function PillNav({ items, onCartClick }: { items: NavItem[]; onCartClick?: () => void }) {
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);

  // contador del carrito (localStorage compartido con la bolsa)
  useEffect(() => {
    const sync = () => {
      try {
        const raw = localStorage.getItem("quegrasa_bolsa");
        setCartCount(raw ? (JSON.parse(raw) as unknown[]).length : 0);
      } catch {
        setCartCount(0);
      }
    };
    sync();
    window.addEventListener("quegrasa-bag-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("quegrasa-bag-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-10 items-center justify-between bg-background/80 px-3 backdrop-blur-sm sm:px-6">
      <Link
        href="/"
        aria-label="QueGrasa — inicio"
        className="group relative overflow-hidden rounded-full border border-border bg-[#0A0A0A] px-4 py-1.5"
      >
        {/* círculo que crece */}
        <span
          aria-hidden="true"
          className="absolute -bottom-6 left-1/2 h-16 w-24 -translate-x-1/2 scale-0 rounded-full bg-gold transition-transform duration-500 ease-out group-hover:scale-150"
        />
        <span className="relative font-heading text-lg tracking-widest text-primary group-hover:text-black">
          QUEGRASA
        </span>
      </Link>

      <nav className="flex items-center gap-1.5" aria-label="Navegación">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`group relative overflow-hidden rounded-full border bg-[#0A0A0A] px-4 py-1.5 text-sm font-medium tracking-wide transition-colors ${
                active ? "border-gold text-gold" : "border-border hover:border-gold/50"
              }`}
            >
              <span
                aria-hidden="true"
                className="absolute -bottom-6 left-1/2 h-16 w-24 -translate-x-1/2 scale-0 rounded-full bg-gold transition-transform duration-500 ease-out group-hover:scale-150"
              />
              <span className="relative group-hover:text-black">{item.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onCartClick}
          aria-label={
            cartCount > 0 ? `Ver carrito, ${cartCount} prendas` : "Ver carrito"
          }
          className="group relative overflow-hidden rounded-full border border-border bg-[#0A0A0A] p-2 transition-colors hover:border-gold/50"
        >
          <span
            aria-hidden="true"
            className="absolute -bottom-6 left-1/2 h-16 w-10 -translate-x-1/2 scale-0 rounded-full bg-gold transition-transform duration-500 ease-out group-hover:scale-150"
          />
          <ShoppingBag size={16} className="relative group-hover:text-black" aria-hidden="true" />
          {cartCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold tabular-nums text-black">
              {cartCount}
            </span>
          )}
        </button>
      </nav>
    </header>
  );
}
