"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { sendMessageAction, type SentMessage } from "../actions";

const POLL_MS = 4000;

export function ChatThread({
  conversationId,
  meId,
  initialMessages,
}: {
  conversationId: string;
  meId: string;
  initialMessages: SentMessage[];
}) {
  const [messages, setMessages] = useState<SentMessage[]>(initialMessages);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastAtRef = useRef(
    initialMessages.length > 0
      ? initialMessages[initialMessages.length - 1].createdAt
      : new Date(0).toISOString()
  );

  function appendNew(incoming: SentMessage[]) {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      const known = new Set(prev.map((m) => m.id));
      const fresh = incoming.filter((m) => !known.has(m.id));
      if (fresh.length === 0) return prev;
      const next = [...prev, ...fresh];
      lastAtRef.current = next[next.length - 1].createdAt;
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/chat/${conversationId}/messages?after=${encodeURIComponent(lastAtRef.current)}`
        );
        if (!res.ok || cancelled) return;
        const data: { messages: SentMessage[] } = await res.json();
        appendNew(data.messages);
      } catch {
        // sin conexión: se reintenta en el próximo ciclo
      }
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function send() {
    const body = text.trim();
    if (!body || pending) return;
    startTransition(async () => {
      const res = await sendMessageAction(conversationId, body);
      if (res.message) {
        appendNew([res.message]);
        setText("");
      }
    });
  }

  return (
    <>
      <div className="flex-1 space-y-2 overflow-y-auto py-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-zinc-500">
            Escribe el primer mensaje. Mantén la conversación dentro de la
            plataforma para tu seguridad.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === meId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                  mine
                    ? "rounded-br-sm bg-fuchsia-600 text-white"
                    : "rounded-bl-sm border border-zinc-800 bg-zinc-900 text-zinc-100"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`mt-1 text-right text-[10px] ${mine ? "text-fuchsia-200" : "text-zinc-500"}`}>
                  {new Date(m.createdAt).toLocaleTimeString("es-CO", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 border-t border-zinc-800 pt-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Escribe un mensaje…"
          className="max-h-32 flex-1 resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-fuchsia-500"
        />
        <button
          onClick={send}
          disabled={pending || !text.trim()}
          className="rounded-xl bg-fuchsia-600 px-5 text-sm font-semibold text-white transition hover:bg-fuchsia-500 disabled:opacity-40"
        >
          Enviar
        </button>
      </div>
    </>
  );
}
