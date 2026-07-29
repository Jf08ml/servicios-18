import "server-only";
import { parse } from "csv-parse/sync";
import JSZip from "jszip";
import { db } from "./db";
import { hashPassword, isAdult } from "./auth";
import { resolveGeo } from "./geo";
import { saveImage } from "./uploads";
import { seedDefaultServiceTypes } from "./scheduling";

export type BulkImportRowResult = {
  row: number;
  email: string;
  ok: boolean;
  message: string;
};

const MAX_ROWS = 500;

const PHOTO_EXT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  const v = (value ?? "").trim().toLowerCase();
  if (!v) return defaultValue;
  return ["si", "sí", "yes", "true", "1"].includes(v);
}

type CsvRow = Record<string, string>;

/**
 * Crea cuentas de profesionales ya verificadas (verifiedAt directo, sin pasar
 * por Verification) a partir de una fila de CSV por cuenta. Se usa para
 * dar de alta en bloque profesionales que el equipo ya vetó fuera de la
 * plataforma — a diferencia del alta normal, aquí no hay documento/selfie de
 * respaldo porque la verificación no ocurrió a través del flujo de la app.
 */
export async function importWorkersFromCsv(
  csvText: string,
  zipBuffer: Buffer | null
): Promise<BulkImportRowResult[]> {
  let rows: CsvRow[];
  try {
    rows = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
  } catch (e) {
    throw new Error(
      "No se pudo leer el CSV: " + (e instanceof Error ? e.message : "formato inválido")
    );
  }

  if (rows.length === 0) throw new Error("El CSV no tiene filas de datos");
  if (rows.length > MAX_ROWS) throw new Error(`Máximo ${MAX_ROWS} filas por carga`);

  const zip = zipBuffer ? await JSZip.loadAsync(zipBuffer) : null;

  const results: BulkImportRowResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +1 por el encabezado, +1 porque la fila 1 es la primera de datos
    const email = String(row.email ?? "").trim().toLowerCase();

    try {
      const password = String(row.password ?? "");
      const displayName = String(row.nombre ?? "").trim().slice(0, 60);
      const phone = String(row.telefono ?? "").trim().slice(0, 20);
      const birthDateRaw = String(row.fecha_nacimiento ?? "").trim();
      const countryCode = String(row.pais ?? "").trim().toUpperCase();
      const stateCode = String(row.departamento ?? "").trim().toUpperCase();
      const city = String(row.ciudad ?? "").trim().slice(0, 80);
      const bio = String(row.bio ?? "").trim().slice(0, 1000);
      const languages = String(row.idiomas ?? "").trim().slice(0, 120);
      const photoFile = String(row.foto_archivo ?? "").trim();
      const visible = parseBoolean(row.visible, true);

      if (!email || !email.includes("@")) throw new Error("Correo inválido o vacío");
      if (!password || password.length < 8)
        throw new Error("Contraseña obligatoria (mínimo 8 caracteres)");
      if (!displayName) throw new Error("Nombre obligatorio");
      if (!phone) throw new Error("Teléfono obligatorio");
      if (!countryCode || !stateCode || !city)
        throw new Error("País, departamento y ciudad son obligatorios");

      const birthDate = new Date(birthDateRaw);
      if (isNaN(birthDate.getTime()))
        throw new Error("Fecha de nacimiento inválida (usa AAAA-MM-DD)");
      if (!isAdult(birthDate)) throw new Error("Debe ser mayor de 18 años");

      const geoResult = resolveGeo(countryCode, stateCode, city);
      if ("error" in geoResult) throw new Error(geoResult.error);
      const geo = geoResult;

      const existing = await db.user.findUnique({ where: { email } });
      if (existing) throw new Error("Ya existe una cuenta con este correo");

      let photoPath: string | undefined;
      if (photoFile) {
        if (!zip) throw new Error(`Se indicó foto "${photoFile}" pero no se subió ningún ZIP`);
        const entry = zip.file(photoFile);
        if (!entry) throw new Error(`No se encontró "${photoFile}" dentro del ZIP`);
        const ext = photoFile.slice(photoFile.lastIndexOf(".")).toLowerCase();
        const mime = PHOTO_EXT_TYPES[ext];
        if (!mime) throw new Error(`Formato de foto no permitido: ${photoFile}`);
        const buffer = await entry.async("nodebuffer");
        const file = new File([new Uint8Array(buffer)], photoFile, { type: mime });
        photoPath = await saveImage(file, "avatars");
      }

      const user = await db.user.create({
        data: {
          email,
          passwordHash: await hashPassword(password),
          role: "WORKER",
          displayName,
          phone,
          birthDate,
          verifiedAt: new Date(),
          profile: {
            create: {
              bio: bio || null,
              languages: languages || null,
              visible,
              ...geo,
              ...(photoPath ? { photoPath } : {}),
            },
          },
        },
      });
      await seedDefaultServiceTypes(user.id);

      results.push({ row: rowNum, email, ok: true, message: "Cuenta creada y verificada" });
    } catch (e) {
      results.push({
        row: rowNum,
        email: email || "(sin correo)",
        ok: false,
        message: e instanceof Error ? e.message : "Error desconocido",
      });
    }
  }

  return results;
}
