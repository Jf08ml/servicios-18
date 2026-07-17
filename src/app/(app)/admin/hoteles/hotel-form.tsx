"use client";

import { useActionState } from "react";
import { createHotelAction, type HotelFormState } from "../actions";
import { SubmitButton } from "@/components/submit-button";
import { input, label } from "@/lib/ui";

export function HotelForm() {
  const [state, formAction] = useActionState<HotelFormState, FormData>(
    createHotelAction,
    {}
  );

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className={label}>Nombre</label>
        <input name="name" required maxLength={100} className={input} />
      </div>
      <div>
        <label className={label}>Ciudad</label>
        <input name="city" required maxLength={60} className={input} />
      </div>
      <div className="sm:col-span-2">
        <label className={label}>Dirección</label>
        <input name="address" required maxLength={150} className={input} />
      </div>
      <div className="sm:col-span-2">
        <label className={label}>Descripción</label>
        <textarea name="description" rows={2} maxLength={1000} className={input} />
      </div>
      <div>
        <label className={label}>Comisión (%)</label>
        <input name="commissionPct" type="number" min={0} max={50} defaultValue={10} required className={input} />
      </div>
      <div>
        <label className={label}>
          Correo de la cuenta Hotel <span className="text-zinc-500">(opcional)</span>
        </label>
        <input name="ownerEmail" type="email" className={input} />
      </div>
      <div className="sm:col-span-2">
        <label className={label}>Foto</label>
        <input
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className={input + " file:mr-3 file:rounded file:border-0 file:bg-zinc-700 file:px-3 file:py-1 file:text-xs file:text-white"}
        />
      </div>

      {state.error && (
        <p className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300 sm:col-span-2">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-lg border border-emerald-800 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200 sm:col-span-2">
          ✓ Hotel registrado
        </p>
      )}

      <div className="sm:col-span-2">
        <SubmitButton>Registrar hotel</SubmitButton>
      </div>
    </form>
  );
}
