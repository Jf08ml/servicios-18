import "server-only";
import { phoneCode } from "./geo";

/**
 * Cliente del gateway de WhatsApp propio (wa-baileys-backend). Igual que el
 * push, es best-effort: sin las variables de entorno no envía nada, y nunca
 * lanza — devuelve el resultado para que el llamador decida si reintentar.
 */
const API_URL = (process.env.WA_API_URL ?? "").replace(/\/$/, "");
const API_KEY = process.env.WA_API_KEY ?? "";
const CLIENT_ID = process.env.WA_CLIENT_ID ?? "";

export function whatsappEnabled(): boolean {
  return !!(API_URL && API_KEY && CLIENT_ID);
}

export function whatsappClientId(): string {
  return CLIENT_ID;
}

export type WhatsappResult =
  | { ok: true }
  // permanent: no tiene sentido reintentar (número sin WhatsApp).
  | { ok: false; error: string; permanent: boolean };

export async function sendWhatsapp(phone: string, message: string): Promise<WhatsappResult> {
  if (!whatsappEnabled()) return { ok: false, error: "disabled", permanent: false };
  try {
    const res = await fetch(`${API_URL}/api/send`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": API_KEY },
      body: JSON.stringify({ clientId: CLIENT_ID, phone, message, checkExists: true }),
      // checkExists (10 s) + envío (30 s) del lado del gateway.
      signal: AbortSignal.timeout(45_000),
    });
    if (res.ok) return { ok: true };
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    const error = data.error ?? `http_${res.status}`;
    return { ok: false, error, permanent: error === "not_on_whatsapp" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "network_error", permanent: false };
  }
}

/**
 * Normaliza un teléfono libre ("300 123 4567", "+57 300…", "0057…") al formato
 * que espera el gateway: solo dígitos con indicativo, sin "+". Si el número no
 * trae indicativo se usa el del país del perfil (o WA_DEFAULT_COUNTRY, "CO").
 * null si no parece un número válido.
 */
export function toWhatsappNumber(phone: string, countryCode?: string | null): string | null {
  const raw = phone.trim();
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  if (!raw.startsWith("+")) {
    if (digits.startsWith("00")) {
      digits = digits.slice(2);
    } else {
      const cc =
        phoneCode(countryCode || process.env.WA_DEFAULT_COUNTRY || "CO") ?? "57";
      // Ya trae el indicativo si empieza por él y le sobran dígitos para un
      // número nacional (≥ 8); si no, es un número nacional.
      if (!(digits.startsWith(cc) && digits.length >= cc.length + 8)) {
        digits = cc + digits.replace(/^0+/, "");
      }
    }
  }
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}
