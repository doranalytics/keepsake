import { NextRequest, NextResponse } from "next/server";
import { isDemo } from "@/lib/store";
import { getSetting, setSetting } from "@/lib/vault";

export const dynamic = "force-dynamic";

const KEY = "dismissed_update";

// Remembers that you closed the update banner for a particular version, so it
// stays closed. Stored in the vault rather than localStorage because the
// WKWebView shell doesn't persist localStorage reliably — the same reason
// notes live there. A newer release writes a different sha, so the banner
// comes back exactly once per version.

export async function GET() {
  if (isDemo) return NextResponse.json({ dismissed: null });
  return NextResponse.json({ dismissed: getSetting(KEY) });
}

export async function POST(req: NextRequest) {
  if (isDemo) return NextResponse.json({ dismissed: null });
  const { sha } = (await req.json()) as { sha?: string };
  setSetting(KEY, sha ?? null);
  return NextResponse.json({ dismissed: getSetting(KEY) });
}
