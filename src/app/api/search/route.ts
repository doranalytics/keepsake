import { NextRequest, NextResponse } from "next/server";
import { search } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") ?? "";
  const threadId = sp.get("threadId") ?? undefined;
  return NextResponse.json({ results: search(q, threadId) });
}
