"use client";

// Botón "En agencia" — un toque y el envío sale de pendientes.

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markShipmentAtAgency } from "@/lib/actions/sales";
import { Check } from "lucide-react";

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
      className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-600 py-2.5 text-xs font-semibold text-white transition hover:bg-amber-500 active:scale-[0.98] disabled:opacity-50"
    >
      <Check size={14} strokeWidth={2.5} />
      {busy ? "Actualizando…" : "Entregado en agencia"}
    </button>
  );
}
