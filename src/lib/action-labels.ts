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
