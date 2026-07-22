import "server-only";
import { db } from "./db";
import { saveMedia, deleteUpload } from "./uploads";

export const GALLERY_LIMIT = 12;

/**
 * Núcleo de alta de galería, sin autorización propia: la llama tanto la
 * trabajadora sobre sí misma (perfil/actions.ts) como su agencia sobre un
 * perfil vinculado (agencia/actions.ts).
 */
export async function addGalleryMedia(
  targetUserId: string,
  files: File[]
): Promise<{ error?: string; ok?: boolean }> {
  const current = await db.mediaItem.count({ where: { userId: targetUserId } });
  if (current + files.length > GALLERY_LIMIT) {
    return {
      error: `La galería admite máximo ${GALLERY_LIMIT} archivos (tienes ${current}).`,
    };
  }

  for (const file of files) {
    try {
      const media = await saveMedia(file, "gallery");
      await db.mediaItem.create({
        data: { userId: targetUserId, kind: media.kind, filePath: media.path },
      });
    } catch (e) {
      return {
        error: `${file.name}: ${e instanceof Error ? e.message : "error al guardar"}`,
      };
    }
  }

  return { ok: true };
}

export async function deleteGalleryMedia(targetUserId: string, id: string): Promise<void> {
  const item = await db.mediaItem.findFirst({ where: { id, userId: targetUserId } });
  if (!item) return;
  await db.mediaItem.delete({ where: { id: item.id } });
  await deleteUpload(item.filePath);
}
