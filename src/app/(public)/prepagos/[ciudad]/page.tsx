import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { absUrl, SITE_NAME, slugify } from "@/lib/site";
import { WorkerCatalog, VISIBLE_WORKER_PROFILE } from "@/components/worker-catalog";

type GeoRow = {
  countryCode: string | null;
  countryName: string | null;
  stateName: string | null;
  city: string | null;
};

/**
 * Landing SEO por ciudad (/prepagos/bogota, /prepagos/medellin, …).
 * Solo existen para ciudades con perfiles visibles; el slug se resuelve
 * contra los nombres de ciudad guardados en los perfiles.
 */
async function resolveCity(slug: string): Promise<GeoRow | null> {
  const rows = await db.profile.findMany({
    where: VISIBLE_WORKER_PROFILE,
    select: { countryCode: true, countryName: true, stateName: true, city: true },
    distinct: ["countryCode", "city"],
  });
  const matches = rows.filter((r) => r.city && slugify(r.city) === slug);
  if (matches.length === 0) return null;
  // Si dos países comparten nombre de ciudad, Colombia tiene prioridad.
  return matches.find((r) => r.countryCode === "CO") ?? matches[0];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ciudad: string }>;
}): Promise<Metadata> {
  const { ciudad } = await params;
  const geo = await resolveCity(ciudad);
  if (!geo?.city) return { robots: { index: false } };

  // Evita "Bogotá D.C. (Bogotá D.C., Colombia)" cuando depto == ciudad.
  const region = [geo.stateName, geo.countryName]
    .filter((part) => part && part !== geo.city)
    .join(", ");
  return {
    title: `Escorts y prepagos en ${geo.city} — Perfiles verificados`,
    description: `Escorts, prepagos, acompañantes y damas de compañía con identidad verificada en ${geo.city}${region ? ` (${region})` : ""}: fotos reales, reseñas y agenda. Explora gratis, sin registro.`,
    alternates: { canonical: `/prepagos/${ciudad}` },
    openGraph: {
      title: `Escorts y prepagos en ${geo.city} — Perfiles verificados | ${SITE_NAME}`,
      url: absUrl(`/prepagos/${ciudad}`),
    },
  };
}

export default async function PrepagosCiudadPage({
  params,
}: {
  params: Promise<{ ciudad: string }>;
}) {
  const { ciudad } = await params;
  const geo = await resolveCity(ciudad);
  if (!geo?.city) notFound();

  const otherCities = (
    await db.profile.findMany({
      where: VISIBLE_WORKER_PROFILE,
      select: { city: true },
      distinct: ["city"],
    })
  )
    .map((r) => r.city)
    .filter((c): c is string => !!c && slugify(c) !== ciudad)
    .sort((a, b) => a.localeCompare(b, "es"));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: absUrl("/") },
      {
        "@type": "ListItem",
        position: 2,
        name: `Escorts y prepagos en ${geo.city}`,
        item: absUrl(`/prepagos/${ciudad}`),
      },
    ],
  };

  return (
    <div className="space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="pt-4 sm:pt-6">
        <nav className="mb-3 text-sm text-zinc-500">
          <Link href="/" className="hover:text-zinc-300">
            Inicio
          </Link>{" "}
          / <span className="text-zinc-400">Escorts y prepagos en {geo.city}</span>
        </nav>
        <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Escorts y prepagos en {geo.city}
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          Escorts, prepagos, acompañantes y damas de compañía en {geo.city}
          {geo.stateName && geo.stateName !== geo.city
            ? `, ${geo.stateName}`
            : ""}{" "}
          con identidad verificada
          por nuestro equipo: fotos reales, reseñas de clientes y agenda
          disponible. Explora libremente; para chatear o agendar solo necesitas
          una cuenta gratuita.
        </p>
      </section>

      <WorkerCatalog
        pais={geo.countryCode ?? undefined}
        ciudad={geo.city}
        showFilters={false}
      />

      {otherCities.length > 0 && (
        <section className="border-t border-zinc-800 pt-6">
          <h2 className="text-sm font-semibold text-zinc-300">
            Prepagos en otras ciudades
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {otherCities.map((city) => (
              <li key={city}>
                <Link
                  href={`/prepagos/${slugify(city)}`}
                  className="inline-block rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-sm text-zinc-300 transition hover:border-fuchsia-700 hover:text-white"
                >
                  Prepagos en {city}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
