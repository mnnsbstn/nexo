import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isWebPushConfigured } from "@/server/push/vapid-config";

const bodySchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(req: Request) {
  if (!isWebPushConfigured()) {
    return NextResponse.json({ error: "Web Push nicht konfiguriert." }, { status: 503 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültiges Abonnement." }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: parsed.data.endpoint },
    create: {
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
    },
    update: {
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const endpoint = url.searchParams.get("endpoint");
  if (endpoint) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  } else {
    await prisma.pushSubscription.deleteMany();
  }
  return NextResponse.json({ ok: true });
}
