import { NextRequest, NextResponse } from "next/server";
import { isDemo } from "@/lib/store";
import { getApiKey, setApiKey } from "@/lib/claude";

export const dynamic = "force-dynamic";

// The key is never sent back to the browser — only whether one exists and a
// masked tail, so the settings screen can show it's set without re-exposing it.
function shape() {
  const key = getApiKey();
  return {
    configured: !!key,
    hint: key ? `…${key.slice(-6)}` : null,
    fromEnv: !!process.env.ANTHROPIC_API_KEY,
  };
}

export async function GET() {
  if (isDemo) return NextResponse.json({ configured: false, hint: null, fromEnv: false });
  return NextResponse.json(shape());
}

export async function POST(req: NextRequest) {
  if (isDemo) return NextResponse.json({ error: "Not available here." }, { status: 400 });
  const { key } = (await req.json()) as { key: string };
  const trimmed = (key ?? "").trim();
  if (!trimmed.startsWith("sk-ant-")) {
    return NextResponse.json(
      { error: "That doesn't look like an Anthropic key — they start with sk-ant-." },
      { status: 400 }
    );
  }
  // Verify before saving, so a typo surfaces here rather than as a failed
  // answer inside a popover later.
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": trimmed,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 8,
        messages: [{ role: "user", content: "hi" }],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const detail = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      return NextResponse.json(
        {
          error:
            res.status === 401
              ? "Anthropic rejected that key."
              : (detail?.error?.message ?? `Anthropic returned ${res.status}.`),
        },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach Anthropic to check the key. Check your connection." },
      { status: 400 }
    );
  }
  setApiKey(trimmed);
  return NextResponse.json(shape());
}

export async function DELETE() {
  if (isDemo) return NextResponse.json({ ok: false });
  setApiKey(null);
  return NextResponse.json(shape());
}
