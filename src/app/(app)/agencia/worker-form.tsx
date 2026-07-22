"use client";

import { useActionState } from "react";
import { createAgencyWorkerAction, type AgencyFormState } from "./actions";
import { SubmitButton } from "@/components/submit-button";
import { input, label } from "@/lib/ui";

export function WorkerForm() {
  const [state, formAction] = useActionState<AgencyFormState, FormData>(
    createAgencyWorkerAction,
    {}
  );

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <div>
        <label htmlFor="worker-displayName" className={label}>
          Nombre o alias público
        </label>
        <input
          id="worker-displayName"
          name="displayName"
          required
          maxLength={60}
          className={input}
        />
      </div>
      <div>
        <label htmlFor="worker-email" className={label}>
          Correo electrónico
        </label>
        <input
          id="worker-email"
          name="email"
          type="email"
          required
          className={input}
        />
      </div>
      <div>
        <label htmlFor="worker-password" className={label}>
          Contraseña inicial
        </label>
        <input
          id="worker-password"
          name="password"
          type="password"
          required
          minLength={8}
          className={input}
        />
        <p className="mt-1 text-xs text-zinc-500">
          Compártela con ella fuera de la plataforma para que pueda iniciar sesión.
        </p>
      </div>
      <div>
        <label htmlFor="worker-confirmPassword" className={label}>
          Confirmar contraseña
        </label>
        <input
          id="worker-confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          className={input}
        />
      </div>
      <div>
        <label htmlFor="worker-birthDate" className={label}>
          Fecha de nacimiento
        </label>
        <input id="worker-birthDate" name="birthDate" type="date" required className={input} />
      </div>
      <div>
        <label htmlFor="worker-city" className={label}>
          Ciudad <span className="text-zinc-500">(opcional)</span>
        </label>
        <input id="worker-city" name="city" maxLength={60} className={input} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="worker-phone" className={label}>
          Teléfono <span className="text-zinc-500">(opcional, nunca es público)</span>
        </label>
        <input id="worker-phone" name="phone" type="tel" maxLength={20} className={input} />
      </div>

      <label className="flex items-start gap-2 text-sm text-zinc-300 sm:col-span-2">
        <input type="checkbox" name="attestConsent" required className="mt-0.5 accent-fuchsia-600" />
        <span>
          Confirmo que esta profesional es mayor de 18 años y aceptó unirse a esta agencia.
        </span>
      </label>

      {state.error && (
        <p className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300 sm:col-span-2">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-lg border border-emerald-800 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200 sm:col-span-2">
          ✓ Profesional agregada al catálogo
        </p>
      )}

      <div className="sm:col-span-2">
        <SubmitButton>Agregar al catálogo</SubmitButton>
      </div>
    </form>
  );
}
