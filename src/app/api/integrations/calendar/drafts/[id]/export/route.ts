import { NextResponse } from "next/server";
import { exportDraftToGoogle } from "@/server/integrations/google-calendar-export";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  const result = await exportDraftToGoogle(id);
  return NextResponse.json(result);
}
