"use client";

// Hero de QueGrasa — color sólido de fondo (sin imagen), logo circular con
// glow dorado y titular editorial. Entrada coreografiada con framer-motion.

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative flex min-h-[92svh] w-full items-center justify-center overflow-hidden bg-background">
      {/* resplandor dorado central sutil */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.09)_0%,transparent_65%)]"
      />

      <div className="relative z-10 flex flex-col items-center px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="relative mb-6 h-52 w-52 overflow-hidden rounded-full shadow-[0_0_80px_rgba(212,175,55,0.25)] sm:h-64 sm:w-64"
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
          transition={{ delay: 0.3 }}
          className="font-heading text-balance text-4xl leading-[1.05] tracking-[0.06em] text-primary sm:text-5xl md:text-6xl"
        >
          SOLO PARA LOS QUE DISTINGUEN LA{" "}
          <span className="text-gold">GRASA</span> DEL RESTO
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mb-10 mt-3 flex items-center gap-2 text-sm uppercase tracking-[0.25em] text-muted-foreground sm:text-base"
        >
          <MapPin className="h-4 w-4 text-gold" aria-hidden="true" />
          Barquisimeto, Venezuela
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
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
            className="font-heading flex h-14 items-center justify-center border border-primary/20 px-10 text-lg tracking-widest text-primary transition-colors hover:border-gold hover:text-gold"
          >
            PEDIDOS POR WHATSAPP
          </a>
        </motion.div>
      </div>
    </section>
  );
}
