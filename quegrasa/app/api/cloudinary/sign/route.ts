// Firma parámetros para subida directa del navegador a Cloudinary.
// El flujo (spec §7): el cliente pide la firma aquí (con sesión) y sube
// la imagen directamente a Cloudinary — el archivo jamás pasa por
// nuestras funciones serverless (límite de 4.5MB en Vercel).
//
// Firma: sha1(params ordenados alfabéticamente + api_secret) — algoritmo
// estándar de "signed upload" de Cloudinary, sin SDK pesado.
import { createHash } from "node:crypto";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ ok: false, error: "No autenticado" }, { status: 401 });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return Response.json(
      { ok: false, error: "Cloudinary no está configurado" },
      { status: 500 },
    );
  }

  const folder = "quegrasa/productos";
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // Parámetros a firmar, orden alfabético estricto: folder, timestamp
  const toSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = createHash("sha1")
    .update(toSign + apiSecret)
    .digest("hex");

  return Response.json({
    ok: true,
    cloudName,
    apiKey,
    timestamp,
    folder,
    signature,
  });
}
