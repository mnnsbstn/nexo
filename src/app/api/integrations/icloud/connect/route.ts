import { NextResponse } from "next/server";
import { z } from "zod";
import { connectICloud } from "@/server/integrations/icloud-connect";

const bodySchema = z.object({
  appleId: z.string().email("Gültige Apple-ID (E-Mail) erforderlich."),
  appPassword: z.string().min(8, "App-spezifisches Passwort erforderlich."),
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
    const result = await connectICloud({
      appleId: parsed.data.appleId.trim(),
      appPassword: parsed.data.appPassword.trim(),
    });
    return NextResponse.json({
      ok: true,
      appleId: result.appleId,
      message: "iCloud Kalender und Mail verbunden.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "iCloud-Verbindung fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
