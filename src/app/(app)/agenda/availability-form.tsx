"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { addAvailabilityAction } from "./actions";
import { minutesTo12h } from "@/lib/format";
import { input, label as labelCls, btnPrimary } from "@/lib/ui";

// Semana empezando en lunes (más natural para planear), valores = índice de WEEKDAYS.
const DAY_CHIPS = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mié" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
];

const PRESETS: { label: string; days: number[] }[] = [
  { label: "Lun–Vie", days: [1, 2, 3, 4, 5] },
  { label: "Fin de semana", days: [6, 0] },
  { label: "Todos los días", days: [1, 2, 3, 4, 5, 6, 0] },
];

// Opciones cada 30 min. "Hasta" incluye 1440 (medianoche, fin del día).
const STEP = 30;
const START_OPTIONS = Array.from({ length: 1440 / STEP }, (_, i) => i * STEP);
const END_OPTIONS = Array.from({ length: 1440 / STEP }, (_, i) => (i + 1) * STEP);

function endLabel(minutes: number) {
  return minutes === 1440 ? "12:00 a. m. (medianoche)" : minutesTo12h(minutes);
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} className={btnPrimary}>
      {pending ? "Agregando…" : "Agregar horario"}
    </button>
  );
}

/**
 * Alta rápida de disponibilidad semanal: se eligen varios días a la vez
 * (chips + atajos) y un rango horario en formato 12h con a. m./p. m.
 */
export function AvailabilityForm({
  action = addAvailabilityAction,
  workerId,
}: {
  /** Server Action a enlazar; por defecto edita la disponibilidad de la sesión actual. */
  action?: (formData: FormData) => Promise<void> | void;
  /** Si se usa desde el panel de una agencia, id de la trabajadora gestionada. */
  workerId?: string;
} = {}) {
  const [days, setDays] = useState<number[]>([]);
  const [start, setStart] = useState(840); // 2:00 p. m.
  const [end, setEnd] = useState(1320); // 10:00 p. m.

  const invalidRange = end <= start;
  const chipBase =
    "rounded-full border px-3 py-1.5 text-sm font-medium transition cursor-pointer";

  function toggleDay(value: number) {
    setDays((d) =>
      d.includes(value) ? d.filter((v) => v !== value) : [...d, value]
    );
  }

  return (
    <form action={action} className="mt-4 space-y-4">
      {workerId && <input type="hidden" name="workerId" value={workerId} />}
      {days.map((d) => (
        <input key={d} type="hidden" name="weekday" value={d} />
      ))}

      <div>
        <span className={labelCls}>Días (elige uno o varios)</span>
        <div className="flex flex-wrap gap-2">
          {DAY_CHIPS.map((chip) => {
            const active = days.includes(chip.value);
            return (
              <button
                key={chip.value}
                type="button"
                aria-pressed={active}
                onClick={() => toggleDay(chip.value)}
                className={`${chipBase} ${
                  active
                    ? "border-fuchsia-500 bg-fuchsia-600/20 text-fuchsia-200"
                    : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setDays(p.days)}
              className="font-medium text-fuchsia-400 hover:text-fuchsia-300"
            >
              {p.label}
            </button>
          ))}
          {days.length > 0 && (
            <button
              type="button"
              onClick={() => setDays([])}
              className="font-medium text-zinc-500 hover:text-zinc-300"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:max-w-lg sm:grid-cols-2">
        <div>
          <label htmlFor="startMinute" className={labelCls}>
            Desde
          </label>
          <select
            id="startMinute"
            name="startMinute"
            value={start}
            onChange={(e) => setStart(Number(e.target.value))}
            className={input}
          >
            {START_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {minutesTo12h(m)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="endMinute" className={labelCls}>
            Hasta
          </label>
          <select
            id="endMinute"
            name="endMinute"
            value={end}
            onChange={(e) => setEnd(Number(e.target.value))}
            className={input}
          >
            {END_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {endLabel(m)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {invalidRange && (
        <p className="text-sm text-red-400">
          La hora "Hasta" debe ser mayor que la hora "Desde".
        </p>
      )}
      {days.length === 0 && (
        <p className="text-sm text-zinc-500">
          Selecciona al menos un día para agregar el horario.
        </p>
      )}

      <SubmitButton disabled={days.length === 0 || invalidRange} />
    </form>
  );
}
