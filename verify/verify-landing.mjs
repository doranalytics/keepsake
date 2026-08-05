import { chromium } from "playwright";

const URL = "https://sidenote.lol";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const fail = (m) => {
  console.error("FAIL:", m);
  process.exit(1);
};

// Fresh visitor → landing page
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForSelector("text=Every text.", { timeout: 15000 }).catch(() => fail("landing hero"));
await page.click("text=Get Sidenote for Mac");
await page.waitForSelector("text=curl -fsSL", { timeout: 5000 }).catch(() => fail("install command"));
await page.screenshot({ path: "verify/landing.png" });

// Enter demo → app works
await page.click("text=Browse the demo →");
await page.waitForSelector("text=Maya Chen", { timeout: 15000 }).catch(() => fail("demo after landing"));

await browser.close();
console.log("LANDING CHECKS PASSED");
