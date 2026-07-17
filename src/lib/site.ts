/**
 * Constantes y utilidades de sitio para SEO.
 *
 * NEXT_PUBLIC_SITE_URL debe apuntar al dominio de producción
 * (p. ej. https://prepagoniacas.com) para que canonicals, sitemap
 * y Open Graph generen URLs absolutas correctas.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const SITE_NAME = "Prepagoniacas";

export const SITE_DESCRIPTION =
  "Directorio de prepagos, escorts y acompañantes con identidad verificada en Colombia. Perfiles reales con fotos, reseñas y agenda. Explora gratis, sin registro.";

/** Convierte un nombre (p. ej. "Bogotá D.C.") en slug de URL ("bogota-d-c"). */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function absUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}
