import type { NextRequest } from "next/server";

export const SESSION_COOKIE = "nexo_session";
const SESSION_TTL_SEC = 60 * 60 * 24 * 7;

export function isAuthEnabled(): boolean {
  const password = process.env.NEXO_AUTH_PASSWORD?.trim();
  return Boolean(password);
}

function sessionSecret(): string {
  const secret = process.env.NEXO_SESSION_SECRET?.trim();
  if (secret && secret.length >= 16) return secret;
  if (isAuthEnabled()) {
    return `nexo-pw:${process.env.NEXO_AUTH_PASSWORD}`;
  }
  return "nexo-dev-no-auth";
}

async function sha256(value: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
}

function bufToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacSign(body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return bufToBase64Url(sig);
}

async function hashPassword(value: string): Promise<string> {
  const digest = await sha256(`${sessionSecret()}:${value}`);
  return bufToBase64Url(digest);
}

export async function verifyAppPassword(password: string): Promise<boolean> {
  const expected = process.env.NEXO_AUTH_PASSWORD?.trim() ?? "";
  if (!expected) return true;
  const a = await hashPassword(password);
  const b = await hashPassword(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

type SessionPayload = {
  v: 1;
  exp: number;
};

export async function createSessionToken(): Promise<string> {
  const payload: SessionPayload = {
    v: 1,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SEC,
  };
  const json = JSON.stringify(payload);
  const body = btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const sig = await hmacSign(body);
  return `${body}.${sig}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!isAuthEnabled()) return true;
  if (!token) return false;
  const [body, sig] = token.split(".");
  if (!body || !sig) return false;
  const expected = await hmacSign(body);
  if (sig.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return false;
  try {
    const padded = body.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "="));
    const payload = JSON.parse(json) as SessionPayload;
    if (payload.v !== 1) return false;
    if (payload.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function getSessionFromRequest(req: NextRequest | Request): Promise<boolean> {
  if (!isAuthEnabled()) return true;
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  const token = match?.slice(SESSION_COOKIE.length + 1);
  return verifySessionToken(decodeURIComponent(token ?? ""));
}
