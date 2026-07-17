import { db } from "@/lib/db";
import { pageTitle, card } from "@/lib/ui";
import { StatusBadge } from "@/components/badges";
import { EmptyState } from "@/components/empty-state";
import { formatDateTime } from "@/lib/format";
import { resolveSosAction } from "../actions";

export const metadata = { title: "Alertas SOS" };

export default async function AdminSosPage() {
  const alerts = await db.sosAlert.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      user: {
        select: {
          displayName: true,
          email: true,
          phone: true,
          emergencyContacts: true,
        },
      },
    },
  });

  const active = alerts.filter((a) => a.status === "ACTIVE");
  const resolved = alerts.filter((a) => a.status !== "ACTIVE");

  return (
    <div className="space-y-6">
      <h1 className={pageTitle}>
        Alertas SOS activas ({active.length})
      </h1>

      {active.length === 0 ? (
        <EmptyState title="No hay alertas activas" description="Sin emergencias en este momento." />
      ) : (
        active.map((a) => (
          <div key={a.id} className={card + " border-red-900"}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-white">🚨 {a.user.displayName}</h2>
              <StatusBadge status={a.status} />
            </div>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500">Contacto</dt>
                <dd className="text-zinc-200">
                  {a.user.email}
                  {a.user.phone && <> · {a.user.phone}</>}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Hora</dt>
                <dd className="text-zinc-200">{formatDateTime(a.createdAt)}</dd>
              </div>
              {a.message && (
                <div className="sm:col-span-2">
                  <dt className="text-zinc-500">Mensaje</dt>
                  <dd className="text-zinc-200">{a.message}</dd>
                </div>
              )}
              {a.latitude != null && a.longitude != null && (
                <div className="sm:col-span-2">
                  <dt className="text-zinc-500">Ubicación</dt>
                  <dd>
                    <a
                      href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-fuchsia-400 hover:text-fuchsia-300"
                    >
                      Ver en Google Maps ({a.latitude.toFixed(5)}, {a.longitude.toFixed(5)})
                    </a>
                  </dd>
                </div>
              )}
              {a.user.emergencyContacts.length > 0 && (
                <div className="sm:col-span-2">
                  <dt className="text-zinc-500">Contactos de emergencia</dt>
                  <dd className="text-zinc-200">
                    {a.user.emergencyContacts
                      .map((c) => `${c.name}: ${c.phone}`)
                      .join(" · ")}
                  </dd>
                </div>
              )}
            </dl>
            <form action={resolveSosAction} className="mt-4">
              <input type="hidden" name="id" value={a.id} />
              <button
                type="submit"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                ✓ Marcar como resuelta
              </button>
            </form>
          </div>
        ))
      )}

      {resolved.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-white">Historial</h2>
          <ul className="space-y-2">
            {resolved.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800/60 bg-zinc-900/30 px-4 py-3"
              >
                <div>
                  <p className="text-sm text-zinc-300">{a.user.displayName}</p>
                  <p className="text-xs text-zinc-500">{formatDateTime(a.createdAt)}</p>
                </div>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
