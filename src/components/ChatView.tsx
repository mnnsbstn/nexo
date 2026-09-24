"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActionConfirmationCard,
  type ProposalClient,
} from "@/components/ActionConfirmationCard";

type Message = {
  id: string;
  role: string;
  content: string;
  metadata?: { proposalIds?: string[]; demo?: boolean } | null;
  createdAt: string;
};

export function ChatView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [proposals, setProposals] = useState<ProposalClient[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/chat");
    const data = await res.json();
    setConversationId(data.conversationId);
    setMessages(data.messages);
    setProposals(data.pendingProposals ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, proposals]);

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
      if (data.proposals?.length) {
        setProposals((prev) => {
          const ids = new Set(prev.map((p) => p.id));
          const merged = [...prev];
          for (const p of data.proposals as ProposalClient[]) {
            if (!ids.has(p.id)) merged.push(p);
          }
          return merged;
        });
      }
    } catch {
      setError("Netzwerkfehler — bitte erneut versuchen.");
      setInput(content);
    } finally {
      setLoading(false);
    }
  }

  async function refreshProposals() {
    const [chatRes, actRes] = await Promise.all([
      fetch("/api/chat"),
      fetch("/api/actions/recent"),
    ]);
    const chat = await chatRes.json();
    const act = await actRes.json();
    setMessages(chat.messages);
    const pending = (act.actions as ProposalClient[]).filter((a) =>
      ["awaiting_confirmation", "executing", "succeeded", "failed", "rejected"].includes(
        a.status,
      ),
    );
    setProposals(pending.slice(0, 15));
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)]">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Chat</h1>
        <p className="text-sm text-stone-600 mt-1">
          Zentraleingang für Nexo. Schreibende Änderungen brauchen deine Bestätigung. Chat und
          Gedächtnis sind getrennt — Erinnerungen bleiben beim Löschen des Chats erhalten (Chat-Löschung
          folgt später).
        </p>
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
        {proposals.length > 0 && (
          <div className="space-y-3 pt-2">
            <h2 className="text-sm font-medium text-stone-700">Freigaben & Aktivitäten</h2>
            {proposals.map((p) => (
              <ActionConfirmationCard key={p.id} proposal={p} onUpdated={refreshProposals} />
            ))}
          </div>
        )}
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
