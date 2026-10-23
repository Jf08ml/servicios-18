import type { WhatsappOutreachStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { pageTitle } from "@/lib/ui";
import { EmptyState } from "@/components/empty-state";
import { formatDateTime } from "@/lib/format";
import { whatsappEnabled } from "@/lib/whatsapp";

export const metadata = { title: "WhatsApp" };

const STATUS_LABELS: Record<WhatsappOutreachStatus, string> = {
  INVITED: "Invitada",
  LINK_SENT: "Enlace enviado",
  OPTED_OUT: "Pidió no escribirle",
  FAILED: "Fallido",
};

const STATUS_STYLES: Record<WhatsappOutreachStatus, string> = {
  INVITED: "bg-amber-950/60 text-amber-300",
  LINK_SENT: "bg-emerald-950/60 text-emerald-300",
  OPTED_OUT: "bg-zinc-800 text-zinc-400",
  FAILED: "bg-red-950/60 text-red-300",
};

export default async function AdminWhatsappPage() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [rows, grouped, invitedToday] = await Promise.all([
    db.whatsappOutreach.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: { user: { select: { displayName: true, email: true, claimedAt: true } } },
    }),
    db.whatsappOutreach.groupBy({ by: ["status"], _count: true }),
    db.whatsappOutreach.count({ where: { invitedAt: { gte: since } } }),
  ]);
  const counts = Object.fromEntries(grouped.map((g) => [g.status, g._count]));
  const dailyLimit = Number(process.env.WA_DAILY_LIMIT) || 20;

  return (
    <div className="space-y-6">
      <div>
        <h1 className={pageTitle}>Avisos por WhatsApp</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Profesionales con cuenta no reclamada a las que se avisó que un cliente les escribió.
          {whatsappEnabled() ? "" : " El envío está desactivado (faltan variables WA_* en el entorno)."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
          <p className="text-xs text-zinc-500">Últimas 24 h</p>
          <p className="text-lg font-semibold text-white">
            {invitedToday} / {dailyLimit}
          </p>
        </div>
        {(Object.keys(STATUS_LABELS) as WhatsappOutreachStatus[]).map((s) => (
          <div key={s} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
            <p className="text-xs text-zinc-500">{STATUS_LABELS[s]}</p>
            <p className="text-lg font-semibold text-white">{counts[s] ?? 0}</p>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Aún no hay avisos"
          description="Cuando un cliente le escriba a una profesional sin cuenta reclamada, aparecerá aquí."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-800">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900 text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">Profesional</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Invitada</th>
                <th className="px-4 py-3">Enlace</th>
                <th className="px-4 py-3">Último error</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-zinc-800/60">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{r.user.displayName}</p>
                    <p className="text-xs text-zinc-500">
                      {r.user.email}
                      {r.user.claimedAt ? " · cuenta reclamada" : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">+{r.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status]}`}>
                      {STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {r.invitedAt ? formatDateTime(r.invitedAt) : "—"}
                    {r.attempts > 1 ? ` (${r.attempts} intentos)` : ""}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {r.linkSentAt ? formatDateTime(r.linkSentAt) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{r.lastError ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
