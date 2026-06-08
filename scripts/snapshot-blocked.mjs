import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const DIST = new URL("../dist/", import.meta.url).pathname;
const PORT = 4327;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png" };
const server = createServer(async (req, res) => {
  try { let p = decodeURIComponent((req.url || "/").split("?")[0]); if (p === "/") p = "/index.html"; const f = join(DIST, normalize(p)); res.writeHead(200, { "content-type": TYPES[extname(f)] || "application/octet-stream" }); res.end(await readFile(f)); }
  catch { res.writeHead(404); res.end("nf"); }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 412, height: 900 }, deviceScaleFactor: 2 });
const shot = (n) => page.screenshot({ path: `snapshots/${n}.png` });

// Inyecta un puzzle solo donde la Torre y el Caballo quedan bloqueados.
const start = { R: 0, Q: 1, B: 2, N: 6, K: 8 }; // R(0,0) Q(0,1) B(0,2) N(2,0) K(2,2)
const target = { R: 0, Q: 1, B: 2, N: 6, K: 7 };

await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
await page.evaluate(({ start, target }) => {
  localStorage.clear();
  localStorage.setItem("tre-tutorial", "true");
  localStorage.setItem("tre-session", JSON.stringify({ screen: "solo", players: ["A", "B"] }));
  localStorage.setItem("tre-solo", JSON.stringify({ start, target, positions: start, used: 0 }));
}, { start, target });
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(600);

const hits = page.locator(".hit");
// Seleccionar la Torre (0,0) = índice 0 → debe mostrar verde (1,0) y rojos (0,1),(2,0).
await hits.nth(0).click({ force: true });
await page.waitForTimeout(300);
console.log("Torre: verdes:", await page.locator(".tile--hi").count(), "rojos:", await page.locator(".tile--block").count());
await shot("blk-rook");
// Deseleccionar y seleccionar el Caballo (2,0) = índice 6.
await hits.nth(0).click({ force: true });
await page.waitForTimeout(150);
await hits.nth(6).click({ force: true });
await page.waitForTimeout(300);
console.log("Caballo: verdes:", await page.locator(".tile--hi").count(), "rojos:", await page.locator(".tile--block").count());
await shot("blk-knight");

await browser.close();
server.close();
console.log("OK blocked");
