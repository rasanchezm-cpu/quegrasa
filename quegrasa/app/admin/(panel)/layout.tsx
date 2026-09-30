// Layout del panel (protegido): todo lo que esté bajo este route group
// exige sesión. El login vive FUERA de este grupo (app/admin/login).
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="min-h-dvh bg-neutral-50">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">👕</span>
            <span className="font-bold tracking-tight">QueGrasa</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-500">{session.name}</span>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg px-2.5 py-1.5 text-sm text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-6 pb-24">{children}</main>
    </div>
  );
}
