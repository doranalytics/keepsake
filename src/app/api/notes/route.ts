import { NextRequest, NextResponse } from "next/server";
import { isDemo } from "@/lib/store";
import { getNote, setNote } from "@/lib/vault";

export const dynamic = "force-dynamic";

const demoOnly = () =>
  NextResponse.json(
    { error: "Notes are stored on your Mac — not available in the web demo." },
    { status: 400 }
  );

export async function GET(req: NextRequest) {
  if (isDemo) return demoOnly();
  const threadId = req.nextUrl.searchParams.get("threadId");
  if (!threadId) return NextResponse.json({ error: "threadId required" }, { status: 400 });
  return NextResponse.json({ body: getNote(threadId) });
}

async function write(req: NextRequest) {
  if (isDemo) return demoOnly();
  const { threadId, body } = (await req.json()) as { threadId?: string; body?: string };
  if (!threadId) return NextResponse.json({ error: "threadId required" }, { status: 400 });
  setNote(threadId, body ?? "");
  return NextResponse.json({ ok: true });
}

export const PUT = write;

// navigator.sendBeacon can only POST. The notes panel uses it to flush an
// in-flight edit when the window is going away, so POST has to work too.
export const POST = write;
