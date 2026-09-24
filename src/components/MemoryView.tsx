"use client";

import { useEffect, useState } from "react";

type Memory = {
  id: string;
  content: string;
  category: string;
  source: string;
  createdAt: string;
  updatedAt: string;
};

export function MemoryView() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [query, setQuery] = useState("");
  const [content, setContent] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load(q?: string) {
    const res = await fetch(`/api/memories?q=${encodeURIComponent(q ?? query)}`);
    const data = await res.json();
    setMemories(data.memories);
  }

  useEffect(() => {
    void load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    await fetch("/api/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.trim(), category: "note" }),
    });
    setContent("");
    load();
  }

  async function remove() {
    if (!deleteId) return;
    await fetch(`/api/memories/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Persönliches Gedächtnis</h1>
        <p className="text-sm text-stone-600 mt-1">
          Nur explizit gespeicherte Informationen — getrennt vom Chat. Herkunft und Zeitpunkt sind
          sichtbar. Gelöschte Erinnerungen werden nicht mehr verwendet.
        </p>
      </div>

      <form onSubmit={add} className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
        <h2 className="font-medium">Manuell speichern</h2>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm"
          rows={3}
          placeholder="Was soll Nexo sich merken?"
        />
        <button type="submit" className="px-4 py-2 rounded-lg bg-teal-700 text-white text-sm">
          Speichern
        </button>
      </form>

      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suche…"
          className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => load(query)}
          className="px-4 py-2 rounded-lg border border-stone-300 text-sm"
        >
          Suchen
        </button>
      </div>

      <ul className="space-y-3">
        {memories.length === 0 && (
          <li className="text-sm text-stone-500">Keine Erinnerungen — lege welche im Chat oder hier an.</li>
        )}
        {memories.map((m) => (
          <li key={m.id} className="bg-white border border-stone-200 rounded-xl p-4">
            <p className="text-stone-900">{m.content}</p>
            <p className="text-xs text-stone-500 mt-2">
              {m.category} · Quelle: {m.source} ·{" "}
              {new Date(m.createdAt).toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}
            </p>
            <button
              type="button"
              onClick={() => setDeleteId(m.id)}
              className="mt-2 text-sm text-red-800 underline"
            >
              Löschen
            </button>
          </li>
        ))}
      </ul>

      {deleteId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full space-y-4">
            <p className="font-medium">Erinnerung löschen?</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setDeleteId(null)} className="px-3 py-2 text-sm border rounded-lg">
                Abbrechen
              </button>
              <button type="button" onClick={remove} className="px-3 py-2 text-sm bg-red-700 text-white rounded-lg">
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
