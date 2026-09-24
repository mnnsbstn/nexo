import { getDailyContext, searchMemories, listTasks } from "@/server/tools/read";
import { proposeAction } from "@/server/actions/propose";
import { parseGermanDuePhrase, formatDueDisplay } from "@/lib/dates";
import { getSettings } from "@/lib/settings";
import type { ActionPayload } from "@/server/schemas/actions";
import { buildDayPlanDraft, formatDayPlanPreview } from "@/server/daily/day-plan";

import type { LiveAgentMeta } from "@/server/agent/live-meta";

export type AgentTurnResult = {
  reply: string;
  proposalIds: string[];
  demo: boolean;
  liveMeta?: LiveAgentMeta;
};

export async function runDemoAgent(
  userMessage: string,
  ctx: { conversationId: string; messageId: string },
): Promise<AgentTurnResult> {
  const settings = await getSettings();
  const text = userMessage.trim();
  const lower = text.toLowerCase();
  const proposalIds: string[] = [];

  if (/was ist heute wichtig|heute wichtig|priorit/.test(lower)) {
    const daily = await getDailyContext();
    const lines = [
      "**Demo-Antwort** (regelbasiert, keine Live-KI)",
      "",
      "Basierend auf deinen gespeicherten Aufgaben in Nexo:",
    ];
    if (daily.priorities.length) {
      for (const p of daily.priorities) {
        lines.push(`• **${p.title}** — Vorschlag, weil: ${p.reason}`);
      }
    } else {
      lines.push("Keine priorisierten Vorschläge — lege Fälligkeiten oder Prioritäten fest.");
    }
    if (daily.overdue.length) {
      lines.push("", `Überfällig: ${daily.overdue.map((t) => t.title).join(", ")}`);
    }
    lines.push("", "_Kein externer Kalender verbunden._");
    return { reply: lines.join("\n"), proposalIds, demo: true };
  }

  if (/kalender|termin block|in (den|meinem) kalender|calendar/i.test(lower)) {
    if (!settings.calendarIntegrationEnabled) {
      return {
        reply:
          "**Demo-Antwort**\n\nKalender-Entwürfe sind **aus**. Unter **Einstellungen** „Kalender-Entwürfe (Beta)“ aktivieren — dann kann ich einen Termin-Entwurf vorschlagen (Freigabe nötig, **noch kein** Google/Outlook-Export).",
        proposalIds,
        demo: true,
      };
    }

    const titleMatch =
      /(?:termin|eintrag|event)[:\s]+(.+)/i.exec(text) || /kalender[:\s]+(.+)/i.exec(text);
    let title = titleMatch?.[1]?.trim() ?? "Termin";
    title = title.replace(/,?\s*(morgen|heute).*$/i, "").trim() || "Termin";

    const due = parseGermanDuePhrase(text, settings.timezone);
    const startAt = due?.dueAt ? new Date(due.dueAt) : new Date();
    if (!due?.dueAt) {
      startAt.setHours(10, 0, 0, 0);
    }
    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

    const payload: ActionPayload = {
      actionType: "external_calendar_draft",
      data: {
        title,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        timezone: settings.timezone,
      },
    };

    const whenLabel = due?.label ?? startAt.toLocaleString("de-DE", { timeZone: settings.timezone });
    const proposal = await proposeAction({
      conversationId: ctx.conversationId,
      triggerMessageId: ctx.messageId,
      payload,
      summary: `Kalender-Entwurf: ${title}`,
      affectedData: `Termin-Entwurf „${title}“ ab ${whenLabel} — wird lokal gespeichert, nicht im externen Kalender.`,
      scope: "external",
    });
    proposalIds.push(proposal.id);

    return {
      reply: [
        "**Demo-Antwort** — Kalender-Entwurf (Beta):",
        "",
        `**${title}** · ${whenLabel}`,
        "",
        "_Noch keine Verbindung zu Google/Outlook — nach Bestätigung nur ein Entwurf in Nexo._",
        "",
        "Bitte bestätige die Aktionskarte.",
      ].join("\n"),
      proposalIds,
      demo: true,
    };
  }

  if (/plane meinen tag|tagesplan/.test(lower)) {
    const draft = await buildDayPlanDraft();
    const preview = formatDayPlanPreview(draft);
    const payload: ActionPayload = {
      actionType: "save_day_plan",
      data: draft,
    };
    const proposal = await proposeAction({
      conversationId: ctx.conversationId,
      triggerMessageId: ctx.messageId,
      payload,
      summary: `Tagesplan für ${draft.planDate} speichern`,
      affectedData: preview,
      scope: "local",
    });
    proposalIds.push(proposal.id);

    const reply = [
      "**Demo-Antwort** — Tagesplan als Entwurf (nur Nexo, kein Kalender):",
      "",
      preview,
      "",
      "_Aufgaben werden erst durch separate Freigaben geändert._",
      "",
      "Bitte bestätige die Aktionskarte, um den Plan unter **Heute** zu speichern.",
    ].join("\n");
    return { reply, proposalIds, demo: true };
  }

  const taskCreate =
    /(?:erstell(?:e|en)?|neue)\s+(?:eine\s+)?aufgabe[:\s]+(.+)/i.exec(text) ||
    /aufgabe[:\s]+(.+)/i.exec(text);
  if (taskCreate) {
    let title = taskCreate[1].trim();
    title = title.replace(/,?\s*(morgen|heute).*$/i, "").trim();
    if (!title) title = "Neue Aufgabe";

    const due = parseGermanDuePhrase(text, settings.timezone);
    const payload: ActionPayload = {
      actionType: "create_task",
      data: {
        title,
        ...(due?.dueDate ? { dueDate: due.dueDate } : {}),
        ...(due?.dueAt ? { dueAt: due.dueAt.toISOString() } : {}),
      },
    };

    const affected = due?.label
      ? `Neue Aufgabe „${title}“, Fälligkeit: ${due.label}`
      : `Neue Aufgabe „${title}“ ohne Datum`;

    const proposal = await proposeAction({
      conversationId: ctx.conversationId,
      triggerMessageId: ctx.messageId,
      payload,
      summary: `Aufgabe anlegen: ${title}`,
      affectedData: affected,
      scope: "local",
    });
    proposalIds.push(proposal.id);

    let reply = `**Demo-Antwort**\n\nIch schlage vor, diese Aufgabe anzulegen:\n\n**${title}**`;
    if (due?.label) {
      reply += `\n\nGeplanter Fälligkeitszeitpunkt in Nexo: **${due.label}**`;
      reply +=
        "\n\n_Das ist ein gespeicherter Termin in der App — keine Push-Benachrichtigung._";
    }
    reply += "\n\nBitte bestätige die Aktionskarte unten.";
    return { reply, proposalIds, demo: true };
  }

  if (/merke dir|speicher.*(?:dass|mir)/i.test(text)) {
    const content =
      text.replace(/^.*?merke dir(?:,)?\s*(?:dass\s*)?/i, "").trim() ||
      text.replace(/^.*?speicher.*?\s*(?:dass\s*)?/i, "").trim();
    const payload: ActionPayload = {
      actionType: "create_memory",
      data: {
        content,
        category: /bevorzug|antwort|stil/i.test(content) ? "preference" : "note",
      },
    };
    const proposal = await proposeAction({
      conversationId: ctx.conversationId,
      triggerMessageId: ctx.messageId,
      payload,
      summary: "Erinnerung im persönlichen Gedächtnis speichern",
      affectedData: content,
      scope: "local",
    });
    proposalIds.push(proposal.id);
    return {
      reply:
        "**Demo-Antwort**\n\nIch kann das als **persönliche Erinnerung** speichern (getrennt vom Chatverlauf). Bitte bestätige die Karte — ohne Bestätigung speichere ich nichts.",
      proposalIds,
      demo: true,
    };
  }

  if (/was hab(e)? ich mir.*gemerkt|zu diesem thema|erinnerung/.test(lower)) {
    const topic = text.replace(/.*(?:thema|zu)\s*/i, "").trim();
    const memories = await searchMemories(topic.length > 3 ? topic : text);
    if (!memories.length) {
      return {
        reply:
          "**Demo-Antwort**\n\nKeine passenden aktiven Erinnerungen gefunden. Du kannst explizit sagen: „Merke dir, dass …“",
        proposalIds,
        demo: true,
      };
    }
    const lines = memories.map(
      (m) => `• ${m.content} _(gespeichert ${m.createdAt.toISOString().slice(0, 10)}, ${m.source})_`,
    );
    return {
      reply: `**Demo-Antwort**\n\nGefundene Erinnerungen:\n\n${lines.join("\n")}`,
      proposalIds,
      demo: true,
    };
  }

  if (/zusammenfass|offene aufgaben|meine aufgaben/.test(lower)) {
    const tasks = await listTasks({ status: "open" });
    if (!tasks.length) {
      return {
        reply: "**Demo-Antwort**\n\nDu hast aktuell keine offenen Aufgaben in Nexo.",
        proposalIds,
        demo: true,
      };
    }
    const lines = tasks.slice(0, 15).map((t) => {
      const due = formatDueDisplay(t.dueDate, t.dueAt, settings.timezone);
      return `• ${t.title} (${due}${t.priority ? `, Priorität: ${t.priority}` : ""})`;
    });
    return {
      reply: `**Demo-Antwort**\n\nOffene Aufgaben:\n\n${lines.join("\n")}`,
      proposalIds,
      demo: true,
    };
  }

  return {
    reply: [
      "**Demo-Modus** — unterstützte Beispiele:",
      "• „Was ist heute wichtig?“",
      "• „Plane meinen Tag anhand meiner offenen Aufgaben.“",
      "• „Erstelle eine Aufgabe: Termin vereinbaren, morgen um 10 Uhr.“",
      "• (Kalender Beta) „Kalender Termin: …“ — nach Opt-in in Einstellungen",
      "• „Merke dir, dass ich kurze Antworten bevorzuge.“",
      "• „Was habe ich mir zu diesem Thema gemerkt?“",
      "",
      "Schreibende Aktionen erfordern immer deine Bestätigung.",
    ].join("\n"),
    proposalIds,
    demo: true,
  };
}
