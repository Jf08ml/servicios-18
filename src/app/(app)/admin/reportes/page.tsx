import { db } from "@/lib/db";
import { pageTitle, card, input, label } from "@/lib/ui";
import { StatusBadge } from "@/components/badges";
import { EmptyState } from "@/components/empty-state";
import { formatDateTime } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/labels";
import { resolveReportAction } from "../actions";

export const metadata = { title: "Reportes" };

export default async function AdminReportesPage() {
  const reports = await db.report.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      reporter: { select: { displayName: true, email: true } },
      reported: { select: { id: true, displayName: true, email: true, status: true } },
    },
  });

  const open = reports.filter((r) => ["OPEN", "REVIEWING"].includes(r.status));
  const closed = reports.filter((r) => !["OPEN", "REVIEWING"].includes(r.status));

  return (
    <div className="space-y-6">
      <h1 className={pageTitle}>Reportes abiertos ({open.length})</h1>

      {open.length === 0 ? (
        <EmptyState title="No hay reportes abiertos" />
      ) : (
        open.map((r) => (
          <div key={r.id} className={card}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-white">
                {CATEGORY_LABELS[r.category] ?? r.category}
              </h2>
              <StatusBadge status={r.status} />
            </div>
            <p className="mt-2 text-sm text-zinc-300">{r.description}</p>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500">Reportado por</dt>
                <dd className="text-zinc-200">
                  {r.reporter.displayName} ({r.reporter.email})
                </dd>
              </div>
              {r.reported && (
                <div>
                  <dt className="text-zinc-500">Usuario reportado</dt>
                  <dd className="text-zinc-200">
                    {r.reported.displayName} ({r.reported.email}){" "}
                    <StatusBadge status={r.reported.status} />
                  </dd>
                </div>
              )}
            </dl>
            <p className="mt-2 text-xs text-zinc-600">{formatDateTime(r.createdAt)}</p>

            <form action={resolveReportAction} className="mt-4 space-y-3 border-t border-zinc-800 pt-4">
              <input type="hidden" name="id" value={r.id} />
              <div>
                <label htmlFor={`notes-${r.id}`} className={label}>
                  Respuesta para quien reportó
                </label>
                <input id={`notes-${r.id}`} name="adminNotes" maxLength={1000} className={input} />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  name="status"
                  value="REVIEWING"
                  className="rounded-lg border border-sky-800 bg-sky-950/50 px-4 py-2 text-sm font-medium text-sky-300 hover:bg-sky-900/50"
                >
                  Marcar en revisión
                </button>
                <button
                  type="submit"
                  name="status"
                  value="RESOLVED"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                >
                  ✓ Resolver
                </button>
                <button
                  type="submit"
                  name="status"
                  value="DISMISSED"
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:border-zinc-500"
                >
                  Descartar
                </button>
              </div>
            </form>
          </div>
        ))
      )}

      {closed.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-white">Historial</h2>
          <ul className="space-y-2">
            {closed.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800/60 bg-zinc-900/30 px-4 py-3"
              >
                <div>
                  <p className="text-sm text-zinc-300">
                    {CATEGORY_LABELS[r.category] ?? r.category} · {r.reporter.displayName}
                    {r.reported && <> → {r.reported.displayName}</>}
                  </p>
                  <p className="text-xs text-zinc-500">{formatDateTime(r.createdAt)}</p>
                </div>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
