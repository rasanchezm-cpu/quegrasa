// Endpoint del cron diario: guarda la tasa BCV del día.
// Vercel Cron lo llama con "Authorization: Bearer $CRON_SECRET".
// Idempotente: llamarlo varias veces al día solo actualiza la tasa de hoy.
import { fetchAndStoreBcvRate } from "@/lib/exchange";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  try {
    const { rate, fromFallback } = await fetchAndStoreBcvRate();
    return Response.json({
      ok: true,
      fromFallback,
      rate: rate.rate,
      date: rate.date,
      source: rate.source,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    return Response.json({ ok: false, error: message }, { status: 503 });
  }
}
