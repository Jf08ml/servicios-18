import "server-only";
import { db } from "./db";
import { MAX_SERVICE_TYPES, SERVICE_DURATIONS } from "./services";

/**
 * Núcleo de disponibilidad y tipos de servicio, sin autorización propia: lo
 * llama tanto la trabajadora sobre sí misma (agenda/actions.ts) como su
 * agencia sobre un perfil vinculado (agencia/actions.ts).
 */
export async function addAvailabilitySlots(workerId: string, formData: FormData): Promise<void> {
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
    where: { workerId, weekday: { in: weekdays } },
    select: { weekday: true, startMinute: true, endMinute: true },
  });
  const rows = weekdays
    .filter(
      (d) =>
        !existing.some(
          (s) => s.weekday === d && s.startMinute < end && s.endMinute > start
        )
    )
    .map((d) => ({ workerId, weekday: d, startMinute: start, endMinute: end }));

  if (rows.length > 0) {
    await db.availabilitySlot.createMany({ data: rows });
  }
}

export async function deleteAvailabilitySlot(workerId: string, id: string): Promise<void> {
  await db.availabilitySlot.deleteMany({ where: { id, workerId } });
}

export async function addServiceType(workerId: string, formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  const duration = Number(formData.get("duration"));

  if (!name || !SERVICE_DURATIONS.includes(duration)) return;
  const count = await db.serviceType.count({ where: { workerId } });
  if (count >= MAX_SERVICE_TYPES) return;

  await db.serviceType.create({
    data: { workerId, name, durationMinutes: duration },
  });
}

export async function deleteServiceType(workerId: string, id: string): Promise<void> {
  await db.serviceType.deleteMany({ where: { id, workerId } });
}
