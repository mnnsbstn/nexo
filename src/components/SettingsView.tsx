"use client";

import { useEffect, useState } from "react";

export function SettingsView() {
  const [settings, setSettings] = useState({
    uiLanguage: "de",
    responseLanguage: "de",
    timezone: "Europe/Berlin",
  });
  const [status, setStatus] = useState<{ mode: string; hint: string; liveConfigured: boolean } | null>(
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
  }, []);

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
