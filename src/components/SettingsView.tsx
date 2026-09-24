"use client";

import { useEffect, useState } from "react";

export function SettingsView() {
  const [settings, setSettings] = useState({
    uiLanguage: "de",
    responseLanguage: "de",
    timezone: "Europe/Berlin",
    notifyInAppDueTasks: false,
    notifyBrowserDueTasks: false,
    calendarIntegrationEnabled: false,
    emailIntegrationEnabled: false,
  });
  const [emailDrafts, setEmailDrafts] = useState<
    {
      id: string;
      subject: string;
      to: string[];
      status: string;
      preview: string;
      createdLabel: string;
      sendError?: string | null;
    }[]
  >([]);
  const [emailStatus, setEmailStatus] = useState<{
    message: string;
    sendConfigured?: boolean;
    icloudConnected?: boolean;
    icloudAccountEmail?: string | null;
  } | null>(null);
  const [externalInboxMessages, setExternalInboxMessages] = useState<
    { id: string; subject: string; from: string; dateLabel: string }[]
  >([]);
  const [externalInboxHint, setExternalInboxHint] = useState<string | null>(null);
  const [calendarDrafts, setCalendarDrafts] = useState<
    {
      id: string;
      title: string;
      startLabel: string;
      status: string;
      externalEventId?: string | null;
      exportError?: string | null;
      exportProvider?: string | null;
      icsUrl?: string;
    }[]
  >([]);
  const [calendarStatus, setCalendarStatus] = useState<{
    oauthConfigured: boolean;
    googleOAuthConfigured?: boolean;
    microsoftOAuthConfigured?: boolean;
    icloudAvailable?: boolean;
    icloudConnected?: boolean;
    connected: boolean;
    provider?: string | null;
    accountEmail: string | null;
    message: string;
  } | null>(null);
  const [icloudAppleId, setIcloudAppleId] = useState("");
  const [icloudAppPassword, setIcloudAppPassword] = useState("");
  const [icloudConnectError, setIcloudConnectError] = useState<string | null>(null);
  const [icloudConnecting, setIcloudConnecting] = useState(false);
  const [calendarBanner, setCalendarBanner] = useState<string | null>(null);
  const [externalCalendarEvents, setExternalCalendarEvents] = useState<
    { id: string; title: string; startLabel: string }[]
  >([]);
  const [externalCalendarReadHint, setExternalCalendarReadHint] = useState<string | null>(null);
  const [browserPermission, setBrowserPermission] = useState<
    NotificationPermission | "unsupported" | "loading"
  >("loading");
  const [status, setStatus] = useState<{
    mode: string;
    hint: string;
    liveConfigured: boolean;
    authRequired?: boolean;
    liveLimits?: { toolRoundsMax: number; historyMessagesMax: number };
  } | null>(null);
  const [session, setSession] = useState<{ authRequired: boolean; authenticated: boolean } | null>(
    null,
  );
  const [saved, setSaved] = useState(false);
  const [demoMsg, setDemoMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings));
    fetch("/api/integrations/calendar")
      .then((r) => r.json())
      .then((d) => {
        setCalendarDrafts(d.drafts ?? []);
        setCalendarStatus({
          oauthConfigured: Boolean(d.oauthConfigured),
          googleOAuthConfigured: Boolean(d.googleOAuthConfigured),
          microsoftOAuthConfigured: Boolean(d.microsoftOAuthConfigured),
          icloudAvailable: d.icloudAvailable !== false,
          icloudConnected: Boolean(d.icloudConnected),
          connected: Boolean(d.connected),
          provider: d.provider ?? null,
          accountEmail: d.accountEmail ?? null,
          message: d.message ?? "",
        });
        if (d.connected && d.enabled) {
          fetch("/api/integrations/calendar/events?limit=8")
            .then((r) => r.json())
            .then((ev) => {
              setExternalCalendarEvents(ev.events ?? []);
              setExternalCalendarReadHint(
                ev.readError
                  ? `${ev.message ?? ""} ${ev.readError}`.trim()
                  : (ev.message ?? null),
              );
            });
        }
      });
    fetch("/api/integrations/email")
      .then((r) => r.json())
      .then((d) => {
        setEmailDrafts(d.drafts ?? []);
        setEmailStatus({
          message: d.message ?? "",
          sendConfigured: Boolean(d.sendConfigured),
          icloudConnected: Boolean(d.icloudConnected),
          icloudAccountEmail: d.icloudAccountEmail ?? null,
        });
        if (d.icloudConnected && d.enabled) {
          fetch("/api/integrations/email/messages?limit=6")
            .then((r) => r.json())
            .then((inbox) => {
              setExternalInboxMessages(inbox.messages ?? []);
              setExternalInboxHint(
                inbox.readError
                  ? `${inbox.message ?? ""} ${inbox.readError}`.trim()
                  : (inbox.message ?? null),
              );
            });
        }
      });
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const cal = params.get("calendar");
      if (cal === "connected") setCalendarBanner("Google Kalender verbunden.");
      if (cal === "error") setCalendarBanner("Google-Verbindung fehlgeschlagen — bitte erneut versuchen.");
      if (cal === "ms_connected") setCalendarBanner("Microsoft Kalender verbunden.");
      if (cal === "ms_error") setCalendarBanner("Microsoft-Verbindung fehlgeschlagen — bitte erneut versuchen.");
    }
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus);
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then(setSession);
    if (typeof window !== "undefined" && "Notification" in window) {
      setBrowserPermission(Notification.permission);
    } else {
      setBrowserPermission("unsupported");
    }
  }, []);

  async function requestBrowserPermission() {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setBrowserPermission(result);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/anmelden";
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function reloadExternalCalendarEvents() {
    const res = await fetch("/api/integrations/calendar/events?limit=8");
    if (!res.ok) {
      setExternalCalendarEvents([]);
      setExternalCalendarReadHint(null);
      return;
    }
    const d = (await res.json()) as {
      events?: { id: string; title: string; startLabel: string }[];
      message?: string;
      readError?: string;
    };
    setExternalCalendarEvents(d.events ?? []);
    setExternalCalendarReadHint(
      d.readError ? `${d.message ?? ""} ${d.readError}`.trim() : (d.message ?? null),
    );
  }

  async function reloadCalendarDrafts() {
    const res = await fetch("/api/integrations/calendar");
    const d = await res.json();
    setCalendarDrafts(d.drafts ?? []);
    setCalendarStatus({
      oauthConfigured: Boolean(d.oauthConfigured),
      googleOAuthConfigured: Boolean(d.googleOAuthConfigured),
      microsoftOAuthConfigured: Boolean(d.microsoftOAuthConfigured),
      icloudAvailable: d.icloudAvailable !== false,
      icloudConnected: Boolean(d.icloudConnected),
      connected: Boolean(d.connected),
      provider: d.provider ?? null,
      accountEmail: d.accountEmail ?? null,
      message: d.message ?? "",
    });
    if (d.connected && d.enabled) {
      await reloadExternalCalendarEvents();
    } else {
      setExternalCalendarEvents([]);
      setExternalCalendarReadHint(null);
    }
  }

  async function connectICloud() {
    setIcloudConnectError(null);
    setIcloudConnecting(true);
    try {
      const res = await fetch("/api/integrations/icloud/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appleId: icloudAppleId.trim(),
          appPassword: icloudAppPassword.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok) {
        setIcloudConnectError(data.error ?? "Verbindung fehlgeschlagen.");
        return;
      }
      setIcloudAppPassword("");
      setCalendarBanner("iCloud Kalender und Mail verbunden.");
      await reloadCalendarDrafts();
      const emailRes = await fetch("/api/integrations/email");
      const emailData = await emailRes.json();
      setEmailStatus({
        message: emailData.message ?? "",
        sendConfigured: Boolean(emailData.sendConfigured),
        icloudConnected: Boolean(emailData.icloudConnected),
        icloudAccountEmail: emailData.icloudAccountEmail ?? null,
      });
      if (emailData.icloudConnected && settings.emailIntegrationEnabled) {
        const inboxRes = await fetch("/api/integrations/email/messages?limit=6");
        const inbox = await inboxRes.json();
        setExternalInboxMessages(inbox.messages ?? []);
        setExternalInboxHint(inbox.message ?? null);
      }
    } finally {
      setIcloudConnecting(false);
    }
  }

  async function disconnectICloud() {
    await fetch("/api/integrations/icloud/connection", { method: "DELETE" });
    setIcloudAppleId("");
    setIcloudAppPassword("");
    await reloadCalendarDrafts();
    const emailRes = await fetch("/api/integrations/email");
    const emailData = await emailRes.json();
    setEmailStatus({
      message: emailData.message ?? "",
      sendConfigured: Boolean(emailData.sendConfigured),
      icloudConnected: Boolean(emailData.icloudConnected),
      icloudAccountEmail: emailData.icloudAccountEmail ?? null,
    });
    setExternalInboxMessages([]);
    setExternalInboxHint(null);
  }

  async function retryCalendarExport(draftId: string) {
    await fetch(`/api/integrations/calendar/drafts/${draftId}/export`, { method: "POST" });
    await reloadCalendarDrafts();
  }

  async function disconnectGoogle() {
    await fetch("/api/integrations/calendar/connection", { method: "DELETE" });
    await reloadCalendarDrafts();
  }

  function exportProviderLabel(provider?: string | null) {
    if (provider === "microsoft") return " · Outlook";
    if (provider === "icloud") return " · iCloud";
    return " · Google";
  }

  function connectedProviderLabel(provider?: string | null) {
    if (provider === "microsoft") return "Microsoft";
    if (provider === "icloud") return "iCloud";
    return "Google";
  }

  async function reloadEmailDrafts() {
    const res = await fetch("/api/integrations/email");
    const d = await res.json();
    setEmailDrafts(d.drafts ?? []);
    setEmailStatus({
      message: d.message ?? "",
      sendConfigured: Boolean(d.sendConfigured),
    });
  }

  async function sendEmailDraft(draftId: string, subject: string) {
    if (
      !window.confirm(
        `E-Mail „${subject}“ jetzt wirklich senden? Dieser Schritt ist getrennt von der Chat-Freigabe.`,
      )
    ) {
      return;
    }
    await fetch(`/api/integrations/email/drafts/${draftId}/send`, { method: "POST" });
    await reloadEmailDrafts();
  }

  function emailStatusSuffix(status: string) {
    if (status === "sent") return " · Gesendet";
    if (status === "send_failed") return " · Versand fehlgeschlagen";
    if (status === "saved") return " · Gespeichert";
    return " · Entwurf";
  }

  async function loadDemo() {
    const res = await fetch("/api/demo/seed", { method: "POST" });
    const data = await res.json();
    setDemoMsg(data.message);
  }

  return (
    <div className="space-y-8 max-w-lg">
      <div>
        <h1 className="text-2xl font-semibold">Einstellungen</h1>
        <p className="text-sm text-stone-600 mt-1">Einzelnutzer-MVP · Secrets nur serverseitig</p>
      </div>

      {session?.authRequired && (
        <div className="rounded-xl p-4 text-sm bg-stone-50 border border-stone-200 flex flex-wrap items-center justify-between gap-2">
          <p className="text-stone-700">Anmeldung aktiv (Einzelnutzer).</p>
          <button type="button" onClick={logout} className="text-sm px-3 py-1.5 border rounded-lg">
            Abmelden
          </button>
        </div>
      )}

      {status && (
        <div
          className={`rounded-xl p-4 text-sm ${
            status.mode === "live" ? "bg-teal-50 border border-teal-100" : "bg-amber-50 border border-amber-100"
          }`}
        >
          <p className="font-medium">{status.mode === "live" ? "Live-Modus" : "Demo-Modus"}</p>
          <p className="mt-1 text-stone-700">{status.hint}</p>
          {!status.liveConfigured && (
            <p className="mt-2 text-stone-600">
              Für Live-Betrieb: <code className="text-xs bg-white px-1 rounded">OPENAI_API_KEY</code> in{" "}
              <code className="text-xs bg-white px-1 rounded">.env</code> setzen (siehe{" "}
              <code className="text-xs bg-white px-1 rounded">.env.example</code>).
            </p>
          )}
          {status.liveConfigured && (
            <p className="mt-2 text-stone-600 text-xs">
              Live-Agent: feste Tool-Allowlist
              {status.liveLimits
                ? ` (max. ${status.liveLimits.toolRoundsMax} Tool-Runden, ${status.liveLimits.historyMessagesMax} Chat-Nachrichten Kontext)`
                : ""}
              , Schreibaktionen nur via Freigabe. Bei Provider-Fehlern: Demo-Fallback mit Kennzeichnung.
              Im Chat siehst du pro Live-Antwort das Kontextbudget.
            </p>
          )}
        </div>
      )}

      <form onSubmit={save} className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
        <label className="block text-sm">
          UI-Sprache
          <input
            value={settings.uiLanguage}
            onChange={(e) => setSettings({ ...settings, uiLanguage: e.target.value })}
            className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Antwortsprache
          <input
            value={settings.responseLanguage}
            onChange={(e) => setSettings({ ...settings, responseLanguage: e.target.value })}
            className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Zeitzone
          <input
            value={settings.timezone}
            onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
            className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2"
          />
        </label>
        <button type="submit" className="px-4 py-2 rounded-lg bg-teal-700 text-white text-sm">
          Speichern
        </button>
        {saved && <p className="text-sm text-teal-800">Gespeichert.</p>}
      </form>

      <form onSubmit={save} className="bg-white border border-stone-200 rounded-xl p-4 space-y-4">
        <div>
          <h2 className="font-medium text-sm">Erinnerungen (Opt-in)</h2>
          <p className="text-xs text-stone-600 mt-1">
            Standard: aus. Nexo fragt nicht beim ersten Besuch nach Berechtigungen — du entscheidest
            hier bewusst.
          </p>
        </div>
        <label className="flex gap-3 text-sm items-start">
          <input
            type="checkbox"
            className="mt-1"
            checked={settings.notifyInAppDueTasks}
            onChange={(e) =>
              setSettings({ ...settings, notifyInAppDueTasks: e.target.checked })
            }
          />
          <span>
            <span className="font-medium">Hinweis auf Heute</span>
            <span className="block text-stone-600 text-xs mt-0.5">
              Banner für überfällige / heute fällige Aufgaben — nur sichtbar, solange Nexo geöffnet
              ist.
            </span>
          </span>
        </label>
        <label className="flex gap-3 text-sm items-start">
          <input
            type="checkbox"
            className="mt-1"
            checked={settings.notifyBrowserDueTasks}
            onChange={(e) =>
              setSettings({ ...settings, notifyBrowserDueTasks: e.target.checked })
            }
            disabled={browserPermission === "unsupported"}
          />
          <span>
            <span className="font-medium">Browser-Benachrichtigung (Heute)</span>
            <span className="block text-stone-600 text-xs mt-0.5">
              Max. ein Hinweis pro Tab-Sitzung beim Öffnen von Heute — kein Dauer-Push im
              Hintergrund ohne geöffnete App.
            </span>
          </span>
        </label>
        {browserPermission === "unsupported" && (
          <p className="text-xs text-stone-500">Dein Browser unterstützt keine Web-Benachrichtigungen.</p>
        )}
        {browserPermission !== "unsupported" && settings.notifyBrowserDueTasks && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-stone-600">
              Browser-Status:{" "}
              {browserPermission === "granted"
                ? "erlaubt"
                : browserPermission === "denied"
                  ? "blockiert"
                  : "noch nicht angefragt"}
            </span>
            {browserPermission !== "granted" && (
              <button
                type="button"
                onClick={requestBrowserPermission}
                className="px-2 py-1 border border-stone-300 rounded-lg text-stone-800"
              >
                Berechtigung anfragen
              </button>
            )}
          </div>
        )}
        <button type="submit" className="px-4 py-2 rounded-lg bg-teal-700 text-white text-sm">
          Erinnerungen speichern
        </button>
      </form>

      <form onSubmit={save} className="bg-white border border-stone-200 rounded-xl p-4 space-y-4">
        <div>
          <h2 className="font-medium text-sm">Kalender-Entwürfe (Beta)</h2>
          <p className="text-xs text-stone-600 mt-1">
            Opt-in für freigabepflichtige Termin-Entwürfe. Mit Google, Microsoft oder iCloud
            verbunden → Export nach Bestätigung; sonst nur Entwurf in Nexo (+ .ics).
          </p>
        </div>
        {calendarBanner && (
          <p className="text-sm text-teal-800 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2">
            {calendarBanner}
          </p>
        )}
        {calendarStatus && (
          <p className="text-xs text-stone-600">{calendarStatus.message}</p>
        )}
        {!calendarStatus?.connected && calendarStatus?.googleOAuthConfigured && (
          <a
            href="/api/integrations/calendar/connect"
            className="inline-block text-sm px-3 py-2 rounded-lg bg-white border border-stone-300 hover:bg-stone-50"
          >
            Mit Google verbinden
          </a>
        )}
        {!calendarStatus?.connected && calendarStatus?.microsoftOAuthConfigured && (
          <a
            href="/api/integrations/calendar/microsoft/connect"
            className="inline-block text-sm px-3 py-2 rounded-lg bg-white border border-stone-300 hover:bg-stone-50 ml-0 sm:ml-2 mt-2 sm:mt-0"
          >
            Mit Microsoft verbinden
          </a>
        )}
        {!calendarStatus?.connected && calendarStatus?.icloudAvailable !== false && (
          <div className="border border-stone-200 rounded-lg p-3 space-y-2 bg-stone-50/80">
            <p className="text-xs font-medium text-stone-700">iCloud (Kalender + Mail)</p>
            <p className="text-xs text-stone-600">
              Apple-ID und{" "}
              <a
                href="https://account.apple.com/account/manage"
                className="text-teal-800 underline"
                target="_blank"
                rel="noreferrer"
              >
                app-spezifisches Passwort
              </a>
              . Wird verschlüsselt gespeichert — kein OAuth.
            </p>
            <input
              type="email"
              autoComplete="username"
              placeholder="Apple-ID (E-Mail)"
              value={icloudAppleId}
              onChange={(e) => setIcloudAppleId(e.target.value)}
              className="w-full text-sm border border-stone-300 rounded-lg px-2 py-1.5"
            />
            <input
              type="password"
              autoComplete="current-password"
              placeholder="App-Passwort"
              value={icloudAppPassword}
              onChange={(e) => setIcloudAppPassword(e.target.value)}
              className="w-full text-sm border border-stone-300 rounded-lg px-2 py-1.5"
            />
            {icloudConnectError && (
              <p className="text-xs text-red-700" role="alert">
                {icloudConnectError}
              </p>
            )}
            <button
              type="button"
              disabled={icloudConnecting || !icloudAppleId.trim() || !icloudAppPassword.trim()}
              onClick={connectICloud}
              className="text-sm px-3 py-2 rounded-lg bg-white border border-stone-300 hover:bg-stone-50 disabled:opacity-50"
            >
              {icloudConnecting ? "Verbinde…" : "Mit iCloud verbinden"}
            </button>
          </div>
        )}
        {calendarStatus?.connected && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-stone-700">
              Verbunden ({connectedProviderLabel(calendarStatus.provider)})
              {calendarStatus.accountEmail ? `: ${calendarStatus.accountEmail}` : ""}
            </span>
            {calendarStatus.provider === "icloud" ? (
              <button
                type="button"
                onClick={disconnectICloud}
                className="text-xs px-2 py-1 border border-stone-300 rounded-lg"
              >
                iCloud trennen
              </button>
            ) : (
              <button
                type="button"
                onClick={disconnectGoogle}
                className="text-xs px-2 py-1 border border-stone-300 rounded-lg"
              >
                Trennen
              </button>
            )}
          </div>
        )}
        {calendarStatus?.connected && (
          <div className="border border-stone-100 rounded-lg p-3 space-y-2 bg-stone-50/50">
            <p className="text-xs font-medium text-stone-700">Externe Termine (read-only)</p>
            {externalCalendarEvents.length > 0 ? (
              <ul className="text-xs space-y-1 text-stone-800">
                {externalCalendarEvents.map((ev) => (
                  <li key={ev.id}>
                    <span className="text-stone-500">{ev.startLabel}</span> — {ev.title}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-stone-500">Keine Termine im Vorschau-Zeitraum geladen.</p>
            )}
            {externalCalendarReadHint && (
              <p className="text-xs text-stone-500">{externalCalendarReadHint}</p>
            )}
          </div>
        )}
        <label className="flex gap-3 text-sm items-start">
          <input
            type="checkbox"
            className="mt-1"
            checked={settings.calendarIntegrationEnabled}
            onChange={(e) =>
              setSettings({ ...settings, calendarIntegrationEnabled: e.target.checked })
            }
          />
          <span>
            <span className="font-medium">Kalender-Entwürfe erlauben</span>
            <span className="block text-stone-600 text-xs mt-0.5">
              Demo-Chat z. B.: „Kalender Termin: Team-Call morgen 10 Uhr“ → Aktionskarte mit
              Badge „nicht verbunden“.
            </span>
          </span>
        </label>
        {calendarDrafts.length > 0 && (
          <ul className="text-sm space-y-2 border-t border-stone-100 pt-3">
            {calendarDrafts.map((d) => (
              <li key={d.id} className="border border-stone-100 rounded-lg p-3 space-y-1">
                <div className="flex flex-wrap justify-between gap-2 text-stone-800">
                  <span className="font-medium">{d.title}</span>
                  <span className="text-xs text-stone-500 shrink-0">
                    {d.startLabel}
                    {d.status === "exported"
                      ? exportProviderLabel(d.exportProvider)
                      : d.status === "export_failed"
                        ? " · Export fehlgeschlagen"
                        : " · Entwurf"}
                  </span>
                </div>
                {d.exportError && (
                  <p className="text-xs text-red-700" role="alert">
                    {d.exportError}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 text-xs">
                  {d.icsUrl && (
                    <a href={d.icsUrl} className="text-teal-800 underline">
                      Als .ics laden
                    </a>
                  )}
                  {d.status === "export_failed" && calendarStatus?.connected && (
                    <button
                      type="button"
                      onClick={() => retryCalendarExport(d.id)}
                      className="text-stone-700 underline"
                    >
                      Export erneut versuchen
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <button type="submit" className="px-4 py-2 rounded-lg bg-teal-700 text-white text-sm">
          Integration speichern
        </button>
      </form>

      <form onSubmit={save} className="bg-white border border-stone-200 rounded-xl p-4 space-y-4">
        <div>
          <h2 className="font-medium text-sm">E-Mail-Entwürfe (Beta)</h2>
          <p className="text-xs text-stone-600 mt-1">
            Opt-in für freigabepflichtige E-Mail-Entwürfe. Chat-Freigabe speichert den Entwurf;
            Versand nur manuell hier (SMTP in .env oder iCloud-Verbindung oben), nie automatisch aus
            dem Chat.
          </p>
        </div>
        {emailStatus && <p className="text-xs text-stone-600">{emailStatus.message}</p>}
        {emailStatus?.icloudConnected && (
          <div className="border border-stone-100 rounded-lg p-3 space-y-2 bg-stone-50/50">
            <p className="text-xs font-medium text-stone-700">iCloud Posteingang (read-only)</p>
            {externalInboxMessages.length > 0 ? (
              <ul className="text-xs space-y-1 text-stone-800">
                {externalInboxMessages.map((m) => (
                  <li key={m.id}>
                    <span className="text-stone-500">{m.dateLabel}</span> — {m.subject}
                    <span className="text-stone-500"> · {m.from}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-stone-500">Keine Vorschau geladen.</p>
            )}
            {externalInboxHint && (
              <p className="text-xs text-stone-500">{externalInboxHint}</p>
            )}
          </div>
        )}
        <label className="flex gap-3 text-sm items-start">
          <input
            type="checkbox"
            className="mt-1"
            checked={settings.emailIntegrationEnabled}
            onChange={(e) =>
              setSettings({ ...settings, emailIntegrationEnabled: e.target.checked })
            }
          />
          <span>
            <span className="font-medium">E-Mail-Entwürfe erlauben</span>
            <span className="block text-stone-600 text-xs mt-0.5">
              Demo-Chat z. B.: „E-Mail an team@beispiel.de Betreff: Update Nachricht: Kurzer Text“
            </span>
          </span>
        </label>
        {emailDrafts.length > 0 && (
          <ul className="text-sm space-y-2 border-t border-stone-100 pt-3">
            {emailDrafts.map((d) => (
              <li key={d.id} className="border border-stone-100 rounded-lg p-3 space-y-1">
                <div className="flex flex-wrap justify-between gap-2 text-stone-800">
                  <span className="font-medium">{d.subject}</span>
                  <span className="text-xs text-stone-500 shrink-0">
                    {d.createdLabel}
                    {emailStatusSuffix(d.status)}
                  </span>
                </div>
                <p className="text-xs text-stone-600">An: {d.to.join(", ")}</p>
                <p className="text-xs text-stone-500 line-clamp-2">{d.preview}</p>
                {d.sendError && (
                  <p className="text-xs text-red-700" role="alert">
                    {d.sendError}
                  </p>
                )}
                {d.status === "saved" && emailStatus?.sendConfigured && (
                  <button
                    type="button"
                    onClick={() => sendEmailDraft(d.id, d.subject)}
                    className="text-xs text-teal-800 underline"
                  >
                    E-Mail senden…
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <button type="submit" className="px-4 py-2 rounded-lg bg-teal-700 text-white text-sm">
          E-Mail-Option speichern
        </button>
      </form>

      <div className="border border-dashed border-stone-300 rounded-xl p-4 space-y-2">
        <h2 className="font-medium text-sm">Demo-Beispieldaten</h2>
        <p className="text-xs text-stone-600">
          Lädt klar gekennzeichnete [Demo]-Einträge — nicht mit deinen echten Daten vermischt außer in
          derselben Liste.
        </p>
        <button type="button" onClick={loadDemo} className="text-sm px-3 py-2 border rounded-lg">
          Demo-Daten laden
        </button>
        {demoMsg && <p className="text-sm text-stone-700">{demoMsg}</p>}
      </div>
    </div>
  );
}
