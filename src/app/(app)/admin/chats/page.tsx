import Link from "next/link";
import { db } from "@/lib/db";
import { pageTitle } from "@/lib/ui";
import { EmptyState } from "@/components/empty-state";
import { ROLE_LABELS } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Chats" };

const PAGE_SIZE = 30;

export default async function AdminChatsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const currentPage = Math.max(1, Math.floor(Number(page)) || 1);

  const [conversations, totalCount] = await Promise.all([
    db.conversation.findMany({
      orderBy: { lastMessageAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        a: { select: { id: true, displayName: true, role: true } },
        b: { select: { id: true, displayName: true, role: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { messages: true } },
      },
    }),
    db.conversation.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <h1 className={pageTitle}>Chats ({totalCount})</h1>

      {conversations.length === 0 ? (
        <EmptyState
          title="Aún no hay conversaciones"
          description="Cuando un cliente y una profesional empiecen a chatear, aparecerán aquí."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900 text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3">Participantes</th>
                  <th className="px-4 py-3">Último mensaje</th>
                  <th className="px-4 py-3">Mensajes</th>
                  <th className="px-4 py-3">Última actividad</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {conversations.map((c) => {
                  const last = c.messages[0];
                  return (
                    <tr key={c.id} className="border-b border-zinc-800/60">
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">
                          {c.a.displayName}{" "}
                          <span className="text-xs font-normal text-zinc-500">
                            ({ROLE_LABELS[c.a.role]})
                          </span>
                        </p>
                        <p className="font-medium text-white">
                          {c.b.displayName}{" "}
                          <span className="text-xs font-normal text-zinc-500">
                            ({ROLE_LABELS[c.b.role]})
                          </span>
                        </p>
                      </td>
                      <td className="max-w-xs px-4 py-3 text-zinc-400">
                        <p className="truncate">{last ? last.body : "Sin mensajes"}</p>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">{c._count.messages}</td>
                      <td className="px-4 py-3 text-zinc-400">
                        {formatDateTime(c.lastMessageAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/chats/${c.id}`}
                          className="text-xs font-medium text-fuchsia-400 hover:text-fuchsia-300"
                        >
                          Ver mensajes
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <nav aria-label="Paginación" className="flex items-center justify-center gap-3 pt-2">
              {currentPage > 1 ? (
                <Link
                  href={`?page=${currentPage - 1}`}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-fuchsia-700 hover:text-white"
                >
                  ← Anterior
                </Link>
              ) : (
                <span className="rounded-lg border border-zinc-900 px-3 py-1.5 text-sm text-zinc-700">
                  ← Anterior
                </span>
              )}
              <span className="text-sm text-zinc-500">
                Página {currentPage} de {totalPages}
              </span>
              {currentPage < totalPages ? (
                <Link
                  href={`?page=${currentPage + 1}`}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-fuchsia-700 hover:text-white"
                >
                  Siguiente →
                </Link>
              ) : (
                <span className="rounded-lg border border-zinc-900 px-3 py-1.5 text-sm text-zinc-700">
                  Siguiente →
                </span>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
