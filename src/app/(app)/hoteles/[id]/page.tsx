import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { card, pageTitle } from "@/lib/ui";
import { formatDateTime, formatMoney } from "@/lib/format";
import { BookingForm } from "./booking-form";

export const metadata = { title: "Hotel aliado" };

export default async function HotelDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cita?: string }>;
}) {
  const user = await requireUser(["WORKER", "CLIENT"]);
  const { id } = await params;
  const { cita } = await searchParams;

  const hotel = await db.hotel.findFirst({
    where: { id, active: true },
    include: { roomTypes: { orderBy: { price: "asc" } } },
  });
  if (!hotel) notFound();

  // Citas del usuario que pueden vincularse a la reserva.
  const linkableAppointments = await db.appointment.findMany({
    where: {
      OR: [{ workerId: user.id }, { clientId: user.id }],
      status: { in: ["PENDING", "CONFIRMED"] },
      startsAt: { gt: new Date() },
      hotelBooking: null,
    },
    orderBy: { startsAt: "asc" },
    include: {
      worker: { select: { displayName: true } },
      client: { select: { displayName: true } },
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        {hotel.photoPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/files/${hotel.photoPath}`}
            alt={hotel.name}
            className="mb-4 h-52 w-full rounded-2xl object-cover"
          />
        ) : (
          <div className="mb-4 flex h-52 w-full items-center justify-center rounded-2xl bg-zinc-800 text-6xl">
            🏨
          </div>
        )}
        <h1 className={pageTitle}>{hotel.name}</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {hotel.city} · {hotel.address}
        </p>
        {hotel.description && (
          <p className="mt-3 text-sm leading-relaxed text-zinc-300">{hotel.description}</p>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Habitaciones</h2>
        {hotel.roomTypes.map((room) => (
          <div key={room.id} className={card}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-white">{room.name}</h3>
                {room.description && (
                  <p className="mt-1 text-sm text-zinc-400">{room.description}</p>
                )}
              </div>
              <p className="text-right">
                <span className="text-lg font-bold text-fuchsia-300">{formatMoney(room.price)}</span>
                <span className="block text-xs text-zinc-500">bloque de {room.blockHours}h</span>
              </p>
            </div>
            <div className="mt-4 border-t border-zinc-800 pt-4">
              <BookingForm
                roomTypeId={room.id}
                preselectedAppointmentId={cita ?? ""}
                appointments={linkableAppointments.map((a) => ({
                  id: a.id,
                  label: `${formatDateTime(a.startsAt)} · ${
                    a.workerId === user.id ? a.client.displayName : a.worker.displayName
                  }`,
                }))}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
