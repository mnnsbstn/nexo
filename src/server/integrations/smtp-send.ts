import nodemailer from "nodemailer";
import { isE2eEmailMockEnabled } from "@/lib/e2e-email-mock";
import { getSmtpConfig } from "@/server/integrations/smtp-config";

export async function sendViaSmtp(input: {
  to: string[];
  cc?: string[];
  subject: string;
  text: string;
}): Promise<{ messageId: string }> {
  if (isE2eEmailMockEnabled()) {
    return { messageId: `e2e-mock-mail-${Date.now()}` };
  }

  const cfg = getSmtpConfig();
  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: cfg.user && cfg.pass ? { user: cfg.user, pass: cfg.pass } : undefined,
  });

  const info = await transport.sendMail({
    from: cfg.from,
    to: input.to.join(", "),
    cc: input.cc?.length ? input.cc.join(", ") : undefined,
    subject: input.subject,
    text: input.text,
  });

  return { messageId: info.messageId || "unknown" };
}
