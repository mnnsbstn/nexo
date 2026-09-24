import { createSessionToken, verifySessionToken } from "@/lib/auth";

export async function createOAuthState(): Promise<string> {
  return createSessionToken();
}

export async function verifyOAuthState(state: string | null | undefined): Promise<boolean> {
  return verifySessionToken(state);
}
