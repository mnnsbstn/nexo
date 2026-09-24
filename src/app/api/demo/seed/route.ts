import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Loads clearly labeled demo sample data — not mixed with user data silently. */
export async function POST() {
  await prisma.task.createMany({
    data: [
      {
        title: "[Demo] Wochenplanung durchgehen",
        description: "Beispielaufgabe aus Demo-Daten",
        priority: "medium",
        status: "open",
      },
      {
        title: "[Demo] Rückmeldung an Team",
        priority: "high",
        status: "open",
      },
    ],
  });
  await prisma.memory.create({
    data: {
      content: "[Demo] Kurze Antworten bevorzugt",
      category: "preference",
      source: "demo_seed",
    },
  });
  return NextResponse.json({
    ok: true,
    message: "Demo-Beispieldaten wurden hinzugefügt (mit [Demo]-Präfix).",
  });
}
