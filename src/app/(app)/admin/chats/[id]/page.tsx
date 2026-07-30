import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { pageTitle } from "@/lib/ui";
import { ROLE_LABELS } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Conversación" };

const MESSAGE_LIMIT = 300;

export default async function AdminChatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const conversation = await db.conversation.findUnique({
    where: { id },
    include: {
      a: { select: { id: true, displayName: true, role: true } },
      b: { select: { id: true, displayName: true, role: true } },
      messages: { orderBy: { createdAt: "desc" }, take: MESSAGE_LIMIT },
      _count: { select: { messages: true } },
    },
  });
  if (!conversation) notFound();

  // Se piden desc para quedarnos con los MESSAGE_LIMIT más recientes, y se
  // invierten para mostrarlos en orden cronológico.
  const messages = [...conversation.messages].reverse();
  const truncated = conversation._count.messages > MESSAGE_LIMIT;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/admin/chats" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← Todos los chats
        </Link>
        <h1 className={`${pageTitle} mt-1`}>
          {conversation.a.displayName} · {conversation.b.displayName}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          {conversation.a.displayName} ({ROLE_LABELS[conversation.a.role]}) y{" "}
          {conversation.b.displayName} ({ROLE_LABELS[conversation.b.role]}) — creada el{" "}
          {formatDateTime(conversation.createdAt)}
        </p>
      </div>

      {truncated && (
        <p className="rounded-lg border border-amber-800 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">
          Mostrando los {MESSAGE_LIMIT} mensajes más recientes de{" "}
          {conversation._count.messages} en total.
        </p>
      )}

      <div className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-500">Sin mensajes todavía.</p>
        ) : (
          messages.map((m) => {
            const fromA = m.senderId === conversation.a.id;
            const sender = fromA ? conversation.a : conversation.b;
            return (
              <div key={m.id} className={`flex ${fromA ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    fromA
                      ? "rounded-bl-sm border border-zinc-800 bg-zinc-900 text-zinc-100"
                      : "rounded-br-sm bg-fuchsia-600 text-white"
                  }`}
                >
                  <p
                    className={`mb-0.5 text-[10px] font-medium ${
                      fromA ? "text-zinc-500" : "text-fuchsia-200"
                    }`}
                  >
                    {sender.displayName}
                  </p>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p
                    className={`mt-1 text-right text-[10px] ${
                      fromA ? "text-zinc-500" : "text-fuchsia-200"
                    }`}
                  >
                    {formatDateTime(m.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
