import { chromium } from "playwright";

const URL = "https://keepsake-liard-rho.vercel.app";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const fail = (msg) => {
  console.error("FAIL:", msg);
  process.exit(1);
};

// Fresh visitor → onboarding modal appears
await page.goto(URL, { waitUntil: "networkidle" });
await page
  .waitForSelector("text=Set up Keepsake on your Mac", { timeout: 15000 })
  .catch(() => fail("onboarding modal"));
await page
  .waitForSelector("text=curl -fsSL", { timeout: 5000 })
  .catch(() => fail("install command shown"));
await page.screenshot({ path: "verify/onboarding.png" });

// Dismiss → demo works, flag persists across reload
await page.click("text=Explore the demo first");
await page.waitForSelector("text=Maya Chen", { timeout: 15000 }).catch(() => fail("demo after dismiss"));
await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector("text=Maya Chen", { timeout: 15000 });
const modalAgain = await page.locator("text=Set up Keepsake on your Mac").count();
if (modalAgain > 0) fail("modal should not reappear after dismissal");

// Banner reopens it on demand
await page.click("text=Sample data — set up Keepsake");
await page
  .waitForSelector("text=Set up Keepsake on your Mac", { timeout: 10000 })
  .catch(() => fail("banner reopens modal"));

await browser.close();
console.log("ONBOARDING CHECKS PASSED");
