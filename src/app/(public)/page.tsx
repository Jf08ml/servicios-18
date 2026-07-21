import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { absUrl, SITE_DESCRIPTION, SITE_NAME, slugify } from "@/lib/site";
import { WorkerCatalog, VISIBLE_WORKER_PROFILE } from "@/components/worker-catalog";

export const metadata: Metadata = {
  title: {
    absolute: `Escorts y prepagos en Colombia — Perfiles verificados | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  // Las variantes con filtros (?pais=&ciudad=) canonicalizan a la portada.
  alternates: { canonical: "/" },
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ pais?: string; depto?: string; ciudad?: string }>;
}) {
  const { pais, depto, ciudad } = await searchParams;
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  const cityRows = await db.profile.findMany({
    where: VISIBLE_WORKER_PROFILE,
    select: { city: true },
    distinct: ["city"],
  });
  const cities = cityRows
    .map((r) => r.city)
    .filter((c): c is string => !!c)
    .sort((a, b) => a.localeCompare(b, "es"));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: absUrl("/"),
    description: SITE_DESCRIPTION,
    inLanguage: "es-CO",
  };

  return (
    <div className="space-y-8">
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="pt-4 text-center sm:pt-8">
        <p className="mx-auto mb-3 w-fit rounded-full border border-fuchsia-800 bg-fuchsia-950/40 px-4 py-1 text-xs font-medium text-fuchsia-300">
          Solo perfiles con identidad verificada · Mayores de 18 años
        </p>
        <h1 className="mx-auto max-w-3xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Escorts, prepagos y acompañantes con perfil verificado en Colombia
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-zinc-400">
          Directorio de escorts, prepagos y damas de compañía con identidad
          verificada por nuestro equipo: fotos reales, reseñas y agenda.
          Explora libremente; para chatear o agendar solo necesitas una cuenta
          gratuita.{" "}
          <Link
            href="/como-funciona"
            className="font-medium text-fuchsia-400 hover:text-fuchsia-300"
          >
            ¿Cómo funciona? →
          </Link>
        </p>
      </section>

      <WorkerCatalog pais={pais} depto={depto} ciudad={ciudad} />

      {cities.length > 0 && (
        <section className="border-t border-zinc-800 pt-6">
          <h2 className="text-sm font-semibold text-zinc-300">
            Prepagos por ciudad
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {cities.map((city) => (
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
