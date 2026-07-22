"use client";

import { useActionState, useState } from "react";
import { registerAction, type AuthState } from "../actions";
import { SubmitButton } from "@/components/submit-button";
import { input, label } from "@/lib/ui";

export function RegisterForm() {
  const [state, formAction] = useActionState<AuthState, FormData>(registerAction, {});
  const [role, setRole] = useState<"WORKER" | "CLIENT" | "AGENCY">("CLIENT");
  const isAgency = role === "AGENCY";

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <span className={label}>Quiero registrarme como</span>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["CLIENT", "Cliente", "Busco perfiles verificados"],
              ["WORKER", "Profesional", "Ofrezco servicios de forma independiente"],
              ["AGENCY", "Agencia", "Gestiono el catálogo de varias profesionales"],
            ] as const
          ).map(([value, title, desc]) => (
            <label
              key={value}
              className={`cursor-pointer rounded-xl border p-3 transition ${
                role === value
                  ? "border-fuchsia-500 bg-fuchsia-950/40"
                  : "border-zinc-700 bg-zinc-900 hover:border-zinc-500"
              }`}
            >
              <input
                type="radio"
                name="role"
                value={value}
                checked={role === value}
                onChange={() => setRole(value)}
                className="sr-only"
              />
              <span className="block text-sm font-semibold text-white">{title}</span>
              <span className="mt-0.5 block text-xs text-zinc-400">{desc}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="displayName" className={label}>
          {isAgency ? "Nombre de la agencia" : "Nombre o alias público"}
        </label>
        <input id="displayName" name="displayName" required maxLength={60} className={input} />
        {!isAgency && (
          <p className="mt-1 text-xs text-zinc-500">
            Puedes usar un alias para proteger tu privacidad.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="email" className={label}>
          Correo electrónico
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className={input} />
        <p className="mt-1.5 rounded-lg border border-emerald-900/60 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-200/90">
          🔒 Cero correos: no enviamos promociones, boletines ni notificaciones.
          Tu correo solo sirve para iniciar sesión y nunca se comparte.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="password" className={label}>
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={input}
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className={label}>
            Confirmar
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={input}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="birthDate" className={label}>
            Fecha de nacimiento
          </label>
          <input id="birthDate" name="birthDate" type="date" required className={input} />
        </div>
        <div>
          <label htmlFor="city" className={label}>
            Ciudad <span className="text-zinc-500">(opcional)</span>
          </label>
          <input id="city" name="city" maxLength={60} className={input} />
        </div>
      </div>

      <div>
        <label htmlFor="phone" className={label}>
          Teléfono <span className="text-zinc-500">(opcional, nunca es público)</span>
        </label>
        <input id="phone" name="phone" type="tel" maxLength={20} className={input} />
      </div>

      <label className="flex items-start gap-2 text-sm text-zinc-300">
        <input type="checkbox" name="acceptTerms" required className="mt-0.5 accent-fuchsia-600" />
        <span>
          Declaro que soy mayor de 18 años y acepto los términos de uso y la
          política de privacidad.
        </span>
      </label>

      {state.error && (
        <p className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <SubmitButton className="w-full inline-flex items-center justify-center rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-500 disabled:opacity-50">
        Crear cuenta
      </SubmitButton>
    </form>
  );
}
