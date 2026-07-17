import Link from "next/link";
import type { NotificationType } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { pageTitle } from "@/lib/ui";
import { EmptyState } from "@/components/empty-state";
import { formatDateTime } from "@/lib/format";
import { PushToggle } from "./push-toggle";

export const metadata = { title: "Notificaciones" };

const TYPE_ICONS: Record<NotificationType, string> = {
  APPOINTMENT: "📅",
  BOOKING: "🏨",
  VERIFICATION: "✅",
  REVIEW: "⭐",
  REPORT: "🚩",
  SOS: "🚨",
  SYSTEM: "🔔",
};

export default async function NotificacionesPage() {
  const user = await requireUser();

  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Al abrir la sección, todo queda marcado como leído; el resaltado de
  // "nuevas" en esta vista usa el estado leído ANTES de abrir.
  if (notifications.some((n) => !n.readAt)) {
    await db.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className={pageTitle}>Notificaciones</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Todo pasa aquí dentro: nunca te enviaremos correos ni mensajes fuera
          de la plataforma.
        </p>
      </div>

      <PushToggle />
      <p className="text-xs text-zinc-500">
        💡 Para recibir avisos en tu teléfono como una app,{" "}
        <Link href="/instalar" className="font-medium text-fuchsia-400 hover:text-fuchsia-300">
          instala Prepagoniacas en tu pantalla de inicio
        </Link>
        {" "}(en iPhone es obligatorio para que lleguen las notificaciones).
      </p>

      {notifications.length === 0 ? (
        <EmptyState
          title="No tienes notificaciones"
          description="Cuando pase algo con tus citas, verificación o reservas, lo verás aquí."
        />
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => {
            const isNew = !n.readAt;
            const content = (
              <div className="flex items-start gap-3">
                <span className="text-xl" aria-hidden>
                  {TYPE_ICONS[n.type]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white">{n.title}</p>
                    {isNew && (
                      <span className="rounded-full bg-fuchsia-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                        Nueva
                      </span>
                    )}
                  </div>
                  {n.body && <p className="mt-0.5 text-sm text-zinc-400">{n.body}</p>}
                  <p className="mt-1 text-xs text-zinc-600">{formatDateTime(n.createdAt)}</p>
                </div>
                {n.link && <span className="text-sm text-fuchsia-400">Ver →</span>}
              </div>
            );

            const cls = `block rounded-xl border p-4 transition ${
              isNew
                ? "border-fuchsia-800 bg-fuchsia-950/20"
                : "border-zinc-800 bg-zinc-900/60"
            } ${n.link ? "hover:border-fuchsia-700" : ""}`;

            return (
              <li key={n.id}>
                {n.link ? (
                  <Link href={n.link} className={cls}>
                    {content}
                  </Link>
                ) : (
                  <div className={cls}>{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
