import "server-only";
import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";
import crypto from "crypto";

const ROOT = path.join(process.cwd(), "uploads");
const MAX_IMAGE_SIZE = 8 * 1024 * 1024; // 8 MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const VIDEO_TYPES: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
};

export const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

export type UploadDir = "avatars" | "verifications" | "hotels" | "gallery";

async function persist(file: File, dir: UploadDir, ext: string): Promise<string> {
  const name = crypto.randomBytes(12).toString("hex") + ext;
  await mkdir(path.join(ROOT, dir), { recursive: true });
  await writeFile(path.join(ROOT, dir, name), Buffer.from(await file.arrayBuffer()));
  return `${dir}/${name}`;
}

/**
 * Guarda una imagen subida bajo uploads/<dir>/ y devuelve la ruta relativa.
 */
export async function saveImage(file: File, dir: UploadDir): Promise<string> {
  if (!file || file.size === 0) throw new Error("Archivo vacío");
  if (file.size > MAX_IMAGE_SIZE) throw new Error("La imagen supera el tamaño máximo de 8 MB");
  const ext = IMAGE_TYPES[file.type];
  if (!ext) throw new Error("Formato no permitido (usa JPG, PNG o WebP)");
  return persist(file, dir, ext);
}

/**
 * Guarda una imagen o video de galería y devuelve la ruta relativa junto
 * con el tipo detectado.
 */
export async function saveMedia(
  file: File,
  dir: UploadDir
): Promise<{ path: string; kind: "IMAGE" | "VIDEO" }> {
  if (!file || file.size === 0) throw new Error("Archivo vacío");

  const imageExt = IMAGE_TYPES[file.type];
  if (imageExt) {
    if (file.size > MAX_IMAGE_SIZE) throw new Error("La imagen supera el tamaño máximo de 8 MB");
    return { path: await persist(file, dir, imageExt), kind: "IMAGE" };
  }

  const videoExt = VIDEO_TYPES[file.type];
  if (videoExt) {
    if (file.size > MAX_VIDEO_SIZE) throw new Error("El video supera el tamaño máximo de 50 MB");
    return { path: await persist(file, dir, videoExt), kind: "VIDEO" };
  }

  throw new Error("Formato no permitido (fotos JPG/PNG/WebP o videos MP4/WebM)");
}

/**
 * Elimina un archivo de uploads (best-effort: ignora si ya no existe).
 */
export async function deleteUpload(relativePath: string): Promise<void> {
  const full = path.resolve(ROOT, relativePath);
  if (!full.startsWith(path.resolve(ROOT) + path.sep)) return;
  try {
    await unlink(full);
  } catch {
    // El registro en BD es la fuente de verdad; un archivo huérfano no bloquea.
  }
}

/**
 * Lee un archivo de uploads validando que la ruta no escape del directorio.
 */
export async function readUpload(relativePath: string): Promise<{ data: Buffer; contentType: string } | null> {
  const full = path.resolve(ROOT, relativePath);
  if (!full.startsWith(path.resolve(ROOT) + path.sep)) return null;
  const contentType = CONTENT_TYPES[path.extname(full).toLowerCase()];
  if (!contentType) return null;
  try {
    const data = await readFile(full);
    return { data, contentType };
  } catch {
    return null;
  }
}
