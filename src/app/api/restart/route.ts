import { NextResponse } from "next/server";
import { isDemo } from "@/lib/store";

export const dynamic = "force-dynamic";

// Exits the server so launchd (KeepAlive) brings it straight back up — the
// only way a fresh Full Disk Access grant takes effect. When Sidenote is run
// by hand (npm run dev / npm start) there is nothing to relaunch it, so we
// report managed: false and let the UI explain the manual restart instead.
export async function POST() {
  if (isDemo) {
    return NextResponse.json({ error: "Only available when running locally." }, { status: 400 });
  }
  // Managed = something relaunches us after exit: launchd for the installer
  // path, the native shell for Sidenote.app.
  const managed =
    process.env.SIDENOTE_MANAGED === "1" || process.env.SIDENOTE_APP === "1";
  if (managed) {
    setTimeout(() => process.exit(0), 500);
  }
  return NextResponse.json({ ok: true, managed });
}
