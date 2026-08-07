import { NextRequest, NextResponse } from "next/server";
import { isDemo } from "@/lib/store";
import { createConversation, listConversations } from "@/lib/vault";

export const dynamic = "force-dynamic";

const demoOnly = () =>
  NextResponse.json(
    { error: "AI chats are stored on your Mac — not available in the web demo." },
    { status: 400 }
  );

export async function GET(req: NextRequest) {
  if (isDemo) return demoOnly();
  const threadId = req.nextUrl.searchParams.get("threadId");
  if (!threadId) return NextResponse.json({ error: "threadId required" }, { status: 400 });
  return NextResponse.json({ conversations: listConversations(threadId) });
}

export async function POST(req: NextRequest) {
  if (isDemo) return demoOnly();
  const { threadId, title } = (await req.json()) as { threadId?: string; title?: string };
  if (!threadId) return NextResponse.json({ error: "threadId required" }, { status: 400 });
  return NextResponse.json({ conversation: createConversation(threadId, title || undefined) });
}
