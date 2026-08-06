import { NextResponse } from "next/server";
import { exec } from "child_process";
import { isDemo } from "@/lib/store";

export const dynamic = "force-dynamic";

// Reveals the running node binary in Finder so the user can drag it into the
// Full Disk Access list. process.execPath is exactly the executable macOS
// checks when Sidenote tries to read the Messages database.
export async function POST() {
  if (isDemo) {
    return NextResponse.json({ error: "Only available when running locally." }, { status: 400 });
  }
  // Inside Sidenote.app, macOS attributes disk access to the app bundle, so
  // that's what belongs in the Full Disk Access list — reveal it instead of
  // the engine binary buried inside it.
  const target = process.env.SIDENOTE_APP_PATH ?? process.execPath;
  exec(`open -R "${target}"`);
  return NextResponse.json({ ok: true, engine: target });
}
