import { NextRequest, NextResponse } from "next/server";
import { getRecentText, getThread, isDemo, searchThread } from "@/lib/store";
import { friendlyError, hasApiKey, streamClaude, type ToolSpec } from "@/lib/claude";
import { appendExchange, getConversationMessages } from "@/lib/vault";
import type Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  if (isDemo) {
    return NextResponse.json(
      {
        error:
          "AI runs when Sidenote is installed on your Mac, reading your own messages.",
      },
      { status: 400 }
    );
  }
  if (!hasApiKey()) {
    return NextResponse.json(
      { error: "Add your Anthropic API key in Settings to use AI." },
      { status: 402 }
    );
  }
  const body = (await req.json()) as {
    threadId: string;
    mode: "summarize" | "ask";
    question?: string;
    conversationId?: string;
  };
  const thread = getThread(body.threadId);
  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const { text: recent } = getRecentText(body.threadId);

  // The whole history reaches the model through this tool rather than by
  // stuffing the prompt. On a 42,000-message thread even a very large window
  // covers only the last couple of months, so searching beats shipping.
  const search: ToolSpec = {
    name: "search_messages",
    description:
      "Search the full history of this conversation, going back years — far beyond the recent messages you were given. " +
      "Use it whenever the question refers to the past, to something you can't see, or to a person, place, or plan mentioned earlier. " +
      "Call it several times with different wordings if the first search comes back thin.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "What to look for, in natural language or keywords.",
        },
      },
      required: ["query"],
    },
    run: async (input) => searchThread(body.threadId, String(input.query ?? "")),
  };

  const system =
    `You are Sidenote, helping the user understand their own iMessage history. ` +
    `This conversation is between the user ("Me") and ${thread.name}. ` +
    `Be concise, warm, and concrete. Never invent details that aren't in the messages — ` +
    `if the answer isn't there, search once more, then say plainly that you couldn't find it.`;

  const prompt =
    body.mode === "summarize"
      ? `Summarize my conversation with ${thread.name}`
      : (body.question ?? "");

  const history: Anthropic.MessageParam[] = body.conversationId
    ? getConversationMessages(body.conversationId).map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("assistant" as const),
        content: m.text,
      }))
    : [];

  const task =
    body.mode === "summarize"
      ? `Here are the most recent messages:\n\n${recent}\n\nSummarize this conversation: the key facts, plans, and anything worth remembering about ${thread.name}. Short bullet points.`
      : `Here are the most recent messages for context:\n\n${recent}\n\nQuestion: ${prompt}`;

  try {
    const stream = streamClaude({
      system,
      messages: [...history, { role: "user", content: task }],
      tools: [search],
      maxTokens: 2000,
      signal: req.signal,
      onDone: (answer) => {
        // Written server-side once the tokens are out, so the answer lands in
        // the vault even if the window closed mid-stream.
        if (body.conversationId && answer.trim()) {
          try {
            appendExchange(body.conversationId, prompt, answer);
          } catch {
            // never let a persistence hiccup kill an answer already delivered
          }
        }
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (e) {
    return NextResponse.json({ error: friendlyError(e as Error) }, { status: 502 });
  }
}
