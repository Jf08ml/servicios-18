/**
 * Constantes y utilidades de sitio para SEO.
 *
 * NEXT_PUBLIC_SITE_URL debe apuntar al dominio de producción
 * (p. ej. https://misescorts.com) para que canonicals, sitemap
 * y Open Graph generen URLs absolutas correctas.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const SITE_NAME = "Mis Escorts";

export const SITE_DESCRIPTION =
  "Directorio de prepagos, putas, escorts, prostitutas, acompañantes y damas de compañía con identidad verificada en Colombia. Perfiles reales con fotos, reseñas y agenda. Explora gratis, sin registro.";

/**
 * Sinónimos con que se busca el servicio, para variar los textos ancla de los
 * enlaces internos por ciudad (diversidad de anchor text sin páginas doorway).
 * El índice se elige de forma determinista para que los anchors sean estables.
 */
export const SERVICE_SYNONYMS = [
  "Prepagos",
  "Putas",
  "Escorts",
  "Prostitutas",
  "Acompañantes",
] as const;

export function synonymFor(index: number): string {
  return SERVICE_SYNONYMS[index % SERVICE_SYNONYMS.length];
}

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
