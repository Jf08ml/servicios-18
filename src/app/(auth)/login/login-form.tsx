"use client";

import { useActionState } from "react";
import { loginAction, type AuthState } from "../actions";
import { SubmitButton } from "@/components/submit-button";
import { input, label } from "@/lib/ui";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<AuthState, FormData>(loginAction, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className={label}>
          Correo electrónico
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className={input} />
      </div>
      <div>
        <label htmlFor="password" className={label}>
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={input}
        />
      </div>
      {state.error && (
        <p className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
      <SubmitButton className="w-full inline-flex items-center justify-center rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-500 disabled:opacity-50">
        Entrar
      </SubmitButton>
    </form>
  );
}
