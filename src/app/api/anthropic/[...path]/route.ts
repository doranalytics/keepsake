import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Relays Anthropic calls so installed copies of Sidenote don't each need their
// own API key. The app points the Anthropic SDK's baseURL here; this adds the
// real key server-side and streams the response straight back, so the SDK —
// including its tool loop — works unchanged. Tools still execute on the user's
// Mac: only the model call crosses the wire.
//
// ⚠️  This spends the operator's Anthropic balance. The shared secret below is
// baked into a downloadable app, so treat it as obfuscation, not security —
// anyone determined can extract it. It stops casual abuse and nothing more.
// Before a wide launch this needs real per-install accounts and metering.

const UPSTREAM = "https://api.anthropic.com";
const ALLOWED = new Set(["v1/messages"]);

// Per-IP sliding window. In-memory, so it resets on cold start and isn't
// shared across regions — a speed bump, not a quota.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // crude bound on memory
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: { message: "This Sidenote server has no API key configured." } },
      { status: 503 }
    );
  }

  const secret = process.env.SIDENOTE_CLIENT_SECRET;
  if (secret && req.headers.get("x-sidenote-client") !== secret) {
    return NextResponse.json(
      { error: { message: "Not authorised." } },
      { status: 401 }
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: { message: "Too many requests — give it a minute." } },
      { status: 429 }
    );
  }

  const path = (await ctx.params).path.join("/");
  if (!ALLOWED.has(path)) {
    return NextResponse.json({ error: { message: "Not found." } }, { status: 404 });
  }

  const body = await req.text();
  // Bound what a single call can cost, whatever the client asked for.
  let payload = body;
  try {
    const parsed = JSON.parse(body) as { max_tokens?: number };
    if (typeof parsed.max_tokens === "number" && parsed.max_tokens > 4000) {
      payload = JSON.stringify({ ...parsed, max_tokens: 4000 });
    }
  } catch {
    return NextResponse.json({ error: { message: "Bad request." } }, { status: 400 });
  }

  const upstream = await fetch(`${UPSTREAM}/${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "anthropic-version": req.headers.get("anthropic-version") ?? "2023-06-01",
      "x-api-key": key,
      ...(req.headers.get("anthropic-beta")
        ? { "anthropic-beta": req.headers.get("anthropic-beta")! }
        : {}),
    },
    body: payload,
  });

  // Pass the body through untouched so streaming keeps working.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  });
}
