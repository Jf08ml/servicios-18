"use client";

import { useActionState } from "react";
import {
  addGalleryMediaAction,
  deleteGalleryMediaAction,
  type ProfileFormState,
} from "./actions";
import { SubmitButton } from "@/components/submit-button";
import { input, label } from "@/lib/ui";

type GalleryItem = { id: string; kind: "IMAGE" | "VIDEO"; filePath: string };

export function GalleryManager({
  items,
  limit,
}: {
  items: GalleryItem[];
  limit: number;
}) {
  const [state, formAction] = useActionState<ProfileFormState, FormData>(
    addGalleryMediaAction,
    {}
  );

  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((m) => (
            <div key={m.id} className="group relative">
              {m.kind === "VIDEO" ? (
                <video
                  src={`/api/files/${m.filePath}`}
                  controls
                  preload="metadata"
                  playsInline
                  className="aspect-square w-full rounded-xl border border-zinc-800 bg-black object-contain"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/files/${m.filePath}`}
                  alt=""
                  loading="lazy"
                  className="aspect-square w-full rounded-xl border border-zinc-800 object-cover"
                />
              )}
              <form action={deleteGalleryMediaAction} className="absolute right-2 top-2">
                <input type="hidden" name="id" value={m.id} />
                <button
                  type="submit"
                  title="Eliminar de la galería"
                  className="rounded-lg bg-black/70 px-2 py-1 text-xs font-medium text-red-300 transition hover:bg-red-950 hover:text-red-200"
                >
                  ✕ Eliminar
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      {items.length < limit ? (
        <form action={formAction} className="space-y-3">
          <div>
            <label htmlFor="media" className={label}>
              Agregar fotos o videos ({items.length}/{limit})
            </label>
            <input
              id="media"
              name="media"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              className={
                input +
                " file:mr-3 file:rounded file:border-0 file:bg-zinc-700 file:px-3 file:py-1 file:text-xs file:text-white"
              }
            />
            <p className="mt-1 text-xs text-zinc-500">
              Fotos JPG, PNG o WebP (máx. 8 MB) · Videos MP4 o WebM (máx. 50 MB)
            </p>
          </div>

          {state.error && (
            <p className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
              {state.error}
            </p>
          )}
          {state.ok && (
            <p className="rounded-lg border border-emerald-800 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
              ✓ Galería actualizada
            </p>
          )}

          <SubmitButton>Subir a la galería</SubmitButton>
        </form>
      ) : (
        <p className="text-sm text-zinc-500">
          Alcanzaste el máximo de {limit} archivos. Elimina alguno para subir más.
        </p>
      )}
    </div>
  );
}
