"use client";

import { useEffect, useState } from "react";
import { buildDuePayload, taskToDateTimeFields } from "@/lib/task-form";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  dueDate: string | null;
  dueAt: string | null;
};

type TaskFormState = {
  title: string;
  description: string;
  priority: string;
  dueDate: string;
  dueTime: string;
};

const emptyForm: TaskFormState = {
  title: "",
  description: "",
  priority: "",
  dueDate: "",
  dueTime: "",
};

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [form, setForm] = useState<TaskFormState>(emptyForm);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState<TaskFormState>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/tasks");
    const data = await res.json();
    setTasks(data.tasks);
  }

  useEffect(() => {
    load();
  }, []);

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    const due = buildDuePayload(form.dueDate, form.dueTime);
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title.trim(),
        description: form.description || undefined,
        priority: form.priority || undefined,
        dueDate: due.dueDate ?? undefined,
        dueAt: due.dueAt ?? undefined,
      }),
    });
    setForm(emptyForm);
    setSaving(false);
    load();
  }

  function openEdit(task: Task) {
    const { dueDate, dueTime } = taskToDateTimeFields(task);
    setEditTask(task);
    setEditForm({
      title: task.title,
      description: task.description ?? "",
      priority: task.priority ?? "",
      dueDate,
      dueTime,
    });
    setEditError(null);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTask || !editForm.title.trim()) return;
    setEditSaving(true);
    setEditError(null);
    const due = buildDuePayload(editForm.dueDate, editForm.dueTime);
    const res = await fetch(`/api/tasks/${editTask.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editForm.title.trim(),
        description: editForm.description.trim() || null,
        priority: editForm.priority || null,
        dueDate: due.dueDate,
        dueAt: due.dueAt,
      }),
    });
    setEditSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setEditError(data.error ?? "Speichern fehlgeschlagen.");
      return;
    }
    setEditTask(null);
    load();
  }

  async function toggleDone(task: Task) {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: task.status === "done" ? "open" : "done" }),
    });
    load();
  }

  async function confirmDelete() {
    if (!deleteId) return;
    await fetch(`/api/tasks/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Aufgaben</h1>
        <p className="text-sm text-stone-600 mt-1">
          Fälligkeiten sind Hinweise in Nexo — keine Push-Erinnerungen bei geschlossener App.
        </p>
      </div>

      <form onSubmit={createTask} className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
        <h2 className="font-medium">Neue Aufgabe</h2>
        <TaskFields form={form} setForm={setForm} idPrefix="new" />
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-teal-700 text-white text-sm font-medium hover:bg-teal-800 disabled:opacity-50"
        >
          Speichern
        </button>
      </form>

      <ul className="space-y-2">
        {tasks.map((t) => (
          <li
            key={t.id}
            className="bg-white border border-stone-200 rounded-xl p-4 flex flex-wrap gap-3 items-start justify-between"
          >
            <div>
              <p className={`font-medium ${t.status === "done" ? "line-through text-stone-400" : ""}`}>
                {t.title}
              </p>
              {t.description && <p className="text-sm text-stone-600 mt-1">{t.description}</p>}
              <p className="text-xs text-stone-500 mt-2">
                {t.priority && `Priorität: ${t.priority} · `}
                {t.dueAt
                  ? `Fällig: ${new Date(t.dueAt).toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}`
                  : t.dueDate
                    ? `Datum: ${t.dueDate}`
                    : "Ohne Datum"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openEdit(t)}
                className="text-sm px-3 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-50"
              >
                Bearbeiten
              </button>
              <button
                type="button"
                onClick={() => toggleDone(t)}
                className="text-sm px-3 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-50"
              >
                {t.status === "done" ? "Wieder öffnen" : "Erledigt"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteId(t.id)}
                className="text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-800 hover:bg-red-50"
              >
                Löschen
              </button>
            </div>
          </li>
        ))}
      </ul>

      {editTask && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={saveEdit}
            className="bg-white rounded-xl p-6 max-w-md w-full space-y-4 shadow-lg max-h-[90vh] overflow-y-auto"
          >
            <h2 className="font-medium text-lg">Aufgabe bearbeiten</h2>
            <TaskFields form={editForm} setForm={setEditForm} idPrefix="edit" />
            <p className="text-xs text-stone-500">
              Datum leer lassen = kein Fälligkeitstermin. Uhrzeit optional (sonst nur Datum).
            </p>
            {editError && (
              <p className="text-sm text-red-700" role="alert">
                {editError}
              </p>
            )}
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setEditTask(null)}
                className="px-3 py-2 text-sm border rounded-lg"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={editSaving}
                className="px-4 py-2 text-sm bg-teal-700 text-white rounded-lg disabled:opacity-50"
              >
                {editSaving ? "Speichern…" : "Änderungen speichern"}
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full space-y-4 shadow-lg">
            <p className="font-medium">Aufgabe wirklich löschen?</p>
            <p className="text-sm text-stone-600">Diese Aktion kann nicht rückgängig gemacht werden.</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setDeleteId(null)} className="px-3 py-2 text-sm border rounded-lg">
                Abbrechen
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-3 py-2 text-sm bg-red-700 text-white rounded-lg"
              >
                Löschen bestätigen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskFields({
  form,
  setForm,
  idPrefix,
}: {
  form: TaskFormState;
  setForm: (f: TaskFormState) => void;
  idPrefix: string;
}) {
  return (
    <>
      <label className="block text-sm">
        Titel
        <input
          required
          id={`${idPrefix}-title`}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm">
        Beschreibung
        <textarea
          id={`${idPrefix}-desc`}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 text-sm"
          rows={2}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <select
          value={form.priority}
          onChange={(e) => setForm({ ...form, priority: e.target.value })}
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
          aria-label="Priorität"
        >
          <option value="">Priorität</option>
          <option value="low">Niedrig</option>
          <option value="medium">Mittel</option>
          <option value="high">Hoch</option>
        </select>
        <input
          type="date"
          value={form.dueDate}
          onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
          aria-label="Fälligkeitsdatum"
        />
        <input
          type="time"
          value={form.dueTime}
          onChange={(e) => setForm({ ...form, dueTime: e.target.value })}
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
          aria-label="Uhrzeit"
        />
      </div>
    </>
  );
}
