import Link from "next/link";
import { requireUser, isPremium, isVerified } from "@/lib/auth";
import { db } from "@/lib/db";
import { card, pageTitle } from "@/lib/ui";
import { StatusBadge, VerifiedBadge, PremiumBadge } from "@/components/badges";
import { formatDateTime } from "@/lib/format";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Panel" };

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href?: string;
}) {
  const body = (
    <div className={card + " transition hover:border-zinc-600"}>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="mt-1 text-sm text-zinc-400">{label}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function PanelPage() {
  const user = await requireUser();

  if (user.role === "ADMIN") {
    const [pendingVerifications, openReports, activeSos, totalUsers] =
      await Promise.all([
        db.verification.count({ where: { status: "PENDING" } }),
        db.report.count({ where: { status: { in: ["OPEN", "REVIEWING"] } } }),
        db.sosAlert.count({ where: { status: "ACTIVE" } }),
        db.user.count(),
      ]);
    return (
      <div className="space-y-6">
        <h1 className={pageTitle}>Panel de administración</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Verificaciones pendientes" value={pendingVerifications} href="/admin/verificaciones" />
          <StatCard label="Reportes abiertos" value={openReports} href="/admin/reportes" />
          <StatCard label="Alertas SOS activas" value={activeSos} href="/admin/sos" />
          <StatCard label="Usuarios registrados" value={totalUsers} href="/admin/usuarios" />
        </div>
        <Link href="/admin" className="inline-block text-sm font-medium text-fuchsia-400 hover:text-fuchsia-300">
          Ir a la administración completa →
        </Link>
      </div>
    );
  }

  if (user.role === "HOTEL") {
    const hotels = await db.hotel.findMany({
      where: { ownerId: user.id },
      include: {
        bookings: {
          where: { startsAt: { gte: new Date() }, status: "CONFIRMED" },
          orderBy: { startsAt: "asc" },
          take: 5,
          include: { roomType: true, user: { select: { displayName: true } } },
        },
      },
    });
    return (
      <div className="space-y-6">
        <h1 className={pageTitle}>Hola, {user.displayName}</h1>
        {hotels.length === 0 ? (
          <EmptyState
            title="Aún no tienes un hotel asignado"
            description="El equipo de la plataforma vinculará tu cuenta con tu hotel aliado."
          />
        ) : (
          hotels.map((hotel) => (
            <div key={hotel.id} className={card}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">{hotel.name}</h2>
                <Link href="/hotel" className="text-sm font-medium text-fuchsia-400 hover:text-fuchsia-300">
                  Gestionar reservas →
                </Link>
              </div>
              <p className="mt-1 text-sm text-zinc-400">
                Próximas reservas confirmadas: {hotel.bookings.length}
              </p>
              <ul className="mt-3 space-y-2">
                {hotel.bookings.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm">
                    <span className="text-zinc-200">
                      {b.roomType.name} · {b.user.displayName}
                    </span>
                    <span className="text-zinc-400">{formatDateTime(b.startsAt)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    );
  }

  // WORKER y CLIENT
  const now = new Date();
  const [verification, upcoming, unread, rating] = await Promise.all([
    db.verification.findUnique({ where: { userId: user.id } }),
    db.appointment.findMany({
      where: {
        OR: [{ workerId: user.id }, { clientId: user.id }],
        status: { in: ["PENDING", "CONFIRMED"] },
        endsAt: { gte: now },
      },
      orderBy: { startsAt: "asc" },
      take: 5,
      include: {
        worker: { select: { displayName: true } },
        client: { select: { displayName: true } },
      },
    }),
    db.message.count({
      where: {
        readAt: null,
        senderId: { not: user.id },
        conversation: { OR: [{ aId: user.id }, { bId: user.id }] },
      },
    }),
    db.review.aggregate({
      where: { targetId: user.id },
      _avg: { score: true },
      _count: true,
    }),
  ]);

  const verified = isVerified(user);
  const premium = isPremium(user);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className={pageTitle}>Hola, {user.displayName}</h1>
        {verified && <VerifiedBadge />}
        {premium && <PremiumBadge />}
      </div>

      {!verified && (
        <div className="rounded-2xl border border-amber-800 bg-amber-950/30 p-5">
          <h2 className="font-semibold text-amber-200">
            {verification?.status === "PENDING"
              ? "Tu verificación está en revisión"
              : verification?.status === "REJECTED"
                ? "Tu verificación fue rechazada"
                : "Verifica tu identidad"}
          </h2>
          <p className="mt-1 text-sm text-amber-100/80">
            {verification?.status === "PENDING"
              ? "Nuestro equipo está revisando tu envío. Te avisaremos con una notificación."
              : "Los perfiles verificados generan más confianza y reducen el riesgo de fraude para todos."}
          </p>
          {verification?.status !== "PENDING" && (
            <Link
              href="/verificacion"
              className="mt-3 inline-block rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500"
            >
              {verification?.status === "REJECTED" ? "Reintentar verificación" : "Verificarme ahora"}
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Mensajes sin leer" value={unread} href="/chat" />
        <StatCard
          label={`Calificación (${rating._count} reseñas)`}
          value={rating._avg.score ? rating._avg.score.toFixed(1) + " ★" : "—"}
        />
        <StatCard label="Próximas citas" value={upcoming.length} href="/agenda" />
      </div>

      {user.role === "WORKER" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-fuchsia-800 bg-fuchsia-950/20 p-5">
          <div>
            <h2 className="font-semibold text-white">📲 Lleva la app en tu teléfono</h2>
            <p className="mt-1 text-sm text-zinc-300">
              Instálala en tu pantalla de inicio y activa las notificaciones:
              responde solicitudes de cita al instante, incluso con el
              navegador cerrado.
            </p>
          </div>
          <Link
            href="/instalar"
            className="rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-500"
          >
            Cómo instalarla
          </Link>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Próximas citas</h2>
        {upcoming.length === 0 ? (
          <EmptyState
            title="No tienes citas próximas"
            description={
              user.role === "CLIENT"
                ? "Explora los perfiles verificados y agenda tu primera cita."
                : "Cuando un cliente agende contigo, aparecerá aquí."
            }
          />
        ) : (
          <ul className="space-y-2">
            {upcoming.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/citas/${a.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 transition hover:border-zinc-600"
                >
                  <div>
                    <p className="text-sm font-medium text-white">
                      {user.role === "WORKER" ? a.client.displayName : a.worker.displayName}
                    </p>
                    <p className="text-xs text-zinc-400">{formatDateTime(a.startsAt)}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
