import { NextResponse } from "next/server";
import { getModelMode, getModelConfigHint } from "@/server/model/provider";

export async function GET() {
  const mode = getModelMode();
  return NextResponse.json({
    mode,
    hint: getModelConfigHint(),
    liveConfigured: Boolean(process.env.OPENAI_API_KEY),
  });
}
