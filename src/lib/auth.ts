import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { Role } from "@prisma/client";
import { db } from "./db";

export const SESSION_COOKIE = "s18_session";
const SESSION_DAYS = 30;

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
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { token } });
  }
  jar.delete(SESSION_COOKIE);
}

/**
 * Usuario de la sesión actual, o null. Cacheado por request.
 */
export const getCurrentUser = cache(async () => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { profile: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (session.user.status === "BANNED") return null;
  return session.user;
});

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.status === "SUSPENDED") redirect("/suspendido");
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
