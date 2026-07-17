"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { notify } from "@/lib/notifications";

export type BookingFormState = { error?: string };

function bookingCode() {
  // Código corto legible para presentar en recepción.
  return crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 7);
}

export async function createBookingAction(
  _prev: BookingFormState,
  formData: FormData
): Promise<BookingFormState> {
  const user = await requireUser(["WORKER", "CLIENT"]);

  const roomTypeId = String(formData.get("roomTypeId") ?? "");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const appointmentId = String(formData.get("appointmentId") ?? "");

  const startsAt = new Date(`${date}T${time}:00`);
  if (isNaN(startsAt.getTime())) return { error: "Fecha u hora inválida" };
  if (startsAt <= new Date()) return { error: "La reserva debe ser en el futuro" };

  const roomType = await db.roomType.findUnique({
    where: { id: roomTypeId },
    include: { hotel: true },
  });
  if (!roomType || !roomType.hotel.active) {
    return { error: "La habitación no está disponible" };
  }

  const endsAt = new Date(startsAt.getTime() + roomType.blockHours * 60 * 60 * 1000);

  const overlapping = await db.hotelBooking.count({
    where: {
      roomTypeId,
      status: "CONFIRMED",
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  });
  if (overlapping >= roomType.totalRooms) {
    return { error: "No hay habitaciones disponibles en ese horario" };
  }

  if (appointmentId) {
    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: { hotelBooking: { select: { id: true } } },
    });
    const participates =
      appointment &&
      (appointment.workerId === user.id || appointment.clientId === user.id);
    if (!participates) return { error: "Cita inválida" };
    if (appointment.hotelBooking) {
      return { error: "Esa cita ya tiene una reserva de hotel" };
    }
  }

  const commissionAmount = Math.round((roomType.price * roomType.hotel.commissionPct) / 100);

  const booking = await db.hotelBooking.create({
    data: {
      code: bookingCode(),
      hotelId: roomType.hotelId,
      roomTypeId,
      userId: user.id,
      appointmentId: appointmentId || null,
      startsAt,
      endsAt,
      totalPrice: roomType.price,
      commissionAmount,
    },
  });

  if (roomType.hotel.ownerId) {
    await notify(roomType.hotel.ownerId, {
      type: "BOOKING",
      title: `Nueva reserva ${booking.code}`,
      body: `${roomType.name} · ${formatDateTime(startsAt)} (${roomType.blockHours} h).`,
      link: "/hotel",
    });
  }

  revalidatePath("/reservas");
  revalidatePath("/agenda");
  redirect(`/reservas?nueva=${booking.code}`);
}

export async function cancelBookingAction(formData: FormData) {
  const user = await requireUser(["WORKER", "CLIENT"]);
  const id = String(formData.get("id") ?? "");

  const booking = await db.hotelBooking.findUnique({ where: { id } });
  if (!booking || booking.userId !== user.id) return;
  if (booking.status !== "CONFIRMED" || booking.startsAt <= new Date()) return;

  await db.hotelBooking.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  const hotel = await db.hotel.findUnique({
    where: { id: booking.hotelId },
    select: { ownerId: true },
  });
  if (hotel?.ownerId) {
    await notify(hotel.ownerId, {
      type: "BOOKING",
      title: `Reserva ${booking.code} cancelada`,
      body: `La reserva del ${formatDateTime(booking.startsAt)} fue cancelada por el usuario.`,
      link: "/hotel",
    });
  }

  revalidatePath("/reservas");
  revalidatePath("/agenda");
}
