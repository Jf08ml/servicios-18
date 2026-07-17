"use client";

import { useEffect, useState } from "react";
import { savePushSubscriptionAction, deletePushSubscriptionAction } from "./actions";

type PushState = "unsupported" | "loading" | "off" | "on" | "denied";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function PushToggle() {
  const [state, setState] = useState<PushState>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("off"));
  }, []);

  async function enable() {
    setError(null);
    setState("loading");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""
        ) as BufferSource,
      });
      const json = sub.toJSON();
      const result = await savePushSubscriptionAction({
        endpoint: sub.endpoint,
        keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
      });
      if (result.error) throw new Error(result.error);
      setState("on");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo activar");
      setState("off");
    }
  }

  async function disable() {
    setError(null);
    setState("loading");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscriptionAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setState("on");
    }
  }

  if (state === "unsupported") return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">
            Notificaciones en este dispositivo
          </p>
          <p className="text-xs text-zinc-500">
            {state === "on"
              ? "Activadas: te avisaremos aunque no tengas la app abierta."
              : state === "denied"
                ? "Bloqueadas por el navegador. Habilítalas en la configuración del sitio."
                : "Opcional. Solo avisos de tu actividad; nunca publicidad ni correos."}
          </p>
        </div>
        {state !== "denied" && (
          <button
            type="button"
            disabled={state === "loading"}
            onClick={state === "on" ? disable : enable}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
              state === "on"
                ? "border border-zinc-700 text-zinc-300 hover:border-zinc-500"
                : "bg-fuchsia-600 text-white hover:bg-fuchsia-500"
            }`}
          >
            {state === "loading" ? "…" : state === "on" ? "Desactivar" : "Activar"}
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
