import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildIcsForDraft } from "@/server/integrations/ics";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const draft = await prisma.externalCalendarDraft.findUnique({ where: { id } });
  if (!draft) {
    return NextResponse.json({ error: "Entwurf nicht gefunden" }, { status: 404 });
  }

  const ics = buildIcsForDraft(draft);
  const filename = `nexo-${draft.title.replace(/[^\w\-]+/g, "-").slice(0, 40) || "termin"}.ics`;

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
