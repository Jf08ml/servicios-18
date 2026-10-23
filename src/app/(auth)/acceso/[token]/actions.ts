"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { consumeLoginToken } from "@/lib/login-tokens";

/**
 * Entra con el enlace de acceso de WhatsApp. Se consume con un POST (botón) y
 * no al abrir la URL, para que vistas previas o escáneres de enlaces no gasten
 * el token de un solo uso.
 */
export async function enterWithTokenAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const userId = token ? await consumeLoginToken(token) : null;
  if (!userId) redirect(`/acceso/${encodeURIComponent(token)}`);

  await db.user.updateMany({
    where: { id: userId, claimedAt: null },
    data: { claimedAt: new Date() },
  });
  await db.user.update({ where: { id: userId }, data: { mustChangePassword: true } });

  await createSession(userId);
  redirect("/contrasena");
}
