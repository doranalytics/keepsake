import { NextRequest, NextResponse } from "next/server";
import { getAvatar } from "@/lib/store";

export const dynamic = "force-dynamic";

// Serves a contact's photo (pulled from the macOS AddressBook during sync)
// by display name. 404 means "no photo" — the UI falls back to initials.
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "Missing name" }, { status: 400 });
  }
  const avatar = getAvatar(name);
  if (!avatar) {
    return NextResponse.json({ error: "No photo" }, { status: 404 });
  }
  return new Response(new Uint8Array(avatar.data), {
    headers: {
      "Content-Type": avatar.mime,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
