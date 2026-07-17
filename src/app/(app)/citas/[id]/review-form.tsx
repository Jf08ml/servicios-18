"use client";

import { useActionState, useState } from "react";
import { createReviewAction, type ReviewFormState } from "../actions";
import { SubmitButton } from "@/components/submit-button";
import { input, label } from "@/lib/ui";

export function ReviewForm({
  appointmentId,
  otherName,
}: {
  appointmentId: string;
  otherName: string;
}) {
  const [state, formAction] = useActionState<ReviewFormState, FormData>(
    createReviewAction,
    {}
  );
  const [score, setScore] = useState(0);
  const [hover, setHover] = useState(0);

  if (state.ok) {
    return (
      <p className="rounded-lg border border-emerald-800 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
        ✓ Gracias por calificar. Tu reseña ayuda a toda la comunidad.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <input type="hidden" name="score" value={score} />
      <div>
        <span className={label}>¿Cómo fue tu experiencia con {otherName}?</span>
        <div className="flex gap-1 text-3xl">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setScore(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              aria-label={`${n} estrellas`}
              className={
                (hover || score) >= n ? "text-amber-400" : "text-zinc-700"
              }
            >
              ★
            </button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="comment" className={label}>
          Comentario <span className="text-zinc-500">(opcional)</span>
        </label>
        <textarea id="comment" name="comment" rows={3} maxLength={1000} className={input} />
      </div>

      {state.error && (
        <p className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <SubmitButton>Publicar calificación</SubmitButton>
    </form>
  );
}
