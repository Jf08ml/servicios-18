import { db } from "@/lib/db";
import { pageTitle, card, input, label, btnSecondary } from "@/lib/ui";
import { formatMoney } from "@/lib/format";
import { addRoomTypeAction, toggleHotelActiveAction } from "../actions";
import { HotelForm } from "./hotel-form";

export const metadata = { title: "Hoteles aliados" };

export default async function AdminHotelesPage() {
  const hotels = await db.hotel.findMany({
    orderBy: { name: "asc" },
    include: {
      roomTypes: true,
      owner: { select: { email: true } },
      _count: { select: { bookings: true } },
    },
  });

  return (
    <div className="space-y-6">
      <h1 className={pageTitle}>Hoteles aliados</h1>

      <div className={card}>
        <h2 className="mb-4 font-semibold text-white">Registrar nuevo hotel</h2>
        <HotelForm />
      </div>

      {hotels.map((hotel) => (
        <div key={hotel.id} className={card}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-semibold text-white">
                {hotel.name}
                {!hotel.active && (
                  <span className="ml-2 rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-400">
                    Inactivo
                  </span>
                )}
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                {hotel.city} · {hotel.address} · Comisión {hotel.commissionPct}%
              </p>
              <p className="text-sm text-zinc-500">
                {hotel.owner ? `Cuenta: ${hotel.owner.email}` : "Sin cuenta vinculada"} ·{" "}
                {hotel._count.bookings} reservas históricas
              </p>
            </div>
            <form action={toggleHotelActiveAction}>
              <input type="hidden" name="id" value={hotel.id} />
              <button type="submit" className={btnSecondary}>
                {hotel.active ? "Desactivar" : "Activar"}
              </button>
            </form>
          </div>

          {hotel.roomTypes.length > 0 && (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {hotel.roomTypes.map((r) => (
                <li key={r.id} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm">
                  <span className="font-medium text-zinc-200">{r.name}</span>
                  <span className="ml-2 text-zinc-400">
                    {formatMoney(r.price)} / {r.blockHours}h · {r.totalRooms} hab.
                  </span>
                </li>
              ))}
            </ul>
          )}

          <details className="mt-4 border-t border-zinc-800 pt-4">
            <summary className="cursor-pointer text-sm font-medium text-fuchsia-400">
              + Agregar tipo de habitación
            </summary>
            <form action={addRoomTypeAction} className="mt-3 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="hotelId" value={hotel.id} />
              <div>
                <label className={label}>Nombre</label>
                <input name="name" required maxLength={80} className={input} placeholder="Suite estándar" />
              </div>
              <div>
                <label className={label}>Descripción</label>
                <input name="description" maxLength={300} className={input} />
              </div>
              <div>
                <label className={label}>Horas por bloque</label>
                <input name="blockHours" type="number" min={1} max={24} required className={input} />
              </div>
              <div>
                <label className={label}>Precio (COP)</label>
                <input name="price" type="number" min={0} step={1000} required className={input} />
              </div>
              <div>
                <label className={label}>Nº de habitaciones</label>
                <input name="totalRooms" type="number" min={1} required className={input} />
              </div>
              <div className="flex items-end">
                <button type="submit" className={btnSecondary}>
                  Agregar habitación
                </button>
              </div>
            </form>
          </details>
        </div>
      ))}
    </div>
  );
}
