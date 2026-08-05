import { chromium } from "playwright";

const URL = "http://localhost:3999";
const browser = await chromium.launch();

const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

// mark onboarded so the app (not landing) renders
await page.goto(URL);
await page.evaluate(() => localStorage.setItem("keepsake-onboarded", "1"));

// seed a pinned message + notes for the notes shot
await page.evaluate(() => {
  localStorage.setItem(
    "keepsake-saved:demo-maya",
    JSON.stringify([
      {
        id: 1030,
        text: "it's weft you absolute muffin",
        sender: "Maya",
        isFromMe: false,
        date: Date.now() - 3 * 86400000,
        savedAt: Date.now(),
      },
      {
        id: 1027,
        text: "WE SHIPPED IT. the indigo wave pattern I designed made the cover of the lookbook 😭",
        sender: "Maya",
        isFromMe: false,
        date: Date.now() - 4 * 86400000,
        savedAt: Date.now(),
      },
    ])
  );
  localStorage.setItem(
    "keepsake-notes:demo-maya",
    "Textile designer in East Rock — jacquard patterns\nCortado person (foam is a scam, agreed)\nSister visiting Sunday · coffee at Fuel, Sat 9am\nHas never been on a wine tour 👀"
  );
});

// 1) hero: Maya thread open
await page.goto(URL, { waitUntil: "networkidle" });
await page.click("text=Maya Chen");
await page.waitForSelector("[data-mid]", { timeout: 15000 });
await page.waitForTimeout(600);
await page.screenshot({ path: "public/screenshot.png" });

// 2) search shot
await page.fill('input[placeholder="Search people and messages"]', "baguette");
await page.waitForSelector("mark", { timeout: 15000 });
await page.waitForTimeout(400);
await page.screenshot({ path: "public/shot-search.png" });
await page.click('button[aria-label="Clear search"]');

// 3) notes shot: open notes sheet with pinned messages
await page.click('button[aria-label="Notes"]');
await page.waitForSelector("text=Saved messages", { timeout: 10000 });
await page.waitForTimeout(600);
await page.screenshot({ path: "public/shot-notes.png" });
await page.keyboard.press("Escape");
await page.waitForTimeout(500);

// 4) remember shot: right-click menu open on a message
await page.click("text=his name is Baguette. I am not making this up", { button: "right" });
await page.waitForSelector("text=Remember this", { timeout: 5000 });
await page.waitForTimeout(300);
await page.screenshot({ path: "public/shot-remember.png" });
await page.keyboard.press("Escape");
await page.waitForTimeout(400);

// 5) export dialog shot
await page.click('button[aria-label="Export conversation"]');
await page.waitForSelector("text=Export conversation", { timeout: 5000 });
await page.waitForTimeout(400);
await page.screenshot({ path: "public/shot-export.png" });

await browser.close();
console.log("SHOTS CAPTURED");
