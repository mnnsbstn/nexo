"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  actionStatusLabels,
  statusBadgeClass,
  type ActionFilter,
} from "@/lib/action-labels";
import {
  ActionConfirmationCard,
  type ProposalClient,
} from "@/components/ActionConfirmationCard";

const filters: { id: ActionFilter; label: string }[] = [
  { id: "all", label: "Alle" },
  { id: "open", label: "Offen" },
  { id: "done", label: "Erfolgreich" },
  { id: "failed", label: "Fehlgeschlagen / Abgelehnt" },
];

const OPEN = new Set(["proposed", "awaiting_confirmation", "executing"]);

type ActivityFeedProps = {
  compact?: boolean;
  showHeuteLink?: boolean;
  refreshToken?: number;
  onPendingChange?: () => void;
};

export function ActivityFeed({
  compact = false,
  showHeuteLink = false,
  refreshToken = 0,
  onPendingChange,
}: ActivityFeedProps) {
  const [filter, setFilter] = useState<ActionFilter>("all");
  const [actions, setActions] = useState<ProposalClient[]>([]);
  const [loading, setLoading] = useState(true);

  const effectiveFilter = compact ? "all" : filter;

  const load = useCallback(async () => {
    setLoading(true);
    const limit = compact ? 10 : 40;
    const res = await fetch(
      `/api/actions/recent?filter=${effectiveFilter}&limit=${limit}`,
    );
    const data = await res.json();
    setActions(data.actions ?? []);
    setLoading(false);
  }, [effectiveFilter, compact]);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  function handleUpdated() {
    load();
    onPendingChange?.();
  }

  const openActions = actions.filter((a) => OPEN.has(a.status));
  const historyActions = actions.filter((a) => !OPEN.has(a.status));

  return (
    <section className={compact ? "space-y-3" : "space-y-4"} id={compact ? undefined : "aktivitaeten"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={compact ? "text-sm font-medium text-stone-700" : "font-medium text-lg"}>
          {compact ? "Freigaben & Aktivitäten" : "Aktivitäten & Freigaben"}
        </h2>
        {showHeuteLink && (
          <Link href="/heute#aktivitaeten" className="text-sm text-teal-800 underline">
            Alle auf Heute
          </Link>
        )}
      </div>

      {!compact && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Aktivitäten filtern">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                filter === f.id
                  ? "bg-teal-700 text-white border-teal-700"
                  : "border-stone-300 text-stone-600 hover:bg-stone-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {loading && <p className="text-sm text-stone-500">Lade…</p>}

      {!loading && openActions.length > 0 && (
        <div className="space-y-2">
          {openActions.map((p) => (
            <ActionConfirmationCard key={p.id} proposal={p} onUpdated={handleUpdated} />
          ))}
        </div>
      )}

      {!loading && historyActions.length > 0 && (
        <ul className="space-y-2">
          {historyActions.map((a) => (
            <li
              key={a.id}
              className="bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm space-y-1"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${statusBadgeClass(a.status)}`}
                >
                  {actionStatusLabels[a.status] ?? a.status}
                </span>
                <span className="text-xs text-stone-500">
                  {a.scope === "local" ? "Nur lokal" : "Extern"} ·{" "}
                  {new Date(a.createdAt).toLocaleString("de-DE", {
                    timeZone: "Europe/Berlin",
                  })}
                </span>
              </div>
              <p className="font-medium text-stone-900">{a.summary}</p>
              <p className="text-stone-600 text-xs line-clamp-2">{a.affectedData}</p>
              {a.errorMessage && <p className="text-red-700 text-xs">{a.errorMessage}</p>}
            </li>
          ))}
        </ul>
      )}

      {!loading && actions.length === 0 && (
        <p className="text-sm text-stone-500">Noch keine Aktivitäten in diesem Filter.</p>
      )}
    </section>
  );
}
