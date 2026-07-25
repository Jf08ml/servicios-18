import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { AgeGate } from "@/components/age-gate";
import { Analytics } from "@/components/analytics";
import { PwaRegister } from "@/components/pwa-register";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Prepagos, putas y escorts verificadas`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  // Cubre el abanico de sinónimos con que se busca el servicio (incluida
  // la variante mal escrita "scorts", muy frecuente en LatAm).
  keywords: [
    "prepagos",
    "prepagos Colombia",
    "putas",
    "putas Colombia",
    "escorts",
    "escorts Colombia",
    "scorts",
    "prostitutas",
    "prostitutas Colombia",
    "acompañantes",
    "damas de compañía",
    "citas con escorts",
    "servicios para adultos",
    "perfiles verificados",
  ],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "es_CO",
    title: `${SITE_NAME} — Prepagos, putas y escorts verificadas`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  // Etiquetado de contenido adulto (SafeSearch / filtros parentales).
  other: {
    rating: "RTA-5042-1996-1400-1577-RTA",
  },
  icons: {
    // Explícito a propósito: si "icons" está presente, Next.js deja de
    // detectar automáticamente app/icon.png y el favicon no se enlaza.
    // El de 192px cumple el requisito de Google para favicon en resultados
    // de búsqueda (múltiplo de 48px); el de 64px queda para pestañas.
    icon: [
      { url: "/icon.png", sizes: "64x64", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: SITE_NAME,
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="es">
      <body className="min-h-dvh">
        {children}
        <AgeGate />
        <PwaRegister />
        <Analytics nonce={nonce} />
      </body>
    </html>
  );
}
