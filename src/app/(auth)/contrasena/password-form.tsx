"use client";

import { useActionState } from "react";
import { changePasswordAction, type PasswordState } from "./actions";
import { SubmitButton } from "@/components/submit-button";
import { input, label } from "@/lib/ui";

export function PasswordForm({ requireCurrent }: { requireCurrent: boolean }) {
  const [state, formAction] = useActionState<PasswordState, FormData>(changePasswordAction, {});

  return (
    <form action={formAction} className="space-y-4">
      {requireCurrent && (
        <div>
          <label htmlFor="currentPassword" className={label}>
            Contraseña actual
          </label>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            className={input}
          />
        </div>
      )}
      <div>
        <label htmlFor="password" className={label}>
          Nueva contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          maxLength={100}
          autoComplete="new-password"
          className={input}
        />
      </div>
      <div>
        <label htmlFor="confirmPassword" className={label}>
          Confirmar contraseña
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          maxLength={100}
          autoComplete="new-password"
          className={input}
        />
      </div>
      {state.error && (
        <p className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
      <SubmitButton className="w-full inline-flex items-center justify-center rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-500 disabled:opacity-50">
        Guardar contraseña
      </SubmitButton>
    </form>
  );
}
