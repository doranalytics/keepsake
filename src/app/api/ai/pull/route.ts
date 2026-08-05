import { NextRequest, NextResponse } from "next/server";
import { isDemo } from "@/lib/store";
import { OLLAMA } from "@/lib/ollama";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Proxies Ollama's model download so the browser can show live progress.
export async function POST(req: NextRequest) {
  if (isDemo) {
    return NextResponse.json({ error: "Only available when running locally." }, { status: 400 });
  }
  const { model } = (await req.json()) as { model: string };
  if (!model || !/^[\w.:-]+$/.test(model)) {
    return NextResponse.json({ error: "Invalid model name." }, { status: 400 });
  }
  const res = await fetch(`${OLLAMA}/api/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, stream: true }),
  });
  if (!res.ok || !res.body) {
    return NextResponse.json(
      { error: "Ollama isn't running. Open the Ollama app first." },
      { status: 503 }
    );
  }
  return new Response(res.body, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
}
