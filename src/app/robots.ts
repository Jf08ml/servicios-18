import type { MetadataRoute } from "next";
import { absUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Rutas privadas de la app: sin valor de búsqueda y requieren sesión.
        disallow: [
          "/api/",
          "/admin",
          "/panel",
          "/chat",
          "/agenda",
          "/citas",
          "/reservas",
          // "$" evita bloquear /perfiles/* (robots.txt compara por prefijo).
          "/perfil$",
          "/verificacion",
          "/notificaciones",
          "/reportes",
          "/hotel",
          "/login",
          "/registro",
          "/suspendido",
        ],
      },
    ],
    sitemap: absUrl("/sitemap.xml"),
  };
}
