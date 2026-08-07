import { NextRequest, NextResponse } from "next/server";
import { isDemo } from "@/lib/store";
import { hasImported, importLegacy, markImported, type SavedMessage } from "@/lib/vault";

export const dynamic = "force-dynamic";

// Rescues notes written back when everything lived in localStorage. The client
// sweeps its own storage and posts whatever it finds; we fold it in once.
export async function POST(req: NextRequest) {
  if (isDemo) {
    return NextResponse.json({ error: "Not available in the web demo." }, { status: 400 });
  }
  if (hasImported()) {
    return NextResponse.json({ ok: true, alreadyImported: true, notes: 0, saved: 0 });
  }
  const payload = (await req.json()) as {
    notes?: { threadId: string; body: string }[];
    saved?: { threadId: string; messages: SavedMessage[] }[];
  };
  const result = importLegacy({
    notes: payload.notes ?? [],
    saved: payload.saved ?? [],
  });
  markImported();
  return NextResponse.json({ ok: true, alreadyImported: false, ...result });
}

export async function GET() {
  if (isDemo) return NextResponse.json({ imported: true });
  return NextResponse.json({ imported: hasImported() });
}
