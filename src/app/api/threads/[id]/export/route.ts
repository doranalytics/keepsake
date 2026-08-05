import { NextRequest, NextResponse } from "next/server";
import { exportThread } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const since = req.nextUrl.searchParams.get("since");
  const result = exportThread(
    decodeURIComponent(id),
    since ? Number(since) : undefined
  );
  if (!result) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }
  return NextResponse.json(result);
}
