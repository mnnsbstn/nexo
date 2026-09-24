import { ZodError } from "zod";

export function formatAgentToolError(toolName: string, err: unknown): string {
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`).join("; ");
    return JSON.stringify({
      error: `Tool „${toolName}“: ungültige Argumente.`,
      details,
      hint: "Argumente an die Tool-Beschreibung halten und erneut aufrufen.",
    });
  }
  if (err instanceof Error) {
    return JSON.stringify({
      error: `Tool „${toolName}“ fehlgeschlagen.`,
      message: err.message,
    });
  }
  return JSON.stringify({ error: `Tool „${toolName}“: unbekannter Fehler.` });
}
