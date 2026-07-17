"use client";

import { useActionState } from "react";
import { createReportAction, type ReportFormState } from "./actions";
import { SubmitButton } from "@/components/submit-button";
import { input, label } from "@/lib/ui";

export function ReportForm({
  reported,
}: {
  reported: { id: string; name: string } | null;
}) {
  const [state, formAction] = useActionState<ReportFormState, FormData>(
    createReportAction,
    {}
  );

  if (state.ok) {
    return (
      <p className="rounded-lg border border-emerald-800 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
        ✓ Reporte enviado. El equipo lo revisará y te responderá en esta misma
        página.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {reported && (
        <>
          <input type="hidden" name="reportedId" value={reported.id} />
          <p className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
            Reportando a: <span className="font-semibold text-white">{reported.name}</span>
          </p>
        </>
      )}

      <div>
        <label htmlFor="category" className={label}>
          Categoría
        </label>
        <select id="category" name="category" required defaultValue="" className={input}>
          <option value="" disabled>
            Selecciona…
          </option>
          <option value="PERFIL_FALSO">Perfil falso</option>
          <option value="ESTAFA">Estafa o fraude</option>
          <option value="ACOSO">Acoso</option>
          <option value="SEGURIDAD">Problema de seguridad</option>
          <option value="OTRO">Otro</option>
        </select>
      </div>

      <div>
        <label htmlFor="description" className={label}>
          ¿Qué sucedió?
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          required
          minLength={10}
          maxLength={2000}
          placeholder="Describe la situación con el mayor detalle posible…"
          className={input}
        />
      </div>

      {state.error && (
        <p className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <SubmitButton>Enviar reporte</SubmitButton>
    </form>
  );
}
