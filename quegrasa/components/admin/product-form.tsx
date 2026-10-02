"use client";

// Formulario "Subir prenda" (spec §5.2):
// fotos → Cloudinary directo | tallas sugeridas + libres | precio USD/Bs en vivo.

import { useActionState, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createProduct, type ProductFormState } from "@/lib/actions/products";
import { formatBs, usdToBs } from "@/lib/money";
import { CheckCircle2, ImagePlus, X, Plus } from "lucide-react";
import ImageCropper from "@/components/admin/image-cropper";

type SizeOption = { id: string; name: string };
type Photo = { url: string; publicId: string };
type Variant = { sizeName: string; stock: number };

const MAX_PHOTOS = 5;
const MAX_FILE_MB = 8;

export default function ProductForm({
  categories,
  sizes,
  rate,
}: {
  categories: { id: string; name: string }[];
  sizes: SizeOption[];
  rate: number | null;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(
    createProduct,
    {},
  );

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // cola de recortes: cada foto pasa por el encuadre antes de subirse
  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const cropping = cropQueue[0] ?? null;

  const [price, setPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [isOffer, setIsOffer] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState<Variant[]>([]);
  const [newSize, setNewSize] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const rateNum = rate ?? 0;
  const priceNum = Number(price) || 0;

  // ---------- Fotos ----------

  const uploadToCloudinary = useCallback(async (file: File): Promise<Photo | null> => {
    setUploadError(null);
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setUploadError(`"${file.name}" pesa más de ${MAX_FILE_MB}MB`);
      return null;
    }
    try {
      const sign = (await (await fetch("/api/cloudinary/sign")).json()) as {
        ok: boolean;
        cloudName: string;
        apiKey: string;
        timestamp: string;
        folder: string;
        signature: string;
      };
      if (!sign.ok) throw new Error("No se pudo firmar la subida");

      const body = new FormData();
      body.append("file", file);
      body.append("api_key", sign.apiKey);
      body.append("timestamp", sign.timestamp);
      body.append("folder", sign.folder);
      body.append("signature", sign.signature);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`,
        { method: "POST", body },
      );
      if (!res.ok) throw new Error("Cloudinary rechazó la imagen");
      const data = (await res.json()) as { secure_url: string; public_id: string };
      return { url: data.secure_url, publicId: data.public_id };
    } catch {
      setUploadError("Error subiendo la foto. Revisa tu conexión e intenta de nuevo.");
      return null;
    }
  }, []);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const space = MAX_PHOTOS - photos.length - cropQueue.length;
    const list = Array.from(files).slice(0, space);
    if (list.length === 0) return;
    // todas pasan primero por el recortador interactivo
    setCropQueue((prev) => [...prev, ...list]);
    if (fileInput.current) fileInput.current.value = "";
  };

  // el recortador confirmó el encuadre: subir a Cloudinary y seguir con la cola
  const onCropped = useCallback(
    async (croppedFile: File) => {
      setCropQueue((prev) => prev.slice(1));
      setUploading(true);
      const photo = await uploadToCloudinary(croppedFile);
      if (photo) setPhotos((prev) => [...prev, photo]);
      setUploading(false);
    },
    [uploadToCloudinary],
  );

  const onCropCancel = useCallback(() => {
    setCropQueue((prev) => prev.slice(1));
  }, []);

  const removePhoto = (publicId: string) =>
    setPhotos((prev) => prev.filter((p) => p.publicId !== publicId));

  // ---------- Tallas ----------

  const addSize = (name: string) => {
    const clean = name.trim().slice(0, 10);
    if (!clean) return;
    if (selectedSizes.some((v) => v.sizeName.toLowerCase() === clean.toLowerCase())) return;
    setSelectedSizes((prev) => [...prev, { sizeName: clean, stock: 1 }]);
    setNewSize("");
  };

  const changeStock = (sizeName: string, delta: number) =>
    setSelectedSizes((prev) =>
      prev.map((v) =>
        v.sizeName === sizeName
          ? { ...v, stock: Math.max(0, Math.min(999, v.stock + delta)) }
          : v,
      ),
    );

  const removeSize = (sizeName: string) =>
    setSelectedSizes((prev) => prev.filter((v) => v.sizeName !== sizeName));

  // ---------- Submit ----------

  const onSubmit = (formData: FormData) => {
    formData.set("images", JSON.stringify(photos));
    formData.set("categories", JSON.stringify(selectedCategories));
    formData.set(
      "variants",
      JSON.stringify(selectedSizes.filter((v) => v.stock > 0)),
    );
    formAction(formData);
  };

  if (state.success) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle2 size={32} strokeWidth={1.5} className="text-emerald-600" />
        <p className="mt-3 text-sm font-semibold text-emerald-800">
          Prenda publicada
        </p>
        <p className="mt-1 text-xs text-emerald-700">
          Ya es visible en el inventario.
        </p>
        <button
          onClick={() => router.push("/admin/inventario")}
          className="mt-5 rounded-lg bg-gold px-4 py-2.5 text-xs font-bold text-zinc-950 transition hover:bg-gold-dark"
        >
          Ir al inventario
        </button>
      </div>
    );
  }

  return (
    <form action={onSubmit} className="space-y-6">
      {/* ---------- Fotos ---------- */}
      <section>
        <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Fotos (máximo {MAX_PHOTOS})
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <div key={p.publicId} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt=""
                className="aspect-square w-full rounded-lg object-cover ring-1 ring-zinc-200"
              />
              <button
                type="button"
                onClick={() => removePhoto(p.publicId)}
                className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-white shadow"
                aria-label="Quitar foto"
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-300 text-zinc-400 transition hover:border-zinc-400 hover:text-zinc-600 active:scale-95 disabled:opacity-50"
            >
              <ImagePlus size={20} strokeWidth={1.5} />
              <span className="text-[11px] font-medium">
                {uploading ? "Subiendo…" : "Agregar"}
              </span>
            </button>
          )}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {/* Recortador interactivo: una foto a la vez antes de subir */}
        {cropping && (
          <ImageCropper
            key={cropping.name + cropping.size}
            file={cropping}
            onConfirm={onCropped}
            onCancel={onCropCancel}
          />
        )}
        {uploadError && (
          <p className="mt-2 text-xs text-red-600">{uploadError}</p>
        )}
      </section>

      {/* ---------- Datos ---------- */}
      <section className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-xs font-medium text-zinc-600">
            Nombre de la prenda
          </label>
          <input
            id="name"
            name="name"
            required
            placeholder="Ej: Jean recto azul"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
          />
          {state.fieldErrors?.name && (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.name}</p>
          )}
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-zinc-600">
            Categorías <span className="text-zinc-400">(toca todas las que apliquen)</span>
          </span>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => {
              const sel = selectedCategories.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() =>
                    setSelectedCategories((prev) =>
                      sel ? prev.filter((x) => x !== c.id) : [...prev, c.id],
                    )
                  }
                  className={`rounded-full px-3.5 py-2 text-xs font-semibold transition active:scale-95 ${
                    sel
                      ? "bg-zinc-900 text-gold"
                      : "border border-zinc-300 bg-white text-zinc-600 hover:border-zinc-500"
                  }`}
                >
                  {sel ? "✓ " : ""}
                  {c.name}
                </button>
              );
            })}
          </div>
          {state.fieldErrors?.categories && (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.categories}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="price" className="mb-1.5 block text-xs font-medium text-zinc-600">
              Precio (USD)
            </label>
            <input
              id="price"
              name="price"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="15.00"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm tabular-nums outline-none transition focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
            />
            {rateNum > 0 && priceNum > 0 && (
              <p className="mt-1 text-[10px] tabular-nums text-zinc-400">
                ≈ {formatBs(usdToBs(priceNum, rateNum))}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-zinc-600">
              <input
                type="checkbox"
                checked={isOffer}
                onChange={(e) => {
                  setIsOffer(e.target.checked);
                  if (!e.target.checked) setSalePrice("");
                }}
                className="h-3.5 w-3.5 accent-zinc-900"
              />
              En oferta
            </label>
            <input
              name="salePrice"
              type="number"
              step="0.01"
              min="0.01"
              disabled={!isOffer}
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              placeholder="12.00"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm tabular-nums outline-none transition focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 disabled:bg-zinc-50 disabled:text-zinc-300"
            />
            {isOffer && rateNum > 0 && Number(salePrice) > 0 && (
              <p className="mt-1 text-[10px] tabular-nums text-red-500">
                ≈ {formatBs(usdToBs(Number(salePrice), rateNum))}
              </p>
            )}
          </div>
        </div>
        {(state.fieldErrors?.price || state.fieldErrors?.salePrice) && (
          <p className="text-xs text-red-600">
            {state.fieldErrors.price ?? state.fieldErrors.salePrice}
          </p>
        )}

        <div>
          <label htmlFor="description" className="mb-1.5 block text-xs font-medium text-zinc-600">
            Descripción <span className="font-normal text-zinc-400">(opcional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={2}
            placeholder="Color, tela, detalles…"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
          />
        </div>
      </section>

      {/* ---------- Tallas ---------- */}
      <section>
        <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Tallas y stock
        </h2>

        {selectedSizes.length > 0 && (
          <div className="mb-3 space-y-1.5">
            {selectedSizes.map((v) => (
              <div
                key={v.sizeName}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2"
              >
                <span className="text-xs font-semibold text-zinc-900">
                  {v.sizeName}
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    role="button"
                    onClick={() => changeStock(v.sizeName, -1)}
                    className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                  >
                    −
                  </span>
                  <span className="w-7 text-center text-xs font-bold tabular-nums text-zinc-900">
                    {v.stock}
                  </span>
                  <span
                    role="button"
                    onClick={() => changeStock(v.sizeName, +1)}
                    className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                  >
                    +
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSize(v.sizeName)}
                    className="ml-1 text-[10px] font-medium text-zinc-300 transition hover:text-red-600"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {sizes
            .filter(
              (s) =>
                !selectedSizes.some(
                  (v) => v.sizeName.toLowerCase() === s.name.toLowerCase(),
                ),
            )
            .map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => addSize(s.name)}
                className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-zinc-400 hover:bg-zinc-50 active:scale-95"
              >
                {s.name}
              </button>
            ))}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={newSize}
            onChange={(e) => setNewSize(e.target.value)}
            placeholder="Otra talla (ej: XXL)…"
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-xs outline-none transition focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
          />
          <button
            type="button"
            onClick={() => addSize(newSize)}
            disabled={!newSize.trim()}
            className="flex items-center gap-1 rounded-lg bg-gold px-3 py-2 text-xs font-bold text-zinc-950 transition hover:bg-gold-dark disabled:opacity-40"
          >
            <Plus size={12} strokeWidth={2.5} />
            Agregar
          </button>
        </div>
        {state.fieldErrors?.variants && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.variants}</p>
        )}
      </section>

      {(state.error || state.fieldErrors?.images) && (
        <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
          {state.error ?? state.fieldErrors?.images}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={
            pending ||
            uploading ||
            photos.length === 0 ||
            selectedSizes.length === 0 ||
            selectedCategories.length === 0
          }
          className="w-full rounded-lg bg-gold py-3 text-sm font-bold text-zinc-950 transition hover:bg-gold-dark active:scale-[0.98] disabled:opacity-40"
        >
          {pending ? "Publicando…" : "Publicar prenda"}
        </button>
        <p className="mt-2 text-center text-[11px] text-zinc-400">
          Aparece en el catálogo público al instante
        </p>
      </div>
    </form>
  );
}
