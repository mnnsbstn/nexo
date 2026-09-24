import { NextResponse } from "next/server";
import { sendDueTaskWebPushIfNeeded } from "@/server/push/send-due-push";

export async function POST() {
  const result = await sendDueTaskWebPushIfNeeded();
  return NextResponse.json(result);
}
