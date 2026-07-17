"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { notify } from "@/lib/notifications";
import {
  DEFAULT_DURATIONS,
  MAX_SERVICE_TYPES,
  SERVICE_DURATIONS,
} from "@/lib/services";

export async function addAvailabilityAction(formData: FormData) {
  const user = await requireUser(["WORKER"]);
  // El formulario permite elegir varios días a la vez (un input por día).
  const weekdays = [...new Set(formData.getAll("weekday").map(Number))].filter(
    (d) => Number.isInteger(d) && d >= 0 && d <= 6
  );
  const start = Number(formData.get("startMinute"));
  const end = Number(formData.get("endMinute"));

  if (weekdays.length === 0) return;
  if (!Number.isInteger(start) || !Number.isInteger(end)) return;
  if (start < 0 || end > 1440 || end <= start) return;

  // No duplicar: se omiten los días donde el rango se solapa con uno existente.
  const existing = await db.availabilitySlot.findMany({
    where: { workerId: user.id, weekday: { in: weekdays } },
    select: { weekday: true, startMinute: true, endMinute: true },
  });
  const rows = weekdays
    .filter(
      (d) =>
        !existing.some(
          (s) => s.weekday === d && s.startMinute < end && s.endMinute > start
        )
    )
    .map((d) => ({ workerId: user.id, weekday: d, startMinute: start, endMinute: end }));

  if (rows.length > 0) {
    await db.availabilitySlot.createMany({ data: rows });
  }
  revalidatePath("/agenda");
}

export async function deleteAvailabilityAction(formData: FormData) {
  const user = await requireUser(["WORKER"]);
  const id = String(formData.get("id") ?? "");
  await db.availabilitySlot.deleteMany({ where: { id, workerId: user.id } });
  revalidatePath("/agenda");
}

export async function addServiceTypeAction(formData: FormData) {
  const user = await requireUser(["WORKER"]);
  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  const duration = Number(formData.get("duration"));

  if (!name || !SERVICE_DURATIONS.includes(duration)) return;
  const count = await db.serviceType.count({ where: { workerId: user.id } });
  if (count >= MAX_SERVICE_TYPES) return;

  await db.serviceType.create({
    data: { workerId: user.id, name, durationMinutes: duration },
  });
  revalidatePath("/agenda");
}

export async function deleteServiceTypeAction(formData: FormData) {
  const user = await requireUser(["WORKER"]);
  const id = String(formData.get("id") ?? "");
  await db.serviceType.deleteMany({ where: { id, workerId: user.id } });
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
