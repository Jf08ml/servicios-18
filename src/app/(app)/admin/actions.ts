"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveImage } from "@/lib/uploads";
import { notify } from "@/lib/notifications";

export async function reviewVerificationAction(formData: FormData) {
  const admin = await requireUser(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 500);

  const verification = await db.verification.findUnique({ where: { id } });
  if (!verification || verification.status !== "PENDING") return;

  if (decision === "approve") {
    await db.$transaction([
      db.verification.update({
        where: { id },
        data: {
          status: "APPROVED",
          notes: notes || null,
          reviewedById: admin.id,
          reviewedAt: new Date(),
        },
      }),
      db.user.update({
        where: { id: verification.userId },
        data: {
          verifiedAt: new Date(),
          // Una completa aprobada satisface la exigencia del equipo.
          ...(verification.level === "FULL" ? { fullVerificationRequired: false } : {}),
        },
      }),
    ]);
    await notify(verification.userId, {
      type: "VERIFICATION",
      title: "Verificación aprobada ✓",
      body:
        verification.level === "QUICK"
          ? "Tu verificación rápida fue aprobada. Ya tienes el distintivo de perfil verificado."
          : "Tu verificación completa fue aprobada. Tienes el nivel máximo de confianza.",
      link: "/verificacion",
    });
  } else if (decision === "reject") {
    await db.$transaction([
      db.verification.update({
        where: { id },
        data: {
          status: "REJECTED",
          notes: notes || "El envío no pudo validarse",
          reviewedById: admin.id,
          reviewedAt: new Date(),
        },
      }),
      db.user.update({
        where: { id: verification.userId },
        data: { verifiedAt: null },
      }),
    ]);
    await notify(verification.userId, {
      type: "VERIFICATION",
      title: "Verificación rechazada",
      body: notes || "El envío no pudo validarse. Puedes volver a intentarlo.",
      link: "/verificacion",
    });
  }

  revalidatePath("/admin/verificaciones");
  revalidatePath("/admin");
}

/**
 * Exige (o deja de exigir) la verificación completa a un usuario, típicamente
 * ante reportes de estafa o perfil falso.
 */
export async function requireFullVerificationAction(formData: FormData) {
  await requireUser(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const required = String(formData.get("required") ?? "") === "true";

  const target = await db.user.findUnique({ where: { id } });
  if (!target || target.role === "ADMIN" || target.role === "HOTEL") return;

  await db.user.update({
    where: { id },
    data: { fullVerificationRequired: required },
  });

  if (required) {
    await notify(id, {
      type: "VERIFICATION",
      title: "Necesitamos tu verificación completa",
      body:
        "Por seguridad de la comunidad, tu cuenta debe verificarse con documento de identidad y selfie.",
      link: "/verificacion",
    });
  }

  revalidatePath("/admin/usuarios");
  revalidatePath("/verificacion");
}

export async function resolveReportAction(formData: FormData) {
  await requireUser(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const adminNotes = String(formData.get("adminNotes") ?? "").trim().slice(0, 1000);

  if (!["REVIEWING", "RESOLVED", "DISMISSED"].includes(status)) return;

  const report = await db.report.update({
    where: { id },
    data: {
      status: status as "REVIEWING" | "RESOLVED" | "DISMISSED",
      adminNotes: adminNotes || null,
      resolvedAt: status === "REVIEWING" ? null : new Date(),
    },
  });

  if (status !== "REVIEWING") {
    await notify(report.reporterId, {
      type: "REPORT",
      title: status === "RESOLVED" ? "Tu reporte fue resuelto" : "Tu reporte fue revisado y archivado",
      body: adminNotes || "Gracias por ayudar a cuidar la comunidad.",
      link: "/reportes",
    });
  }

  revalidatePath("/admin/reportes");
  revalidatePath("/admin");
}

export async function resolveSosAction(formData: FormData) {
  await requireUser(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  await db.sosAlert.update({
    where: { id },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });
  revalidatePath("/admin/sos");
  revalidatePath("/admin");
}

export async function setUserStatusAction(formData: FormData) {
  const admin = await requireUser(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!["ACTIVE", "SUSPENDED", "BANNED"].includes(status)) return;
  if (id === admin.id) return;

  const target = await db.user.findUnique({ where: { id } });
  if (!target || target.role === "ADMIN") return;

  await db.user.update({
    where: { id },
    data: { status: status as "ACTIVE" | "SUSPENDED" | "BANNED" },
  });

  // Cerrar sesiones activas de cuentas bloqueadas o suspendidas.
  if (status !== "ACTIVE") {
    await db.session.deleteMany({ where: { userId: id } });
  }

  revalidatePath("/admin/usuarios");
}

export async function setPremiumAction(formData: FormData) {
  await requireUser(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const grant = String(formData.get("grant") ?? "") === "true";

  await db.user.update({
    where: { id },
    data: {
      premiumUntil: grant
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        : null,
    },
  });

  await notify(id, {
    type: "SYSTEM",
    title: grant ? "Premium activado ★" : "Premium desactivado",
    body: grant
      ? "Tu cuenta tiene premium por 30 días: distintivo especial y prioridad en el directorio."
      : "Tu membresía premium terminó.",
  });

  revalidatePath("/admin/usuarios");
  revalidatePath("/perfiles");
}

export type HotelFormState = { error?: string; ok?: boolean };

export async function createHotelAction(
  _prev: HotelFormState,
  formData: FormData
): Promise<HotelFormState> {
  await requireUser(["ADMIN"]);

  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const city = String(formData.get("city") ?? "").trim().slice(0, 60);
  const address = String(formData.get("address") ?? "").trim().slice(0, 150);
  const description = String(formData.get("description") ?? "").trim().slice(0, 1000);
  const commissionPct = Number(formData.get("commissionPct"));
  const ownerEmail = String(formData.get("ownerEmail") ?? "").trim().toLowerCase();
  const photo = formData.get("photo");

  if (!name || !city || !address) {
    return { error: "Nombre, ciudad y dirección son obligatorios" };
  }
  if (!Number.isInteger(commissionPct) || commissionPct < 0 || commissionPct > 50) {
    return { error: "La comisión debe estar entre 0 y 50%" };
  }

  let ownerId: string | null = null;
  if (ownerEmail) {
    const owner = await db.user.findUnique({ where: { email: ownerEmail } });
    if (!owner || owner.role !== "HOTEL") {
      return { error: "No existe una cuenta con rol Hotel para ese correo" };
    }
    ownerId = owner.id;
  }

  let photoPath: string | undefined;
  if (photo instanceof File && photo.size > 0) {
    try {
      photoPath = await saveImage(photo, "hotels");
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Error al guardar la foto" };
    }
  }

  await db.hotel.create({
    data: {
      name,
      city,
      address,
      description: description || null,
      commissionPct,
      ownerId,
      ...(photoPath ? { photoPath } : {}),
    },
  });

  revalidatePath("/admin/hoteles");
  revalidatePath("/hoteles");
  return { ok: true };
}

export async function addRoomTypeAction(formData: FormData) {
  await requireUser(["ADMIN"]);
  const hotelId = String(formData.get("hotelId") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const description = String(formData.get("description") ?? "").trim().slice(0, 300);
  const blockHours = Number(formData.get("blockHours"));
  const price = Number(formData.get("price"));
  const totalRooms = Number(formData.get("totalRooms"));

  if (!name || !hotelId) return;
  if (!Number.isInteger(blockHours) || blockHours < 1 || blockHours > 24) return;
  if (!Number.isInteger(price) || price < 0) return;
  if (!Number.isInteger(totalRooms) || totalRooms < 1) return;

  await db.roomType.create({
    data: {
      hotelId,
      name,
      description: description || null,
      blockHours,
      price,
      totalRooms,
    },
  });
  revalidatePath("/admin/hoteles");
  revalidatePath("/hoteles");
}

export async function toggleHotelActiveAction(formData: FormData) {
  await requireUser(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const hotel = await db.hotel.findUnique({ where: { id } });
  if (!hotel) return;
  await db.hotel.update({ where: { id }, data: { active: !hotel.active } });
  revalidatePath("/admin/hoteles");
  revalidatePath("/hoteles");
}
