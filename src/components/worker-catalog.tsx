import Link from "next/link";
import { db } from "@/lib/db";
import { isPremium } from "@/lib/auth";
import { formatLocation } from "@/lib/format";
import { Avatar } from "@/components/avatar";
import { Stars } from "@/components/stars";
import { VerifiedBadge, PremiumBadge } from "@/components/badges";
import { CatalogFilters } from "@/components/catalog-filters";
import { EmptyState } from "@/components/empty-state";

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
            const [cover, ...thumbs] = w.mediaItems;
            const extra = w._count.mediaItems - w.mediaItems.length;
            return (
              <Link
                key={w.id}
                href={`/perfiles/${w.id}`}
                className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 transition hover:border-fuchsia-700"
              >
                {cover && (
                  <div>
                    <div className="relative">
                      {cover.kind === "VIDEO" ? (
                        <video
                          src={`/api/files/${cover.filePath}`}
                          muted
                          preload="metadata"
                          playsInline
                          className="h-40 w-full bg-black object-cover"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/files/${cover.filePath}`}
                          alt={`${w.displayName} — ${formatLocation(w.profile)}`}
                          loading="lazy"
                          className="h-40 w-full object-cover"
                        />
                      )}
                      {cover.kind === "VIDEO" && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="rounded-full bg-black/60 px-3 py-1.5 text-sm text-white">
                            ▶ Video
                          </span>
                        </span>
                      )}
                    </div>
                    {thumbs.length > 0 && (
                      <div className="grid grid-cols-3 gap-px bg-zinc-800">
                        {thumbs.map((m, i) => (
                          <div key={m.id} className="relative">
                            {m.kind === "VIDEO" ? (
                              <video
                                src={`/api/files/${m.filePath}`}
                                muted
                                preload="metadata"
                                playsInline
                                className="h-16 w-full bg-black object-cover"
                              />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={`/api/files/${m.filePath}`}
                                alt={`Foto de ${w.displayName}`}
                                loading="lazy"
                                className="h-16 w-full object-cover"
                              />
                            )}
                            {m.kind === "VIDEO" && (
                              <span className="absolute inset-0 flex items-center justify-center text-xs text-white">
                                <span className="rounded-full bg-black/60 px-1.5 py-0.5">▶</span>
                              </span>
                            )}
                            {i === thumbs.length - 1 && extra > 0 && (
                              <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-semibold text-white">
                                +{extra}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-3">
                    <Avatar
                      photoPath={w.profile?.photoPath}
                      name={w.displayName}
                      className="h-14 w-14 text-lg"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{w.displayName}</p>
                      <p className="truncate text-sm text-zinc-400">{formatLocation(w.profile)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <VerifiedBadge />
                    {isPremium(w) && <PremiumBadge />}
                  </div>
                  <div className="mt-3">
                    <Stars value={rating?._avg.score ?? null} count={rating?._count} />
                  </div>
                  {w.profile?.bio && (
                    <p className="mt-3 line-clamp-2 text-sm text-zinc-400">{w.profile.bio}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
