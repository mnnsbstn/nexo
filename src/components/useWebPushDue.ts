"use client";

import { useEffect, useRef } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function useWebPushDue(enabled: boolean, todayKey: string) {
  const checkedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !todayKey) return;
    if (checkedRef.current === todayKey) return;
    checkedRef.current = todayKey;

    void fetch("/api/push/check-due", { method: "POST" });
  }, [enabled, todayKey]);
}

export async function registerWebPushSubscription(): Promise<{ ok: boolean; message: string }> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, message: "Web Push wird in diesem Browser nicht unterstützt." };
  }

  const keyRes = await fetch("/api/push/vapid-public-key");
  const keyData = (await keyRes.json()) as { configured?: boolean; publicKey?: string | null };
  if (!keyData.configured || !keyData.publicKey) {
    return { ok: false, message: "Web Push ist auf dem Server nicht konfiguriert (VAPID-Env)." };
  }

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, message: "Benachrichtigungs-Berechtigung nicht erteilt." };
  }

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
  });

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, message: "Push-Abonnement unvollständig." };
  }

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    }),
  });

  if (!res.ok) {
    return { ok: false, message: "Abonnement konnte nicht gespeichert werden." };
  }

  return { ok: true, message: "Web Push für fällige Aufgaben aktiviert." };
}
