import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { pageTitle } from "@/lib/ui";
import { Avatar } from "@/components/avatar";
import { UnverifiedBadge } from "@/components/badges";
import { EmptyState } from "@/components/empty-state";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Chat" };

export default async function ChatPage() {
  const user = await requireUser(["WORKER", "CLIENT"]);

  const conversations = await db.conversation.findMany({
    where: { OR: [{ aId: user.id }, { bId: user.id }] },
    orderBy: { lastMessageAt: "desc" },
    include: {
      a: { select: { id: true, displayName: true, role: true, verifiedAt: true, profile: { select: { photoPath: true } } } },
      b: { select: { id: true, displayName: true, role: true, verifiedAt: true, profile: { select: { photoPath: true } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: {
        select: {
          messages: { where: { readAt: null, senderId: { not: user.id } } },
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className={pageTitle}>Chat interno</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Conversaciones seguras dentro de la plataforma, sin compartir tu
          número personal.
        </p>
      </div>

      {conversations.length === 0 ? (
        <EmptyState
          title="Aún no tienes conversaciones"
          description={
            user.role === "CLIENT"
              ? "Abre el perfil de un profesional verificado y envíale un mensaje."
              : "Cuando un cliente te escriba, la conversación aparecerá aquí."
          }
        />
      ) : (
        <ul className="space-y-2">
          {conversations.map((c) => {
            const other = c.a.id === user.id ? c.b : c.a;
            const last = c.messages[0];
            const unread = c._count.messages;
            return (
              <li key={c.id}>
                <Link
                  href={`/chat/${c.id}`}
                  className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 transition hover:border-zinc-600"
                >
                  <Avatar photoPath={other.profile?.photoPath} name={other.displayName} className="h-11 w-11" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex min-w-0 items-center gap-2 truncate font-medium text-white">
                        {other.displayName}
                        {other.role === "CLIENT" && !other.verifiedAt && <UnverifiedBadge />}
                      </p>
                      {last && (
                        <span className="shrink-0 text-xs text-zinc-500">
                          {formatDateTime(last.createdAt)}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm text-zinc-400">
                      {last ? last.body : "Sin mensajes todavía"}
                    </p>
                  </div>
                  {unread > 0 && (
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-fuchsia-600 px-1.5 text-xs font-bold text-white">
                      {unread}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
