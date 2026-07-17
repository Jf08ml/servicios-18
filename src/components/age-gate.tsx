"use client";

import { useEffect, useState } from "react";
import { SITE_NAME } from "@/lib/site";

const STORAGE_KEY = "s18_age_ok";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 año

/**
 * Puerta de verificación de edad (+18). Es un overlay de cliente: el contenido
 * se sirve igual del lado del servidor (los buscadores lo indexan normal),
 * pero el visitante no puede interactuar hasta confirmar su mayoría de edad.
 * La confirmación persiste en localStorage y en una cookie (por si en el
 * futuro se quiere leer del lado del servidor).
 */
export function AgeGate() {
  // null = aún no sabemos (evita parpadeo en visitantes que ya confirmaron)
  const [accepted, setAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    setAccepted(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  useEffect(() => {
    document.body.style.overflow = accepted === false ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [accepted]);

  if (accepted !== false) return null;

  const confirm = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    document.cookie = `${STORAGE_KEY}=1; max-age=${COOKIE_MAX_AGE}; path=/; samesite=lax`;
    setAccepted(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/95 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center shadow-2xl">
        <p className="mx-auto mb-4 w-fit rounded-full border border-fuchsia-800 bg-fuchsia-950/40 px-4 py-1 text-xs font-semibold tracking-wide text-fuchsia-300">
          Contenido para adultos
        </p>
        <h2 id="age-gate-title" className="text-2xl font-extrabold tracking-tight text-white">
          ¿Eres mayor de 18 años?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          {SITE_NAME} contiene imágenes y contenido explícito para adultos. Al
          entrar confirmas que tienes al menos 18 años (o la mayoría de edad de
          tu país) y que ver este contenido es legal donde te encuentras.
        </p>
        <div className="mt-6 space-y-3">
          <button
            onClick={confirm}
            className="w-full rounded-xl bg-fuchsia-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-fuchsia-500"
          >
            Tengo 18 años o más — Entrar
          </button>
          <a
            href="https://www.google.com"
            className="block w-full rounded-xl border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
          >
            Soy menor de edad — Salir
          </a>
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-zinc-600">
          Este aviso se guarda en tu dispositivo durante un año. Solo perfiles
          de personas adultas con identidad verificada.
        </p>
      </div>
    </div>
  );
}
