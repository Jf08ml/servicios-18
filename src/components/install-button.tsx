"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Botón de instalación directa. Solo aparece cuando el navegador ofrece el
 * prompt nativo (Chrome/Edge en Android y escritorio). En iPhone no existe
 * ese API: ahí aplican las instrucciones manuales de la página.
 */
export function InstallButton() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) {
    return (
      <p className="inline-flex items-center gap-2 rounded-lg border border-emerald-800 bg-emerald-950/40 px-4 py-2 text-sm font-medium text-emerald-200">
        ✓ Ya tienes la app instalada en este dispositivo
      </p>
    );
  }

  if (!promptEvent) return null;

  return (
    <button
      type="button"
      onClick={() => promptEvent.prompt()}
      className="inline-flex items-center gap-2 rounded-lg bg-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-fuchsia-500"
    >
      📲 Instalar la app ahora
    </button>
  );
}
