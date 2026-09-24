import { NextResponse } from "next/server";
import { disconnectCalendar } from "@/server/integrations/calendar-connection";

export async function DELETE() {
  await disconnectCalendar();
  return NextResponse.json({ disconnected: true });
}
