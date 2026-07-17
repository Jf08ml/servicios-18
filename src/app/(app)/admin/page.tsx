import Link from "next/link";
import { db } from "@/lib/db";
import { pageTitle, card } from "@/lib/ui";
import { formatMoney } from "@/lib/format";

export const metadata = { title: "Administración" };

export default async function AdminResumenPage() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    pendingVerifications,
    openReports,
    activeSos,
    totalUsers,
    totalWorkers,
    verifiedWorkers,
    monthBookings,
  ] = await Promise.all([
    db.verification.count({ where: { status: "PENDING" } }),
    db.report.count({ where: { status: { in: ["OPEN", "REVIEWING"] } } }),
    db.sosAlert.count({ where: { status: "ACTIVE" } }),
    db.user.count(),
    db.user.count({ where: { role: "WORKER" } }),
    db.user.count({ where: { role: "WORKER", verifiedAt: { not: null } } }),
    db.hotelBooking.aggregate({
      where: { createdAt: { gte: monthStart }, status: { not: "CANCELLED" } },
      _count: true,
      _sum: { totalPrice: true, commissionAmount: true },
    }),
  ]);

  const stats = [
    { label: "Verificaciones pendientes", value: pendingVerifications, href: "/admin/verificaciones", urgent: pendingVerifications > 0 },
    { label: "Reportes abiertos", value: openReports, href: "/admin/reportes", urgent: openReports > 0 },
    { label: "Alertas SOS activas", value: activeSos, href: "/admin/sos", urgent: activeSos > 0 },
    { label: "Usuarios totales", value: totalUsers, href: "/admin/usuarios" },
    { label: "Profesionales", value: `${verifiedWorkers}/${totalWorkers} verif.`, href: "/admin/usuarios" },
    { label: "Reservas del mes", value: monthBookings._count, href: "/admin/hoteles" },
  ];

  return (
    <div className="space-y-6">
      <h1 className={pageTitle}>Resumen</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <div
              className={
                card +
                " transition hover:border-zinc-600" +
                (s.urgent ? " border-amber-800" : "")
              }
            >
              <p className="text-3xl font-bold text-white">{s.value}</p>
              <p className="mt-1 text-sm text-zinc-400">{s.label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className={card}>
        <h2 className="font-semibold text-white">Ingresos por comisiones (mes actual)</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-2xl font-bold text-emerald-300">
              {formatMoney(monthBookings._sum.commissionAmount ?? 0)}
            </p>
            <p className="text-sm text-zinc-400">Comisiones generadas</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">
              {formatMoney(monthBookings._sum.totalPrice ?? 0)}
            </p>
            <p className="text-sm text-zinc-400">Volumen total reservado</p>
          </div>
        </div>
      </div>
    </div>
  );
}
