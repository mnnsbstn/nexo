"use client";

import { useCallback, useEffect, useState } from "react";

type Task = { id: string; title: string; status: string; priority: string | null };
type Priority = {
  taskId: string;
  title: string;
  reason: string;
  suggested: true;
  userPriority: string | null;
};

export function TodayView() {
  const [data, setData] = useState<{
    today: string;
    dueToday: Task[];
    overdue: Task[];
    dueSoon: Task[];
    noDate: Task[];
    priorities: Priority[];
    briefing: { content: string; generatedAtLabel: string } | null;
    dueLabels: Record<string, string>;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/today");
    setData(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function refreshBriefing() {
    setRefreshing(true);
    await fetch("/api/briefing/refresh", { method: "POST" });
    await load();
    setRefreshing(false);
  }

  if (!data) return <p className="text-stone-500">Lade…</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Heute</h1>
        <p className="text-sm text-stone-600 mt-1">{data.today} · Europe/Berlin</p>
      </div>

      <section className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium">Briefing</h2>
          <button
            type="button"
            onClick={refreshBriefing}
            disabled={refreshing}
            className="text-sm px-3 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-50 disabled:opacity-50"
          >
            {refreshing ? "Aktualisiere…" : "Briefing aktualisieren"}
          </button>
        </div>
        {data.briefing ? (
          <>
            <p className="text-xs text-stone-500">Erstellt: {data.briefing.generatedAtLabel}</p>
            <pre className="text-sm whitespace-pre-wrap font-sans text-stone-800">{data.briefing.content}</pre>
          </>
        ) : (
          <p className="text-sm text-stone-500">
            Noch kein Briefing — tippe auf „Briefing aktualisieren“, um eines aus deinen Nexo-Daten zu
            erzeugen.
          </p>
        )}
      </section>

      <TaskSection title="Überfällig" tasks={data.overdue} dueLabels={data.dueLabels} empty="Nichts überfällig." />
      <TaskSection title="Heute fällig" tasks={data.dueToday} dueLabels={data.dueLabels} empty="Heute nichts datiert." />
      <TaskSection
        title="Demnächst (7 Tage)"
        tasks={data.dueSoon ?? []}
        dueLabels={data.dueLabels}
        empty="Keine anstehenden Termine in den nächsten 7 Tagen."
      />

      <section>
        <h2 className="font-medium mb-2">Vorgeschlagene Prioritäten</h2>
        {data.priorities.length === 0 ? (
          <p className="text-sm text-stone-500">Keine Vorschläge — setze Fälligkeiten oder Prioritäten.</p>
        ) : (
          <ul className="space-y-2">
            {data.priorities.map((p) => (
              <li key={p.taskId} className="bg-teal-50/50 border border-teal-100 rounded-xl p-3 text-sm">
                <span className="text-xs text-teal-800 font-medium uppercase mr-2">Vorschlag</span>
                {p.title}
                <p className="text-stone-600 mt-1">{p.reason}</p>
                {p.userPriority && (
                  <p className="text-xs text-stone-500 mt-1">Deine Priorität: {p.userPriority}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <TaskSection
        title="Ohne Datum"
        tasks={data.noDate}
        dueLabels={data.dueLabels}
        empty="Keine offenen Aufgaben ohne Datum."
      />
    </div>
  );
}

function TaskSection({
  title,
  tasks,
  dueLabels,
  empty,
}: {
  title: string;
  tasks: Task[];
  dueLabels: Record<string, string>;
  empty: string;
}) {
  return (
    <section>
      <h2 className="font-medium mb-2">{title}</h2>
      {tasks.length === 0 ? (
        <p className="text-sm text-stone-500">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li key={t.id} className="bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm flex justify-between gap-2">
              <span>{t.title}</span>
              <span className="text-stone-500 shrink-0">{dueLabels[t.id]}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
