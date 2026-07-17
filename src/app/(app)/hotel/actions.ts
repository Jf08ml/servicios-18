"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function completeHotelBookingAction(formData: FormData) {
  const user = await requireUser(["HOTEL"]);
  const id = String(formData.get("id") ?? "");

  const booking = await db.hotelBooking.findUnique({
    where: { id },
    include: { hotel: { select: { ownerId: true } } },
  });
  if (!booking || booking.hotel.ownerId !== user.id) return;
  if (booking.status !== "CONFIRMED" || booking.startsAt > new Date()) return;

  await db.hotelBooking.update({ where: { id }, data: { status: "COMPLETED" } });
  revalidatePath("/hotel");
}
