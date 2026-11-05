import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Avatar } from "@/components/avatar";
import { VerifiedBadge, UnverifiedBadge } from "@/components/badges";
import { whatsappEnabled } from "@/lib/whatsapp";
import { whatsappHref } from "@/lib/format";
import { SITE_NAME } from "@/lib/site";
import { ChatThread, type PendingNotice } from "./chat-thread";

const participantSelect = {
  id: true,
  displayName: true,
  role: true,
  verifiedAt: true,
  claimedAt: true,
  agencyId: true,
  phone: true,
  profile: { select: { photoPath: true, showPhone: true } },
  whatsappOutreach: { select: { status: true } },
} as const;

export const metadata = { title: "Conversación" };

export default async function ChatThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser(["WORKER", "CLIENT"]);
  const { id } = await params;

  const conversation = await db.conversation.findUnique({
    where: { id },
    include: {
      a: { select: participantSelect },
      b: { select: participantSelect },
      messages: { orderBy: { createdAt: "asc" }, take: 200 },
    },
  });
  if (!conversation || (conversation.a.id !== user.id && conversation.b.id !== user.id)) {
    notFound();
  }

  const other = conversation.a.id === user.id ? conversation.b : conversation.a;

  // Profesional de carga masiva que aún no reclamó su cuenta: al cliente se le
  // explica que le estamos avisando (ver inviteWorkerIfUnclaimed) y, si ella
  // no ocultó su número, se le ofrece WhatsApp como alternativa.
  let pendingNotice: PendingNotice | null = null;
  if (user.role === "CLIENT" && other.role === "WORKER" && !other.claimedAt && !other.agencyId) {
    const outreachStatus = other.whatsappOutreach?.status;
    const phone = other.phone && (other.profile?.showPhone ?? true) ? other.phone : null;
    pendingNotice = {
      contacting:
        whatsappEnabled() &&
        !!other.phone &&
        outreachStatus !== "OPTED_OUT" &&
        outreachStatus !== "FAILED",
      whatsappUrl: phone
        ? `${whatsappHref(phone)}?text=${encodeURIComponent(
            `Hola ${other.displayName}, te escribí por ${SITE_NAME}.`
          )}`
        : null,
    };
  }

  // Abrir el hilo marca como leídos los mensajes recibidos.
  await db.message.updateMany({
    where: { conversationId: id, senderId: { not: user.id }, readAt: null },
    data: { readAt: new Date() },
  });

  return (
    <div className="mx-auto flex h-[calc(100dvh-160px)] max-w-2xl flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-3">
          <Avatar photoPath={other.profile?.photoPath} name={other.displayName} className="h-10 w-10" />
          <div>
            <p className="flex flex-wrap items-center gap-2 font-semibold text-white">
              {other.displayName}
              {other.role === "CLIENT" &&
                (other.verifiedAt ? <VerifiedBadge /> : <UnverifiedBadge />)}
            </p>
            {other.role === "WORKER" ? (
              <Link href={`/perfiles/${other.id}`} className="text-xs text-fuchsia-400 hover:text-fuchsia-300">
                Ver perfil
              </Link>
            ) : (
              <p className="text-xs text-zinc-500">Cliente</p>
            )}
          </div>
        </div>
        <Link
          href={`/reportes?usuario=${other.id}`}
          className="text-xs font-medium text-zinc-500 hover:text-red-400"
        >
          Reportar
        </Link>
      </div>

      <ChatThread
        conversationId={conversation.id}
        meId={user.id}
        pendingNotice={pendingNotice}
        initialMessages={conversation.messages.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
