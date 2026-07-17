"use client";

import { useActionState } from "react";
import { createBookingAction, type BookingFormState } from "../actions";
import { SubmitButton } from "@/components/submit-button";
import { input, label } from "@/lib/ui";

export function BookingForm({
  roomTypeId,
  appointments,
  preselectedAppointmentId,
}: {
  roomTypeId: string;
  appointments: { id: string; label: string }[];
  preselectedAppointmentId: string;
}) {
  const [state, formAction] = useActionState<BookingFormState, FormData>(
    createBookingAction,
    {}
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="roomTypeId" value={roomTypeId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label}>Fecha</label>
          <input name="date" type="date" required className={input} />
        </div>
        <div>
          <label className={label}>Hora de entrada</label>
          <input name="time" type="time" required className={input} />
        </div>
      </div>

      {appointments.length > 0 && (
        <div>
          <label className={label}>
            Vincular a una cita <span className="text-zinc-500">(opcional)</span>
          </label>
          <select
            name="appointmentId"
            defaultValue={
              appointments.some((a) => a.id === preselectedAppointmentId)
                ? preselectedAppointmentId
                : ""
            }
            className={input}
          >
            <option value="">Sin vincular</option>
            {appointments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {state.error && (
        <p className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <SubmitButton>Reservar</SubmitButton>
    </form>
  );
}
