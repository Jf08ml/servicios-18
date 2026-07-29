"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { importWorkersFromCsv, type BulkImportRowResult } from "@/lib/bulk-import";

export type BulkImportState = {
  error?: string;
  results?: BulkImportRowResult[];
};

const MAX_CSV_SIZE = 2 * 1024 * 1024; // 2 MB
const MAX_ZIP_SIZE = 50 * 1024 * 1024; // 50 MB

export async function bulkImportWorkersAction(
  _prev: BulkImportState,
  formData: FormData
): Promise<BulkImportState> {
  await requireUser(["ADMIN"]);

  const csvFile = formData.get("csv");
  if (!(csvFile instanceof File) || csvFile.size === 0) {
    return { error: "Selecciona el archivo CSV con los datos" };
  }
  if (csvFile.size > MAX_CSV_SIZE) {
    return { error: "El CSV supera el tamaño máximo de 2 MB" };
  }

  const zipFile = formData.get("zip");
  let zipBuffer: Buffer | null = null;
  if (zipFile instanceof File && zipFile.size > 0) {
    if (zipFile.size > MAX_ZIP_SIZE) {
      return { error: "El ZIP de fotos supera el tamaño máximo de 50 MB" };
    }
    zipBuffer = Buffer.from(await zipFile.arrayBuffer());
  }

  const csvText = await csvFile.text();

  try {
    const results = await importWorkersFromCsv(csvText, zipBuffer);
    revalidatePath("/admin/usuarios");
    revalidatePath("/perfiles");
    revalidatePath("/");
    return { results };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al procesar el archivo" };
  }
}
