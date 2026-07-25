import "server-only";
import { db } from "./db";
import { saveImage } from "./uploads";
import { resolveGeo } from "./geo";

export type ProfileFormState = { error?: string; ok?: boolean };

/**
 * Núcleo de la edición de perfil (bio, ubicación, foto, visibilidad), sin
 * autorización propia: la llama tanto la trabajadora sobre sí misma
 * (perfil/actions.ts) como su agencia sobre un perfil vinculado
 * (agencia/actions.ts), cada una tras verificar su propio permiso.
 */
export async function saveWorkerProfile(
  targetUserId: string,
  formData: FormData
): Promise<ProfileFormState> {
  const bio = String(formData.get("bio") ?? "").trim().slice(0, 1000);
  const languages = String(formData.get("languages") ?? "").trim().slice(0, 120);
  const visible = formData.get("visible") === "on";
  const photo = formData.get("photo");

  // Ubicación: códigos del selector en cascada, validados contra la librería.
  const cCode = String(formData.get("country") ?? "").trim();
  const sCode = String(formData.get("state") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim().slice(0, 80);

  const geoResult = resolveGeo(cCode, sCode, city);
  if ("error" in geoResult) return { error: geoResult.error };
  const geo = geoResult;

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
    where: { userId: targetUserId },
    create: { userId: targetUserId, ...data },
    update: data,
  });

  return { ok: true };
}
