"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifyAdmins } from "@/lib/notifications";

export type SosResult = {
  ok?: boolean;
  error?: string;
  contacts?: { name: string; phone: string }[];
};

export async function sendSosAction(input: {
  message?: string;
  latitude?: number;
  longitude?: number;
}): Promise<SosResult> {
  const user = await requireUser();

  await db.sosAlert.create({
    data: {
      userId: user.id,
      message: input.message?.slice(0, 500) || null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
    },
  });

  await notifyAdmins({
    type: "SOS",
    title: `Alerta SOS de ${user.displayName}`,
    body: input.message?.slice(0, 200) || "Sin mensaje. Revisa la ubicación en el panel.",
    link: "/admin/sos",
  });

  const contacts = await db.emergencyContact.findMany({
    where: { userId: user.id },
    select: { name: true, phone: true },
  });

  return { ok: true, contacts };
}
