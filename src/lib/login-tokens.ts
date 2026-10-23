import "server-only";
import crypto from "crypto";
import { db } from "./db";

const TOKEN_HOURS = 72;

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Crea un enlace de acceso de un solo uso y devuelve el token en claro. */
export async function createLoginToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("base64url");
  await db.loginToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TOKEN_HOURS * 60 * 60 * 1000),
    },
  });
  return token;
}

export const LOGIN_TOKEN_HOURS = TOKEN_HOURS;

/** ¿Token vigente? No lo consume (para mostrar la página antes de entrar). */
export async function isLoginTokenValid(token: string): Promise<boolean> {
  const row = await db.loginToken.findUnique({ where: { tokenHash: hashToken(token) } });
  return !!row && !row.usedAt && row.expiresAt > new Date();
}

/**
 * Consume el token de forma atómica (un solo uso aunque lleguen dos clics a la
 * vez) y devuelve el userId, o null si no existe, ya se usó o venció.
 */
export async function consumeLoginToken(token: string): Promise<string | null> {
  const tokenHash = hashToken(token);
  const { count } = await db.loginToken.updateMany({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (count !== 1) return null;
  const row = await db.loginToken.findUnique({ where: { tokenHash } });
  return row?.userId ?? null;
}
