import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSessionToken,
  isAuthEnabled,
  SESSION_COOKIE,
  verifyAppPassword,
} from "@/lib/auth";

const bodySchema = z.object({
  password: z.string().min(1).max(256),
});

export async function POST(req: Request) {
  if (!isAuthEnabled()) {
    return NextResponse.json({
      ok: true,
      authRequired: false,
      message: "Auth ist deaktiviert (kein NEXO_AUTH_PASSWORD gesetzt).",
    });
  }

  const { password } = bodySchema.parse(await req.json());
  if (!(await verifyAppPassword(password))) {
    return NextResponse.json({ error: "Passwort ungültig." }, { status: 401 });
  }

  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true, authRequired: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
