"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/lib/actions/auth";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {},
  );

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-neutral-950 px-6 text-white">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl">
            👕
          </div>
          <h1 className="text-3xl font-bold tracking-tight">QueGrasa</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Panel de la tienda — inicia sesión
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm text-neutral-300">
              Correo
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3.5 text-base outline-none placeholder:text-neutral-500 focus:border-white"
              placeholder="tucorreo@ejemplo.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm text-neutral-300">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3.5 text-base outline-none placeholder:text-neutral-500 focus:border-white"
              placeholder="••••••••"
            />
          </div>

          {state?.error && (
            <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-white py-3.5 text-base font-semibold text-neutral-900 transition active:scale-[0.98] disabled:opacity-50"
          >
            {pending ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
