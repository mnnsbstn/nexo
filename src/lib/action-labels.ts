export const actionTypeLabels: Record<string, string> = {
  create_task: "Aufgabe anlegen",
  update_task: "Aufgabe ändern",
  delete_task: "Aufgabe löschen",
  create_memory: "Erinnerung speichern",
  update_memory: "Erinnerung ändern",
  delete_memory: "Erinnerung löschen",
  save_day_plan: "Tagesplan speichern",
  external_calendar_draft: "Kalender-Entwurf",
  external_email_draft: "E-Mail-Entwurf",
};

export function proposalScopeLabel(scope: string, actionType: string): string {
  if (actionType === "external_calendar_draft") {
    return "Kalender · Freigabe, Export wenn verbunden";
  }
  if (actionType === "external_email_draft") {
    return "E-Mail · Freigabe, kein Versand (Beta)";
  }
  return scope === "local" ? "Nur lokal in Nexo" : "Extern";
}

export const actionStatusLabels: Record<string, string> = {
  proposed: "Vorgeschlagen",
  awaiting_confirmation: "Wartet auf Bestätigung",
  executing: "Wird ausgeführt",
  succeeded: "Erfolgreich",
  failed: "Fehlgeschlagen",
  rejected: "Abgelehnt",
};

export type ActionFilter = "all" | "open" | "done" | "failed";

export function statusesForFilter(filter: ActionFilter): string[] | null {
  switch (filter) {
    case "open":
      return ["proposed", "awaiting_confirmation", "executing"];
    case "done":
      return ["succeeded"];
    case "failed":
      return ["failed", "rejected"];
    default:
      return null;
  }
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case "succeeded":
      return "bg-teal-50 text-teal-900";
    case "failed":
      return "bg-red-50 text-red-900";
    case "rejected":
      return "bg-stone-100 text-stone-700";
    case "awaiting_confirmation":
    case "proposed":
      return "bg-amber-50 text-amber-900";
    case "executing":
      return "bg-blue-50 text-blue-900";
    default:
      return "bg-stone-100 text-stone-700";
  }
}
