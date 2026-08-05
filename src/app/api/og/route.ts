import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Fetches a link's Open Graph card (title / image / site) so URLs in
// conversations render as previews. Metadata only — never proxies content.
const cache = new Map<string, unknown>();

const pick = (html: string, patterns: RegExp[]): string | null => {
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return null;
};

const meta = (prop: string) => [
  new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"),
  new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, "i"),
];

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "Bad url" }, { status: 400 });
  }
  if (cache.has(url)) return NextResponse.json(cache.get(url));

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Sidenote link previews)" },
    });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.includes("html")) throw new Error("not a page");
    const html = (await res.text()).slice(0, 300_000);
    const image = pick(html, meta("og:image")) ?? pick(html, meta("twitter:image"));
    const body = {
      url,
      title:
        pick(html, meta("og:title")) ??
        pick(html, [/<title[^>]*>([^<]+)<\/title>/i]),
      description: pick(html, meta("og:description")) ?? pick(html, meta("description")),
      image: image && /^https?:\/\//i.test(image) ? image : null,
      site: pick(html, meta("og:site_name")) ?? new URL(res.url || url).hostname,
    };
    if (cache.size > 500) cache.clear();
    cache.set(url, body);
    return NextResponse.json(body);
  } catch {
    const body = { url, title: null, description: null, image: null, site: new URL(url).hostname };
    cache.set(url, body);
    return NextResponse.json(body);
  }
}
