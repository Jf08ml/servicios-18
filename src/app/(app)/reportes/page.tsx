import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { card, pageTitle } from "@/lib/ui";
import { StatusBadge } from "@/components/badges";
import { formatDateTime } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/labels";
import { ReportForm } from "./report-form";

export const metadata = { title: "Reportes" };

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ usuario?: string }>;
}) {
  const user = await requireUser();
  const { usuario } = await searchParams;

  const reportedUser = usuario
    ? await db.user.findUnique({
        where: { id: usuario },
        select: { id: true, displayName: true },
      })
    : null;

  const myReports = await db.report.findMany({
    where: { reporterId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { reported: { select: { displayName: true } } },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className={pageTitle}>Reportes</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Si detectas un perfil falso, un intento de estafa o cualquier
          situación de riesgo, repórtalo. Nuestro equipo revisa cada caso.
        </p>
      </div>

      <div className={card}>
        <h2 className="mb-4 font-semibold text-white">Nuevo reporte</h2>
        <ReportForm
          reported={reportedUser ? { id: reportedUser.id, name: reportedUser.displayName } : null}
        />
      </div>

      {myReports.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-white">Mis reportes</h2>
          <ul className="space-y-2">
            {myReports.map((r) => (
              <li key={r.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-white">
                    {CATEGORY_LABELS[r.category] ?? r.category}
                    {r.reported && (
                      <span className="ml-2 text-zinc-400">→ {r.reported.displayName}</span>
                    )}
                  </p>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-2 text-sm text-zinc-400">{r.description}</p>
                <p className="mt-2 text-xs text-zinc-600">{formatDateTime(r.createdAt)}</p>
                {r.adminNotes && (
                  <p className="mt-2 rounded-lg border border-sky-900 bg-sky-950/40 px-3 py-2 text-sm text-sky-200">
                    Respuesta del equipo: {r.adminNotes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
