import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Nota: /perfiles (directorio y detalle) es público a propósito:
// se puede explorar sin cuenta; chatear/agendar sí exige sesión.
const PROTECTED_PREFIXES = [
  "/panel",
  "/perfil",
  "/chat",
  "/agenda",
  "/citas",
  "/hoteles",
  "/reservas",
  "/reportes",
  "/verificacion",
  "/notificaciones",
  "/admin",
  "/hotel",
  "/api/files",
  "/api/chat",
];

// Media pública (portada y perfiles se exploran sin cuenta). La ruta
// /api/files valida por su cuenta todo lo que no sea público.
const PUBLIC_FILE_PREFIXES = [
  "/api/files/avatars/",
  "/api/files/hotels/",
  "/api/files/gallery/",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_FILE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }
  // "/perfil" no debe capturar "/perfiles"
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
  if (!isProtected) return NextResponse.next();

  const hasSession = request.cookies.has("s18_session");
  if (!hasSession) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
