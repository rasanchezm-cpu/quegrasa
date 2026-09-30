"use client";

// Botón "En agencia ✓" — un toque y el envío sale de pendientes.

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markShipmentAtAgency } from "@/lib/actions/sales";

export default function AgencyButton({ shipmentId }: { shipmentId: string }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();

  const click = () => {
    startTransition(async () => {
      const res = await markShipmentAtAgency(shipmentId);
      if (!res.ok) {
        alert(res.error ?? "No se pudo actualizar");
        return;
      }
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={click}
      disabled={busy}
      className="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
    >
      {busy ? "Actualizando…" : "🚚 En agencia ✓"}
    </button>
  );
}
