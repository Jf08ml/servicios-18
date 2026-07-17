import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { pageTitle } from "@/lib/ui";
import { EmptyState } from "@/components/empty-state";
import { formatMoney } from "@/lib/format";

export const metadata = { title: "Hoteles aliados" };

export default async function HotelesPage({
  searchParams,
}: {
  searchParams: Promise<{ cita?: string }>;
}) {
  await requireUser(["WORKER", "CLIENT"]);
  const { cita } = await searchParams;

  const hotels = await db.hotel.findMany({
    where: { active: true },
    include: { roomTypes: { orderBy: { price: "asc" } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className={pageTitle}>Hoteles aliados</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Lugares seguros y verificados por la plataforma. Reserva con código de
          confirmación, sin llamadas ni esperas.
        </p>
      </div>

      {hotels.length === 0 ? (
        <EmptyState
          title="Aún no hay hoteles aliados"
          description="Estamos incorporando hoteles verificados. Vuelve pronto."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hotels.map((hotel) => {
            const cheapest = hotel.roomTypes[0];
            return (
              <Link
                key={hotel.id}
                href={`/hoteles/${hotel.id}${cita ? `?cita=${cita}` : ""}`}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-fuchsia-700"
              >
                {hotel.photoPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/files/${hotel.photoPath}`}
                    alt={hotel.name}
                    className="mb-3 h-36 w-full rounded-xl object-cover"
                  />
                ) : (
                  <div className="mb-3 flex h-36 w-full items-center justify-center rounded-xl bg-zinc-800 text-4xl">
                    🏨
                  </div>
                )}
                <h2 className="font-semibold text-white">{hotel.name}</h2>
                <p className="text-sm text-zinc-400">
                  {hotel.city} · {hotel.address}
                </p>
                {cheapest && (
                  <p className="mt-2 text-sm text-fuchsia-300">
                    Desde {formatMoney(cheapest.price)} / {cheapest.blockHours}h
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
