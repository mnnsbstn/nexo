import { NextResponse } from "next/server";
import { z } from "zod";
import { connectCalDav } from "@/server/integrations/caldav-connect";

const bodySchema = z.object({
  serverUrl: z.string().url("Gültige CalDAV-Server-URL erforderlich."),
  username: z.string().min(1, "Benutzername erforderlich."),
  password: z.string().min(1, "Passwort erforderlich."),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join(" ") },
      { status: 400 },
    );
  }

  try {
    const result = await connectCalDav(parsed.data);
    return NextResponse.json({
      ok: true,
      username: result.username,
      message: "CalDAV-Kalender verbunden.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "CalDAV-Verbindung fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
