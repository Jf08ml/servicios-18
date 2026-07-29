"use client";

import { useActionState } from "react";
import { bulkImportWorkersAction, type BulkImportState } from "./actions";
import { SubmitButton } from "@/components/submit-button";
import { input, label } from "@/lib/ui";

const fileInput =
  input + " file:mr-3 file:rounded file:border-0 file:bg-zinc-700 file:px-3 file:py-1 file:text-xs file:text-white";

export function BulkImportForm() {
  const [state, formAction] = useActionState<BulkImportState, FormData>(
    bulkImportWorkersAction,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="csv" className={label}>
          Archivo CSV
        </label>
        <input
          id="csv"
          name="csv"
          type="file"
          accept=".csv,text/csv"
          required
          className={fileInput}
        />
      </div>
      <div>
        <label htmlFor="zip" className={label}>
          ZIP de fotos <span className="text-zinc-500">(opcional)</span>
        </label>
        <input id="zip" name="zip" type="file" accept=".zip,application/zip" className={fileInput} />
      </div>

      {state.error && (
        <p className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <SubmitButton>Procesar carga</SubmitButton>

      {state.results && (
        <div className="mt-4 space-y-2">
          <p className="text-sm text-zinc-300">
            {state.results.filter((r) => r.ok).length} de {state.results.length} cuentas creadas.
            Comparte la contraseña de la plantilla con cada profesional por un canal directo (el
            producto no envía correos).
          </p>
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900 text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="px-3 py-2">Fila</th>
                  <th className="px-3 py-2">Correo</th>
                  <th className="px-3 py-2">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {state.results.map((r) => (
                  <tr key={r.row} className="border-b border-zinc-800/60">
                    <td className="px-3 py-2 text-zinc-400">{r.row}</td>
                    <td className="px-3 py-2 text-zinc-200">{r.email}</td>
                    <td className={"px-3 py-2 " + (r.ok ? "text-emerald-300" : "text-red-300")}>
                      {r.ok ? "✓ " : "✕ "}
                      {r.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </form>
  );
}
