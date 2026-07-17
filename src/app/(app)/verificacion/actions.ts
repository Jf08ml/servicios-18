"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveImage } from "@/lib/uploads";
import { notifyAdmins } from "@/lib/notifications";

export type VerificationFormState = { error?: string; ok?: boolean };

function revalidateVerification() {
  revalidatePath("/verificacion");
  revalidatePath("/panel");
  revalidatePath("/admin/verificaciones");
}

/**
 * Verificación rápida: una sola foto sosteniendo un papel que diga
 * "Prepagoniacas" y la fecha del día. La fecha de envío queda registrada
 * en submittedAt para contrastarla con la escrita en el papel.
 */
export async function submitQuickVerificationAction(
  _prev: VerificationFormState,
  formData: FormData
): Promise<VerificationFormState> {
  const user = await requireUser(["WORKER", "CLIENT"]);

  if (user.fullVerificationRequired) {
    return {
      error:
        "El equipo te pidió la verificación completa (documento + selfie); la rápida ya no aplica para tu cuenta.",
    };
  }

  const existing = await db.verification.findUnique({ where: { userId: user.id } });
  if (existing && existing.status !== "REJECTED") {
    return { error: "Ya tienes una verificación en curso o aprobada" };
  }

  const photo = formData.get("photo");
  const isPremiumRequested = formData.get("premium") === "on";
  if (!(photo instanceof File) || photo.size === 0) {
    return { error: "Adjunta la foto sosteniendo el papel" };
  }

  let selfiePath: string;
  try {
    selfiePath = await saveImage(photo, "verifications");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al guardar la foto" };
  }

  await db.verification.upsert({
    where: { userId: user.id },
    create: { userId: user.id, level: "QUICK", selfiePath, isPremiumRequested },
    update: {
      level: "QUICK",
      selfiePath,
      isPremiumRequested,
      fullName: null,
      docType: null,
      docNumber: null,
      docImagePath: null,
      status: "PENDING",
      notes: null,
      reviewedById: null,
      reviewedAt: null,
      submittedAt: new Date(),
    },
  });

  await notifyAdmins({
    type: "VERIFICATION",
    title: "Nueva verificación rápida pendiente",
    body: `${user.displayName} envió su foto con el cartel.`,
    link: "/admin/verificaciones",
  });

  revalidateVerification();
  return { ok: true };
}

/**
 * Verificación completa (documento + selfie). Es la vía exigida por el
 * equipo ante reportes o sospechas, y también se puede enviar
 * voluntariamente para subir de nivel una verificación rápida.
 */
export async function submitVerificationAction(
  _prev: VerificationFormState,
  formData: FormData
): Promise<VerificationFormState> {
  const user = await requireUser(["WORKER", "CLIENT"]);

  const existing = await db.verification.findUnique({ where: { userId: user.id } });
  // Solo se bloquea si ya hay una COMPLETA en curso o aprobada; una rápida
  // siempre se puede subir de nivel.
  if (existing && existing.level === "FULL" && existing.status !== "REJECTED") {
    return { error: "Ya tienes una verificación completa en curso o aprobada" };
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const docType = String(formData.get("docType") ?? "").trim();
  const docNumber = String(formData.get("docNumber") ?? "").trim();
  const docImage = formData.get("docImage");
  const selfie = formData.get("selfie");
  const isPremiumRequested = formData.get("premium") === "on";

  if (fullName.length < 3) return { error: "Ingresa tu nombre legal completo" };
  if (!["CC", "CE", "PASAPORTE"].includes(docType)) return { error: "Selecciona el tipo de documento" };
  if (docNumber.length < 4) return { error: "Ingresa el número de documento" };
  if (!(docImage instanceof File) || docImage.size === 0) return { error: "Adjunta la foto de tu documento" };
  if (!(selfie instanceof File) || selfie.size === 0) return { error: "Adjunta tu selfie sosteniendo el documento" };

  let docImagePath: string;
  let selfiePath: string;
  try {
    docImagePath = await saveImage(docImage, "verifications");
    selfiePath = await saveImage(selfie, "verifications");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al guardar las imágenes" };
  }

  await db.verification.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      level: "FULL",
      fullName,
      docType,
      docNumber,
      docImagePath,
      selfiePath,
      isPremiumRequested,
    },
    update: {
      level: "FULL",
      fullName,
      docType,
      docNumber,
      docImagePath,
      selfiePath,
      isPremiumRequested,
      status: "PENDING",
      notes: null,
      reviewedById: null,
      reviewedAt: null,
      submittedAt: new Date(),
    },
  });

  await notifyAdmins({
    type: "VERIFICATION",
    title: "Nueva verificación completa pendiente",
    body: `${user.displayName} envió documento y selfie.`,
    link: "/admin/verificaciones",
  });

  revalidateVerification();
  return { ok: true };
}
