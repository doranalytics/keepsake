import { chromium } from "playwright";

const URL = "https://keepsake-liard-rho.vercel.app";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const fail = (m) => {
  console.error("FAIL:", m);
  process.exit(1);
};

await page.goto(URL, { waitUntil: "networkidle" });
await page.click("text=Explore the demo first").catch(() => {});
await page.click("text=Maya Chen");
await page.waitForSelector("[data-mid]", { timeout: 15000 }).catch(() => fail("thread"));

// Right-click a bubble → "Remember this" → saved to notes
await page.click("text=his name is Baguette. I am not making this up", { button: "right" });
await page.waitForSelector("text=Remember this", { timeout: 5000 }).catch(() => fail("context menu"));
await page.click("text=Remember this");
await page.waitForSelector("text=Saved to Maya Chen's notes", { timeout: 5000 }).catch(() => fail("flash"));
await page.click('button[aria-label="Notes"]');
await page.waitForSelector("textarea", { timeout: 5000 }).catch(() => fail("notes open"));
const notes = await page.inputValue("textarea");
if (!notes.includes("Baguette")) fail("note content not saved");
await page.keyboard.press("Escape");

// Export dialog → copy path returns data
await page.waitForTimeout(400);
await page.click('button[aria-label="Export conversation"]');
await page.waitForSelector("text=Export conversation", { timeout: 5000 }).catch(() => fail("export dialog"));
await page.getByRole("dialog").getByRole("button", { name: "Everything", exact: true }).click();
const exportResp = await page.evaluate(async () => {
  const r = await fetch(`/api/threads/demo-maya/export?since=0`);
  const d = await r.json();
  return { ok: r.ok, count: d.count, hasText: d.text.includes("Conversation with Maya Chen") };
});
if (!exportResp.ok || exportResp.count < 40 || !exportResp.hasText) fail("export data");
await page.screenshot({ path: "verify/export.png" });

await browser.close();
console.log("MEMORY + EXPORT CHECKS PASSED, exported", exportResp.count, "messages");
