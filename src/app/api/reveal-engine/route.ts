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
  exec(`open -R "${process.execPath}"`);
  return NextResponse.json({ ok: true, engine: process.execPath });
}
