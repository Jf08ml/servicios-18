import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { pageTitle, card } from "@/lib/ui";
import { StatusBadge } from "@/components/badges";
import { EmptyState } from "@/components/empty-state";
import { formatDateTime, formatMoney } from "@/lib/format";
import { completeHotelBookingAction } from "./actions";

export const metadata = { title: "Gestión del hotel" };

export default async function HotelPanelPage() {
  const user = await requireUser(["HOTEL"]);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const hotels = await db.hotel.findMany({
    where: { ownerId: user.id },
    include: {
      bookings: {
        orderBy: { startsAt: "desc" },
        take: 60,
        include: {
          roomType: true,
          user: { select: { displayName: true, verifiedAt: true } },
        },
      },
    },
  });

  if (hotels.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className={pageTitle}>Gestión del hotel</h1>
        <EmptyState
          title="Tu cuenta aún no está vinculada a un hotel"
          description="El equipo de la plataforma vinculará tu cuenta. Escríbenos si tarda más de 24 horas."
        />
      </div>
    );
  }

  const now = new Date();

  return (
    <div className="space-y-8">
      <h1 className={pageTitle}>Gestión del hotel</h1>

      {hotels.map((hotel) => {
        const monthBookings = hotel.bookings.filter(
          (b) => b.createdAt >= monthStart && b.status !== "CANCELLED"
        );
        const revenue = monthBookings.reduce((sum, b) => sum + b.totalPrice, 0);
        const commission = monthBookings.reduce((sum, b) => sum + b.commissionAmount, 0);
        const upcoming = hotel.bookings
          .filter((b) => b.status === "CONFIRMED" && b.endsAt >= now)
          .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
        const history = hotel.bookings.filter((b) => !upcoming.includes(b));

        return (
          <section key={hotel.id} className="space-y-4">
            <h2 className="text-lg font-semibold text-white">{hotel.name}</h2>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className={card}>
                <p className="text-2xl font-bold text-white">{monthBookings.length}</p>
                <p className="text-sm text-zinc-400">Reservas este mes</p>
              </div>
              <div className={card}>
                <p className="text-2xl font-bold text-white">{formatMoney(revenue)}</p>
                <p className="text-sm text-zinc-400">Ingresos brutos del mes</p>
              </div>
              <div className={card}>
                <p className="text-2xl font-bold text-amber-300">{formatMoney(commission)}</p>
                <p className="text-sm text-zinc-400">
                  Comisión plataforma ({hotel.commissionPct}%)
                </p>
              </div>
            </div>

            <div className={card}>
              <h3 className="font-semibold text-white">Próximas reservas</h3>
              {upcoming.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-500">No hay reservas próximas.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {upcoming.map((b) => (
                    <li
                      key={b.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2"
                    >
                      <div className="text-sm">
                        <p className="font-medium text-zinc-200">
                          {b.roomType.name} ·{" "}
                          <span className="font-mono text-fuchsia-300">{b.code}</span>
                        </p>
                        <p className="text-zinc-400">
                          {b.user.displayName}
                          {b.user.verifiedAt && (
                            <span className="ml-1 text-emerald-400" title="Cliente verificado">✓</span>
                          )}{" "}
                          · {formatDateTime(b.startsAt)} → {formatDateTime(b.endsAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-300">{formatMoney(b.totalPrice)}</span>
                        {b.startsAt <= now && (
                          <form action={completeHotelBookingAction}>
                            <input type="hidden" name="id" value={b.id} />
                            <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500">
                              Check-in hecho
                            </button>
                          </form>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {history.length > 0 && (
              <div className={card}>
                <h3 className="font-semibold text-white">Historial</h3>
                <ul className="mt-3 space-y-2">
                  {history.slice(0, 15).map((b) => (
                    <li
                      key={b.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800/60 bg-zinc-950/50 px-3 py-2 text-sm"
                    >
                      <span className="text-zinc-400">
                        {b.roomType.name} · {b.user.displayName} · {formatDateTime(b.startsAt)}
                      </span>
                      <StatusBadge status={b.status} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
