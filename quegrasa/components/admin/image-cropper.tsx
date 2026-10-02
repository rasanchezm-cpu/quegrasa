"use client";

// Recortador interactivo de imágenes para "Subir prenda".
// - Marco fijo con la proporción del catálogo (3:4) y máscara oscura
//   en lo que se corta.
// - Arrastrar para mover, slider/rueda/botones para zoom, con límites
//   para que la imagen siempre cubra el marco.
// - "Confirmar encuadre" recorta exactamente lo visible en el marco
//   y devuelve un File 900×1200 listo para subir.

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Minus, Plus, X } from "lucide-react";

const OUT_W = 900;
const OUT_H = 1200; // 3:4 — la proporción del catálogo

type Props = {
  file: File;
  onConfirm: (cropped: File) => void;
  onCancel: () => void;
};

export default function ImageCropper({ file, onConfirm, onCancel }: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const [frame, setFrame] = useState({ w: 0, h: 0 });

  // ---------- cargar la imagen ----------
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => setImg(image);
    image.onerror = () => setLoadError(true);
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // ---------- medir el marco según la pantalla ----------
  useEffect(() => {
    const measure = () => {
      const vp = viewportRef.current;
      if (!vp) return;
      const vw = vp.clientWidth;
      const vh = vp.clientHeight;
      // el marco: ancho 78% del viewport (o limitado por la altura)
      const w = Math.min(vw * 0.78, (vh * 0.62) * (OUT_W / OUT_H));
      setFrame({ w, h: w * (OUT_H / OUT_W) });
      setOffset({ x: 0, y: 0 }); // recentrar al medir
      setZoom(1);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [img]);

  // ---------- geometría ----------
  const coverScale = img && frame.w ? Math.max(frame.w / img.width, frame.h / img.height) : 1;
  const scale = coverScale * zoom;
  const dispW = img ? img.width * scale : 0;
  const dispH = img ? img.height * scale : 0;

  // límites: la imagen siempre cubre el marco
  const clamp = useCallback(
    (x: number, y: number) => {
      const maxX = Math.max(0, (dispW - frame.w) / 2);
      const maxY = Math.max(0, (dispH - frame.h) / 2);
      return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) };
    },
    [dispW, dispH, frame.w, frame.h],
  );

  // ---------- arrastre ----------
  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, tx: offset.x, ty: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const next = clamp(d.tx + (e.clientX - d.x), d.ty + (e.clientY - d.y));
    setOffset(next);
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  // ---------- zoom ----------
  const setZoomClamped = (z: number) => {
    const next = Math.min(4, Math.max(1, z));
    setZoom(next);
    // recentrar tras cambiar zoom para no dejar huecos
    requestAnimationFrame(() => setOffset((o) => clamp(o.x, o.y)));
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoomClamped(zoom * (e.deltaY < 0 ? 1.12 : 0.89));
  };

  // ---------- recortar y exportar ----------
  const confirm = () => {
    if (!img || !frame.w || busy) return;
    setBusy(true);
    const vp = viewportRef.current;
    if (!vp) return;
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;

    // posición de la imagen en el viewport
    const imgLeft = vw / 2 + offset.x - dispW / 2;
    const imgTop = vh / 2 + offset.y - dispH / 2;

    // rect del marco en el viewport
    const fx = vw / 2 - frame.w / 2;
    const fy = vh / 2 - frame.h / 2;

    // convertir a coordenadas de la imagen original
    const sx = (fx - imgLeft) / scale;
    const sy = (fy - imgTop) / scale;
    const sw = frame.w / scale;
    const sh = frame.h / scale;

    const canvas = document.createElement("canvas");
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUT_W, OUT_H);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setBusy(false);
          return;
        }
        const name = file.name.replace(/\.\w+$/, "") + "-encuadre.jpg";
        const out = new File([blob], name, { type: "image/jpeg" });
        setBusy(false);
        onConfirm(out);
      },
      "image/jpeg",
      0.9,
    );
  };

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black">
      {/* encabezado */}
      <div className="flex items-center justify-between px-4 pt-3">
        <p className="font-heading text-lg tracking-widest text-gold">ENCUADRA LA FOTO</p>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancelar recorte"
          className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={18} strokeWidth={2} />
        </button>
      </div>
      <p className="px-4 pb-2 text-[11px] text-zinc-500">
        Arrastra para mover y usa el zoom para que toda la prenda quede dentro del
        marco dorado. Lo oscuro se recorta.
      </p>
      {loadError && (
        <p className="px-4 pb-2 text-[11px] text-red-400">
          No se pudo leer esa imagen. Prueba con otra foto.
        </p>
      )}

      {/* área de trabajo */}
      <div
        ref={viewportRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
        className="relative flex-1 touch-none select-none overflow-hidden"
      >
        {img && (
          <img
            src={img.src}
            alt="Encuadrando"
            draggable={false}
            className="pointer-events-none absolute"
            style={{
              left: "50%",
              top: "50%",
              width: dispW,
              height: dispH,
              transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
            }}
          />
        )}

        {/* máscara oscura fuera del marco (4 franjas exactas) */}
        {frame.w > 0 && (
          <>
            <div
              className="pointer-events-none absolute inset-x-0 top-0 bg-black/70"
              style={{ bottom: `calc(50% + ${frame.h / 2}px)` }}
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/70"
              style={{ top: `calc(50% + ${frame.h / 2}px)` }}
            />
            <div
              className="pointer-events-none absolute top-0 bottom-0 left-0 bg-black/70"
              style={{ right: `calc(50% + ${frame.w / 2}px)` }}
            />
            <div
              className="pointer-events-none absolute top-0 bottom-0 right-0 bg-black/70"
              style={{ left: `calc(50% + ${frame.w / 2}px)` }}
            />

            {/* el marco dorado */}
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 border-2 border-gold shadow-[0_0_0_9999px_rgba(0,0,0,0)]"
              style={{
                width: frame.w,
                height: frame.h,
                transform: "translate(-50%, -50%)",
              }}
            >
              {/* esquinas de guía */}
              <span className="absolute -left-0.5 -top-0.5 h-4 w-4 border-l-4 border-t-4 border-gold" />
              <span className="absolute -right-0.5 -top-0.5 h-4 w-4 border-r-4 border-t-4 border-gold" />
              <span className="absolute -bottom-0.5 -left-0.5 h-4 w-4 border-b-4 border-l-4 border-gold" />
              <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 border-b-4 border-r-4 border-gold" />
            </div>
          </>
        )}
      </div>

      {/* controles */}
      <div className="border-t border-white/10 bg-black px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto flex max-w-sm items-center gap-3">
          <button
            type="button"
            aria-label="Alejar"
            onClick={() => setZoomClamped(zoom - 0.25)}
            className="flex h-10 w-10 items-center justify-center border border-white/20 text-white transition-colors hover:border-gold"
          >
            <Minus size={16} strokeWidth={2.5} />
          </button>
          <input
            type="range"
            min={1}
            max={4}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoomClamped(Number(e.target.value))}
            aria-label="Zoom de la foto"
            className="h-1 flex-1 accent-[#d4af37]"
          />
          <button
            type="button"
            aria-label="Acercar"
            onClick={() => setZoomClamped(zoom + 0.25)}
            className="flex h-10 w-10 items-center justify-center border border-white/20 text-white transition-colors hover:border-gold"
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
        </div>
        <button
          type="button"
          onClick={confirm}
          disabled={busy || !img}
          className="font-heading mt-3 flex w-full items-center justify-center gap-2 bg-gold py-3.5 text-lg tracking-widest text-black transition-colors hover:bg-gold-dark disabled:opacity-50"
        >
          <Check size={18} strokeWidth={3} />
          {busy ? "PROCESANDO…" : "CONFIRMAR ENCUADRE"}
        </button>
      </div>
    </div>
  );
}
