import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser, isPremium } from "@/lib/auth";
import { db } from "@/lib/db";
import { card, pageTitle, btnSecondary, btnPrimary } from "@/lib/ui";
import { Avatar } from "@/components/avatar";
import { Stars } from "@/components/stars";
import { VerifiedBadge, PremiumBadge } from "@/components/badges";
import {
  formatDate,
  formatDurationMinutes,
  formatLocation,
  minutesTo12h,
  WEEKDAYS,
} from "@/lib/format";
import { startConversationAction } from "@/app/(app)/chat/actions";
import { MediaGallery } from "@/components/media-gallery";
import { absUrl, SITE_NAME } from "@/lib/site";
import { AgendarForm } from "./agendar-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const worker = await db.user.findFirst({
    where: {
      id,
      role: "WORKER",
      status: "ACTIVE",
      verifiedAt: { not: null },
      profile: { is: { visible: true } },
    },
    include: { profile: true },
  });

  // Perfiles no públicos (o en revisión): fuera del índice.
  if (!worker) return { title: "Perfil", robots: { index: false } };

  const city = worker.profile?.city;
  const title = city
    ? `${worker.displayName} — Prepago en ${city}`
    : `${worker.displayName} — Perfil verificado`;
  const bio = worker.profile?.bio?.replace(/\s+/g, " ").trim();
  const description = bio
    ? bio.length > 155
      ? `${bio.slice(0, 152)}…`
      : bio
    : `Perfil verificado de ${worker.displayName}${city ? ` en ${city}` : ""}: fotos reales, reseñas y agenda en ${SITE_NAME}.`;

  return {
    title,
    description,
    alternates: { canonical: `/perfiles/${id}` },
    openGraph: {
      title: `${title} · ${SITE_NAME}`,
      description,
      url: absUrl(`/perfiles/${id}`),
      type: "profile",
      ...(worker.profile?.photoPath
        ? { images: [{ url: absUrl(`/api/files/${worker.profile.photoPath}`) }] }
        : {}),
    },
  };
}

export default async function PerfilDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  const { id } = await params;

  const worker = await db.user.findFirst({
    where: { id, role: "WORKER" },
    include: {
      profile: true,
      mediaItems: { orderBy: { createdAt: "asc" } },
      serviceTypes: { orderBy: { durationMinutes: "asc" } },
      availability: { orderBy: [{ weekday: "asc" }, { startMinute: "asc" }] },
      reviewsReceived: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { author: { select: { displayName: true } } },
      },
    },
  });

  const isSelf = !!user && worker?.id === user.id;
  const publiclyVisible =
    worker &&
    worker.status === "ACTIVE" &&
    worker.verifiedAt &&
    worker.profile?.visible;

  if (!worker || (!publiclyVisible && !isSelf && user?.role !== "ADMIN")) {
    notFound();
  }

  const rating = await db.review.aggregate({
    where: { targetId: worker.id },
    _avg: { score: true },
    _count: true,
  });

  const byWeekday = new Map<number, typeof worker.availability>();
  for (const slot of worker.availability) {
    const list = byWeekday.get(slot.weekday) ?? [];
    list.push(slot);
    byWeekday.set(slot.weekday, list);
  }

  const registerCta = `/login?next=/perfiles/${worker.id}`;

  const jsonLd = publiclyVisible
    ? {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        url: absUrl(`/perfiles/${worker.id}`),
        mainEntity: {
          "@type": "Person",
          name: worker.displayName,
          ...(worker.profile?.bio ? { description: worker.profile.bio } : {}),
          ...(worker.profile?.photoPath
            ? { image: absUrl(`/api/files/${worker.profile.photoPath}`) }
            : {}),
          ...(worker.profile?.city
            ? {
                address: {
                  "@type": "PostalAddress",
                  addressLocality: worker.profile.city,
                  ...(worker.profile.countryCode
                    ? { addressCountry: worker.profile.countryCode }
                    : {}),
                },
              }
            : {}),
        },
        ...(rating._count > 0 && rating._avg.score
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: Number(rating._avg.score.toFixed(1)),
                reviewCount: rating._count,
                bestRating: 5,
              },
            }
          : {}),
      }
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar photoPath={worker.profile?.photoPath} name={worker.displayName} className="h-20 w-20 text-2xl" />
          <div>
            <h1 className={pageTitle}>{worker.displayName}</h1>
            <p className="text-sm text-zinc-400">{formatLocation(worker.profile)}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {worker.verifiedAt && <VerifiedBadge />}
              {isPremium(worker) && <PremiumBadge />}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Stars value={rating._avg.score} count={rating._count} />
          {user && !isSelf && (
            <Link
              href={`/reportes?usuario=${worker.id}`}
              className="text-xs font-medium text-zinc-500 hover:text-red-400"
            >
              Reportar este perfil
            </Link>
          )}
        </div>
      </div>

      {!user && (
        <div className="rounded-2xl border border-fuchsia-800 bg-fuchsia-950/30 p-5">
          <p className="text-sm text-fuchsia-100">
            Para chatear o agendar una cita necesitas una cuenta gratuita.
            <span className="block text-fuchsia-300/80">
              Sin correos, boletines ni notificaciones: tu correo solo sirve
              para iniciar sesión.
            </span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/registro" className={btnPrimary}>
              Crear cuenta gratis
            </Link>
            <Link href={registerCta} className={btnSecondary}>
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      )}

      {user && !isSelf && user.role === "CLIENT" && (
        <div className="flex flex-wrap gap-3">
          <form action={startConversationAction}>
            <input type="hidden" name="targetId" value={worker.id} />
            <button type="submit" className={btnSecondary}>
              💬 Enviar mensaje
            </button>
          </form>
          <a
            href="#agendar"
            className="inline-flex items-center gap-2 rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-500"
          >
            📅 Agendar cita
          </a>
        </div>
      )}

      {worker.profile?.bio && (
        <div className={card}>
          <h2 className="mb-2 font-semibold text-white">Presentación</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
            {worker.profile.bio}
          </p>
          {worker.profile.languages && (
            <p className="mt-3 text-sm text-zinc-400">
              <span className="text-zinc-500">Idiomas:</span> {worker.profile.languages}
            </p>
          )}
        </div>
      )}

      {worker.serviceTypes.length > 0 && (
        <div className={card}>
          <h2 className="mb-3 font-semibold text-white">Servicios</h2>
          <ul className="flex flex-wrap gap-2">
            {worker.serviceTypes.map((svc) => (
              <li
                key={svc.id}
                className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-200"
              >
                {svc.name}{" "}
                <span className="text-zinc-500">
                  · {formatDurationMinutes(svc.durationMinutes)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {worker.mediaItems.length > 0 && (
        <div className={card}>
          <h2 className="mb-3 font-semibold text-white">Galería</h2>
          <MediaGallery
            ownerName={worker.displayName}
            items={worker.mediaItems.map((m) => ({
              id: m.id,
              kind: m.kind,
              filePath: m.filePath,
            }))}
          />
        </div>
      )}

      <div className={card}>
        <h2 className="mb-3 font-semibold text-white">Disponibilidad habitual</h2>
        {worker.availability.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Este perfil aún no publica su disponibilidad. Escríbele por chat.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {[...byWeekday.entries()].map(([weekday, slots]) => (
              <li key={weekday} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm">
                <span className="font-medium text-zinc-200">{WEEKDAYS[weekday]}</span>
                <span className="ml-2 text-zinc-400">
                  {slots.map((s) => `${minutesTo12h(s.startMinute)} – ${minutesTo12h(s.endMinute)}`).join(", ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {rating._count > 0 && (
        <div className={card}>
          <h2 className="mb-3 font-semibold text-white">Reseñas recientes</h2>
          <ul className="space-y-3">
            {worker.reviewsReceived.map((r) => (
              <li key={r.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-200">{r.author.displayName}</span>
                  <span className="text-sm text-amber-400">{"★".repeat(r.score)}</span>
                </div>
                {r.comment && <p className="mt-1 text-sm text-zinc-400">{r.comment}</p>}
                <p className="mt-1 text-xs text-zinc-600">{formatDate(r.createdAt)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {user && !isSelf && user.role === "CLIENT" && (
        <div id="agendar" className={card}>
          <h2 className="mb-1 font-semibold text-white">Agendar una cita</h2>
          <p className="mb-4 text-sm text-zinc-400">
            La solicitud queda pendiente hasta que {worker.displayName} la
            confirme. Recibirás la respuesta en tu agenda.
          </p>
          <AgendarForm
            workerId={worker.id}
            services={worker.serviceTypes.map((s) => ({
              id: s.id,
              name: s.name,
              durationMinutes: s.durationMinutes,
            }))}
          />
        </div>
      )}
    </div>
  );
}
