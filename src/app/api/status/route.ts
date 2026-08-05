import { NextResponse } from "next/server";
import { getStatus, isDemo } from "@/lib/store";
import { detectOllama } from "@/lib/ollama";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = getStatus();
  if (!isDemo) {
    status.ollama = await detectOllama();
    status.engine = process.execPath;
    if (status.synced) {
      // live mode: new texts flow into the index within seconds
      const { startLiveSync } = await import("@/lib/local-sync");
      startLiveSync();
    }
  }
  return NextResponse.json(status);
}
