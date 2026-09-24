import { NextResponse } from "next/server";
import { z } from "zod";
import {
  disconnectAllCalendars,
  disconnectCalendar,
} from "@/server/integrations/calendar-connection";
import type { CalendarProvider } from "@/server/integrations/calendar-provider";

const providerSchema = z.enum(["google", "microsoft", "icloud"]);

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const providerParam = url.searchParams.get("provider");
  if (!providerParam) {
    await disconnectAllCalendars();
    return NextResponse.json({ disconnected: true, scope: "all" });
  }
  const provider = providerSchema.parse(providerParam) as CalendarProvider;
  await disconnectCalendar(provider);
  return NextResponse.json({ disconnected: true, provider });
}
