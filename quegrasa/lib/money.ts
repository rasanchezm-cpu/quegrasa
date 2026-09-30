// ============================================================
// Formato de dinero: precios administrados en USD,
// mostrados también en Bs con la tasa del día.
// ============================================================

/** Convierte un precio en USD a Bs usando la tasa vigente. */
export function usdToBs(usd: number, rate: number): number {
  return usd * rate;
}

/** "$15.00" */
export function formatUsd(usd: number): string {
  return `$${usd.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** "Bs 1.234,56" — formato venezolano con separador de miles. */
export function formatBs(bs: number): string {
  return `Bs ${bs.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Fecha corta legible para mostrar junto a la tasa: "28-sep". */
export function formatRateDate(date: Date): string {
  return date.toLocaleDateString("es-VE", {
    day: "numeric",
    month: "short",
  });
}
