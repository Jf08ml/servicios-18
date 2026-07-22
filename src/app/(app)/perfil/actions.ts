"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveWorkerProfile, type ProfileFormState } from "@/lib/profile";
import { addGalleryMedia, deleteGalleryMedia } from "@/lib/gallery";
import { listStates, listCities, type GeoOption } from "@/lib/geo";

export type { ProfileFormState };

/** Opciones en cascada para los selects de ubicación del formulario. */
export async function getStatesAction(countryCode: string): Promise<GeoOption[]> {
  return listStates(countryCode);
}

export async function getCitiesAction(
  countryCode: string,
  stateCode: string
): Promise<GeoOption[]> {
  return listCities(countryCode, stateCode);
}

export async function updateProfileAction(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const user = await requireUser();
  const result = await saveWorkerProfile(user.id, formData);
  revalidatePath("/perfil");
  revalidatePath("/perfiles");
  revalidatePath("/");
  return result;
}

function revalidateGallery(userId: string) {
  revalidatePath("/perfil");
  revalidatePath("/");
  revalidatePath("/perfiles");
  revalidatePath(`/perfiles/${userId}`);
}

export async function addGalleryMediaAction(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const user = await requireUser();
  if (user.role !== "WORKER") {
    return { error: "Solo los perfiles profesionales tienen galería" };
  }

  const files = formData
    .getAll("media")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return { error: "Selecciona al menos una foto o video" };
  }

  const result = await addGalleryMedia(user.id, files);
  revalidateGallery(user.id);
  return result;
}

export async function deleteGalleryMediaAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  await deleteGalleryMedia(user.id, id);
  revalidateGallery(user.id);
}

export async function addEmergencyContactAction(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 20);
  if (!name || !phone) return;

  const count = await db.emergencyContact.count({ where: { userId: user.id } });
  if (count >= 5) return;

  await db.emergencyContact.create({ data: { userId: user.id, name, phone } });
  revalidatePath("/perfil");
}

export async function deleteEmergencyContactAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  await db.emergencyContact.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/perfil");
}

export async function leaveAgencyAction(_formData: FormData) {
  const user = await requireUser();
  await db.user.update({ where: { id: user.id }, data: { agencyId: null } });
  revalidatePath("/perfil");
}
