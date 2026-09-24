import Link from "next/link";
import { buildDueReminderSummary, hasDueReminders } from "@/lib/due-reminders";

type Task = { title: string };

export function DueReminderBanner({
  overdue,
  dueToday,
}: {
  overdue: Task[];
  dueToday: Task[];
}) {
  if (!hasDueReminders(overdue, dueToday)) return null;

  const { headline, detail } = buildDueReminderSummary(overdue, dueToday);

  return (
    <section
      className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-stone-800"
      aria-live="polite"
    >
      <p className="font-medium text-amber-950">Erinnerung (nur in Nexo geöffnet)</p>
      <p className="mt-1">{headline}</p>
      {detail && <p className="mt-1 text-stone-700">{detail}</p>}
      <p className="mt-2 text-xs text-stone-600">
        Keine E-Mail, kein Hintergrund-Push — nur diese Hinweiszeile auf Heute. Browser-Hinweise
        optional unter{" "}
        <Link href="/einstellungen" className="text-teal-800 underline">
          Einstellungen
        </Link>
        .
      </p>
    </section>
  );
}
