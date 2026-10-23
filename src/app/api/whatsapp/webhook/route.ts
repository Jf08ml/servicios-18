import crypto from "crypto";
import { NextResponse } from "next/server";
import { handleWhatsappReply } from "@/lib/whatsapp-outreach";
import { whatsappClientId } from "@/lib/whatsapp";

/**
 * Mensajes entrantes del número de WhatsApp de Mis Escorts, reenviados por el
 * gateway (wa-baileys-backend, MISESCORTS_WEBHOOK_URL). Se autentica con el
 * secreto compartido en el header X-WA-Agent-Secret.
 */
function validSecret(received: string | null): boolean {
  const expected = process.env.WA_WEBHOOK_SECRET ?? "";
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

type InboundPayload = {
  clientId?: string;
  clientPhone?: string;
  fromMe?: boolean;
  body?: string;
};

export async function POST(req: Request) {
  if (!validSecret(req.headers.get("x-wa-agent-secret"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const payload = (await req.json().catch(() => null)) as InboundPayload | null;
  if (
    !payload ||
    payload.fromMe ||
    payload.clientId !== whatsappClientId() ||
    typeof payload.clientPhone !== "string" ||
    typeof payload.body !== "string"
  ) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  await handleWhatsappReply(payload.clientPhone, payload.body.slice(0, 500));
  return NextResponse.json({ ok: true });
}
