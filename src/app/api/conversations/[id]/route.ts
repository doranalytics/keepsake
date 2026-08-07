import { NextRequest, NextResponse } from "next/server";
import { isDemo } from "@/lib/store";
import {
  deleteConversation,
  getConversation,
  getConversationMessages,
  renameConversation,
} from "@/lib/vault";

export const dynamic = "force-dynamic";

const demoOnly = () =>
  NextResponse.json(
    { error: "AI chats are stored on your Mac — not available in the web demo." },
    { status: 400 }
  );

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (isDemo) return demoOnly();
  const { id } = await params;
  const conversation = getConversation(id);
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }
  return NextResponse.json({ conversation, messages: getConversationMessages(id) });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (isDemo) return demoOnly();
  const { id } = await params;
  const { title } = (await req.json()) as { title?: string };
  const trimmed = title?.trim();
  if (!trimmed) return NextResponse.json({ error: "title required" }, { status: 400 });
  renameConversation(id, trimmed);
  return NextResponse.json({ conversation: getConversation(id) });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (isDemo) return demoOnly();
  const { id } = await params;
  deleteConversation(id);
  return NextResponse.json({ ok: true });
}
