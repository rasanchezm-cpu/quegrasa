// Cinta de palabras infinita (estilo Grasa MID) — identidad QueGrasa.
const words = [
  "QUEGRASA",
  "ROPA DISPONIBLE AL MOMENTO",
  "ENVÍOS NACIONALES",
  "BARQUISEMETO",
  "PEDIDOS POR WHATSAPP",
];

export function GoldMarquee() {
  const sequence = [...words, ...words];
  return (
    <div className="relative -rotate-1 scale-[1.02] overflow-hidden border-y-2 border-black bg-gold py-3">
      <div className="animate-marquee flex w-max" aria-hidden="true">
        {[...sequence, ...sequence].map((word, i) => (
          <span
            key={`${word}-${i}`}
            className="font-heading flex items-center gap-6 px-6 text-2xl tracking-widest text-black sm:text-3xl"
          >
            {word}
            <span className="inline-block h-2 w-2 rotate-45 bg-black" />
          </span>
        ))}
      </div>
      <p className="sr-only">
        QueGrasa — ropa disponible al momento, envíos nacionales desde Barquisimeto y
        pedidos por WhatsApp.
      </p>
    </div>
  );
}
