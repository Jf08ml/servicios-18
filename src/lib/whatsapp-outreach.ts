import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { absUrl, SITE_NAME } from "./site";
import { createLoginToken, LOGIN_TOKEN_HOURS } from "./login-tokens";
import { sendWhatsapp, toWhatsappNumber, whatsappEnabled } from "./whatsapp";

/**
 * Aviso por WhatsApp a profesionales con cuenta no reclamada (carga masiva)
 * cuando un cliente les escribe por el chat. Flujo en dos pasos para cuidar
 * la reputación del número:
 *   1. Invitación SIN enlace: "un cliente te escribió, ¿quieres el acceso?".
 *   2. Si responde (webhook del gateway → handleWhatsappReply), se le envía el
 *      enlace de acceso de un solo uso. "NO"/"STOP" la da de baja para siempre.
 */

// Tope de invitaciones en 24 h (las respuestas con el enlace no cuentan).
const DAILY_LIMIT = Number(process.env.WA_DAILY_LIMIT) || 20;
// Si no responde, se reintenta como máximo una vez más pasados estos días.
const REINVITE_DAYS = 7;
const MAX_INVITES = 2;
// Evita responder a cada mensaje si sigue escribiendo tras recibir el enlace.
const REPLY_COOLDOWN_MS = 10 * 60 * 1000;

const OPT_OUT = /^\s*(no|stop|baja|parar|cancelar|basta)\b/i;

function firstName(displayName: string) {
  return displayName.trim().split(/\s+/)[0] || displayName;
}

const messages = {
  invite: (name: string) =>
    `Hola ${firstName(name)} 👋\n\n` +
    `Un cliente te escribió por ${SITE_NAME} y está esperando tu respuesta.\n\n` +
    `¿Quieres que te enviemos el acceso a tu perfil para responderle? ` +
    `Responde *SÍ* para recibirlo, o *NO* si no quieres recibir más mensajes.`,
  link: (url: string) =>
    `Este es tu acceso a ${SITE_NAME}:\n${url}\n\n` +
    `Es personal, de un solo uso y vence en ${LOGIN_TOKEN_HOURS} horas. ` +
    `Al entrar te pediremos crear una contraseña nueva. No lo compartas con nadie.`,
  alreadyClaimed: () =>
    `Ya activaste tu cuenta. Ingresa con tu correo y contraseña en ${absUrl("/login")}`,
  optedOut: () => `Listo, no te volveremos a escribir.`,
};

function isUniqueViolation(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

/**
 * Invita por WhatsApp a la profesional si su cuenta no está reclamada.
 * Pensado para correr en `after()`: nunca lanza por fallas del gateway.
 */
export async function inviteWorkerIfUnclaimed(workerId: string): Promise<void> {
  if (!whatsappEnabled()) return;

  const worker = await db.user.findUnique({
    where: { id: workerId },
    select: {
      id: true,
      role: true,
      status: true,
      claimedAt: true,
      agencyId: true,
      phone: true,
      displayName: true,
      profile: { select: { countryCode: true } },
      whatsappOutreach: true,
    },
  });
  if (
    !worker ||
    worker.role !== "WORKER" ||
    worker.status !== "ACTIVE" ||
    worker.claimedAt ||
    worker.agencyId ||
    !worker.phone
  ) {
    return;
  }

  const existing = worker.whatsappOutreach;
  if (existing) {
    if (existing.status !== "INVITED" || existing.attempts >= MAX_INVITES) return;
    const cutoff = new Date(Date.now() - REINVITE_DAYS * 24 * 60 * 60 * 1000);
    if (existing.invitedAt && existing.invitedAt > cutoff) return;
  }

  const phone = toWhatsappNumber(worker.phone, worker.profile?.countryCode);
  if (!phone) {
    const data = { status: "FAILED" as const, lastError: "invalid_phone" };
    await db.whatsappOutreach.upsert({
      where: { userId: worker.id },
      create: { userId: worker.id, phone: worker.phone.replace(/\D/g, ""), ...data },
      update: data,
    });
    return;
  }

  // Si se alcanzó el tope no se registra nada: el próximo mensaje de un
  // cliente vuelve a intentarlo.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sentToday = await db.whatsappOutreach.count({ where: { invitedAt: { gte: since } } });
  if (sentToday >= DAILY_LIMIT) return;

  // Reserva atómica antes de enviar: si dos mensajes de clientes llegan a la
  // vez, solo uno gana y se envía una sola invitación.
  const now = new Date();
  if (!existing) {
    try {
      await db.whatsappOutreach.create({
        data: { userId: worker.id, phone, status: "INVITED", attempts: 1, invitedAt: now },
      });
    } catch (e) {
      if (isUniqueViolation(e)) return;
      throw e;
    }
  } else {
    const { count } = await db.whatsappOutreach.updateMany({
      where: { id: existing.id, status: "INVITED", attempts: existing.attempts, invitedAt: existing.invitedAt },
      data: { phone, attempts: { increment: 1 }, invitedAt: now },
    });
    if (count !== 1) return;
  }

  const result = await sendWhatsapp(phone, messages.invite(worker.displayName));
  if (result.ok) {
    await db.whatsappOutreach.update({ where: { userId: worker.id }, data: { lastError: null } });
    return;
  }

  console.warn("[whatsapp] invitación fallida", { userId: worker.id, error: result.error });
  await db.whatsappOutreach.update({
    where: { userId: worker.id },
    data: result.permanent
      ? { status: "FAILED", lastError: result.error }
      : // Error transitorio (gateway caído, sesión desconectada, tope del
        // gateway): se deshace la reserva para reintentar con el próximo mensaje.
        { attempts: { decrement: 1 }, invitedAt: existing?.invitedAt ?? null, lastError: result.error },
  });
}

/** Mensaje entrante reenviado por el gateway (POST /api/whatsapp/webhook). */
export async function handleWhatsappReply(fromPhone: string, body: string): Promise<void> {
  const phone = fromPhone.replace(/\D/g, "");
  if (!phone) return;

  const outreach = await db.whatsappOutreach.findFirst({
    where: { phone, status: { in: ["INVITED", "LINK_SENT"] } },
    orderBy: { updatedAt: "desc" },
    include: { user: { select: { id: true, status: true, claimedAt: true } } },
  });
  if (!outreach) return;

  if (OPT_OUT.test(body)) {
    await db.whatsappOutreach.update({
      where: { id: outreach.id },
      data: { status: "OPTED_OUT" },
    });
    await sendWhatsapp(phone, messages.optedOut());
    return;
  }

  if (outreach.user.status !== "ACTIVE") return;
  if (outreach.linkSentAt && Date.now() - outreach.linkSentAt.getTime() < REPLY_COOLDOWN_MS) {
    return;
  }

  // Reserva atómica: dos mensajes seguidos de ella generan un solo enlace.
  const { count } = await db.whatsappOutreach.updateMany({
    where: { id: outreach.id, linkSentAt: outreach.linkSentAt },
    data: { status: "LINK_SENT", linkSentAt: new Date() },
  });
  if (count !== 1) return;

  const text = outreach.user.claimedAt
    ? messages.alreadyClaimed()
    : messages.link(absUrl(`/acceso/${await createLoginToken(outreach.user.id)}`));

  const result = await sendWhatsapp(phone, text);
  if (!result.ok) {
    console.warn("[whatsapp] envío de enlace fallido", { userId: outreach.userId, error: result.error });
    await db.whatsappOutreach.update({
      where: { id: outreach.id },
      // Sin linkSentAt el próximo mensaje de ella lo vuelve a intentar.
      data: { status: outreach.status, linkSentAt: outreach.linkSentAt, lastError: result.error },
    });
  }
}
