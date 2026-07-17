import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const conversation = await db.conversation.findUnique({ where: { id } });
  if (!conversation || (conversation.aId !== user.id && conversation.bId !== user.id)) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const url = new URL(req.url);
  const afterParam = url.searchParams.get("after");
  const after = afterParam ? new Date(afterParam) : new Date(0);

  const messages = await db.message.findMany({
    where: {
      conversationId: id,
      createdAt: { gt: isNaN(after.getTime()) ? new Date(0) : after },
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  // El lector marca como leídos los mensajes del otro participante.
  await db.message.updateMany({
    where: { conversationId: id, senderId: { not: user.id }, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}
