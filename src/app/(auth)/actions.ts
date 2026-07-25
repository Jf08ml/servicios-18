"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveGeo } from "@/lib/geo";
import { seedDefaultServiceTypes } from "@/lib/scheduling";
import {
  createSession,
  destroySession,
  hashPassword,
  isAdult,
  verifyPassword,
} from "@/lib/auth";

export type AuthState = { error?: string };

const registerSchema = z.object({
  role: z.enum(["WORKER", "CLIENT", "AGENCY"]),
  displayName: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(60),
  email: z.string().trim().toLowerCase().email("Correo electrónico inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(100),
  birthDate: z.coerce.date({ errorMap: () => ({ message: "Fecha de nacimiento inválida" }) }),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
});

export async function registerAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    role: formData.get("role"),
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    birthDate: formData.get("birthDate"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }
  const data = parsed.data;

  if (formData.get("confirmPassword") !== data.password) {
    return { error: "Las contraseñas no coinciden" };
  }
  if (formData.get("acceptTerms") !== "on") {
    return { error: "Debes confirmar que eres mayor de edad y aceptar los términos" };
  }
  if (!isAdult(data.birthDate)) {
    return { error: "Debes ser mayor de 18 años para usar la plataforma" };
  }
  if (data.role !== "CLIENT" && !data.phone) {
    return { error: "El teléfono es obligatorio para profesionales y agencias" };
  }

  const geoResult = resolveGeo(
    String(formData.get("country") ?? "").trim(),
    String(formData.get("state") ?? "").trim(),
    String(formData.get("city") ?? "").trim().slice(0, 80)
  );
  if ("error" in geoResult) return { error: geoResult.error };

  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return { error: "Ya existe una cuenta con este correo" };
  }

  const user = await db.user.create({
    data: {
      email: data.email,
      passwordHash: await hashPassword(data.password),
      role: data.role,
      displayName: data.displayName,
      birthDate: data.birthDate,
      phone: data.phone || null,
      ...(data.role === "AGENCY"
        ? { ownedAgency: { create: { name: data.displayName, city: geoResult.city } } }
        : { profile: { create: { ...geoResult } } }),
    },
  });

  if (data.role === "WORKER") {
    await seedDefaultServiceTypes(user.id);
  }

  await createSession(user.id);
  redirect("/panel");
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!email || !password) {
    return { error: "Ingresa tu correo y contraseña" };
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Correo o contraseña incorrectos" };
  }
  if (user.status === "BANNED") {
    return { error: "Esta cuenta ha sido bloqueada. Contacta al soporte." };
  }

  await createSession(user.id);
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/panel");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
