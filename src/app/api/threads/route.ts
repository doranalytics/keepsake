import { NextRequest, NextResponse } from "next/server";
import { getThreads } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? undefined;
  return NextResponse.json({ threads: getThreads(q) });
}
