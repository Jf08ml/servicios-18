"use client";

import { useActionState } from "react";
import { submitQuickVerificationAction, type VerificationFormState } from "./actions";
import { SubmitButton } from "@/components/submit-button";
import { input, label } from "@/lib/ui";

export function QuickVerificationForm() {
  const [state, formAction] = useActionState<VerificationFormState, FormData>(
    submitQuickVerificationAction,
    {}
  );

  const today = new Date().toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  if (state.ok) {
    return (
      <p className="rounded-lg border border-emerald-800 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
        ✓ Foto enviada. Te avisaremos por notificación cuando la revisión
        termine (normalmente menos de 24 horas).
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <ol className="list-decimal space-y-2 pl-5 text-sm text-zinc-300">
        <li>
          Escribe a mano en un papel:{" "}
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-fuchsia-300">
            Mis Escorts · {today}
          </span>
        </li>
        <li>Tómate una foto sosteniendo el papel. Tu rostro y el texto deben verse con claridad.</li>
        <li>Súbela aquí. La fecha debe ser la de hoy: así validamos que la foto es tuya y reciente.</li>
      </ol>

      <div>
        <label htmlFor="photo" className={label}>
          Foto sosteniendo el papel
        </label>
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className={input + " file:mr-3 file:rounded file:border-0 file:bg-zinc-700 file:px-3 file:py-1 file:text-xs file:text-white"}
        />
        <p className="mt-1 text-xs text-zinc-500">
          Solo la ve el equipo de revisión, nunca otros usuarios.
        </p>
      </div>

      <label className="flex items-start gap-2 text-sm text-zinc-300">
        <input type="checkbox" name="premium" className="mt-0.5 accent-amber-500" />
        <span>
          Solicitar <span className="font-medium text-amber-300">verificación premium</span>{" "}
          (revisión prioritaria y distintivo especial en tu perfil).
        </span>
      </label>

      {state.error && (
        <p className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <SubmitButton>Enviar para revisión</SubmitButton>
    </form>
  );
}
