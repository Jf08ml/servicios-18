"use client";

import { useEffect } from "react";
import { whatsappHref } from "@/lib/format";

/**
 * Modal de foto/video a pantalla completa, compartido por MediaGallery (con
 * navegación entre varios ítems) y el avatar de perfil (una sola foto). Si se
 * pasa `phone`, muestra un botón de contacto por WhatsApp debajo de la foto.
 */
export function PhotoLightbox({
  src,
  mediaKey,
  alt,
  isVideo,
  phone,
  counter,
  onClose,
  onPrev,
  onNext,
}: {
  src: string;
  /** Fuerza el remount del <video>/<img> al navegar, para que el video autoreproduzca. */
  mediaKey?: string;
  alt?: string;
  isVideo?: boolean;
  phone?: string | null;
  counter?: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNext?.();
      if (e.key === "ArrowLeft") onPrev?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, onPrev, onNext]);

  const waHref = phone ? whatsappHref(phone) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute right-4 top-4 z-10 rounded-full bg-zinc-800/80 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-700"
      >
        ✕
      </button>

      {onPrev && onNext && (
        <>
          <button
            type="button"
            aria-label="Anterior"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
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
              onNext();
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
        {isVideo ? (
          <video
            key={mediaKey}
            src={src}
            controls
            autoPlay
            playsInline
            className="max-h-[82dvh] w-auto max-w-full rounded-xl"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={mediaKey}
            src={src}
            alt={alt ?? ""}
            className="max-h-[82dvh] w-auto max-w-full rounded-xl"
          />
        )}
        {counter && <figcaption className="text-sm text-zinc-400">{counter}</figcaption>}
        {waHref && (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-500"
          >
            📱 {phone}
          </a>
        )}
      </figure>
    </div>
  );
}
