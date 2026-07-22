"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser, hashPassword, isAdult } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveImage } from "@/lib/uploads";
import { saveWorkerProfile, type ProfileFormState } from "@/lib/profile";
import { addGalleryMedia, deleteGalleryMedia } from "@/lib/gallery";
import {
  addAvailabilitySlots,
  deleteAvailabilitySlot,
  addServiceType,
  deleteServiceType,
} from "@/lib/scheduling";

export type AgencyFormState = { error?: string; ok?: boolean };

async function getOwnAgency(userId: string) {
  return db.agency.findUnique({ where: { ownerId: userId } });
}

/** Verifica que la trabajadora pertenezca a esta agencia antes de dejarla tocarla. */
async function requireOwnedWorker(agencyId: string, workerId: string) {
  return db.user.findFirst({ where: { id: workerId, agencyId } });
}

export async function updateAgencyAction(
  _prev: AgencyFormState,
  formData: FormData
): Promise<AgencyFormState> {
  const user = await requireUser(["AGENCY"]);
  const agency = await getOwnAgency(user.id);
  if (!agency) return { error: "Tu cuenta no tiene una agencia asociada" };

  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const city = String(formData.get("city") ?? "").trim().slice(0, 60);
  const description = String(formData.get("description") ?? "").trim().slice(0, 1000);
  const photo = formData.get("photo");

  if (!name) return { error: "El nombre de la agencia es obligatorio" };

  let photoPath: string | undefined;
  if (photo instanceof File && photo.size > 0) {
    try {
      photoPath = await saveImage(photo, "agencies");
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Error al guardar la foto" };
    }
  }

  await db.agency.update({
    where: { id: agency.id },
    data: {
      name,
      city: city || null,
      description: description || null,
      ...(photoPath ? { photoPath } : {}),
    },
  });

  revalidatePath("/agencia");
  revalidatePath("/panel");
  revalidatePath(`/agencias/${agency.id}`);
  return { ok: true };
}

const createWorkerSchema = z.object({
  displayName: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(60),
  email: z.string().trim().toLowerCase().email("Correo electrónico inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(100),
  birthDate: z.coerce.date({ errorMap: () => ({ message: "Fecha de nacimiento inválida" }) }),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  city: z.string().trim().max(60).optional().or(z.literal("")),
});

export async function createAgencyWorkerAction(
  _prev: AgencyFormState,
  formData: FormData
): Promise<AgencyFormState> {
  const user = await requireUser(["AGENCY"]);
  const agency = await getOwnAgency(user.id);
  if (!agency) return { error: "Tu cuenta no tiene una agencia asociada" };

  const parsed = createWorkerSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    birthDate: formData.get("birthDate"),
    phone: formData.get("phone"),
    city: formData.get("city"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }
  const data = parsed.data;

  if (formData.get("confirmPassword") !== data.password) {
    return { error: "Las contraseñas no coinciden" };
  }
  if (formData.get("attestConsent") !== "on") {
    return {
      error: "Debes confirmar que la profesional es mayor de edad y aceptó unirse a la agencia",
    };
  }
  if (!isAdult(data.birthDate)) {
    return { error: "Debe ser mayor de 18 años para usar la plataforma" };
  }

  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return { error: "Ya existe una cuenta con este correo" };
  }

  await db.user.create({
    data: {
      email: data.email,
      passwordHash: await hashPassword(data.password),
      role: "WORKER",
      displayName: data.displayName,
      birthDate: data.birthDate,
      phone: data.phone || null,
      agencyId: agency.id,
      profile: { create: { city: data.city || null } },
    },
  });

  revalidatePath("/agencia");
  revalidatePath("/panel");
  return { ok: true };
}

export async function removeAgencyWorkerAction(formData: FormData) {
  const user = await requireUser(["AGENCY"]);
  const agency = await getOwnAgency(user.id);
  if (!agency) return;

  const workerId = String(formData.get("workerId") ?? "");
  await db.user.updateMany({
    where: { id: workerId, agencyId: agency.id },
    data: { agencyId: null },
  });
  revalidatePath("/agencia");
}

export async function updateAgencyWorkerProfileAction(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const user = await requireUser(["AGENCY"]);
  const agency = await getOwnAgency(user.id);
  if (!agency) return { error: "Tu cuenta no tiene una agencia asociada" };

  const workerId = String(formData.get("workerId") ?? "");
  const worker = await requireOwnedWorker(agency.id, workerId);
  if (!worker) return { error: "Esta profesional no pertenece a tu agencia" };

  const result = await saveWorkerProfile(workerId, formData);
  revalidatePath(`/agencia/${workerId}`);
  revalidatePath("/perfiles");
  revalidatePath("/");
  revalidatePath(`/perfiles/${workerId}`);
  return result;
}

export async function addAgencyWorkerGalleryMediaAction(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const user = await requireUser(["AGENCY"]);
  const agency = await getOwnAgency(user.id);
  if (!agency) return { error: "Tu cuenta no tiene una agencia asociada" };

  const workerId = String(formData.get("workerId") ?? "");
  const worker = await requireOwnedWorker(agency.id, workerId);
  if (!worker) return { error: "Esta profesional no pertenece a tu agencia" };

  const files = formData
    .getAll("media")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return { error: "Selecciona al menos una foto o video" };
  }

  const result = await addGalleryMedia(workerId, files);
  revalidatePath(`/agencia/${workerId}`);
  revalidatePath(`/perfiles/${workerId}`);
  revalidatePath("/perfiles");
  revalidatePath("/");
  return result;
}

export async function deleteAgencyWorkerGalleryMediaAction(formData: FormData) {
  const user = await requireUser(["AGENCY"]);
  const agency = await getOwnAgency(user.id);
  if (!agency) return;

  const workerId = String(formData.get("workerId") ?? "");
  const worker = await requireOwnedWorker(agency.id, workerId);
  if (!worker) return;

  const id = String(formData.get("id") ?? "");
  await deleteGalleryMedia(workerId, id);
  revalidatePath(`/agencia/${workerId}`);
  revalidatePath(`/perfiles/${workerId}`);
}

export async function addAgencyWorkerAvailabilityAction(formData: FormData) {
  const user = await requireUser(["AGENCY"]);
  const agency = await getOwnAgency(user.id);
  if (!agency) return;

  const workerId = String(formData.get("workerId") ?? "");
  const worker = await requireOwnedWorker(agency.id, workerId);
  if (!worker) return;

  await addAvailabilitySlots(workerId, formData);
  revalidatePath(`/agencia/${workerId}`);
}

export async function deleteAgencyWorkerAvailabilityAction(formData: FormData) {
  const user = await requireUser(["AGENCY"]);
  const agency = await getOwnAgency(user.id);
  if (!agency) return;

  const workerId = String(formData.get("workerId") ?? "");
  const worker = await requireOwnedWorker(agency.id, workerId);
  if (!worker) return;

  const id = String(formData.get("id") ?? "");
  await deleteAvailabilitySlot(workerId, id);
  revalidatePath(`/agencia/${workerId}`);
}

export async function addAgencyWorkerServiceTypeAction(formData: FormData) {
  const user = await requireUser(["AGENCY"]);
  const agency = await getOwnAgency(user.id);
  if (!agency) return;

  const workerId = String(formData.get("workerId") ?? "");
  const worker = await requireOwnedWorker(agency.id, workerId);
  if (!worker) return;

  await addServiceType(workerId, formData);
  revalidatePath(`/agencia/${workerId}`);
}

export async function deleteAgencyWorkerServiceTypeAction(formData: FormData) {
  const user = await requireUser(["AGENCY"]);
  const agency = await getOwnAgency(user.id);
  if (!agency) return;

  const workerId = String(formData.get("workerId") ?? "");
  const worker = await requireOwnedWorker(agency.id, workerId);
  if (!worker) return;

  const id = String(formData.get("id") ?? "");
  await deleteServiceType(workerId, id);
  revalidatePath(`/agencia/${workerId}`);
}
