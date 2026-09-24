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

type ConflictPayload = {
  error: string;
  message: string;
  conflicts: Memory[];
};

export function MemoryView() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [query, setQuery] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("note");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editMemory, setEditMemory] = useState<Memory | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("note");
  const [conflicts, setConflicts] = useState<Memory[]>([]);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [pendingAck, setPendingAck] = useState<"create" | "edit" | null>(null);
  const [saving, setSaving] = useState(false);

  async function load(q?: string) {
    const res = await fetch(`/api/memories?q=${encodeURIComponent(q ?? query)}`);
    const data = await res.json();
    setMemories(data.memories);
  }

  useEffect(() => {
    void load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  async function submitCreate(acknowledgeConflicts = false) {
    if (!content.trim()) return;
    setSaving(true);
    setConflictMessage(null);
    setConflicts([]);
    const res = await fetch("/api/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: content.trim(),
        category,
        acknowledgeConflicts,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.status === 409 && data.error === "conflicts") {
      const c = data as ConflictPayload;
      setConflicts(c.conflicts);
      setConflictMessage(c.message);
      setPendingAck("create");
      return;
    }
    if (!res.ok) {
      setConflictMessage(data.error ?? "Speichern fehlgeschlagen.");
      return;
    }
    setContent("");
    setPendingAck(null);
    load();
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await submitCreate(false);
  }

  function openEdit(m: Memory) {
    setEditMemory(m);
    setEditContent(m.content);
    setEditCategory(m.category);
    setConflicts([]);
    setConflictMessage(null);
    setPendingAck(null);
  }

  async function saveEdit(acknowledgeConflicts = false) {
    if (!editMemory || !editContent.trim()) return;
    setSaving(true);
    setConflictMessage(null);
    setConflicts([]);
    const res = await fetch(`/api/memories/${editMemory.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: editContent.trim(),
        category: editCategory,
        acknowledgeConflicts,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.status === 409 && data.error === "conflicts") {
      const c = data as ConflictPayload;
      setConflicts(c.conflicts);
      setConflictMessage(c.message);
      setPendingAck("edit");
      return;
    }
    if (!res.ok) {
      setConflictMessage(data.error ?? "Speichern fehlgeschlagen.");
      return;
    }
    setEditMemory(null);
    setPendingAck(null);
    load();
  }

  async function confirmDespiteConflicts() {
    if (pendingAck === "create") await submitCreate(true);
    if (pendingAck === "edit") await saveEdit(true);
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
          Nur explizit gespeicherte Informationen — getrennt vom Chat. Widersprüchliche Hinweise werden
          nicht still überschrieben; du entscheidest, ob mehrere Versionen parallel bleiben.
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
        <CategorySelect value={category} onChange={setCategory} />
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-teal-700 text-white text-sm disabled:opacity-50"
        >
          Speichern
        </button>
      </form>

      <ConflictPanel
        conflicts={pendingAck === "create" ? conflicts : []}
        message={pendingAck === "create" ? conflictMessage : null}
        onConfirm={confirmDespiteConflicts}
        onCancel={() => {
          setPendingAck(null);
          setConflicts([]);
          setConflictMessage(null);
        }}
        saving={saving}
      />

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
              {categoryLabel(m.category)} · Quelle: {m.source} ·{" "}
              {new Date(m.createdAt).toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}
              {m.updatedAt !== m.createdAt && " · bearbeitet"}
            </p>
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => openEdit(m)}
                className="text-sm text-teal-800 underline"
              >
                Bearbeiten
              </button>
              <button
                type="button"
                onClick={() => setDeleteId(m.id)}
                className="text-sm text-red-800 underline"
              >
                Löschen
              </button>
            </div>
          </li>
        ))}
      </ul>

      {editMemory && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full space-y-4 shadow-lg max-h-[90vh] overflow-y-auto">
            <h2 className="font-medium text-lg">Erinnerung bearbeiten</h2>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm"
              rows={4}
            />
            <CategorySelect value={editCategory} onChange={setEditCategory} />
            <ConflictPanel
              conflicts={pendingAck === "edit" ? conflicts : []}
              message={pendingAck === "edit" ? conflictMessage : null}
              onConfirm={confirmDespiteConflicts}
              onCancel={() => {
                setPendingAck(null);
                setConflicts([]);
                setConflictMessage(null);
              }}
              saving={saving}
            />
            {conflictMessage && pendingAck !== "edit" && (
              <p className="text-sm text-red-700">{conflictMessage}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setEditMemory(null)}
                className="px-3 py-2 text-sm border rounded-lg"
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => saveEdit(false)}
                className="px-4 py-2 text-sm bg-teal-700 text-white rounded-lg disabled:opacity-50"
              >
                {saving ? "Speichern…" : "Änderungen speichern"}
              </button>
            </div>
          </div>
        </div>
      )}

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

function categoryLabel(category: string) {
  switch (category) {
    case "preference":
      return "Präferenz";
    case "workflow":
      return "Arbeitsweise";
    default:
      return "Notiz";
  }
}

function CategorySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
      aria-label="Kategorie"
    >
      <option value="note">Notiz</option>
      <option value="preference">Präferenz</option>
      <option value="workflow">Arbeitsweise</option>
    </select>
  );
}

function ConflictPanel({
  conflicts,
  message,
  onConfirm,
  onCancel,
  saving,
}: {
  conflicts: Memory[];
  message: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  if (!conflicts.length || !message) return null;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2 text-sm">
      <p className="font-medium text-amber-950">{message}</p>
      <ul className="space-y-2">
        {conflicts.map((c) => (
          <li key={c.id} className="bg-white/80 rounded-md px-2 py-1.5 text-stone-800">
            {c.content}
            <span className="block text-xs text-stone-500 mt-0.5">
              {categoryLabel(c.category)} · {c.source}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-stone-600">
        Nexo behält beide Einträge, wenn du bestätigst — nichts wird automatisch ersetzt.
      </p>
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onConfirm}
          disabled={saving}
          className="px-3 py-1.5 rounded-lg bg-teal-700 text-white text-xs disabled:opacity-50"
        >
          Trotzdem speichern
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg border text-xs">
          Zurück & anpassen
        </button>
      </div>
    </div>
  );
}
