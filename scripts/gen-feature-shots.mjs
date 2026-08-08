// Marketing screenshots for the landing page, taken against the DEMO data so
// nothing real is ever published. The UI is the real UI; only the API
// responses that the demo can't serve (a configured key, an embedded thread,
// an AI answer) are stubbed, so the shots show what the app actually looks
// like rather than a mockup.
//
//   node scripts/gen-feature-shots.mjs [baseUrl]
//
// Expects a server running in demo mode: KEEPSAKE_DEMO=1 PORT=4849 npm start
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:4849";
const OUT = "public";
const VIEW = { width: 1440, height: 900 };

const ANSWER =
  "“Weft” is a weaving term — the thread that runs crosswise through a loom — " +
  "so Maya is punning on “left” to tease you about the pattern she designed. " +
  "It's an inside joke about her textile work, not a typo.";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEW, deviceScaleFactor: 2 });
// Cards render ~700px wide, so a 1040px crop at 2x stays crisp without zooming in.

// Demo mode hides the AI surfaces, since there's no key and no local index.
// Present as a configured local install so the real components render.
await page.route("**/api/status", async (route) => {
  const res = await route.fetch();
  const body = await res.json();
  await route.fulfill({
    json: { ...body, mode: "local", synced: true, ai: { configured: true } },
  });
});
await page.route("**/api/catchup?*", (route) =>
  route.fulfill({ json: { caughtUp: false, available: true, count: 842 } })
);
await page.route("**/api/catchup", (route) => route.fulfill({ json: { threads: [] } }));
await page.route("**/api/update**", (route) => route.fulfill({ json: { updateAvailable: false } }));
await page.route("**/api/explain", (route) =>
  route.fulfill({ headers: { "Content-Type": "text/plain" }, body: ANSWER })
);

const openFirstThread = async () => {
  await page.goto(`${BASE}/demo`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const row = page
    .locator("button, [role=button], li, a")
    .filter({ hasText: /\d{1,2}:\d{2}\s?(AM|PM)|Yesterday/ })
    .first();
  if (await row.count()) await row.click();
  await page.waitForSelector("[data-mid]", { timeout: 20000 });
  await page.waitForTimeout(800);
};

const bubbleWithText = (needle) =>
  page.locator("[data-mid] .whitespace-pre-wrap").filter({ hasText: needle }).first();

// ---------- 1. the right-click menu ----------
await openFirstThread();
let target = bubbleWithText("weft");
if (!(await target.count())) target = page.locator("[data-mid] .whitespace-pre-wrap").nth(4);
await target.scrollIntoViewIfNeeded();
await target.click({ button: "right" });
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/shot-explain-menu.png`, clip: clipAround(await target.boundingBox()) });
console.log("→ shot-explain-menu.png");

// ---------- 2. the answer popover ----------
await page.locator("text=Explain this").first().click();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/shot-explain.png`, clip: clipAround(await target.boundingBox()) });
console.log("→ shot-explain.png");

// ---------- 3. catch up ----------
await openFirstThread();
const tab = page.locator('[role=tab]').filter({ hasText: "Ask AI" }).first();
if (await tab.count()) await tab.click();
else await page.locator("text=Ask AI").first().click().catch(() => {});
await page.waitForTimeout(1200);
await page.waitForSelector("text=Catch up", { timeout: 10000 }).catch(() => {});
const panel = await page.locator("text=Catch up on this chat").first().boundingBox().catch(() => null);
if (panel) {
  await page.screenshot({
    path: `${OUT}/shot-catchup.png`,
    clip: { x: VIEW.width - 460, y: Math.max(0, panel.y - 90), width: 450, height: 281 },
  });
  console.log("→ shot-catchup.png");
} else {
  console.log("!! catch-up bar not found — skipped");
}

await browser.close();

// An 8:5 crop centred on a point, kept inside the viewport.
function clipAround(box) {
  const width = 1040;
  const height = 650;
  const cx = box ? box.x + box.width / 2 : VIEW.width / 2;
  const cy = box ? box.y : VIEW.height / 2;
  return {
    x: Math.max(0, Math.min(cx - width / 2, VIEW.width - width)),
    y: Math.max(0, Math.min(cy - 60, VIEW.height - height)),
    width,
    height,
  };
}
