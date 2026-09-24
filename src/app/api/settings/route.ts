import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, ensureDefaultSettings } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({ settings });
}

const patchSchema = z.object({
  uiLanguage: z.string().min(2).max(10).optional(),
  responseLanguage: z.string().min(2).max(10).optional(),
  timezone: z.string().min(3).max(64).optional(),
});

export async function PATCH(req: Request) {
  await ensureDefaultSettings();
  const data = patchSchema.parse(await req.json());
  const updated = await prisma.userSettings.update({
    where: { id: "default" },
    data,
  });
  return NextResponse.json({
    settings: {
      uiLanguage: updated.uiLanguage,
      responseLanguage: updated.responseLanguage,
      timezone: updated.timezone,
    },
  });
}
