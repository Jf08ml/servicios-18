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

// Analítica (GA4, src/components/analytics.tsx): script externo de gtag.js +
// beacons de medición. 'strict-dynamic' confía en los scripts que ese script
// nonced cargue a su vez, así que el host es solo respaldo para navegadores
// que no soportan 'strict-dynamic'.
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV !== "production";
  return [
    `default-src 'self'`,
    // 'unsafe-eval' solo en dev: el Fast Refresh de Next usa eval() para
    // recompilar módulos; el build de producción no lo necesita.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.googletagmanager.com${isDev ? " 'unsafe-eval'" : ""}`,
    // 'unsafe-inline' solo en dev: el overlay de Next.js aplica estilos
    // inline vía atributo style="", que un nonce no puede cubrir (los nonce
    // solo protegen elementos <style>, no atributos). Sin 'unsafe-inline' no
    // hay alternativa dev-only viable; en build de producción no aplica.
    `style-src 'self'${isDev ? " 'unsafe-inline'" : ""}`,
    `img-src 'self' data:`,
    `font-src 'self'`,
    `connect-src 'self' https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `worker-src 'self'`,
    `manifest-src 'self'`,
    // Evitada en dev: rompería el HMR de Next (websocket ws:// en localhost).
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

/** Cabeceras de seguridad comunes a toda respuesta (páginas, redirects y JSON de /api). */
function applySecurityHeaders(response: NextResponse, nonce: string): NextResponse {
  response.headers.set("Content-Security-Policy", buildCsp(nonce));
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Nada de cámara/micrófono/pago/usb; geolocalización solo para el botón SOS.
  // interest-cohort=() desactiva FLoC.
  response.headers.set(
    "Permissions-Policy",
    "geolocation=(self), camera=(), microphone=(), payment=(), usb=(), interest-cohort=()"
  );
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // El nonce viaja en un header de request para que los Server Components
  // (layout, Analytics, los <script> de JSON-LD) lo lean con headers() y lo
  // apliquen a sus propios scripts; Next también lo usa para sus scripts de
  // hidratación en streaming si detecta el mismo nonce en la respuesta.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  const pass = () => NextResponse.next({ request: { headers: requestHeaders } });

  if (PUBLIC_FILE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return applySecurityHeaders(pass(), nonce);
  }
  // "/perfil" no debe capturar "/perfiles"
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
  if (!isProtected) return applySecurityHeaders(pass(), nonce);

  const hasSession = request.cookies.has("s18_session");
  if (!hasSession) {
    if (pathname.startsWith("/api/")) {
      return applySecurityHeaders(
        NextResponse.json({ error: "No autorizado" }, { status: 401 }),
        nonce
      );
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return applySecurityHeaders(NextResponse.redirect(login), nonce);
  }
  return applySecurityHeaders(pass(), nonce);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
