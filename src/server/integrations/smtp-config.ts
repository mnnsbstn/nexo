import {
  decryptEmailAppPassword,
  getEmailConnection,
} from "@/server/integrations/email-connection";
import {
  ICLOUD_SMTP_HOST,
  ICLOUD_SMTP_PORT,
} from "@/server/integrations/icloud-constants";

export type ResolvedSmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  from: string;
  user?: string;
  pass?: string;
  source: "env" | "icloud";
};

function envSmtpConfig(): ResolvedSmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const from = process.env.SMTP_FROM?.trim();
  if (!host || !from) return null;
  const port = Number(process.env.SMTP_PORT?.trim() || "587");
  const user = process.env.SMTP_USER?.trim() || undefined;
  const pass = process.env.SMTP_PASS?.trim() || undefined;
  const secure = process.env.SMTP_SECURE?.trim() === "true" || port === 465;
  return { host, port, secure, from, user, pass, source: "env" };
}

export function isSmtpSendConfigured(): boolean {
  return Boolean(envSmtpConfig());
}

export async function isEmailSendConfigured(): Promise<boolean> {
  if (isSmtpSendConfigured()) return true;
  const conn = await getEmailConnection();
  return Boolean(conn?.provider === "icloud" && conn.accountEmail);
}

export async function resolveSmtpConfig(): Promise<ResolvedSmtpConfig> {
  const fromEnv = envSmtpConfig();
  if (fromEnv) return fromEnv;

  const conn = await getEmailConnection();
  if (conn?.provider === "icloud" && conn.accountEmail) {
    return {
      host: ICLOUD_SMTP_HOST,
      port: ICLOUD_SMTP_PORT,
      secure: false,
      from: conn.accountEmail,
      user: conn.accountEmail,
      pass: decryptEmailAppPassword(conn),
      source: "icloud",
    };
  }

  throw new Error("SMTP nicht konfiguriert (SMTP_HOST/SMTP_FROM oder iCloud in Einstellungen).");
}

/** @deprecated Prefer resolveSmtpConfig — env-only, sync. */
export function getSmtpConfig() {
  const cfg = envSmtpConfig();
  if (!cfg) {
    throw new Error("SMTP nicht konfiguriert (SMTP_HOST, SMTP_FROM).");
  }
  const { source, ...rest } = cfg;
  void source;
  return rest;
}
