"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { notify } from "@/lib/notifications";
import { DEFAULT_DURATIONS } from "@/lib/services";
import {
  addAvailabilitySlots,
  deleteAvailabilitySlot,
  addServiceType,
  deleteServiceType,
} from "@/lib/scheduling";

export async function addAvailabilityAction(formData: FormData) {
  const user = await requireUser(["WORKER"]);
  await addAvailabilitySlots(user.id, formData);
  revalidatePath("/agenda");
}

export async function deleteAvailabilityAction(formData: FormData) {
  const user = await requireUser(["WORKER"]);
  const id = String(formData.get("id") ?? "");
  await deleteAvailabilitySlot(user.id, id);
  revalidatePath("/agenda");
}

export async function addServiceTypeAction(formData: FormData) {
  const user = await requireUser(["WORKER"]);
  await addServiceType(user.id, formData);
  revalidatePath("/agenda");
}

export async function deleteServiceTypeAction(formData: FormData) {
  const user = await requireUser(["WORKER"]);
  const id = String(formData.get("id") ?? "");
  await deleteServiceType(user.id, id);
  revalidatePath("/agenda");
}

export type AppointmentFormState = { error?: string };

export async function requestAppointmentAction(
  _prev: AppointmentFormState,
  formData: FormData
): Promise<AppointmentFormState> {
  const user = await requireUser(["CLIENT"]);

  const workerId = String(formData.get("workerId") ?? "");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const serviceId = String(formData.get("serviceId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 500);

  const startsAt = new Date(`${date}T${time}:00`);
  if (isNaN(startsAt.getTime())) return { error: "Fecha u hora inválida" };
  if (startsAt <= new Date()) return { error: "La cita debe ser en el futuro" };

  const worker = await db.user.findFirst({
    where: {
      id: workerId,
      role: "WORKER",
      status: "ACTIVE",
      verifiedAt: { not: null },
      profile: { visible: true },
    },
  });
  if (!worker) return { error: "El perfil no está disponible" };

  // Con tipos de servicio definidos se agenda uno de ellos; si no, una
  // duración estándar. El nombre queda copiado en la cita.
  let duration: number;
  let serviceName: string | null = null;
  if (serviceId) {
    const service = await db.serviceType.findFirst({
      where: { id: serviceId, workerId },
    });
    if (!service) return { error: "Servicio inválido" };
    duration = service.durationMinutes;
    serviceName = service.name;
  } else {
    duration = Number(formData.get("duration"));
    if (!DEFAULT_DURATIONS.includes(duration)) {
      return { error: "Duración inválida" };
    }
  }

  const endsAt = new Date(startsAt.getTime() + duration * 60 * 1000);

  const conflict = await db.appointment.count({
    where: {
      workerId,
      status: { in: ["PENDING", "CONFIRMED"] },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  });
  if (conflict > 0) {
    return { error: "Ese horario ya está ocupado. Elige otro." };
  }

  const appointment = await db.appointment.create({
    data: {
      workerId,
      clientId: user.id,
      startsAt,
      endsAt,
      serviceName,
      notes: notes || null,
    },
  });

  await notify(workerId, {
    type: "APPOINTMENT",
    title: "Nueva solicitud de cita",
    body: `${user.displayName}${user.verifiedAt ? "" : " (cliente sin verificar)"} pidió ${serviceName ? `"${serviceName}"` : "una cita"} para el ${formatDateTime(startsAt)}. Confírmala o recházala desde tu agenda.`,
    link: `/citas/${appointment.id}`,
  });

  revalidatePath("/agenda");
  redirect(`/citas/${appointment.id}`);
}
