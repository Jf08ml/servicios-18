import { db } from "@/lib/db";
import { pageTitle, card, input, label } from "@/lib/ui";
import { EmptyState } from "@/components/empty-state";
import { formatDateTime, formatBirthDate } from "@/lib/format";
import { reviewVerificationAction } from "../actions";

export const metadata = { title: "Verificaciones" };

export default async function AdminVerificacionesPage() {
  const pending = await db.verification.findMany({
    where: { status: "PENDING" },
    orderBy: [{ isPremiumRequested: "desc" }, { submittedAt: "asc" }],
    include: {
      user: { select: { displayName: true, email: true, role: true, birthDate: true } },
    },
  });

  return (
    <div className="space-y-6">
      <h1 className={pageTitle}>Verificaciones pendientes ({pending.length})</h1>

      {pending.length === 0 ? (
        <EmptyState title="No hay verificaciones pendientes" description="Todo al día. 🎉" />
      ) : (
        pending.map((v) => (
          <div key={v.id} className={card}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold text-white">
                  {v.fullName ?? v.user.displayName}
                  <span
                    className={`ml-2 rounded-full border px-2 py-0.5 text-xs ${
                      v.level === "QUICK"
                        ? "border-sky-700 bg-sky-950/50 text-sky-300"
                        : "border-fuchsia-700 bg-fuchsia-950/50 text-fuchsia-300"
                    }`}
                  >
                    {v.level === "QUICK" ? "⚡ Rápida" : "🪪 Completa"}
                  </span>
                  {v.isPremiumRequested && (
                    <span className="ml-2 rounded-full border border-amber-700 bg-amber-950/50 px-2 py-0.5 text-xs text-amber-300">
                      ★ Premium solicitada
                    </span>
                  )}
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  {v.user.displayName} · {v.user.email} ·{" "}
                  {v.user.role === "WORKER" ? "Profesional" : "Cliente"}
                </p>
                <p className="text-sm text-zinc-400">
                  {v.docType && v.docNumber ? `${v.docType} ${v.docNumber} · ` : ""}
                  Nacimiento: {formatBirthDate(v.user.birthDate)}
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  Fecha de envío: {formatDateTime(v.submittedAt)}
                  {v.level === "QUICK" && (
                    <span className="ml-1 text-sky-400">
                      — debe coincidir con la fecha escrita en el papel
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {v.docImagePath && (
                <a href={`/api/files/${v.docImagePath}`} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/files/${v.docImagePath}`}
                    alt="Documento"
                    className="h-48 w-full rounded-xl border border-zinc-700 object-cover"
                  />
                  <p className="mt-1 text-center text-xs text-zinc-500">Documento</p>
                </a>
              )}
              <a href={`/api/files/${v.selfiePath}`} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/files/${v.selfiePath}`}
                  alt={v.level === "QUICK" ? "Foto con cartel" : "Selfie con documento"}
                  className="h-48 w-full rounded-xl border border-zinc-700 object-cover"
                />
                <p className="mt-1 text-center text-xs text-zinc-500">
                  {v.level === "QUICK"
                    ? "Foto sosteniendo el cartel «Mis Escorts + fecha»"
                    : "Selfie con documento"}
                </p>
              </a>
            </div>

            <form action={reviewVerificationAction} className="mt-4 space-y-3 border-t border-zinc-800 pt-4">
              <input type="hidden" name="id" value={v.id} />
              <div>
                <label htmlFor={`notes-${v.id}`} className={label}>
                  Notas <span className="text-zinc-500">(visibles para el usuario si se rechaza)</span>
                </label>
                <input id={`notes-${v.id}`} name="notes" maxLength={500} className={input} />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  name="decision"
                  value="approve"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                >
                  ✓ Aprobar
                </button>
                <button
                  type="submit"
                  name="decision"
                  value="reject"
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
                >
                  ✗ Rechazar
                </button>
              </div>
            </form>
          </div>
        ))
      )}
    </div>
  );
}
