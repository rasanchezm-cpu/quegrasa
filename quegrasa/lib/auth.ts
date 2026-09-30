// ============================================================
// Sesiones de QueGrasa — JWT en cookie httpOnly firmada.
// Sin dependencias de servicios: login propio, didáctico y
// controlado (decisión del spec).
// ============================================================
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import argon2 from "argon2";

export const SESSION_COOKIE = "quegrasa_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 días

function getSecret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET no está configurada");
  return new TextEncoder().encode(s);
}

export type Session = {
  userId: string;
  email: string;
  name: string;
  role: "WORKER" | "PLATFORM_ADMIN";
};

// ---------- Contraseñas ----------

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

export function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

// ---------- Cookie de sesión ----------

export async function createSessionCookie(session: Session): Promise<void> {
  const token = await new SignJWT({
    userId: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecret());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.userId !== "string") return null;
    return {
      userId: payload.userId,
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
      role: payload.role === "PLATFORM_ADMIN" ? "PLATFORM_ADMIN" : "WORKER",
    };
  } catch {
    return null; // token inválido o expirado
  }
}

/** Lanza si no hay sesión — usar al inicio de TODAS las server actions. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");
  return session;
}

export async function destroySessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
