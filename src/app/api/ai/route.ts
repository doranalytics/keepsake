import { NextRequest, NextResponse } from "next/server";
import { getRecentText, getThread, isDemo, retrieveRelevantText } from "@/lib/store";
import { detectOllama, streamChat } from "@/lib/ollama";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  if (isDemo) {
    return NextResponse.json(
      {
        error:
          "AI runs on-device via Ollama and is available when Sidenote runs on your Mac.",
      },
      { status: 400 }
    );
  }
  const body = (await req.json()) as {
    threadId: string;
    mode: "summarize" | "ask";
    question?: string;
    model?: string;
  };
  const thread = getThread(body.threadId);
  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }
  const ollama = await detectOllama();
  const model = body.model ?? ollama.model;
  if (!ollama.running || !model) {
    return NextResponse.json(
      { error: "Ollama isn't running. Open the Ollama app and try again." },
      { status: 503 }
    );
  }

  const { text: context, earliest } = getRecentText(body.threadId);
  // Questions also search the thread's entire history for relevant older
  // messages, so answers aren't limited to the recent window.
  const older =
    body.mode === "ask" && body.question
      ? retrieveRelevantText(body.threadId, body.question, earliest || Date.now())
      : "";
  const system = `You are Sidenote, a private on-device assistant that helps the user remember and understand their iMessage conversations. The conversation below is between the user ("Me") and ${thread.name}. Be concise, warm, and concrete. Never invent details that aren't in the messages.`;
  const user =
    body.mode === "summarize"
      ? `Here are the recent messages:\n\n${context}\n\nSummarize this conversation: the key facts, plans, and anything worth remembering about ${thread.name}. Use short bullet points.`
      : `${
          older
            ? `Older messages from this conversation that may relate to the question (found by searching the full history):\n\n${older}\n\n`
            : ""
        }Here are the recent messages:\n\n${context}\n\nQuestion: ${body.question ?? ""}\n\nAnswer based only on the messages above. If the answer isn't in them, say so.`;

  try {
    const stream = await streamChat(model, system, user);
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
