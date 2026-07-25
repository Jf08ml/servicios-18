"use client";

import { useState } from "react";
import { deleteUserAction } from "../actions";

export function DeleteUserButton({ id, email }: { id: string; email: string }) {
  const [open, setOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const matches = confirmEmail.trim().toLowerCase() === email.toLowerCase();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-red-900 px-2 py-1 text-xs text-red-400 hover:bg-red-950"
      >
        Eliminar cuenta
      </button>
    );
  }

  return (
    <form
      action={deleteUserAction}
      className="flex w-full flex-col gap-1.5 rounded border border-red-900 bg-red-950/30 p-2"
    >
      <input type="hidden" name="id" value={id} />
      <p className="text-xs text-red-300">
        Esto borra la cuenta y todos sus datos de forma permanente. Escribe{" "}
        <span className="font-mono">{email}</span> para confirmar.
      </p>
      <input
        name="confirmEmail"
        value={confirmEmail}
        onChange={(e) => setConfirmEmail(e.target.value)}
        placeholder="email exacto"
        autoComplete="off"
        className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-white"
      />
      <div className="flex gap-1.5">
        <button
          type="submit"
          disabled={!matches}
          className="rounded bg-red-700 px-2 py-1 text-xs font-semibold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Confirmar eliminación
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setConfirmEmail("");
          }}
          className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-900"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
