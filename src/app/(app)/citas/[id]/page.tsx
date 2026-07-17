import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { card, pageTitle, btnSecondary, btnDanger } from "@/lib/ui";
import { StatusBadge, VerifiedBadge, UnverifiedBadge } from "@/components/badges";
import { Avatar } from "@/components/avatar";
import { formatDateTime, formatMoney } from "@/lib/format";
import { updateAppointmentStatusAction } from "../actions";
import { ReviewForm } from "./review-form";

export const metadata = { title: "Detalle de cita" };

export default async function CitaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser(["WORKER", "CLIENT"]);
  const { id } = await params;

  const appointment = await db.appointment.findUnique({
    where: { id },
    include: {
      worker: { select: { id: true, displayName: true, verifiedAt: true, profile: { select: { photoPath: true } } } },
      client: { select: { id: true, displayName: true, verifiedAt: true, profile: { select: { photoPath: true } } } },
      hotelBooking: { include: { hotel: true, roomType: true } },
      reviews: { include: { author: { select: { id: true, displayName: true } } } },
    },
  });

  if (
    !appointment ||
    (appointment.worker.id !== user.id && appointment.client.id !== user.id)
  ) {
    notFound();
  }

  const isWorker = appointment.worker.id === user.id;
  const other = isWorker ? appointment.client : appointment.worker;
  const now = new Date();
  const started = appointment.startsAt <= now;
  const future = appointment.startsAt > now;

  const canConfirm = isWorker && appointment.status === "PENDING";
  const canCancel = ["PENDING", "CONFIRMED"].includes(appointment.status) && future;
  const canComplete = appointment.status === "CONFIRMED" && started;
  const canNoShow = isWorker && appointment.status === "CONFIRMED" && started;

  const myReview = appointment.reviews.find((r) => r.author.id === user.id);
  const otherReview = appointment.reviews.find((r) => r.author.id !== user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className={pageTitle}>Cita</h1>
        <StatusBadge status={appointment.status} />
      </div>

      <div className={card}>
        <div className="flex items-center gap-3">
          <Avatar photoPath={other.profile?.photoPath} name={other.displayName} className="h-12 w-12" />
          <div>
            <p className="flex flex-wrap items-center gap-2 font-semibold text-white">
              {other.displayName}
              {isWorker && (other.verifiedAt ? <VerifiedBadge /> : <UnverifiedBadge />)}
            </p>
            <p className="text-xs text-zinc-500">{isWorker ? "Cliente" : "Profesional"}</p>
          </div>
          {!isWorker && (
            <Link
              href={`/perfiles/${other.id}`}
              className="ml-auto text-sm font-medium text-fuchsia-400 hover:text-fuchsia-300"
            >
              Ver perfil
            </Link>
          )}
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          {appointment.serviceName && (
            <div className="sm:col-span-2">
              <dt className="text-zinc-500">Servicio</dt>
              <dd className="font-medium text-zinc-200">{appointment.serviceName}</dd>
            </div>
          )}
          <div>
            <dt className="text-zinc-500">Inicio</dt>
            <dd className="text-zinc-200">{formatDateTime(appointment.startsAt)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Fin</dt>
            <dd className="text-zinc-200">{formatDateTime(appointment.endsAt)}</dd>
          </div>
          {appointment.notes && (
            <div className="sm:col-span-2">
              <dt className="text-zinc-500">Nota</dt>
              <dd className="text-zinc-200">{appointment.notes}</dd>
            </div>
          )}
        </dl>

        {(canConfirm || canCancel || canComplete || canNoShow) && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-zinc-800 pt-4">
            {canConfirm && (
              <form action={updateAppointmentStatusAction}>
                <input type="hidden" name="id" value={appointment.id} />
                <input type="hidden" name="action" value="confirm" />
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                >
                  ✓ Confirmar cita
                </button>
              </form>
            )}
            {canComplete && (
              <form action={updateAppointmentStatusAction}>
                <input type="hidden" name="id" value={appointment.id} />
                <input type="hidden" name="action" value="complete" />
                <button type="submit" className={btnSecondary}>
                  Marcar como completada
                </button>
              </form>
            )}
            {canNoShow && (
              <form action={updateAppointmentStatusAction}>
                <input type="hidden" name="id" value={appointment.id} />
                <input type="hidden" name="action" value="no_show" />
                <button type="submit" className={btnSecondary}>
                  No asistió
                </button>
              </form>
            )}
            {canCancel && (
              <form action={updateAppointmentStatusAction}>
                <input type="hidden" name="id" value={appointment.id} />
                <input type="hidden" name="action" value="cancel" />
                <button type="submit" className={btnDanger}>
                  Cancelar cita
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      <div className={card}>
        <h2 className="font-semibold text-white">Hotel</h2>
        {appointment.hotelBooking ? (
          <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm">
            <p className="font-medium text-zinc-200">
              {appointment.hotelBooking.hotel.name} · {appointment.hotelBooking.roomType.name}
            </p>
            <p className="mt-1 text-zinc-400">
              {formatDateTime(appointment.hotelBooking.startsAt)} —{" "}
              {formatMoney(appointment.hotelBooking.totalPrice)}
            </p>
            <p className="mt-1 text-zinc-400">
              Código de confirmación:{" "}
              <span className="font-mono font-bold text-fuchsia-300">
                {appointment.hotelBooking.code}
              </span>{" "}
              <StatusBadge status={appointment.hotelBooking.status} />
            </p>
          </div>
        ) : ["PENDING", "CONFIRMED"].includes(appointment.status) && future ? (
          <div className="mt-2">
            <p className="text-sm text-zinc-400">
              ¿Necesitan un lugar seguro? Reserva en un hotel aliado y quedará
              vinculado a esta cita.
            </p>
            <Link
              href={`/hoteles?cita=${appointment.id}`}
              className="mt-3 inline-block rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-500"
            >
              🏨 Reservar hotel aliado
            </Link>
          </div>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">Sin reserva de hotel.</p>
        )}
      </div>

      {appointment.status === "COMPLETED" && (
        <div className={card}>
          <h2 className="font-semibold text-white">Calificaciones</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Las calificaciones mutuas construyen la reputación de la comunidad.
          </p>

          {myReview ? (
            <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm">
              <p className="text-zinc-400">Tu calificación:</p>
              <p className="mt-1 text-amber-400">{"★".repeat(myReview.score)}</p>
              {myReview.comment && <p className="mt-1 text-zinc-300">{myReview.comment}</p>}
            </div>
          ) : (
            <div className="mt-4">
              <ReviewForm appointmentId={appointment.id} otherName={other.displayName} />
            </div>
          )}

          {otherReview && (
            <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm">
              <p className="text-zinc-400">{other.displayName} te calificó:</p>
              <p className="mt-1 text-amber-400">{"★".repeat(otherReview.score)}</p>
              {otherReview.comment && <p className="mt-1 text-zinc-300">{otherReview.comment}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
