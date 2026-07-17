import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa-register";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Prepagos y acompañantes con perfil verificado`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "prepagos",
    "prepagos Colombia",
    "escorts Colombia",
    "acompañantes",
    "damas de compañía",
    "perfiles verificados",
  ],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "es_CO",
    title: `${SITE_NAME} — Prepagos y acompañantes con perfil verificado`,
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
    rating: "adult",
  },
  icons: {
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-dvh">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
