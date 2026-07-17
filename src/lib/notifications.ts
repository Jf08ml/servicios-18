import "server-only";
import type { NotificationType } from "@prisma/client";
import { db } from "./db";
import { sendPushToUser } from "./push";

export type NotifyInput = {
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
};

/**
 * Crea una notificación en plataforma para un usuario. No enviamos correos:
 * la promesa del producto es que el email solo sirve para iniciar sesión.
 */
export async function notify(userId: string, input: NotifyInput): Promise<void> {
  await db.notification.create({
    data: {
      userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
    },
  });
  // Push opcional por dispositivo (solo si el usuario lo activó).
  await sendPushToUser(userId, {
    title: input.title,
    body: input.body,
    link: input.link,
  });
}

/** Notifica a todos los administradores activos. */
export async function notifyAdmins(input: NotifyInput): Promise<void> {
  const admins = await db.user.findMany({
    where: { role: "ADMIN", status: "ACTIVE" },
    select: { id: true },
  });
  if (admins.length === 0) return;
  await db.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
    })),
  });
  await Promise.allSettled(
    admins.map((a) =>
      sendPushToUser(a.id, { title: input.title, body: input.body, link: input.link })
    )
  );
}

/** Notificaciones sin leer de un usuario (para el contador de la campanita). */
export function unreadCount(userId: string): Promise<number> {
  return db.notification.count({ where: { userId, readAt: null } });
}
