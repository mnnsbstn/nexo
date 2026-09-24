"use client";

import { useState } from "react";
import { actionStatusLabels } from "@/lib/action-labels";

export type ProposalClient = {
  id: string;
  actionType: string;
  summary: string;
  affectedData: string;
  scope: string;
  status: string;
  payload: unknown;
  errorMessage?: string | null;
  createdAt: string;
};

export function ActionConfirmationCard({
  proposal,
  onUpdated,
}: {
  proposal: ProposalClient;
  onUpdated: () => void;
}) {
  const [loading, setLoading] = useState<"confirm" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canAct = proposal.status === "awaiting_confirmation" || proposal.status === "proposed";

  async function confirm() {
    setLoading("confirm");
    setError(null);
    try {
      const res = await fetch(`/api/actions/${proposal.id}/confirm`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Fehler");
      }
      onUpdated();
    } catch {
      setError("Netzwerkfehler");
      onUpdated();
    } finally {
      setLoading(null);
    }
  }

  async function reject() {
    setLoading("reject");
    setError(null);
    try {
      await fetch(`/api/actions/${proposal.id}/reject`, { method: "POST" });
      onUpdated();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="border border-stone-200 rounded-xl bg-white p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-stone-500">Aktion</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100">
          {actionStatusLabels[proposal.status] ?? proposal.status}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-800">
          {proposal.scope === "local" ? "Nur lokal in Nexo" : "Extern"}
        </span>
      </div>
      <p className="font-medium text-stone-900">{proposal.summary}</p>
      <div className="text-sm text-stone-600 space-y-1">
        <p>
          <span className="text-stone-500">Betroffen: </span>
          {proposal.affectedData}
        </p>
        <pre className="text-xs bg-stone-50 rounded-lg p-2 overflow-x-auto">
          {JSON.stringify(proposal.payload, null, 2)}
        </pre>
      </div>
      {(error || proposal.errorMessage) && (
        <p className="text-sm text-red-700" role="alert">
          {error || proposal.errorMessage}
        </p>
      )}
      {canAct && (
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={confirm}
            disabled={loading !== null}
            className="px-4 py-2 rounded-lg bg-teal-700 text-white text-sm font-medium hover:bg-teal-800 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600"
          >
            {loading === "confirm" ? "Ausführen…" : "Bestätigen"}
          </button>
          <button
            type="button"
            onClick={reject}
            disabled={loading !== null}
            className="px-4 py-2 rounded-lg border border-stone-300 text-sm hover:bg-stone-50 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600"
          >
            Ablehnen
          </button>
        </div>
      )}
      {proposal.status === "succeeded" && (
        <p className="text-sm text-teal-800">Ausführung abgeschlossen.</p>
      )}
    </div>
  );
}
