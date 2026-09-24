/** Kurze, nutzerfreundliche Übersetzung häufiger Provider-Fehler (Deutsch). */
export function toUserFacingLiveError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("401") || lower.includes("incorrect api key") || lower.includes("invalid api key")) {
    return "API-Schlüssel ungültig oder abgelaufen. Bitte OPENAI_API_KEY in .env prüfen.";
  }
  if (lower.includes("429") || lower.includes("rate limit")) {
    return "Anbieter-Limit erreicht (Rate Limit). Bitte kurz warten und erneut senden.";
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "Zeitüberschreitung beim Modell — bitte erneut versuchen oder kürzer formulieren.";
  }
  if (lower.includes("503") || lower.includes("502") || lower.includes("overloaded")) {
    return "Modell-Anbieter vorübergehend nicht erreichbar. Bitte später erneut versuchen.";
  }
  if (lower.includes("openai_api_key fehlt")) {
    return "Live-Modus ist aktiv, aber OPENAI_API_KEY fehlt.";
  }
  return raw.length > 280 ? `${raw.slice(0, 280)}…` : raw;
}
