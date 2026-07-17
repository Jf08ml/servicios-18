"use client";

import { useCallback, useEffect, useState } from "react";

type GalleryItem = { id: string; kind: "IMAGE" | "VIDEO"; filePath: string };

/**
 * Grilla de fotos y videos de un perfil. Al cliquear un ítem se abre un
 * modal (lightbox) con navegación por flechas y cierre con Escape.
 */
export function MediaGallery({
  items,
  ownerName,
}: {
  items: GalleryItem[];
  /** Nombre del dueño de la galería, para el texto alt de las fotos. */
  ownerName?: string;
}) {
  const [current, setCurrent] = useState<number | null>(null);

  const step = useCallback(
    (delta: number) => {
      setCurrent((c) => (c === null ? null : (c + delta + items.length) % items.length));
    },
    [items.length]
  );

  useEffect(() => {
    if (current === null) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCurrent(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [current, step]);

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
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setCurrent(null)}
        >
          <button
            type="button"
            onClick={() => setCurrent(null)}
            aria-label="Cerrar"
            className="absolute right-4 top-4 z-10 rounded-full bg-zinc-800/80 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-700"
          >
            ✕
          </button>

          {items.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Anterior"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                className="absolute left-2 z-10 rounded-full bg-zinc-800/80 px-3 py-2 text-lg text-white transition hover:bg-fuchsia-600 sm:left-4"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Siguiente"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                className="absolute right-2 z-10 rounded-full bg-zinc-800/80 px-3 py-2 text-lg text-white transition hover:bg-fuchsia-600 sm:right-4"
              >
                ›
              </button>
            </>
          )}

          <figure
            className="flex max-h-full flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            {item.kind === "VIDEO" ? (
              <video
                key={item.id}
                src={`/api/files/${item.filePath}`}
                controls
                autoPlay
                playsInline
                className="max-h-[82dvh] w-auto max-w-full rounded-xl"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={item.id}
                src={`/api/files/${item.filePath}`}
                alt={ownerName ? `Foto de ${ownerName}` : ""}
                className="max-h-[82dvh] w-auto max-w-full rounded-xl"
              />
            )}
            {items.length > 1 && (
              <figcaption className="text-sm text-zinc-400">
                {(current ?? 0) + 1} / {items.length}
              </figcaption>
            )}
          </figure>
        </div>
      )}
    </>
  );
}
