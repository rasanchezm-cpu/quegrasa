// Portada pública de QueGrasa.
// El catálogo completo llega en el Sprint 4; mientras tanto,
// una landing con la identidad de la marca (negro con dorado).
export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-zinc-950 px-6 text-center">
      <h1 className="text-5xl font-semibold tracking-tight text-gold">
        QueGrasa
      </h1>
      <p className="mt-4 max-w-xs text-sm leading-relaxed text-zinc-400">
        Ropa disponible al momento — muy pronto nuestro catálogo online con
        pedidos directos por WhatsApp.
      </p>

      <div className="mt-8 h-px w-16 bg-gold/40" />

      <p className="mt-8 text-xs uppercase tracking-[0.2em] text-zinc-600">
        Próximamente
      </p>
    </main>
  );
}
