import { NextRequest, NextResponse } from "next/server";
import { isDemo } from "@/lib/store";
import { getSaved, pinMessage, unpinMessage } from "@/lib/vault";

export const dynamic = "force-dynamic";

const demoOnly = () =>
  NextResponse.json(
    { error: "Saved messages are stored on your Mac — not available in the web demo." },
    { status: 400 }
  );

export async function GET(req: NextRequest) {
  if (isDemo) return demoOnly();
  const threadId = req.nextUrl.searchParams.get("threadId");
  if (!threadId) return NextResponse.json({ error: "threadId required" }, { status: 400 });
  return NextResponse.json({ messages: getSaved(threadId) });
}

export async function POST(req: NextRequest) {
  if (isDemo) return demoOnly();
  const { threadId, message } = (await req.json()) as {
    threadId?: string;
    message?: {
      id: number;
      text: string;
      sender: string;
      isFromMe: boolean;
      date: number;
    };
  };
  if (!threadId || !message) {
    return NextResponse.json({ error: "threadId and message required" }, { status: 400 });
  }
  const fresh = pinMessage(threadId, message);
  return NextResponse.json({ fresh, messages: getSaved(threadId) });
}

export async function DELETE(req: NextRequest) {
  if (isDemo) return demoOnly();
  const threadId = req.nextUrl.searchParams.get("threadId");
  const messageId = Number(req.nextUrl.searchParams.get("messageId"));
  if (!threadId || !Number.isFinite(messageId)) {
    return NextResponse.json({ error: "threadId and messageId required" }, { status: 400 });
  }
  unpinMessage(threadId, messageId);
  return NextResponse.json({ messages: getSaved(threadId) });
}
