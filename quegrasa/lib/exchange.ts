// ============================================================
// Tasa BCV — obtención, guardado y consulta con respaldo.
// Regla del spec: si la fuente falla, se usa la última tasa
// guardada; nunca se inventa un cálculo.
// ============================================================
import { prisma } from "@/lib/db";

export type RateInfo = {
  rate: number;
  date: Date;
  source: "BCV" | "MANUAL";
};

/** La tasa más reciente guardada en BD (o null si nunca ha habido una). */
export async function getLatestRate(): Promise<RateInfo | null> {
  const row = await prisma.exchangeRate.findFirst({
    orderBy: { date: "desc" },
  });
  if (!row) return null;
  return { rate: Number(row.rate), date: row.date, source: row.source };
}

/**
 * Consulta la tasa oficial del día y la guarda (upsert por fecha).
 * Devuelve la tasa que quedó vigente:
 *  - la recién descargada si la fuente respondió, o
 *  - la última conocida si la fuente falló (resguardo).
 */
export async function fetchAndStoreBcvRate(): Promise<{
  rate: RateInfo;
  fromFallback: boolean;
}> {
  const url = process.env.BCV_API_URL ?? "https://ve.dolarapi.com/v1/dolares/oficial";
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });

    if (res.ok) {
      const data = (await res.json()) as unknown;
      const rate = extractRate(data);
      if (rate && rate > 0) {
        const saved = await prisma.exchangeRate.upsert({
          where: { date: today },
          update: { rate, source: "BCV" },
          create: { date: today, rate, source: "BCV" },
        });
        return {
          rate: { rate: Number(saved.rate), date: saved.date, source: saved.source },
          fromFallback: false,
        };
      }
    }
  } catch {
    // La fuente falló: caemos al respaldo silenciosamente.
  }

  const fallback = await getLatestRate();
  if (!fallback) {
    throw new Error(
      "No hay tasa disponible: la fuente falló y la BD no tiene tasas guardadas."
    );
  }
  return { rate: fallback, fromFallback: true };
}

/** Acepta objeto o array con promedio/venta/compra (defensivo). */
function extractRate(data: unknown): number | null {
  const candidates: unknown[] = Array.isArray(data) ? data : [data];
  for (const item of candidates) {
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      for (const key of ["promedio", "venta", "compra", "rate", "valor"]) {
        const v = o[key];
        if (typeof v === "number" && v > 0) return v;
        if (typeof v === "string" && v !== "" && !Number.isNaN(Number(v)) && Number(v) > 0) {
          return Number(v);
        }
      }
    }
  }
  return null;
}
