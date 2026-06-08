import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const DIST = new URL("../dist/", import.meta.url).pathname;
const PORT = 4322;
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

await page.evaluate?.(() => {}).catch(() => {});
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(500);

await clickRe(/Modo infinito/i);
await page.waitForTimeout(700);
await shot("solo-1");

await clickRe(/Rendirse/i);
await page.waitForTimeout(400);
await shot("solo-2-result");

await clickRe(/Ver soluci/i);
await page.waitForTimeout(2600); // dejar avanzar la reproducción
await shot("solo-3-solution");

const stars = await page.locator(".round-chip").first().innerText();
console.log("chip estrellas:", JSON.stringify(stars));

await browser.close();
server.close();
console.log("OK solo");
