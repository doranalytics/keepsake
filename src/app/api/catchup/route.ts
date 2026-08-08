import { NextRequest, NextResponse } from "next/server";
import { getThread, getThreadTexts, isDemo } from "@/lib/store";

export const dynamic = "force-dynamic";
// Vercel's ceiling, and irrelevant to the only place this actually runs: the
// self-hosted server inside Sidenote.app, which doesn't enforce it. Catching up
// on the largest thread takes a couple of minutes there.
export const maxDuration = 300;

// "Catching up" on a conversation means embedding it so semantic search works.
// It is opt-in per thread and nothing is indexed out of the box: most people
// have real conversations with a dozen people, not five hundred, and a
// ten-minute wait on first launch would be a tax on people who never ask a
// single question. Explaining a message needs none of this.

export async function GET(req: NextRequest) {
  const threadId = req.nextUrl.searchParams.get("threadId");
  if (!threadId) return NextResponse.json({ error: "threadId required" }, { status: 400 });
  if (isDemo) return NextResponse.json({ caughtUp: false, available: false, count: 0 });
  const { isCaughtUp } = await import("@/lib/embeddings");
  return NextResponse.json({
    caughtUp: isCaughtUp(threadId),
    available: true,
    count: getThreadTexts(threadId).length,
  });
}

export async function POST(req: NextRequest) {
  if (isDemo) {
    return NextResponse.json({ error: "Only available on your Mac." }, { status: 400 });
  }
  const { threadId } = (await req.json()) as { threadId: string };
  if (!getThread(threadId)) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const messages = getThreadTexts(threadId);
  const encoder = new TextEncoder();

  // NDJSON progress so the bar can say "4,200 of 11,353" rather than spinning.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(encoder.encode(JSON.stringify(o) + "\n"));
      try {
        const { catchUpThread } = await import("@/lib/embeddings");
        send({ status: "starting", total: messages.length });
        await catchUpThread(threadId, messages, (p) => send({ done: p.done, total: p.total }));
        send({ status: "done", total: messages.length });
      } catch (e) {
        send({ error: (e as Error).message });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}

export async function DELETE(req: NextRequest) {
  const threadId = req.nextUrl.searchParams.get("threadId");
  if (!threadId || isDemo) return NextResponse.json({ ok: false });
  const { forgetThread } = await import("@/lib/embeddings");
  forgetThread(threadId);
  return NextResponse.json({ ok: true });
}
