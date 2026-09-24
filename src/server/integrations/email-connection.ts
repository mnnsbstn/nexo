import { prisma } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/token-crypto";

export type EmailProvider = "icloud";

export async function getEmailConnection() {
  return prisma.emailConnection.findUnique({ where: { id: "default" } });
}

export async function saveICloudEmailConnection(input: {
  appleId: string;
  appPassword: string;
}) {
  return prisma.emailConnection.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      provider: "icloud",
      accessToken: encryptSecret(input.appPassword),
      accountEmail: input.appleId,
    },
    update: {
      provider: "icloud",
      accessToken: encryptSecret(input.appPassword),
      accountEmail: input.appleId,
    },
  });
}

export function decryptEmailAppPassword(conn: { accessToken: string }): string {
  return decryptSecret(conn.accessToken);
}

export async function disconnectEmail() {
  await prisma.emailConnection.deleteMany({ where: { id: "default" } });
}
