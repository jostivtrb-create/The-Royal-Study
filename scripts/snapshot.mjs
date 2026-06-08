// Sirve el build de /dist y recorre el flujo (N jugadores) capturando cada fase.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const DIST = new URL("../dist/", import.meta.url).pathname;
const PORT = 4317;
const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".json": "application/json",
  ".webmanifest": "application/manifest+json", ".png": "image/png",
};
const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent((req.url || "/").split("?")[0]);
    if (p === "/") p = "/index.html";
    const f = join(DIST, normalize(p));
    res.writeHead(200, { "content-type": TYPES[extname(f)] || "application/octet-stream" });
    res.end(await readFile(f));
  } catch { res.writeHead(404); res.end("nf"); }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 412, height: 900 }, deviceScaleFactor: 2 });
const shot = (n) => page.screenshot({ path: `snapshots/${n}.png` });
const clickRe = async (re) => page.getByRole("button", { name: re }).first().click({ force: true });
const clickExact = async (t) => page.getByRole("button", { name: t, exact: true }).first().click({ force: true });
async function selectMovablePiece() {
  const hits = page.locator(".hit");
  const n = await hits.count();
  for (let i = 0; i < n; i++) {
    await hits.nth(i).click({ force: true });
    await page.waitForTimeout(120);
    if (await page.locator(".tile--hi").count()) return i;
    if (await page.locator(".piece-slot--sel").count()) {
      await hits.nth(i).click({ force: true });
      await page.waitForTimeout(50);
    }
  }
  return -1;
}

await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await shot("01-home");

await clickRe(/Jugar local/i);
await page.waitForTimeout(500);
await clickExact("3");                       // 3 jugadores
await page.waitForTimeout(200);
await shot("02-setup");

await clickRe(/Comenzar/i);
await page.waitForTimeout(500);
await shot("03-race");

await clickRe(/Lo tengo/i);
await page.waitForTimeout(400);
await shot("04-pick-bidder");

await page.locator(".pick-btn").first().click({ force: true });
await page.waitForTimeout(400);
await shot("05-bid");

await clickExact("3");                        // apuesta 3
await page.waitForTimeout(400);
await shot("06-counter");

await clickRe(/lo mejoro/i);                  // rebatir (un solo rebatir)
await page.waitForTimeout(400);
await shot("07-pick-challenger");

await page.locator(".pick-btn").first().click({ force: true });
await page.waitForTimeout(300);
await clickExact("1");                         // mejora a 1 → ejecuta directamente
await page.waitForTimeout(500);
await shot("08-execute");

await selectMovablePiece();
await page.waitForTimeout(200);
const tgt = page.locator(".tile--hi").first();
if (await tgt.count()) {
  const box = await tgt.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); // 1 mov → falla
}
await page.waitForTimeout(700);
await shot("09-result");

await clickRe(/Siguiente ronda/i);
await page.waitForTimeout(700);
await shot("10-round2");

// Ajustes
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await clickRe(/Ajustes/i);
await page.waitForTimeout(400);
await shot("11-settings");

await browser.close();
server.close();
console.log("OK: capturas 01..11");
