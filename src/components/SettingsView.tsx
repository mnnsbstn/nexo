"use client";

import { useEffect, useState } from "react";

export function SettingsView() {
  const [settings, setSettings] = useState({
    uiLanguage: "de",
    responseLanguage: "de",
    timezone: "Europe/Berlin",
    notifyInAppDueTasks: false,
    notifyBrowserDueTasks: false,
  });
  const [browserPermission, setBrowserPermission] = useState<
    NotificationPermission | "unsupported" | "loading"
  >("loading");
  const [status, setStatus] = useState<{
    mode: string;
    hint: string;
    liveConfigured: boolean;
    authRequired?: boolean;
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
              Live-Agent: feste Tool-Allowlist, max. 4 Tool-Schritte, Schreibaktionen nur via Freigabe.
              Bei Provider-Fehlern: Demo-Fallback mit Kennzeichnung.
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
