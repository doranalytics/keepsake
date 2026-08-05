import { chromium } from "playwright";

const URL = "https://keepsake-liard-rho.vercel.app";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const fail = (msg) => {
  console.error("FAIL:", msg);
  process.exit(1);
};

await page.goto(URL, { waitUntil: "networkidle" });

// 1. Thread list is alive with demo data
await page.waitForSelector("text=Maya Chen", { timeout: 15000 }).catch(() => fail("thread list"));

// 2. Global search finds a message
await page.fill('input[placeholder="Search people and messages"]', "baguette");
await page.waitForSelector("mark", { timeout: 15000 }).catch(() => fail("search results"));

// 3. Click a message result → jumps into the thread
await page.click("text=BAGUETTE. this is the best day of my life");
await page.waitForSelector('[data-mid]', { timeout: 15000 }).catch(() => fail("thread view"));

// 4. Open notes panel and type a note
await page.click('button[aria-label="Notes"]');
await page.waitForSelector("textarea", { timeout: 10000 }).catch(() => fail("notes panel"));
await page.fill("textarea", "Loves cortados. Designed the indigo wave pattern. Sister visiting Sunday.");
await page.waitForSelector("text=Saved", { timeout: 5000 }).catch(() => fail("notes save"));

// 5. AI tab shows the on-device notice in demo mode
await page.click('button[role="tab"]:has-text("Ask AI")');
await page.waitForSelector("text=On-device AI", { timeout: 10000 }).catch(() => fail("ai panel"));

// Screenshot of the working app (close sheet first for a clean shot)
await page.keyboard.press("Escape");
await page.waitForTimeout(600);
await page.screenshot({ path: "verify/live.png" });

// Mobile pass: list → thread
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto(URL, { waitUntil: "networkidle" });
await mobile.waitForSelector("text=Maya Chen", { timeout: 15000 }).catch(() => fail("mobile list"));
await mobile.click("text=Maya Chen");
await mobile.waitForSelector('[data-mid]', { timeout: 15000 }).catch(() => fail("mobile thread"));
await mobile.screenshot({ path: "verify/live-mobile.png" });

await browser.close();
console.log("ALL CHECKS PASSED");
