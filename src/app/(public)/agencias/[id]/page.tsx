import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { isPremium } from "@/lib/auth";
import { formatLocation } from "@/lib/format";
import { card, pageTitle } from "@/lib/ui";
import { Avatar } from "@/components/avatar";
import { EmptyState } from "@/components/empty-state";
import { WorkerCard } from "@/components/worker-card";
import { SITE_NAME } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const agency = await db.agency.findUnique({ where: { id } });
  if (!agency) return { title: "Agencia", robots: { index: false } };

  return {
    title: `${agency.name} — Agencia`,
    description:
      agency.description ?? `Catálogo de profesionales verificadas de ${agency.name} en ${SITE_NAME}.`,
    alternates: { canonical: `/agencias/${id}` },
  };
}

export default async function AgenciaPublicaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agency = await db.agency.findUnique({ where: { id } });
  if (!agency) notFound();

  const workers = await db.user.findMany({
    where: {
      role: "WORKER",
      status: "ACTIVE",
      verifiedAt: { not: null },
      agencyId: agency.id,
      profile: { visible: true },
    },
    include: {
      profile: true,
      mediaItems: { orderBy: { createdAt: "asc" }, take: 4 },
      _count: { select: { mediaItems: true } },
    },
  });

  const ratings = await db.review.groupBy({
    by: ["targetId"],
    where: { targetId: { in: workers.map((w) => w.id) } },
    _avg: { score: true },
    _count: true,
  });
  const ratingMap = new Map(ratings.map((r) => [r.targetId, r]));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-4">
        <Avatar photoPath={agency.photoPath} name={agency.name} className="h-16 w-16 text-xl" />
        <div>
          <h1 className={pageTitle}>{agency.name}</h1>
          {agency.city && <p className="text-sm text-zinc-400">{agency.city}</p>}
        </div>
      </div>

      {agency.description && (
        <div className={card}>
          <p className="text-sm leading-relaxed text-zinc-300">{agency.description}</p>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">
          Profesionales ({workers.length})
        </h2>
        {workers.length === 0 ? (
          <EmptyState
            title="Esta agencia no tiene perfiles públicos por ahora"
            description="Vuelve pronto: el catálogo se actualiza seguido."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                  }}
                  location={formatLocation(w.profile)}
                  rating={{ avg: rating?._avg.score ?? null, count: rating?._count ?? 0 }}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
