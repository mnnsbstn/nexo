import { NextResponse } from "next/server";
import { exportDraftToExternalCalendar } from "@/server/integrations/calendar-export";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  const result = await exportDraftToExternalCalendar(id);
  return NextResponse.json(result);
}
