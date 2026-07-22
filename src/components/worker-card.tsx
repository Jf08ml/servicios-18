import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { Stars } from "@/components/stars";
import { VerifiedBadge, PremiumBadge, AgencyBadge } from "@/components/badges";

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
 * Tarjeta de trabajadora del catálogo público: portada + miniaturas, avatar,
 * badges, estrellas y bio. La usan tanto WorkerCatalog (portada/perfiles)
 * como la página pública de una agencia (/agencias/[id]).
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
  const [cover, ...thumbs] = worker.mediaItems;
  const extra = worker.mediaCount - worker.mediaItems.length;

  return (
    <Link
      href={`/perfiles/${worker.id}`}
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
                alt={`${worker.displayName} — ${location}`}
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
                      alt={`Foto de ${worker.displayName}`}
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
            photoPath={worker.profile?.photoPath}
            name={worker.displayName}
            className="h-14 w-14 text-lg"
          />
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{worker.displayName}</p>
            <p className="truncate text-sm text-zinc-400">{location}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <VerifiedBadge />
          {worker.premium && <PremiumBadge />}
          {worker.agency && <AgencyBadge name={worker.agency.name} />}
        </div>
        <div className="mt-3">
          <Stars value={rating?.avg ?? null} count={rating?.count} />
        </div>
        {worker.profile?.bio && (
          <p className="mt-3 line-clamp-2 text-sm text-zinc-400">{worker.profile.bio}</p>
        )}
      </div>
    </Link>
  );
}
