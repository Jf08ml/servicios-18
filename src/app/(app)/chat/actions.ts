"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { inviteWorkerIfUnclaimed } from "@/lib/whatsapp-outreach";

function pairIds(userA: string, userB: string): [string, string] {
  return userA < userB ? [userA, userB] : [userB, userA];
}

/** Busca o crea la conversación con el usuario objetivo y redirige al hilo. */
export async function startConversationAction(formData: FormData) {
  const user = await requireUser(["WORKER", "CLIENT"]);
  const targetId = String(formData.get("targetId") ?? "");
  if (!targetId || targetId === user.id) return;

  const target = await db.user.findUnique({ where: { id: targetId } });
  if (!target || target.status !== "ACTIVE") return;
  if (!["WORKER", "CLIENT"].includes(target.role)) return;

  const [aId, bId] = pairIds(user.id, targetId);
  const conversation = await db.conversation.upsert({
    where: { aId_bId: { aId, bId } },
    create: { aId, bId },
    update: {},
  });

  redirect(`/chat/${conversation.id}`);
}

export type SentMessage = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export async function sendMessageAction(
  conversationId: string,
  body: string
): Promise<{ message?: SentMessage; error?: string }> {
  const user = await requireUser(["WORKER", "CLIENT"]);
  const text = body.trim().slice(0, 2000);
  if (!text) return { error: "Mensaje vacío" };

  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
  });
  if (!conversation || (conversation.aId !== user.id && conversation.bId !== user.id)) {
    return { error: "Conversación no encontrada" };
  }

  const message = await db.message.create({
    data: { conversationId, senderId: user.id, body: text },
  });
  await db.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: message.createdAt },
  });

  // Si un cliente le escribe a una profesional que aún no reclamó su cuenta
  // (carga masiva), se le avisa por WhatsApp sin demorar la respuesta del chat.
  if (user.role === "CLIENT") {
    const recipientId = conversation.aId === user.id ? conversation.bId : conversation.aId;
    after(() =>
      inviteWorkerIfUnclaimed(recipientId).catch((e) =>
        console.error("[whatsapp] error al invitar profesional", e)
      )
    );
  }

  revalidatePath("/chat");
  return {
    message: {
      id: message.id,
      senderId: message.senderId,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
    },
  };
}
