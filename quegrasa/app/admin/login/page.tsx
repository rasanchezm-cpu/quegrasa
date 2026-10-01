"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { login, type LoginState } from "@/lib/actions/auth";
import PageTheme from "@/components/page-theme";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {},
  );

  return (
    <main className="flex min-h-dvh items-center justify-center bg-zinc-950 px-6">
      <PageTheme color="#09090b" />
      <div className="w-full max-w-sm">
        {/* Marca */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-gold">
            QueGrasa
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">Panel de la tienda</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <form action={formAction} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-medium text-zinc-400"
              >
                Correo
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-gold focus:ring-1 focus:ring-gold"
                placeholder="nombre@correo.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-medium text-zinc-400"
              >
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-gold focus:ring-1 focus:ring-gold"
                placeholder="••••••••"
              />
            </div>

            {state?.error && (
              <p className="rounded-md bg-red-950/60 px-3 py-2 text-xs text-red-300">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-gold-dark active:scale-[0.98] disabled:opacity-50"
            >
              <LogIn size={16} strokeWidth={2} />
              {pending ? "Entrando…" : "Entrar"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600">
          QueGrasa · Sistema de inventario
        </p>
      </div>
    </main>
  );
}
