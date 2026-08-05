import { NextResponse } from "next/server";
import { exec } from "child_process";
import { isDemo } from "@/lib/store";

export const dynamic = "force-dynamic";

// Opens the macOS Full Disk Access pane. FDA itself can only be toggled by the
// user in System Settings — apps are not allowed to grant it programmatically.
export async function POST() {
  if (isDemo) {
    return NextResponse.json({ error: "Only available when running locally." }, { status: 400 });
  }
  exec(
    'open "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles"'
  );
  return NextResponse.json({ ok: true });
}
