import "server-only";
import { db } from "./db";
import { saveImage } from "./uploads";
import { resolveGeo } from "./geo";
import { toWhatsappNumber } from "./whatsapp";

export type ProfileFormState = { error?: string; ok?: boolean };

/**
 * Núcleo de la edición de perfil (bio, ubicación, foto, visibilidad, WhatsApp), sin
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
  const showPhone = formData.get("showPhone") === "on";
  const phoneInput = String(formData.get("phone") ?? "").trim().slice(0, 20);
  const photo = formData.get("photo");

  // Ubicación: códigos del selector en cascada, validados contra la librería.
  const cCode = String(formData.get("country") ?? "").trim();
  const sCode = String(formData.get("state") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim().slice(0, 80);

  const geoResult = resolveGeo(cCode, sCode, city);
  if ("error" in geoResult) return { error: geoResult.error };
  const geo = geoResult;

  // Obligatorio para profesionales, como en el registro. Se guarda normalizado
  // con indicativo (+57…) para que el enlace wa.me funcione.
  const owner = await db.user.findUnique({ where: { id: targetUserId }, select: { role: true } });
  let phone: string | null = null;
  if (phoneInput) {
    const digits = toWhatsappNumber(phoneInput, geo.countryCode);
    if (!digits) return { error: "El número de WhatsApp no es válido" };
    phone = `+${digits}`;
  } else if (owner?.role === "WORKER") {
    return { error: "El número de WhatsApp es obligatorio" };
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
    showPhone,
    ...geo,
    ...(photoPath ? { photoPath } : {}),
  };

  await db.$transaction([
    db.profile.upsert({
      where: { userId: targetUserId },
      create: { userId: targetUserId, ...data },
      update: data,
    }),
    db.user.update({ where: { id: targetUserId }, data: { phone } }),
  ]);

  return { ok: true };
}
