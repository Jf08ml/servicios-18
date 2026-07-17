"use client";

import { useActionState } from "react";
import { submitVerificationAction, type VerificationFormState } from "./actions";
import { SubmitButton } from "@/components/submit-button";
import { input, label } from "@/lib/ui";

export function VerificationForm() {
  const [state, formAction] = useActionState<VerificationFormState, FormData>(
    submitVerificationAction,
    {}
  );

  if (state.ok) {
    return (
      <p className="rounded-lg border border-emerald-800 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
        ✓ Documentos enviados. Te notificaremos cuando la revisión termine.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="fullName" className={label}>
          Nombre legal completo
        </label>
        <input id="fullName" name="fullName" required maxLength={100} className={input} />
        <p className="mt-1 text-xs text-zinc-500">
          Debe coincidir con tu documento. Nunca se muestra públicamente; tu
          alias sigue siendo el nombre visible.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="docType" className={label}>
            Tipo de documento
          </label>
          <select id="docType" name="docType" required className={input} defaultValue="">
            <option value="" disabled>
              Selecciona…
            </option>
            <option value="CC">Cédula de ciudadanía</option>
            <option value="CE">Cédula de extranjería</option>
            <option value="PASAPORTE">Pasaporte</option>
          </select>
        </div>
        <div>
          <label htmlFor="docNumber" className={label}>
            Número de documento
          </label>
          <input id="docNumber" name="docNumber" required maxLength={30} className={input} />
        </div>
      </div>

      <div>
        <label htmlFor="docImage" className={label}>
          Foto del documento (frente)
        </label>
        <input
          id="docImage"
          name="docImage"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className={input + " file:mr-3 file:rounded file:border-0 file:bg-zinc-700 file:px-3 file:py-1 file:text-xs file:text-white"}
        />
      </div>

      <div>
        <label htmlFor="selfie" className={label}>
          Selfie sosteniendo el documento
        </label>
        <input
          id="selfie"
          name="selfie"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className={input + " file:mr-3 file:rounded file:border-0 file:bg-zinc-700 file:px-3 file:py-1 file:text-xs file:text-white"}
        />
        <p className="mt-1 text-xs text-zinc-500">
          Tu rostro y el documento deben verse claramente en la misma foto.
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
