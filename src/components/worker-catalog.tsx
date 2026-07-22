import { db } from "@/lib/db";
import { isPremium } from "@/lib/auth";
import { formatLocation } from "@/lib/format";
import { CatalogFilters } from "@/components/catalog-filters";
import { EmptyState } from "@/components/empty-state";
import { WorkerCard } from "@/components/worker-card";

export type CatalogFilterParams = {
  pais?: string;
  depto?: string;
  ciudad?: string;
  /** false en landings por ciudad, donde el filtro viene fijo en la URL. */
  showFilters?: boolean;
};

export const VISIBLE_WORKER_PROFILE = {
  visible: true,
  user: { is: { role: "WORKER" as const, status: "ACTIVE" as const, verifiedAt: { not: null } } },
};

/**
 * Catálogo de perfiles verificados. Se usa tanto en la portada pública
 * como en la sección /perfiles para usuarios con sesión.
 */
export async function WorkerCatalog({ pais, depto, ciudad, showFilters = true }: CatalogFilterParams) {
  const [workers, geoRows] = await Promise.all([
    db.user.findMany({
      where: {
        role: "WORKER",
        status: "ACTIVE",
        verifiedAt: { not: null },
        profile: {
          visible: true,
          ...(pais ? { countryCode: pais } : {}),
          ...(depto ? { stateCode: depto } : {}),
          ...(ciudad ? { city: ciudad } : {}),
        },
      },
      include: {
        profile: true,
        mediaItems: { orderBy: { createdAt: "asc" }, take: 4 },
        _count: { select: { mediaItems: true } },
        agency: { select: { id: true, name: true } },
      },
    }),
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

  const sorted = [...workers].sort((a, b) => {
    const premiumDiff = Number(isPremium(b)) - Number(isPremium(a));
    if (premiumDiff !== 0) return premiumDiff;
    const countA = ratingMap.get(a.id)?._count ?? 0;
    const countB = ratingMap.get(b.id)?._count ?? 0;
    return countB - countA;
  });

  return (
    <div className="space-y-6">
      {showFilters && (
        <CatalogFilters
          countries={countries}
          states={states}
          cities={cities}
          selected={{ pais: pais ?? "", depto: depto ?? "", ciudad: ciudad ?? "" }}
          geoPairs={geoPairs}
        />
      )}

      {sorted.length === 0 ? (
        <EmptyState
          title="No hay perfiles disponibles"
          description={
            pais || depto || ciudad
              ? "No encontramos perfiles con esos filtros. Prueba ampliando la búsqueda."
              : "Vuelve pronto: nuevos perfiles se verifican cada día."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((w) => {
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
      )}
    </div>
  );
}
