import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { Stars } from "@/components/stars";
import { VerifiedBadge, PremiumBadge, AgencyBadge } from "@/components/badges";
import { profileSlug } from "@/lib/site";

export type WorkerCardData = {
  id: string;
  displayName: string;
  premium: boolean;
  profile: { photoPath: string | null; bio: string | null } | null;
  mediaItems: { id: string; kind: "IMAGE" | "VIDEO"; filePath: string }[];
  mediaCount: number;
  agency?: { id: string; name: string } | null;
};

/**
 * Tarjeta de trabajadora del catálogo público: la foto de portada es el
 * elemento principal (nombre, ubicación y badges van superpuestos con un
 * degradado), con estrellas y bio debajo. La usan tanto WorkerCatalog
 * (portada/perfiles) como la página pública de una agencia (/agencias/[id]).
 */
export function WorkerCard({
  worker,
  location,
  rating,
}: {
  worker: WorkerCardData;
  location: string;
  rating?: { avg: number | null; count: number };
}) {
  const [cover] = worker.mediaItems;

  return (
    <Link
      href={`/perfiles/${profileSlug(worker.displayName, worker.id)}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 transition hover:-translate-y-0.5 hover:border-fuchsia-600 hover:shadow-lg hover:shadow-fuchsia-950/30"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-950">
        {cover ? (
          <>
            {cover.kind === "VIDEO" ? (
              <video
                src={`/api/files/${cover.filePath}`}
                muted
                preload="metadata"
                playsInline
                className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/files/${cover.filePath}`}
                alt={`${worker.displayName} — ${location}`}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
            )}
            {cover.kind === "VIDEO" && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="rounded-full bg-black/60 px-3 py-1.5 text-sm text-white">
                  ▶ Video
                </span>
              </span>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-zinc-800 to-zinc-950">
            <Avatar
              photoPath={worker.profile?.photoPath}
              name={worker.displayName}
              className="h-20 w-20 text-3xl"
            />
          </div>
        )}

        <div className="absolute left-2 top-2 z-10 flex max-w-[85%] flex-wrap gap-1">
          <VerifiedBadge />
          {worker.premium && <PremiumBadge />}
          {worker.agency && <AgencyBadge name={worker.agency.name} />}
        </div>

        {worker.mediaCount > 1 && (
          <span className="absolute right-2 top-2 z-10 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
            📷 {worker.mediaCount}
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-3 pb-2 pt-10">
          <p className="truncate font-semibold text-white">{worker.displayName}</p>
          <p className="truncate text-xs text-zinc-200/90">📍 {location}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <Stars value={rating?.avg ?? null} count={rating?.count} />
        {worker.profile?.bio && (
          <p className="line-clamp-2 text-sm text-zinc-400">{worker.profile.bio}</p>
        )}
      </div>
    </Link>
  );
}
