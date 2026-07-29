"use client";

import { useCallback, useState } from "react";
import { PhotoLightbox } from "./photo-lightbox";

type GalleryItem = { id: string; kind: "IMAGE" | "VIDEO"; filePath: string };

/**
 * Grilla de fotos y videos de un perfil. Al cliquear un ítem se abre un
 * modal (lightbox) con navegación por flechas y cierre con Escape.
 */
export function MediaGallery({
  items,
  ownerName,
  phone,
}: {
  items: GalleryItem[];
  /** Nombre del dueño de la galería, para el texto alt de las fotos. */
  ownerName?: string;
  /** Si se pasa, el lightbox muestra un botón de contacto por WhatsApp. */
  phone?: string | null;
}) {
  const [current, setCurrent] = useState<number | null>(null);

  const step = useCallback(
    (delta: number) => {
      setCurrent((c) => (c === null ? null : (c + delta + items.length) % items.length));
    },
    [items.length]
  );

  const item = current === null ? null : items[current];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((m, i) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setCurrent(i)}
            title={m.kind === "VIDEO" ? "Reproducir video" : "Ver foto"}
            className="group relative cursor-pointer"
          >
            {m.kind === "VIDEO" ? (
              <video
                src={`/api/files/${m.filePath}`}
                muted
                preload="metadata"
                playsInline
                className="pointer-events-none aspect-square w-full rounded-xl border border-zinc-800 bg-black object-cover"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/files/${m.filePath}`}
                alt={ownerName ? `Foto ${i + 1} de ${ownerName}` : ""}
                loading="lazy"
                className="aspect-square w-full rounded-xl border border-zinc-800 object-cover transition group-hover:opacity-85"
              />
            )}
            {m.kind === "VIDEO" && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="rounded-full bg-black/60 px-3 py-1.5 text-sm text-white transition group-hover:bg-fuchsia-600/80">
                  ▶
                </span>
              </span>
            )}
          </button>
        ))}
      </div>

      {item && (
        <PhotoLightbox
          mediaKey={item.id}
          src={`/api/files/${item.filePath}`}
          alt={ownerName ? `Foto de ${ownerName}` : ""}
          isVideo={item.kind === "VIDEO"}
          phone={phone}
          counter={items.length > 1 ? `${(current ?? 0) + 1} / ${items.length}` : undefined}
          onClose={() => setCurrent(null)}
          onPrev={items.length > 1 ? () => step(-1) : undefined}
          onNext={items.length > 1 ? () => step(1) : undefined}
        />
      )}
    </>
  );
}
