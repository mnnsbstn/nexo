export type ModelMode = "live" | "demo";

export function getModelMode(): ModelMode {
  const forced = process.env.NEXO_DEMO_MODE?.toLowerCase();
  if (forced === "true" || forced === "1") return "demo";
  if (forced === "false" || forced === "0") {
    return process.env.OPENAI_API_KEY ? "live" : "demo";
  }
  // auto
  return process.env.OPENAI_API_KEY ? "live" : "demo";
}

export function getModelConfigHint(): string {
  if (getModelMode() === "live") {
    return "Live-Modus: Modellantworten über konfigurierten Anbieter.";
  }
  return "Demo-Modus: Antworten sind regelbasiert simuliert, nicht echte KI-Ausgaben.";
}
