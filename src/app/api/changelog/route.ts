import { NextResponse } from "next/server";
import { CHANGELOG } from "@/lib/changelog";

// Public on every deployment: installed apps ask the live site what's new.
export async function GET() {
  return NextResponse.json({ entries: CHANGELOG });
}
