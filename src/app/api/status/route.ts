import { NextResponse } from "next/server";
import { getStatus, isDemo } from "@/lib/store";
import { detectOllama } from "@/lib/ollama";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = getStatus();
  if (!isDemo) {
    status.ollama = await detectOllama();
    // In the Mac app it's the bundle that appears in the Full Disk Access
    // list, not the engine binary inside it.
    status.engine = process.env.SIDENOTE_APP_PATH ?? process.execPath;
    if (process.env.SIDENOTE_TRANSLOCATED === "1") status.translocated = true;
    if (status.synced) {
      // live mode: new texts flow into the index within seconds
      const { startLiveSync } = await import("@/lib/local-sync");
      startLiveSync();
    }
  }
  return NextResponse.json(status);
}
