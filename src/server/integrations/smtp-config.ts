export function isSmtpSendConfigured(): boolean {
  const host = process.env.SMTP_HOST?.trim();
  const from = process.env.SMTP_FROM?.trim();
  return Boolean(host && from);
}

export function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const from = process.env.SMTP_FROM?.trim();
  if (!host || !from) {
    throw new Error("SMTP nicht konfiguriert (SMTP_HOST, SMTP_FROM).");
  }
  const port = Number(process.env.SMTP_PORT?.trim() || "587");
  const user = process.env.SMTP_USER?.trim() || undefined;
  const pass = process.env.SMTP_PASS?.trim() || undefined;
  const secure = process.env.SMTP_SECURE?.trim() === "true" || port === 465;

  return { host, port, secure, from, user, pass };
}
