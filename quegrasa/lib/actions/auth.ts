"use server";

// Server Actions de autenticación.
// Regla del proyecto: toda acción verifica lo que necesita por sí misma.

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  verifyPassword,
  createSessionCookie,
  destroySessionCookie,
} from "@/lib/auth";

export type LoginState = {
  error?: string;
};

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().min(3, "Escribe tu correo"),
  password: z.string().min(1, "Escribe tu contraseña"),
});

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Correo o contraseña inválidos" };
  }

  // Pequeño delay anti-fuerza-bruta (el rate limit serio llega con el proxy en S5)
  await new Promise((r) => setTimeout(r, 400));

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  // Mensaje genérico: no revelamos si el correo existe o no.
  const GENERIC = "Correo o contraseña incorrectos";
  if (!user || !user.isActive) return { error: GENERIC };

  const ok = await verifyPassword(user.passwordHash, parsed.data.password);
  if (!ok) return { error: GENERIC };

  await createSessionCookie({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  redirect("/admin");
}

export async function logout(): Promise<void> {
  await destroySessionCookie();
  redirect("/admin/login");
}
