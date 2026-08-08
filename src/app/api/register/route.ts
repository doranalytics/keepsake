import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// Trades an invite code for a token belonging to one install. You hand out
// codes; each copy of Sidenote redeems one once and remembers the token.
//
// Deliberately stateless — no database. The token carries the code it came
// from and is signed, so the relay can verify it without storing anything, and
// deleting a code from SIDENOTE_INVITE_CODES instantly kills every install
// that redeemed it. That's the revocation story until per-user billing exists.

const codes = () =>
  (process.env.SIDENOTE_INVITE_CODES ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

export function signInstall(installId: string, code: string): string {
  const secret = process.env.SIDENOTE_SIGNING_SECRET ?? "";
  const body = `${installId}.${code}`;
  const sig = crypto.createHmac("sha256", secret).update(body).digest("hex").slice(0, 32);
  return `v1.${body}.${sig}`;
}

/** Verifies a token and returns the code it was issued against, or null. */
export function verifyInstall(token: string | null): { installId: string; code: string } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return null;
  const [, installId, code, sig] = parts;
  const expected = signInstall(installId, code).split(".")[3];
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  // A code removed from the env list stops working everywhere it was used.
  if (!codes().includes(code)) return null;
  return { installId, code };
}

export async function POST(req: NextRequest) {
  if (!process.env.SIDENOTE_SIGNING_SECRET) {
    return NextResponse.json({ error: "Sign-up isn't configured." }, { status: 503 });
  }
  const { code } = (await req.json()) as { code?: string };
  const clean = (code ?? "").trim();
  if (!clean || clean.includes(".")) {
    return NextResponse.json({ error: "Enter your invite code." }, { status: 400 });
  }
  if (!codes().includes(clean)) {
    return NextResponse.json(
      { error: "That code isn't valid. Check it and try again." },
      { status: 403 }
    );
  }
  const installId = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  return NextResponse.json({ token: signInstall(installId, clean) });
}
