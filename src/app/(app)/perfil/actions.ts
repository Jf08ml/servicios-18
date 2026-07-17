"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveImage, saveMedia, deleteUpload } from "@/lib/uploads";
import {
  listStates,
  listCities,
  countryName,
  stateName,
  cityExists,
  type GeoOption,
} from "@/lib/geo";

export type ProfileFormState = { error?: string; ok?: boolean };

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

  const bio = String(formData.get("bio") ?? "").trim().slice(0, 1000);
  const languages = String(formData.get("languages") ?? "").trim().slice(0, 120);
  const visible = formData.get("visible") === "on";
  const photo = formData.get("photo");

  // Ubicación: códigos del selector en cascada, validados contra la librería.
  const cCode = String(formData.get("country") ?? "").trim();
  const sCode = String(formData.get("state") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim().slice(0, 80);

  let geo: {
    countryCode: string | null;
    countryName: string | null;
    stateCode: string | null;
    stateName: string | null;
    city: string | null;
  } = { countryCode: null, countryName: null, stateCode: null, stateName: null, city: null };

  if (cCode) {
    const cName = countryName(cCode);
    if (!cName) return { error: "País inválido" };
    geo.countryCode = cCode;
    geo.countryName = cName;

    if (sCode) {
      const sName = stateName(cCode, sCode);
      if (!sName) return { error: "Departamento inválido" };
      geo.stateCode = sCode;
      geo.stateName = sName;

      if (city) {
        if (!cityExists(cCode, sCode, city)) return { error: "Ciudad inválida" };
        geo.city = city;
      }
    }
  }

  let photoPath: string | undefined;
  if (photo instanceof File && photo.size > 0) {
    try {
      photoPath = await saveImage(photo, "avatars");
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Error al guardar la foto" };
    }
  }

  const data = {
    bio: bio || null,
    languages: languages || null,
    visible,
    ...geo,
    ...(photoPath ? { photoPath } : {}),
  };

  await db.profile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });

  revalidatePath("/perfil");
  revalidatePath("/perfiles");
  revalidatePath("/");
  return { ok: true };
}

const GALLERY_LIMIT = 12;

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

  const current = await db.mediaItem.count({ where: { userId: user.id } });
  if (current + files.length > GALLERY_LIMIT) {
    return {
      error: `La galería admite máximo ${GALLERY_LIMIT} archivos (tienes ${current}).`,
    };
  }

  for (const file of files) {
    try {
      const media = await saveMedia(file, "gallery");
      await db.mediaItem.create({
        data: { userId: user.id, kind: media.kind, filePath: media.path },
      });
    } catch (e) {
      revalidateGallery(user.id);
      return {
        error: `${file.name}: ${e instanceof Error ? e.message : "error al guardar"}`,
      };
    }
  }

  revalidateGallery(user.id);
  return { ok: true };
}

export async function deleteGalleryMediaAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");

  const item = await db.mediaItem.findFirst({ where: { id, userId: user.id } });
  if (!item) return;

  await db.mediaItem.delete({ where: { id: item.id } });
  await deleteUpload(item.filePath);
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
