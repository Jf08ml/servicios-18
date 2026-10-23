"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword, requireUser, SESSION_COOKIE, verifyPassword } from "@/lib/auth";

export type PasswordState = { error?: string };

export async function changePasswordAction(
  _prev: PasswordState,
  formData: FormData
): Promise<PasswordState> {
  const user = await requireUser(undefined, { allowPendingPassword: true });
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  // Tras entrar con el enlace de acceso no conoce la contraseña anterior
  // (la puso el equipo en la carga masiva), así que no se le pide.
  if (!user.mustChangePassword) {
    const current = String(formData.get("currentPassword") ?? "");
    if (!(await verifyPassword(current, user.passwordHash))) {
      return { error: "La contraseña actual no es correcta" };
    }
  }
  if (password.length < 8 || password.length > 100) {
    return { error: "La contraseña debe tener entre 8 y 100 caracteres" };
  }
  if (password !== confirm) {
    return { error: "Las contraseñas no coinciden" };
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(password),
      mustChangePassword: false,
      claimedAt: user.claimedAt ?? new Date(),
    },
  });

  // Cierra cualquier otra sesión abierta con la contraseña anterior.
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  await db.session.deleteMany({
    where: { userId: user.id, ...(token ? { token: { not: token } } : {}) },
  });

  redirect(user.mustChangePassword ? "/perfil" : "/panel");
}
