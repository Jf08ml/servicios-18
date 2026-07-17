"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** Guarda (o reasigna) la suscripción push de este dispositivo. */
export async function savePushSubscriptionAction(
  sub: PushSubscriptionInput
): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireUser();

  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return { error: "Suscripción inválida" };
  }

  await db.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: {
      userId: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    // Si otra cuenta usó este navegador, la suscripción pasa al usuario actual.
    update: { userId: user.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  });

  return { ok: true };
}

/** Elimina la suscripción push de este dispositivo. */
export async function deletePushSubscriptionAction(endpoint: string): Promise<void> {
  const user = await requireUser();
  if (!endpoint) return;
  await db.pushSubscription.deleteMany({
    where: { endpoint, userId: user.id },
  });
}
