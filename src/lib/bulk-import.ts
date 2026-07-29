import "server-only";
import { parse } from "csv-parse/sync";
import JSZip from "jszip";
import { db } from "./db";
import { hashPassword, isAdult } from "./auth";
import { resolveGeo } from "./geo";
import { saveImage, saveMedia, deleteUpload } from "./uploads";
import { seedDefaultServiceTypes } from "./scheduling";
import { GALLERY_LIMIT } from "./gallery";

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

const PHOTO_MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const MAX_PHOTO_URL_SIZE = 8 * 1024 * 1024; // 8 MB, igual al límite de saveImage
const PHOTO_URL_TIMEOUT_MS = 15_000;

/**
 * Descarga una imagen (avatar o foto de galería) desde una URL externa (p.
 * ej. un listado que el equipo ya vetó) para guardarla como upload propio,
 * en vez de hotlinkear al sitio de origen.
 */
async function fetchPhotoFromUrl(url: string): Promise<File> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`URL de foto inválida: ${url}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`URL de foto inválida: ${url}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PHOTO_URL_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(parsed, { signal: controller.signal, redirect: "follow" });
  } catch {
    throw new Error(`No se pudo descargar la foto: ${url}`);
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) throw new Error(`No se pudo descargar la foto (${res.status}): ${url}`);

  const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const ext = PHOTO_MIME_EXT[contentType];
  if (!ext) throw new Error(`La URL de foto no es JPG/PNG/WebP: ${url}`);
  // Normalizamos al MIME canónico (p. ej. "image/jpg" -> "image/jpeg"): uploads.ts
  // solo reconoce los tipos estándar, y algunos servidores devuelven variantes.
  const canonicalMime = PHOTO_EXT_TYPES[ext];

  const contentLength = Number(res.headers.get("content-length") ?? "0");
  if (contentLength > MAX_PHOTO_URL_SIZE) {
    throw new Error(`La foto supera el tamaño máximo de 8 MB: ${url}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > MAX_PHOTO_URL_SIZE) {
    throw new Error(`La foto supera el tamaño máximo de 8 MB: ${url}`);
  }

  return new File([new Uint8Array(buffer)], "foto" + ext, { type: canonicalMime });
}

/**
 * Interpreta la columna galeria_urls, que admite tanto un array JSON
 * (`["url1","url2"]`, como exportan algunos scrapers) como una lista separada
 * por `|`. Además deduplica pares thumbnail/foto-completa del mismo archivo
 * (convención vista en CDNs de sitios de anuncios: carpeta `t1/` = miniatura,
 * `d/` = tamaño completo, mismo nombre de archivo) quedándose con la versión
 * completa, y descarta imágenes bajo `/maps/` (pines de ubicación, no fotos
 * de perfil).
 */
function parseGalleryUrls(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  let urls: string[];
  if (trimmed.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      urls = Array.isArray(parsed) ? parsed.map((u) => String(u).trim()) : [];
    } catch {
      urls = trimmed.split("|").map((u) => u.trim());
    }
  } else {
    urls = trimmed.split("|").map((u) => u.trim());
  }
  urls = urls.filter(Boolean);

  const byFilename = new Map<string, string>();
  const order: string[] = [];
  for (const url of urls) {
    if (url.includes("/maps/")) continue;
    let filename: string;
    try {
      filename = new URL(url).pathname.split("/").pop() || url;
    } catch {
      filename = url;
    }
    if (!byFilename.has(filename)) {
      order.push(filename);
      byFilename.set(filename, url);
    } else if (url.includes("/d/")) {
      byFilename.set(filename, url); // preferir la versión de tamaño completo
    }
  }
  return order.map((f) => byFilename.get(f)!);
}

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
      const photoUrl = String(row.foto_url ?? "").trim();
      const galleryUrls = parseGalleryUrls(String(row.galeria_urls ?? "")).slice(0, GALLERY_LIMIT);
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

      // El teléfono no es único en el esquema (lo usan sitios que se re-scrapean
      // periódicamente y pueden repetir el mismo profesional), así que buscamos
      // coincidencia manualmente en vez de depender de una constraint de BD.
      const phoneMatch = await db.user.findFirst({
        where: { phone, role: "WORKER" },
        select: { id: true, email: true, profile: { select: { photoPath: true } } },
      });

      if (!phoneMatch) {
        const existing = await db.user.findUnique({ where: { email } });
        if (existing) throw new Error("Ya existe una cuenta con este correo");
      }

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
      } else if (photoUrl) {
        const file = await fetchPhotoFromUrl(photoUrl);
        photoPath = await saveImage(file, "avatars");
      }

      const galleryMedia: { path: string; kind: "IMAGE" | "VIDEO" }[] = [];
      for (const url of galleryUrls) {
        const file = await fetchPhotoFromUrl(url);
        galleryMedia.push(await saveMedia(file, "gallery"));
      }

      if (phoneMatch) {
        // Mismo teléfono ya registrado: actualiza sus datos en vez de crear un
        // duplicado. Las fotos (avatar/galería) solo se reemplazan si la fila
        // trae foto_url/foto_archivo o galeria_urls; si la fila no trae fotos,
        // se conservan las que ya tenía.
        await db.user.update({
          where: { id: phoneMatch.id },
          data: {
            displayName,
            birthDate,
            profile: {
              update: {
                bio: bio || null,
                languages: languages || null,
                visible,
                ...geo,
                ...(photoPath ? { photoPath } : {}),
              },
            },
          },
        });

        if (photoPath && phoneMatch.profile?.photoPath) {
          await deleteUpload(phoneMatch.profile.photoPath);
        }

        if (galleryMedia.length) {
          const oldMedia = await db.mediaItem.findMany({ where: { userId: phoneMatch.id } });
          await db.$transaction([
            db.mediaItem.deleteMany({ where: { userId: phoneMatch.id } }),
            db.mediaItem.createMany({
              data: galleryMedia.map((m) => ({
                userId: phoneMatch.id,
                kind: m.kind,
                filePath: m.path,
              })),
            }),
          ]);
          for (const old of oldMedia) await deleteUpload(old.filePath);
        }

        results.push({
          row: rowNum,
          email: phoneMatch.email,
          ok: true,
          message: "Ya existía una cuenta con ese teléfono: se actualizó en vez de crear una nueva",
        });
        continue;
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

      if (galleryMedia.length) {
        await db.mediaItem.createMany({
          data: galleryMedia.map((m) => ({ userId: user.id, kind: m.kind, filePath: m.path })),
        });
      }

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
