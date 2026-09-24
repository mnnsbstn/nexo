import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import {
  getEmailIntegrationStatus,
  listEmailDrafts,
  parseRecipientsJson,
} from "@/server/integrations/email";
import { formatInTimeZone } from "date-fns-tz";
import { de } from "date-fns/locale";

export async function GET() {
  const settings = await getSettings();
  const status = await getEmailIntegrationStatus(settings);
  const drafts = await listEmailDrafts(15);

  return NextResponse.json({
    ...status,
    drafts: drafts.map((d) => ({
      id: d.id,
      subject: d.subject,
      to: parseRecipientsJson(d.toJson),
      cc: d.ccJson ? parseRecipientsJson(d.ccJson) : [],
      status: d.status,
      savedNote: d.savedNote,
      sendError: d.sendError,
      sentAt: d.sentAt?.toISOString() ?? null,
      preview: d.body.slice(0, 120) + (d.body.length > 120 ? "…" : ""),
      createdLabel: formatInTimeZone(d.createdAt, settings.timezone, "d. MMM yyyy, HH:mm", {
        locale: de,
      }),
    })),
  });
}
