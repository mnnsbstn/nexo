import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { sendEmailDraft } from "@/server/integrations/email";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const settings = await getSettings();
  if (!settings.emailIntegrationEnabled) {
    return NextResponse.json(
      { error: "E-Mail-Entwürfe sind deaktiviert." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const result = await sendEmailDraft(id);
  return NextResponse.json(result, { status: result.sent ? 200 : 400 });
}
