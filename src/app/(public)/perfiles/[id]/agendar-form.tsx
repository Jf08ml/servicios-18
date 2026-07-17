"use client";

import { useActionState } from "react";
import {
  requestAppointmentAction,
  type AppointmentFormState,
} from "@/app/(app)/agenda/actions";
import { SubmitButton } from "@/components/submit-button";
import { formatDurationMinutes } from "@/lib/format";
import { DEFAULT_DURATIONS } from "@/lib/services";
import { input, label } from "@/lib/ui";

export type ServiceOption = {
  id: string;
  name: string;
  durationMinutes: number;
};

export function AgendarForm({
  workerId,
  services,
}: {
  workerId: string;
  /** Tipos de servicio de la profesional; vacío = duraciones estándar. */
  services: ServiceOption[];
}) {
  const [state, formAction] = useActionState<AppointmentFormState, FormData>(
    requestAppointmentAction,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="workerId" value={workerId} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="date" className={label}>
            Fecha
          </label>
          <input id="date" name="date" type="date" required className={input} />
        </div>
        <div>
          <label htmlFor="time" className={label}>
            Hora
          </label>
          <input id="time" name="time" type="time" required className={input} />
        </div>
        {services.length > 0 ? (
          <div>
            <label htmlFor="serviceId" className={label}>
              Servicio
            </label>
            <select
              id="serviceId"
              name="serviceId"
              required
              defaultValue={services[0].id}
              className={input}
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {formatDurationMinutes(s.durationMinutes)}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label htmlFor="duration" className={label}>
              Duración
            </label>
            <select
              id="duration"
              name="duration"
              required
              defaultValue="60"
              className={input}
            >
              {DEFAULT_DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {formatDurationMinutes(d)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div>
        <label htmlFor="notes" className={label}>
          Nota <span className="text-zinc-500">(opcional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          maxLength={500}
          placeholder="Detalles que quieras compartir…"
          className={input}
        />
      </div>

      {state.error && (
        <p className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <SubmitButton>Solicitar cita</SubmitButton>
    </form>
  );
}
