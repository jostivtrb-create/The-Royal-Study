import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const DIST = new URL("../dist/", import.meta.url).pathname;
const PORT = 4323;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png" };
const server = createServer(async (req, res) => {
  try { let p = decodeURIComponent((req.url || "/").split("?")[0]); if (p === "/") p = "/index.html"; const f = join(DIST, normalize(p)); res.writeHead(200, { "content-type": TYPES[extname(f)] || "application/octet-stream" }); res.end(await readFile(f)); }
  catch { res.writeHead(404); res.end("nf"); }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 412, height: 900 }, deviceScaleFactor: 2 });
const shot = (n) => page.screenshot({ path: `snapshots/${n}.png` });
const clickRe = (re) => page.getByRole("button", { name: re }).first().click({ force: true });

await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(600);

const isTut = await page.locator(".tut").count();
console.log("tutorial sale en primera vez:", isTut > 0);
await shot("tut-0");

await clickRe(/Empezar/i);
await page.waitForTimeout(500);
await shot("tut-1");

await clickRe(/Siguiente/i);
await page.waitForTimeout(500);
await shot("tut-2-move");

// Paso mover: seleccionar Rey (celda 8) y mover a celda 7.
const hits = page.locator(".hit");
await hits.nth(8).click({ force: true });
await page.waitForTimeout(250);
await hits.nth(7).click({ force: true });
await page.waitForTimeout(500);
await shot("tut-2-done");
await page.waitForTimeout(1500); // auto-avanza a girar

await shot("tut-3-rotate");
await clickRe(/Girar tablero/i);
await page.waitForTimeout(1800); // gira y auto-avanza

await shot("tut-4");
await clickRe(/Siguiente/i);
await page.waitForTimeout(500);
await shot("tut-5-final");
const hasCTA = await page.getByRole("button", { name: /Jugar local/i }).count();
console.log("final con CTA jugar:", hasCTA > 0);

await browser.close();
server.close();
console.log("OK tut");
