import { NextResponse } from "next/server";
import { disconnectICloud } from "@/server/integrations/icloud-connect";

export async function DELETE() {
  await disconnectICloud();
  return NextResponse.json({ disconnected: true });
}
