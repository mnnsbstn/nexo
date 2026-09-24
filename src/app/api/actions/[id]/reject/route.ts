import { NextResponse } from "next/server";
import { rejectProposal } from "@/server/actions/execute";
import { serializeProposal } from "@/lib/serialize";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const proposal = await rejectProposal(id);
    return NextResponse.json({ proposal: serializeProposal(proposal) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ablehnung fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
