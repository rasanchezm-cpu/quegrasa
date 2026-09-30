"use client";

// Formulario "Subir prenda" (spec §5.2):
// fotos → Cloudinary directo | tallas sugeridas + libres | precio USD/Bs en vivo.

import { useActionState, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createProduct, type ProductFormState } from "@/lib/actions/products";
import { formatBs, usdToBs } from "@/lib/money";

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

  const [price, setPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [isOffer, setIsOffer] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState<Variant[]>([]);
  const [newSize, setNewSize] = useState("");

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

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const space = MAX_PHOTOS - photos.length;
    const list = Array.from(files).slice(0, space);
    if (list.length === 0) return;
    setUploading(true);
    for (const f of list) {
      const photo = await uploadToCloudinary(f);
      if (photo) setPhotos((prev) => [...prev, photo]);
    }
    setUploading(false);
    if (fileInput.current) fileInput.current.value = "";
  };

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
    formData.set(
      "variants",
      JSON.stringify(selectedSizes.filter((v) => v.stock > 0)),
    );
    formAction(formData);
  };

  if (state.success) {
    return (
      <div className="rounded-2xl bg-emerald-50 p-8 text-center text-emerald-800">
        <p className="text-5xl">✅</p>
        <p className="mt-3 text-lg font-semibold">¡Prenda publicada!</p>
        <p className="mt-1 text-sm">Ya es visible en el inventario.</p>
        <button
          onClick={() => router.push("/admin/inventario")}
          className="mt-5 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white"
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
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">
          Fotos (hasta {MAX_PHOTOS})
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <div key={p.publicId} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt=""
                className="aspect-square w-full rounded-xl object-cover ring-1 ring-black/5"
              />
              <button
                type="button"
                onClick={() => removePhoto(p.publicId)}
                className="absolute -right-1.5 -top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-sm font-bold text-white shadow"
                aria-label="Quitar foto"
              >
                ✕
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-neutral-300 text-neutral-400 transition active:scale-95 disabled:opacity-50"
            >
              <span className="text-3xl">📷</span>
              <span className="text-xs font-medium">
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
        {uploadError && (
          <p className="mt-2 text-sm text-red-600">{uploadError}</p>
        )}
      </section>

      {/* ---------- Datos ---------- */}
      <section className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-semibold text-neutral-700">
            Nombre
          </label>
          <input
            id="name"
            name="name"
            required
            placeholder="Ej: Jean recto azul"
            className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-violet-500"
          />
          {state.fieldErrors?.name && (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.name}</p>
          )}
        </div>

        <div>
          <label htmlFor="categoryId" className="mb-1.5 block text-sm font-semibold text-neutral-700">
            Categoría
          </label>
          <select
            id="categoryId"
            name="categoryId"
            required
            defaultValue=""
            className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-violet-500"
          >
            <option value="" disabled>
              Elige una categoría…
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="price" className="mb-1.5 block text-sm font-semibold text-neutral-700">
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
              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-violet-500"
            />
            {rateNum > 0 && priceNum > 0 && (
              <p className="mt-1 text-xs text-neutral-500">
                ≈ {formatBs(usdToBs(priceNum, rateNum))}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-neutral-700">
              <input
                type="checkbox"
                checked={isOffer}
                onChange={(e) => {
                  setIsOffer(e.target.checked);
                  if (!e.target.checked) setSalePrice("");
                }}
                className="h-4 w-4 accent-violet-600"
              />
              ¿En oferta?
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
              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-violet-500 disabled:bg-neutral-100 disabled:text-neutral-400"
            />
            {isOffer && rateNum > 0 && Number(salePrice) > 0 && (
              <p className="mt-1 text-xs text-rose-600">
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
          <label htmlFor="description" className="mb-1.5 block text-sm font-semibold text-neutral-700">
            Descripción <span className="font-normal text-neutral-400">(opcional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={2}
            placeholder="Color, tela, detalles…"
            className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-violet-500"
          />
        </div>
      </section>

      {/* ---------- Tallas ---------- */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">
          Tallas y stock
        </h2>

        {selectedSizes.length > 0 && (
          <div className="mb-3 space-y-2">
            {selectedSizes.map((v) => (
              <div
                key={v.sizeName}
                className="flex items-center justify-between rounded-xl bg-white px-4 py-2.5 ring-1 ring-black/5"
              >
                <span className="font-semibold">{v.sizeName}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => changeStock(v.sizeName, -1)}
                    className="h-8 w-8 rounded-lg bg-neutral-100 text-lg font-bold text-neutral-600"
                  >
                    −
                  </button>
                  <input
                    readOnly
                    value={v.stock}
                    className="w-10 bg-transparent text-center font-semibold"
                    aria-label={`Stock talla ${v.sizeName}`}
                  />
                  <button
                    type="button"
                    onClick={() => changeStock(v.sizeName, +1)}
                    className="h-8 w-8 rounded-lg bg-neutral-100 text-lg font-bold text-neutral-600"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSize(v.sizeName)}
                    className="ml-1 text-sm text-red-500"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
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
                className="rounded-full bg-white px-4 py-2 text-sm font-medium ring-1 ring-neutral-300 transition active:scale-95"
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
            className="flex-1 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-violet-500"
          />
          <button
            type="button"
            onClick={() => addSize(newSize)}
            disabled={!newSize.trim()}
            className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Agregar
          </button>
        </div>
        {state.fieldErrors?.variants && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.variants}</p>
        )}
      </section>

      {(state.error || state.fieldErrors?.images) && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error ?? state.fieldErrors?.images}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || uploading || photos.length === 0 || selectedSizes.length === 0}
        className="w-full rounded-xl bg-violet-600 py-4 text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
      >
        {pending ? "Publicando…" : "Publicar prenda"}
      </button>
      <p className="text-center text-xs text-neutral-400">
        Aparece en el catálogo público al instante
      </p>
    </form>
  );
}
