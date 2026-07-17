"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { notify } from "@/lib/notifications";

function revalidateAppointment(id: string) {
  revalidatePath("/agenda");
  revalidatePath("/panel");
  revalidatePath(`/citas/${id}`);
}

export async function updateAppointmentStatusAction(formData: FormData) {
  const user = await requireUser(["WORKER", "CLIENT"]);
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "");

  const appointment = await db.appointment.findUnique({ where: { id } });
  if (!appointment) return;

  const isWorker = appointment.workerId === user.id;
  const isClient = appointment.clientId === user.id;
  if (!isWorker && !isClient) return;

  const now = new Date();
  let newStatus: "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW" | null = null;

  switch (action) {
    case "confirm":
      if (isWorker && appointment.status === "PENDING") newStatus = "CONFIRMED";
      break;
    case "cancel":
      if (["PENDING", "CONFIRMED"].includes(appointment.status) && appointment.startsAt > now) {
        newStatus = "CANCELLED";
      }
      break;
    case "complete":
      if (appointment.status === "CONFIRMED" && appointment.startsAt <= now) {
        newStatus = "COMPLETED";
      }
      break;
    case "no_show":
      if (isWorker && appointment.status === "CONFIRMED" && appointment.startsAt <= now) {
        newStatus = "NO_SHOW";
      }
      break;
  }

  if (!newStatus) return;

  await db.appointment.update({ where: { id }, data: { status: newStatus } });

  // Notificar a la contraparte de la cita.
  const counterpartId = isWorker ? appointment.clientId : appointment.workerId;
  const when = formatDateTime(appointment.startsAt);
  const TITLES: Record<"CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW", string> = {
    CONFIRMED: "Cita confirmada",
    CANCELLED: "Cita cancelada",
    COMPLETED: "Cita marcada como completada",
    NO_SHOW: "Cita marcada como no asistida",
  };
  await notify(counterpartId, {
    type: "APPOINTMENT",
    title: TITLES[newStatus],
    body: `${user.displayName} actualizó la cita del ${when}.`,
    link: `/citas/${id}`,
  });

  revalidateAppointment(id);
}

export type ReviewFormState = { error?: string; ok?: boolean };

export async function createReviewAction(
  _prev: ReviewFormState,
  formData: FormData
): Promise<ReviewFormState> {
  const user = await requireUser(["WORKER", "CLIENT"]);
  const appointmentId = String(formData.get("appointmentId") ?? "");
  const score = Number(formData.get("score"));
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 1000);

  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return { error: "Selecciona una calificación de 1 a 5 estrellas" };
  }

  const appointment = await db.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) return { error: "Cita no encontrada" };
  if (appointment.status !== "COMPLETED") {
    return { error: "Solo puedes calificar citas completadas" };
  }

  const isWorker = appointment.workerId === user.id;
  const isClient = appointment.clientId === user.id;
  if (!isWorker && !isClient) return { error: "No participaste en esta cita" };

  const targetId = isWorker ? appointment.clientId : appointment.workerId;

  const existing = await db.review.findUnique({
    where: { appointmentId_authorId: { appointmentId, authorId: user.id } },
  });
  if (existing) return { error: "Ya calificaste esta cita" };

  await db.review.create({
    data: {
      appointmentId,
      authorId: user.id,
      targetId,
      score,
      comment: comment || null,
    },
  });

  await notify(targetId, {
    type: "REVIEW",
    title: `Nueva reseña: ${"★".repeat(score)}`,
    body: `${user.displayName} calificó la cita que tuvieron.`,
    link: `/citas/${appointmentId}`,
  });

  revalidateAppointment(appointmentId);
  revalidatePath("/perfiles");
  return { ok: true };
}
