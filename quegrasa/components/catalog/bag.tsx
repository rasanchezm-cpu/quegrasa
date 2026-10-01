"use client";

// Bolsa de pedido (spec §5.1): selección de prendas guardada en el
// dispositivo (localStorage) que se convierte en un mensaje de WhatsApp
// pre-armado con prendas, tallas y precios.

import { useEffect, useState } from "react";
import { ShoppingBag, X, Trash2 } from "lucide-react";
import { usdToBs } from "@/lib/money";

export type BagItem = {
  productId: string;
  name: string;
  sizeName: string;
  price: number; // USD
};

const STORAGE_KEY = "quegrasa_bolsa";

export function readBag(): BagItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BagItem[]) : [];
  } catch {
    return [];
  }
}

export function addToBag(item: BagItem) {
  const bag = readBag();
  // misma prenda + misma talla: no duplicar
  if (!bag.some((i) => i.productId === item.productId && i.sizeName === item.sizeName)) {
    bag.push(item);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bag));
  }
  window.dispatchEvent(new CustomEvent("quegrasa-bag-updated"));
}

export function BagButton({ rate, whatsapp }: { rate: number | null; whatsapp: string }) {
  const [open, setOpen] = useState(false);
  const [bag, setBag] = useState<BagItem[]>([]);

  useEffect(() => {
    const sync = () => setBag(readBag());
    sync();
    window.addEventListener("quegrasa-bag-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("quegrasa-bag-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const remove = (i: number) => {
    const next = bag.filter((_, idx) => idx !== i);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setBag(next);
    window.dispatchEvent(new CustomEvent("quegrasa-bag-updated"));
  };

  const total = bag.reduce((s, i) => s + i.price, 0);

  const sendToWhatsApp = () => {
    // Formato aireado para WhatsApp: cada prenda en su bloque,
    // nombre en negrita (*texto*), precios con Bs debajo.
    const lines = bag.map(
      (i, idx) =>
        `\n${idx + 1}. *${i.name}*\n` +
        `Talla ${i.sizeName} — $${i.price.toFixed(2)}` +
        (rate && rate > 0
          ? ` (Bs ${(usdToBs(i.price, rate)).toLocaleString("es-VE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })})`
          : ""),
    );
    const msg =
      `Hola QueGrasa! 👀 Me interesan estas prendas:\n` +
      lines.join("\n") +
      `\n\n¿Siguen disponibles?`;
    const url = `https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  return (
    <>
      {/* Botón flotante — respeta la safe-area del iPhone (home indicator) */}
      {bag.length > 0 && !open && (
        <button
          type="button"
          key="fab"
          onClick={() => setOpen(true)}
          className="anim-fab fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-bold text-zinc-950 shadow-lg shadow-gold/20 transition active:scale-95"
          aria-label={`Ver carrito, ${bag.length} ${bag.length === 1 ? "prenda" : "prendas"}`}
        >
          <ShoppingBag size={16} strokeWidth={2.5} aria-hidden="true" />
          Ver carrito
          <span aria-live="polite">
            <span
              key={bag.length}
              className="anim-pop inline-block rounded-full bg-zinc-950 px-2 py-0.5 text-[11px] font-bold tabular-nums text-gold"
            >
              {bag.length}
            </span>
          </span>
        </button>
      )}

      {/* Drawer de la bolsa */}
      {open && (
        <div
          className="fixed inset-0 z-40 flex items-end bg-zinc-950/70 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="anim-drawer max-h-[80dvh] w-full overflow-y-auto overscroll-contain rounded-t-2xl bg-zinc-900 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] ring-1 ring-zinc-700">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-700" />
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-100">Tu pedido</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-zinc-400 transition hover:text-zinc-100"
                aria-label="Cerrar"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <ul className="mt-3 space-y-2">
              {bag.map((i, idx) => (
                <li
                  key={`${i.productId}-${i.sizeName}`}
                  className="flex items-center justify-between gap-3 rounded-lg bg-zinc-800 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-zinc-100">
                      {i.name}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      Talla {i.sizeName} ·{" "}
                      <span className="tabular-nums">${i.price.toFixed(2)}</span>
                      {rate && rate > 0 && (
                        <span className="tabular-nums">
                          {" "}
                          · Bs{" "}
                          {(usdToBs(i.price, rate)).toLocaleString("es-VE", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    aria-label={`Quitar ${i.name}`}
                    className="rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-700 hover:text-red-400"
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                </li>
              ))}
            </ul>

            <p className="mt-3 flex justify-between text-xs text-zinc-400">
              <span>Total aprox.</span>
              <span className="font-bold tabular-nums text-gold">
                ${total.toFixed(2)}
              </span>
            </p>

            <button
              type="button"
              onClick={sendToWhatsApp}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] py-3.5 text-sm font-bold text-zinc-950 transition active:scale-[0.98]"
            >
              {/* Icono de WhatsApp simple */}
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.5 14.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.76-1.67-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.05-.52-.1-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.37.71.3 1.26.48 1.69.61.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35m-5.45 7.44h-.01a9.87 9.87 0 01-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 01-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88a9.83 9.83 0 016.99 2.9 9.83 9.83 0 012.9 7c-.01 5.45-4.45 9.87-9.99 9.87m8.43-18.3A11.82 11.82 0 0012.05 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.14 1.59 5.94L.06 24l6.3-1.65a11.9 11.9 0 005.68 1.45h.01c6.55 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.16-3.49-8.36" />
              </svg>
              Enviar por WhatsApp
            </button>
            <p className="mt-2 text-center text-[10px] text-zinc-500">
              Se abre WhatsApp con tu pedido ya escrito — solo envíalo
            </p>
          </div>
        </div>
      )}
    </>
  );
}
