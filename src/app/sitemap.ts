import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { absUrl, slugify } from "@/lib/site";

// Sin esto Next lo prerenderiza en build y los perfiles nuevos no aparecerían.
export const dynamic = "force-dynamic";

/**
 * Sitemap dinámico: páginas estáticas, landings por ciudad y perfiles
 * públicos. Ayuda a que Google descubra e indexe perfiles nuevos rápido.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const profiles = await db.profile.findMany({
    where: {
      visible: true,
      user: { is: { role: "WORKER", status: "ACTIVE", verifiedAt: { not: null } } },
    },
    select: { userId: true, city: true, updatedAt: true },
  });

  const statics: MetadataRoute.Sitemap = [
    {
      url: absUrl("/"),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absUrl("/como-funciona"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  const cities = [...new Set(profiles.map((p) => p.city).filter(Boolean))] as string[];
  const cityPages: MetadataRoute.Sitemap = cities.map((city) => ({
    url: absUrl(`/prepagos/${slugify(city)}`),
    changeFrequency: "daily",
    priority: 0.9,
  }));

  const profilePages: MetadataRoute.Sitemap = profiles.map((p) => ({
    url: absUrl(`/perfiles/${p.userId}`),
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...statics, ...cityPages, ...profilePages];
}
