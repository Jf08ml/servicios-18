import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { pageTitle, btnDanger } from "@/lib/ui";
import { StatusBadge } from "@/components/badges";
import { EmptyState } from "@/components/empty-state";
import { formatDateTime, formatMoney } from "@/lib/format";
import { cancelBookingAction } from "../hoteles/actions";
import Link from "next/link";

export const metadata = { title: "Mis reservas" };

export default async function ReservasPage({
  searchParams,
}: {
  searchParams: Promise<{ nueva?: string }>;
}) {
  const user = await requireUser(["WORKER", "CLIENT"]);
  const { nueva } = await searchParams;

  const bookings = await db.hotelBooking.findMany({
    where: { userId: user.id },
    orderBy: { startsAt: "desc" },
    take: 50,
    include: { hotel: true, roomType: true, appointment: { select: { id: true } } },
  });

  const now = new Date();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className={pageTitle}>Mis reservas de hotel</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Presenta el código de confirmación en la recepción del hotel aliado.
        </p>
      </div>

      {nueva && (
        <div className="rounded-2xl border border-emerald-800 bg-emerald-950/40 p-5">
          <p className="font-semibold text-emerald-200">✓ ¡Reserva confirmada!</p>
          <p className="mt-1 text-sm text-emerald-100/80">
            Tu código de confirmación es{" "}
            <span className="font-mono text-lg font-bold text-white">{nueva}</span>
          </p>
        </div>
      )}

      {bookings.length === 0 ? (
        <EmptyState
          title="No tienes reservas"
          description="Explora los hoteles aliados y reserva un lugar seguro."
        />
      ) : (
        <ul className="space-y-3">
          {bookings.map((b) => {
            const cancellable = b.status === "CONFIRMED" && b.startsAt > now;
            return (
              <li
                key={b.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-white">
                      {b.hotel.name} · {b.roomType.name}
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {formatDateTime(b.startsAt)} → {formatDateTime(b.endsAt)}
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {formatMoney(b.totalPrice)} · Código:{" "}
                      <span className="font-mono font-bold text-fuchsia-300">{b.code}</span>
                    </p>
                    {b.appointment && (
                      <Link
                        href={`/citas/${b.appointment.id}`}
                        className="mt-1 inline-block text-xs font-medium text-fuchsia-400 hover:text-fuchsia-300"
                      >
                        Ver cita vinculada →
                      </Link>
                    )}
                  </div>
                  <StatusBadge status={b.status} />
                </div>
                {cancellable && (
                  <form action={cancelBookingAction} className="mt-3">
                    <input type="hidden" name="id" value={b.id} />
                    <button type="submit" className={btnDanger}>
                      Cancelar reserva
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
