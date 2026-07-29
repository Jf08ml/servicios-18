import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser, isPremium } from "@/lib/auth";
import { formatLocation } from "@/lib/format";
import { CatalogFilters } from "@/components/catalog-filters";
import { EmptyState } from "@/components/empty-state";
import { WorkerCard } from "@/components/worker-card";

export type CatalogFilterParams = {
  pais?: string;
  depto?: string;
  ciudad?: string;
  page?: string;
  /** false en landings por ciudad, donde el filtro viene fijo en la URL. */
  showFilters?: boolean;
};

export const VISIBLE_WORKER_PROFILE = {
  visible: true,
  user: { is: { role: "WORKER" as const, status: "ACTIVE" as const, verifiedAt: { not: null } } },
};

const PAGE_SIZE = 24;

function pageHref(page: number, pais?: string, depto?: string, ciudad?: string) {
  const qs = new URLSearchParams();
  if (pais) qs.set("pais", pais);
  if (depto) qs.set("depto", depto);
  if (ciudad) qs.set("ciudad", ciudad);
  if (page > 1) qs.set("page", String(page));
  const s = qs.toString();
  return s ? `?${s}` : "?";
}

/**
 * Catálogo de perfiles verificados. Se usa tanto en la portada pública
 * como en la sección /perfiles para usuarios con sesión.
 */
export async function WorkerCatalog({
  pais,
  depto,
  ciudad,
  page,
  showFilters = true,
}: CatalogFilterParams) {
  const currentPage = Math.max(1, Math.floor(Number(page)) || 1);

  const workerWhere = {
    role: "WORKER" as const,
    status: "ACTIVE" as const,
    verifiedAt: { not: null },
    profile: {
      visible: true,
      ...(pais ? { countryCode: pais } : {}),
      ...(depto ? { stateCode: depto } : {}),
      ...(ciudad ? { city: ciudad } : {}),
    },
  };

  const [currentUser, workers, totalCount, geoRows] = await Promise.all([
    getCurrentUser(),
    db.user.findMany({
      where: workerWhere,
      include: {
        profile: true,
        mediaItems: { orderBy: { createdAt: "asc" }, take: 4 },
        _count: { select: { mediaItems: true } },
        agency: { select: { id: true, name: true } },
      },
      // Premium primero (nunca expirados por delante de los no-premium), luego
      // por cantidad de reseñas — mismo criterio que antes se aplicaba en
      // memoria, ahora en la BD para poder paginar sin romper el orden.
      orderBy: [
        { premiumUntil: { sort: "desc", nulls: "last" } },
        { reviewsReceived: { _count: "desc" } },
      ],
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.user.count({ where: workerWhere }),
    // Opciones de filtro: solo lo que existe entre los perfiles visibles.
    db.profile.findMany({
      where: VISIBLE_WORKER_PROFILE,
      select: {
        countryCode: true,
        countryName: true,
        stateCode: true,
        stateName: true,
        city: true,
      },
    }),
  ]);

  const uniqueBy = <T,>(rows: T[], key: (r: T) => string | null) => {
    const seen = new Map<string, T>();
    for (const r of rows) {
      const k = key(r);
      if (k && !seen.has(k)) seen.set(k, r);
    }
    return [...seen.values()];
  };

  const countries = uniqueBy(geoRows, (r) => r.countryCode)
    .map((r) => ({ code: r.countryCode!, name: r.countryName ?? r.countryCode! }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  const states = pais
    ? uniqueBy(geoRows.filter((r) => r.countryCode === pais), (r) => r.stateCode)
        .map((r) => ({ code: r.stateCode!, name: r.stateName ?? r.stateCode! }))
        .sort((a, b) => a.name.localeCompare(b.name, "es"))
    : [];
  const cities = pais
    ? uniqueBy(
        geoRows.filter((r) => r.countryCode === pais && (!depto || r.stateCode === depto)),
        (r) => r.city
      )
        .map((r) => ({ code: r.city!, name: r.city! }))
        .sort((a, b) => a.name.localeCompare(b.name, "es"))
    : [];
  const geoPairs = uniqueBy(geoRows, (r) => `${r.countryCode}|${r.city ?? ""}`)
    .filter((r) => r.countryCode)
    .map((r) => ({ country: r.countryCode!, city: r.city }));

  const ratings = await db.review.groupBy({
    by: ["targetId"],
    where: { targetId: { in: workers.map((w) => w.id) } },
    _avg: { score: true },
    _count: true,
  });
  const ratingMap = new Map(ratings.map((r) => [r.targetId, r]));

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-6">
      {showFilters && (
        <CatalogFilters
          countries={countries}
          states={states}
          cities={cities}
          selected={{ pais: pais ?? "", depto: depto ?? "", ciudad: ciudad ?? "" }}
          geoPairs={geoPairs}
          highlightLocate={currentUser?.role === "CLIENT"}
        />
      )}

      {workers.length === 0 ? (
        <EmptyState
          title="No hay perfiles disponibles"
          description={
            pais || depto || ciudad
              ? "No encontramos perfiles con esos filtros. Prueba ampliando la búsqueda."
              : "Vuelve pronto: nuevos perfiles se verifican cada día."
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {workers.map((w) => {
              const rating = ratingMap.get(w.id);
              return (
                <WorkerCard
                  key={w.id}
                  worker={{
                    id: w.id,
                    displayName: w.displayName,
                    premium: isPremium(w),
                    profile: w.profile,
                    mediaItems: w.mediaItems,
                    mediaCount: w._count.mediaItems,
                    agency: w.agency,
                  }}
                  location={formatLocation(w.profile)}
                  rating={{ avg: rating?._avg.score ?? null, count: rating?._count ?? 0 }}
                />
              );
            })}
          </div>

          {totalPages > 1 && (
            <nav aria-label="Paginación" className="flex items-center justify-center gap-3 pt-2">
              {currentPage > 1 ? (
                <Link
                  href={pageHref(currentPage - 1, pais, depto, ciudad)}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-fuchsia-700 hover:text-white"
                >
                  ← Anterior
                </Link>
              ) : (
                <span className="rounded-lg border border-zinc-900 px-3 py-1.5 text-sm text-zinc-700">
                  ← Anterior
                </span>
              )}
              <span className="text-sm text-zinc-500">
                Página {currentPage} de {totalPages}
              </span>
              {currentPage < totalPages ? (
                <Link
                  href={pageHref(currentPage + 1, pais, depto, ciudad)}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-fuchsia-700 hover:text-white"
                >
                  Siguiente →
                </Link>
              ) : (
                <span className="rounded-lg border border-zinc-900 px-3 py-1.5 text-sm text-zinc-700">
                  Siguiente →
                </span>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
