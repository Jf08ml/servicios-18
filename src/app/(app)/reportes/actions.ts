"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifyAdmins } from "@/lib/notifications";
import { CATEGORY_LABELS } from "@/lib/labels";

export type ReportFormState = { error?: string; ok?: boolean };

const CATEGORIES = ["PERFIL_FALSO", "ESTAFA", "ACOSO", "SEGURIDAD", "OTRO"] as const;

export async function createReportAction(
  _prev: ReportFormState,
  formData: FormData
): Promise<ReportFormState> {
  const user = await requireUser();

  const category = String(formData.get("category") ?? "");
  const description = String(formData.get("description") ?? "").trim().slice(0, 2000);
  const reportedId = String(formData.get("reportedId") ?? "");

  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return { error: "Selecciona una categoría" };
  }
  if (description.length < 10) {
    return { error: "Describe lo sucedido con al menos 10 caracteres" };
  }

  let validReportedId: string | null = null;
  if (reportedId && reportedId !== user.id) {
    const target = await db.user.findUnique({ where: { id: reportedId }, select: { id: true } });
    if (target) validReportedId = target.id;
  }

  await db.report.create({
    data: {
      reporterId: user.id,
      reportedId: validReportedId,
      category: category as (typeof CATEGORIES)[number],
      description,
    },
  });

  await notifyAdmins({
    type: "REPORT",
    title: `Nuevo reporte: ${CATEGORY_LABELS[category] ?? category}`,
    body: `Reportado por ${user.displayName}.`,
    link: "/admin/reportes",
  });

  revalidatePath("/reportes");
  return { ok: true };
}
