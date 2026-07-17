import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { card, pageTitle, input, label, btnSecondary } from "@/lib/ui";
import { StatusBadge, VerifiedBadge, UnverifiedBadge } from "@/components/badges";
import { EmptyState } from "@/components/empty-state";
import {
  formatDateTime,
  formatDurationMinutes,
  minutesTo12h,
  WEEKDAYS,
} from "@/lib/format";
import { SERVICE_DURATIONS } from "@/lib/services";
import {
  addServiceTypeAction,
  deleteAvailabilityAction,
  deleteServiceTypeAction,
} from "./actions";
import { AvailabilityForm } from "./availability-form";

export const metadata = { title: "Agenda" };

export default async function AgendaPage() {
  const user = await requireUser(["WORKER", "CLIENT"]);
  const isWorker = user.role === "WORKER";

  const [appointments, availability, serviceTypes] = await Promise.all([
    db.appointment.findMany({
      where: isWorker ? { workerId: user.id } : { clientId: user.id },
      orderBy: { startsAt: "desc" },
      take: 50,
      include: {
        worker: { select: { displayName: true } },
        client: { select: { displayName: true, verifiedAt: true } },
        hotelBooking: { select: { code: true } },
      },
    }),
    isWorker
      ? db.availabilitySlot.findMany({
          where: { workerId: user.id },
          orderBy: [{ weekday: "asc" }, { startMinute: "asc" }],
        })
      : Promise.resolve([]),
    isWorker
      ? db.serviceType.findMany({
          where: { workerId: user.id },
          orderBy: { durationMinutes: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const now = new Date();
  const upcoming = appointments
    .filter((a) => a.endsAt >= now && ["PENDING", "CONFIRMED"].includes(a.status))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const past = appointments.filter((a) => !upcoming.includes(a));

  return (
    <div className="space-y-8">
      <div>
        <h1 className={pageTitle}>{isWorker ? "Mi agenda" : "Mis citas"}</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {isWorker
            ? "Gestiona tu disponibilidad y responde las solicitudes de cita."
            : "Aquí están todas tus citas. Agenda nuevas desde los perfiles verificados."}
        </p>
      </div>

      {isWorker && (
        <div className={card}>
          <h2 className="font-semibold text-white">Disponibilidad semanal</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Los clientes verán estos horarios en tu perfil.
          </p>

          {availability.length > 0 && (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {availability.map((slot) => (
                <li
                  key={slot.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                >
                  <span className="text-zinc-200">
                    {WEEKDAYS[slot.weekday]} · {minutesTo12h(slot.startMinute)} – {minutesTo12h(slot.endMinute)}
                  </span>
                  <form action={deleteAvailabilityAction}>
                    <input type="hidden" name="id" value={slot.id} />
                    <button type="submit" className="text-xs font-medium text-red-400 hover:text-red-300">
                      Quitar
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <AvailabilityForm />
        </div>
      )}

      {isWorker && (
        <div className={card}>
          <h2 className="font-semibold text-white">Tipos de servicio</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Ponle nombre a lo que ofreces y su duración (ej. &quot;El rato&quot; ·
            15 min, &quot;Amanecida&quot; · 12 horas). Los clientes elegirán uno
            al agendar. Si no defines ninguno, verán duraciones estándar (15,
            30, 45 min…).
          </p>

          {serviceTypes.length > 0 && (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {serviceTypes.map((svc) => (
                <li
                  key={svc.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                >
                  <span className="text-zinc-200">
                    {svc.name}{" "}
                    <span className="text-zinc-500">
                      · {formatDurationMinutes(svc.durationMinutes)}
                    </span>
                  </span>
                  <form action={deleteServiceTypeAction}>
                    <input type="hidden" name="id" value={svc.id} />
                    <button
                      type="submit"
                      className="text-xs font-medium text-red-400 hover:text-red-300"
                    >
                      Quitar
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <form
            action={addServiceTypeAction}
            className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]"
          >
            <div>
              <label htmlFor="service-name" className={label}>
                Nombre del servicio
              </label>
              <input
                id="service-name"
                name="name"
                type="text"
                required
                maxLength={40}
                placeholder="Ej. El rato, Salida, Amanecida…"
                className={input}
              />
            </div>
            <div>
              <label htmlFor="service-duration" className={label}>
                Duración
              </label>
              <select
                id="service-duration"
                name="duration"
                defaultValue="60"
                className={input}
              >
                {SERVICE_DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {formatDurationMinutes(d)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" className={btnSecondary}>
                Agregar
              </button>
            </div>
          </form>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Próximas citas</h2>
        {upcoming.length === 0 ? (
          <EmptyState
            title="No tienes citas próximas"
            description={isWorker ? undefined : "Explora los perfiles verificados para agendar."}
          />
        ) : (
          <ul className="space-y-2">
            {upcoming.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/citas/${a.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 transition hover:border-zinc-600"
                >
                  <div>
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-white">
                      {isWorker ? a.client.displayName : a.worker.displayName}
                      {isWorker &&
                        (a.client.verifiedAt ? <VerifiedBadge /> : <UnverifiedBadge />)}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {formatDateTime(a.startsAt)}
                      {a.serviceName && (
                        <span className="ml-2 text-zinc-300">· {a.serviceName}</span>
                      )}
                      {a.hotelBooking && (
                        <span className="ml-2 text-fuchsia-400">🏨 Hotel reservado ({a.hotelBooking.code})</span>
                      )}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-white">Historial</h2>
          <ul className="space-y-2">
            {past.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/citas/${a.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800/60 bg-zinc-900/30 px-4 py-3 transition hover:border-zinc-600"
                >
                  <div>
                    <p className="text-sm text-zinc-300">
                      {isWorker ? a.client.displayName : a.worker.displayName}
                    </p>
                    <p className="text-xs text-zinc-500">{formatDateTime(a.startsAt)}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
