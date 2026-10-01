// Layout del panel (protegido): todo lo que esté bajo este route group
// exige sesión. El login vive FUERA de este grupo (app/admin/login).
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";
import { LogOut } from "lucide-react";
import PageTheme from "@/components/page-theme";

// Safari pinta su barra de estado/URL del color del panel (claro)
export const viewport = { themeColor: "#fafafa" };

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="min-h-dvh bg-zinc-50">
      {/* Fondo del documento = claro en el panel (theme-color para Safari) */}
      <PageTheme color="#fafafa" />
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto flex h-13 max-w-lg items-center justify-between px-4">
          <span className="text-sm font-semibold tracking-tight text-gold">
            QueGrasa
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">{session.name}</span>
            <form action={logout}>
              <button
                type="submit"
                title="Cerrar sesión"
                className="rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
              >
                <LogOut size={16} strokeWidth={2} />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-6 pb-24">{children}</main>
    </div>
  );
}
