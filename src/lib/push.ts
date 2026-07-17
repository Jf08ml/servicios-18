import "server-only";
import webpush from "web-push";
import { db } from "./db";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT ?? "mailto:soporte@misescorts.com";

const pushEnabled = !!publicKey && !!privateKey;
if (pushEnabled) {
  webpush.setVapidDetails(subject, publicKey!, privateKey!);
}

export type PushPayload = { title: string; body?: string; link?: string };

/**
 * Envía una notificación push a todos los dispositivos suscritos del usuario.
 * Best-effort: los errores no interrumpen la acción que la originó y las
 * suscripciones caducas (404/410) se eliminan.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!pushEnabled) return;

  const subscriptions = await db.pushSubscription.findMany({ where: { userId } });
  if (subscriptions.length === 0) return;

  const body = JSON.stringify(payload);
  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
      } catch (e) {
        const statusCode = (e as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    })
  );
}
