"use client";

import { useState, useTransition } from "react";
import { sendSosAction, type SosResult } from "@/app/(app)/actions";

export function SosButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<SosResult | null>(null);
  const [pending, startTransition] = useTransition();

  function send() {
    const dispatch = (coords?: GeolocationCoordinates) => {
      startTransition(async () => {
        const res = await sendSosAction({
          message,
          latitude: coords?.latitude,
          longitude: coords?.longitude,
        });
        setResult(res);
      });
    };

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => dispatch(pos.coords),
        () => dispatch(),
        { timeout: 4000 }
      );
    } else {
      dispatch();
    }
  }

  function close() {
    setOpen(false);
    setResult(null);
    setMessage("");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Botón de emergencia SOS"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-sm font-extrabold text-white shadow-lg shadow-red-950 transition hover:scale-105 hover:bg-red-500"
      >
        SOS
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
            {result?.ok ? (
              <div>
                <h2 className="text-lg font-bold text-white">🚨 Alerta enviada</h2>
                <p className="mt-2 text-sm text-zinc-300">
                  Tu alerta quedó registrada con fecha, hora
                  {" "}y ubicación (si estaba disponible). El equipo de la
                  plataforma la está monitoreando.
                </p>
                {result.contacts && result.contacts.length > 0 ? (
                  <div className="mt-4 rounded-xl border border-zinc-700 bg-zinc-950 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Tus contactos de emergencia
                    </p>
                    <ul className="mt-2 space-y-1">
                      {result.contacts.map((c) => (
                        <li key={c.phone} className="flex justify-between text-sm text-zinc-200">
                          <span>{c.name}</span>
                          <a href={`tel:${c.phone}`} className="font-mono text-fuchsia-300">
                            {c.phone}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-amber-300">
                    No tienes contactos de emergencia configurados. Agrégalos en
                    tu perfil para tenerlos a la mano en una emergencia.
                  </p>
                )}
                <p className="mt-3 text-xs text-zinc-500">
                  Si estás en peligro inmediato llama a la línea de emergencia
                  local (123 en Colombia).
                </p>
                <button
                  onClick={close}
                  className="mt-4 w-full rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <div>
                <h2 className="text-lg font-bold text-white">Enviar alerta SOS</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Se registrará una alerta con tu identidad, la hora y tu
                  ubicación aproximada para que el equipo pueda actuar.
                </p>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Mensaje opcional (dónde estás, qué sucede…)"
                  rows={3}
                  className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-red-500"
                />
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={close}
                    className="flex-1 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:border-zinc-500"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={send}
                    disabled={pending}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50"
                  >
                    {pending ? "Enviando…" : "🚨 Enviar SOS"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
