import { NextResponse } from "next/server";
import { getSessionFromRequest, isAuthEnabled } from "@/lib/auth";

export async function GET(req: Request) {
  const authRequired = isAuthEnabled();
  return NextResponse.json({
    authRequired,
    authenticated: await getSessionFromRequest(req),
  });
}
