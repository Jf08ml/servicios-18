import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { readUpload } from "@/lib/uploads";

// Directorios de media pública: se ven sin sesión porque la portada y los
// perfiles del catálogo son públicos. Los nombres de archivo son aleatorios.
const PUBLIC_DIRS = ["avatars/", "hotels/", "gallery/", "agencies/"];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const relativePath = segments.join("/");
  const isPublic = PUBLIC_DIRS.some((dir) => relativePath.startsWith(dir));

  if (!isPublic) {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Los documentos de verificación solo los ve su dueño o un admin.
    if (relativePath.startsWith("verifications/") && user.role !== "ADMIN") {
      const owned = await db.verification.findFirst({
        where: {
          userId: user.id,
          OR: [{ docImagePath: relativePath }, { selfiePath: relativePath }],
        },
        select: { id: true },
      });
      if (!owned) {
        return NextResponse.json({ error: "Prohibido" }, { status: 403 });
      }
    }
  }

  const file = await readUpload(relativePath);
  if (!file) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const baseHeaders = {
    "Content-Type": file.contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": isPublic ? "public, max-age=3600" : "private, max-age=3600",
  };

  // Soporte básico de Range para reproducir/buscar en videos (Safari lo exige).
  const range = req.headers.get("range");
  const match = range?.match(/^bytes=(\d*)-(\d*)$/);
  if (match && (match[1] || match[2])) {
    const size = file.data.length;
    const start = match[1] ? parseInt(match[1], 10) : size - parseInt(match[2], 10);
    const end = match[1] && match[2] ? Math.min(parseInt(match[2], 10), size - 1) : size - 1;
    if (Number.isNaN(start) || start < 0 || start > end || start >= size) {
      return new NextResponse(null, {
        status: 416,
        headers: { ...baseHeaders, "Content-Range": `bytes */${size}` },
      });
    }
    return new NextResponse(new Uint8Array(file.data.subarray(start, end + 1)), {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": String(end - start + 1),
      },
    });
  }

  return new NextResponse(new Uint8Array(file.data), {
    headers: { ...baseHeaders, "Content-Length": String(file.data.length) },
  });
}
