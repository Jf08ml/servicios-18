import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { Role } from "@prisma/client";
import { db } from "./db";

export const SESSION_COOKIE = "s18_session";
// Mientras un admin "entra como" otro usuario, aquí se guarda el token de su
// propia sesión para poder volver a ella.
const ADMIN_SESSION_COOKIE = "s18_admin_session";
const SESSION_DAYS = 30;
const IMPERSONATION_HOURS = 2;

async function setSessionCookie(name: string, token: string, expires: Date) {
  const jar = await cookies();
  jar.set(name, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires,
    path: "/",
  });
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { token, userId, expiresAt } });
  await setSessionCookie(SESSION_COOKIE, token, expiresAt);
  // Un login normal descarta cualquier respaldo de "entrar como" que quedara.
  (await cookies()).delete(ADMIN_SESSION_COOKIE);
}

export async function destroySession() {
  const jar = await cookies();
  const tokens = [jar.get(SESSION_COOKIE)?.value, jar.get(ADMIN_SESSION_COOKIE)?.value].filter(
    (t): t is string => !!t
  );
  if (tokens.length) {
    await db.session.deleteMany({ where: { token: { in: tokens } } });
  }
  jar.delete(SESSION_COOKIE);
  jar.delete(ADMIN_SESSION_COOKIE);
}

/**
 * Abre una sesión corta en la cuenta `targetId` a nombre del admin, guardando
 * la sesión del admin en una cookie aparte para volver con stopImpersonation.
 * La autorización (que quien llama sea ADMIN, que el destino no lo sea) va en
 * la Server Action.
 */
export async function startImpersonation(adminId: string, targetId: string) {
  const jar = await cookies();
  const adminToken = jar.get(SESSION_COOKIE)?.value;
  if (!adminToken) return;
  const adminSession = await db.session.findUnique({ where: { token: adminToken } });
  if (!adminSession || adminSession.userId !== adminId) return;

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + IMPERSONATION_HOURS * 60 * 60 * 1000);
  await db.session.create({
    data: { token, userId: targetId, impersonatorId: adminId, expiresAt },
  });
  await setSessionCookie(ADMIN_SESSION_COOKIE, adminToken, adminSession.expiresAt);
  await setSessionCookie(SESSION_COOKIE, token, expiresAt);
}

/**
 * Cierra la sesión de "entrar como" y restaura la del admin. Devuelve false si
 * la sesión actual no era de suplantación o la del admin ya no es válida (en
 * ese caso queda sin sesión).
 */
export async function stopImpersonation(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const adminToken = jar.get(ADMIN_SESSION_COOKIE)?.value;
  const session = token ? await db.session.findUnique({ where: { token } }) : null;
  if (!session?.impersonatorId) return false;

  await db.session.deleteMany({ where: { token: session.token } });
  jar.delete(ADMIN_SESSION_COOKIE);

  const adminSession = adminToken
    ? await db.session.findUnique({ where: { token: adminToken }, include: { user: true } })
    : null;
  if (
    adminSession &&
    !adminSession.impersonatorId &&
    adminSession.userId === session.impersonatorId &&
    adminSession.user.role === "ADMIN" &&
    adminSession.expiresAt > new Date()
  ) {
    await setSessionCookie(SESSION_COOKIE, adminSession.token, adminSession.expiresAt);
    return true;
  }
  jar.delete(SESSION_COOKIE);
  return false;
}

const getSession = cache(async () => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { token },
    include: {
      user: { include: { profile: true } },
      impersonator: { select: { id: true, displayName: true } },
    },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (session.user.status === "BANNED") return null;
  return session;
});

/**
 * Usuario de la sesión actual, o null. Cacheado por request.
 */
export const getCurrentUser = cache(async () => (await getSession())?.user ?? null);

/** Admin que está usando la cuenta actual con "Entrar como", o null. */
export async function getImpersonator() {
  return (await getSession())?.impersonator ?? null;
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser(
  roles?: Role[],
  // Solo la página /contrasena: es a donde se redirige mientras
  // mustChangePassword esté activo (acceso por enlace de WhatsApp).
  opts?: { allowPendingPassword?: boolean }
): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.status === "SUSPENDED") redirect("/suspendido");
  // El admin que entra como ella no debe quedar atrapado en /contrasena.
  if (user.mustChangePassword && !opts?.allowPendingPassword && !(await getImpersonator())) {
    redirect("/contrasena");
  }
  if (roles && !roles.includes(user.role)) redirect("/panel");
  return user;
}

export function isPremium(user: { premiumUntil: Date | null }) {
  return !!user.premiumUntil && user.premiumUntil > new Date();
}

export function isVerified(user: { verifiedAt: Date | null }) {
  return !!user.verifiedAt;
}

export function isAdult(birthDate: Date) {
  const now = new Date();
  const cutoff = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate());
  return birthDate <= cutoff;
}
