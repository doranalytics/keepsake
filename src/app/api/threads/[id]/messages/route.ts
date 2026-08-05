import { NextRequest, NextResponse } from "next/server";
import { getMessages, getThread } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const threadId = decodeURIComponent(id);
  const thread = getThread(threadId);
  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }
  const sp = req.nextUrl.searchParams;
  const before = sp.get("before") ? Number(sp.get("before")) : undefined;
  const around = sp.get("around") ? Number(sp.get("around")) : undefined;
  const page = getMessages(threadId, { before, around });
  return NextResponse.json({ thread, ...page });
}
