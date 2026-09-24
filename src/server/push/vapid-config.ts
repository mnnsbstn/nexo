export function isWebPushConfigured(): boolean {
  const pub = process.env.NEXO_VAPID_PUBLIC_KEY?.trim();
  const priv = process.env.NEXO_VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.NEXO_VAPID_SUBJECT?.trim();
  return Boolean(pub && priv && subject);
}

export function getVapidPublicKey(): string {
  const pub = process.env.NEXO_VAPID_PUBLIC_KEY?.trim();
  if (!pub) {
    throw new Error("Web Push nicht konfiguriert (NEXO_VAPID_PUBLIC_KEY).");
  }
  return pub;
}

export function getWebPushOptions() {
  if (!isWebPushConfigured()) {
    throw new Error(
      "Web Push nicht konfiguriert. Setze NEXO_VAPID_PUBLIC_KEY, NEXO_VAPID_PRIVATE_KEY, NEXO_VAPID_SUBJECT.",
    );
  }
  const publicKey = process.env.NEXO_VAPID_PUBLIC_KEY!.trim();
  const privateKey = process.env.NEXO_VAPID_PRIVATE_KEY!.trim();
  const subject = process.env.NEXO_VAPID_SUBJECT!.trim();
  return { publicKey, privateKey, subject };
}
