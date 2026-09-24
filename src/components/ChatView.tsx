"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityFeed } from "@/components/ActivityFeed";

type Message = {
  id: string;
  role: string;
  content: string;
  metadata?: { proposalIds?: string[]; demo?: boolean } | null;
  createdAt: string;
};

export function ChatView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [activityRefresh, setActivityRefresh] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/chat");
    const data = await res.json();
    setConversationId(data.conversationId);
    setMessages(data.messages);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activityRefresh]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || loading) return;
    setLoading(true);
    setError(null);
    const content = input.trim();
    setInput("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, conversationId: conversationId ?? undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Senden fehlgeschlagen");
        setInput(content);
        return;
      }
      setConversationId(data.conversationId);
      setMessages((prev) => [...prev, data.userMessage, data.assistantMessage]);
      setActivityRefresh((n) => n + 1);
    } catch {
      setError("Netzwerkfehler — bitte erneut versuchen.");
      setInput(content);
    } finally {
      setLoading(false);
    }
  }

  async function clearChat() {
    setClearing(true);
    setError(null);
    try {
      const res = await fetch("/api/chat/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversationId ?? undefined, confirm: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Chat konnte nicht geleert werden.");
        return;
      }
      setShowClearDialog(false);
      setMessages([]);
      setActivityRefresh((n) => n + 1);
      await load();
    } catch {
      setError("Netzwerkfehler beim Leeren des Chats.");
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Chat</h1>
          <p className="text-sm text-stone-600 mt-1 max-w-xl">
            Schreibende Änderungen brauchen deine Bestätigung. Der Chatverlauf ist getrennt vom
            persönlichen Gedächtnis — Erinnerungen, Aufgaben und erledigte Aktionen bleiben beim Leeren
            erhalten.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowClearDialog(true)}
          disabled={messages.length === 0}
          className="text-sm px-3 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Chatverlauf leeren
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 && (
          <p className="text-stone-500 text-sm">Noch keine Nachrichten. Starte mit einer Frage.</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
              m.role === "user"
                ? "ml-auto bg-teal-700 text-white"
                : "bg-white border border-stone-200 text-stone-800"
            }`}
          >
            {m.content}
          </div>
        ))}

        <ActivityFeed
          compact
          showHeuteLink
          refreshToken={activityRefresh}
          onPendingChange={() => setActivityRefresh((n) => n + 1)}
        />

        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="text-sm text-red-700 flex gap-2 items-center">
          {error}
          <button type="button" className="underline" onClick={() => send()}>
            Wiederholen
          </button>
        </div>
      )}

      {showClearDialog && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full space-y-4 shadow-lg">
            <h2 className="font-medium text-lg">Chatverlauf leeren?</h2>
            <ul className="text-sm text-stone-700 space-y-2 list-disc pl-5">
              <li>
                <strong>Wird entfernt:</strong> alle Nachrichten in diesem Chat
              </li>
              <li>
                <strong>Wird abgelehnt:</strong> offene Freigaben, die noch auf Bestätigung warten
              </li>
              <li>
                <strong>Bleibt erhalten:</strong> Aufgaben, Gedächtnis, bereits ausgeführte oder
                abgelehnte Aktionen (Historie unter Heute → Aktivitäten)
              </li>
            </ul>
            <p className="text-xs text-stone-500">
              Der Chatverlauf wird nicht ins Gedächtnis übernommen. Gelöschte Nachrichten können nicht
              wiederhergestellt werden.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowClearDialog(false)}
                className="px-3 py-2 text-sm border rounded-lg"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={clearChat}
                disabled={clearing}
                className="px-3 py-2 text-sm bg-red-700 text-white rounded-lg disabled:opacity-50"
              >
                {clearing ? "Leere…" : "Verlauf endgültig leeren"}
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={send} className="flex gap-2 items-end border-t border-stone-200 pt-3">
        <label className="sr-only" htmlFor="chat-input">
          Nachricht
        </label>
        <textarea
          id="chat-input"
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nachricht an Nexo…"
          className="flex-1 rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-teal-600 focus:ring-1 focus:ring-teal-600 resize-none"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2 rounded-xl bg-teal-700 text-white text-sm font-medium disabled:opacity-50 hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600"
        >
          {loading ? "…" : "Senden"}
        </button>
      </form>
    </div>
  );
}
