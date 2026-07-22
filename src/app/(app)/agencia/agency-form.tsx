"use client";

import { useActionState } from "react";
import { updateAgencyAction, type AgencyFormState } from "./actions";
import { SubmitButton } from "@/components/submit-button";
import { input, label } from "@/lib/ui";

export function AgencyForm({
  defaults,
}: {
  defaults: { name: string; city: string; description: string };
}) {
  const [state, formAction] = useActionState<AgencyFormState, FormData>(
    updateAgencyAction,
    {}
  );

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <div>
        <label htmlFor="agency-name" className={label}>
          Nombre de la agencia
        </label>
        <input
          id="agency-name"
          name="name"
          required
          maxLength={100}
          defaultValue={defaults.name}
          className={input}
        />
      </div>
      <div>
        <label htmlFor="agency-city" className={label}>
          Ciudad
        </label>
        <input
          id="agency-city"
          name="city"
          maxLength={60}
          defaultValue={defaults.city}
          className={input}
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="agency-description" className={label}>
          Descripción
        </label>
        <textarea
          id="agency-description"
          name="description"
          rows={3}
          maxLength={1000}
          defaultValue={defaults.description}
          className={input}
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="agency-photo" className={label}>
          Foto / logo
        </label>
        <input
          id="agency-photo"
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className={
            input +
            " file:mr-3 file:rounded file:border-0 file:bg-zinc-700 file:px-3 file:py-1 file:text-xs file:text-white"
          }
        />
      </div>

      {state.error && (
        <p className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300 sm:col-span-2">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-lg border border-emerald-800 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200 sm:col-span-2">
          ✓ Agencia actualizada
        </p>
      )}

      <div className="sm:col-span-2">
        <SubmitButton>Guardar cambios</SubmitButton>
      </div>
    </form>
  );
}
