"use client";

// Hero fullscreen estilo Grasa MID: slideshow con fotos del inventario,
// logo circular con glow dorado, titular editorial y ubicación.

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, MapPin } from "lucide-react";

export function HeroSection({ photos }: { photos: string[] }) {
  const slides = photos.length > 0 ? photos : [null];
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(
      () => setCurrent((prev) => (prev + 1) % slides.length),
      6000,
    );
    return () => clearInterval(timer);
  }, [slides.length]);

  const slide = slides[current] ?? null;

  return (
    <section className="relative h-[100svh] min-h-[640px] w-full overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0"
        >
          {slide ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={slide}
              alt="Prenda de QueGrasa"
              className="h-full w-full object-cover object-center"
            />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(ellipse_at_center,#1a1a1a_0%,#060606_70%)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-[#060606]" />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="relative mb-6 h-52 w-52 overflow-hidden rounded-full shadow-[0_0_80px_rgba(212,175,55,0.25)] ring-2 ring-gold/40 sm:h-64 sm:w-64"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.jpg"
            alt="QueGrasa"
            className="h-full w-full scale-110 object-cover"
          />
        </motion.div>

        <h1 className="sr-only">QueGrasa — ropa disponible ahora</h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="font-heading text-balance text-5xl tracking-[0.12em] text-primary sm:text-6xl md:text-7xl"
        >
          ROPA SIN <span className="text-gold">FILTRO</span>
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-10 mt-3 flex items-center gap-2 text-sm uppercase tracking-[0.25em] text-muted-foreground sm:text-base"
        >
          <MapPin className="h-4 w-4 text-gold" aria-hidden="true" />
          Barquisimeto, Venezuela
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <Link
            href="/catalogo"
            className="font-heading flex h-14 items-center justify-center bg-gold px-10 text-lg tracking-widest text-black transition-colors hover:bg-gold-dark"
          >
            VER LA TIENDA
            <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
          </Link>
          <a
            href="https://wa.me/584245476224"
            target="_blank"
            rel="noopener noreferrer"
            className="font-heading flex h-14 items-center justify-center border border-primary/40 bg-black/40 px-10 text-lg tracking-widest text-primary transition-colors hover:border-gold hover:text-gold"
          >
            PEDIDOS POR WHATSAPP
          </a>
        </motion.div>
      </div>
    </section>
  );
}
