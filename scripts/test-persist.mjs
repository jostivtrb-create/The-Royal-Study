import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const DIST = new URL("../dist/", import.meta.url).pathname;
const PORT = 4321;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png" };
const server = createServer(async (req, res) => {
  try { let p = decodeURIComponent((req.url || "/").split("?")[0]); if (p === "/") p = "/index.html"; const f = join(DIST, normalize(p)); res.writeHead(200, { "content-type": TYPES[extname(f)] || "application/octet-stream" }); res.end(await readFile(f)); }
  catch { res.writeHead(404); res.end("nf"); }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 412, height: 900 } });
const clickRe = (re) => page.getByRole("button", { name: re }).first().click({ force: true });
const clickExact = (t) => page.getByRole("button", { name: t, exact: true }).first().click({ force: true });

await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await clickRe(/Jugar local/i);
await page.waitForTimeout(300);
await clickExact("3");
await clickRe(/Comenzar/i);
await page.waitForTimeout(300);
await clickRe(/Lo tengo/i);
await page.waitForTimeout(200);
await page.locator(".pick-btn").first().click({ force: true });
await page.waitForTimeout(200);
await clickExact("4"); // apuesta 4 → fase counter
await page.waitForTimeout(400);

const beforeRound = await page.locator(".round-chip").innerText().catch(() => "");
const counterBefore = await page.getByText(/lo mejora/i).count();
console.log("Antes de recargar → ronda:", JSON.stringify(beforeRound), "| en counter:", counterBefore > 0);

// RECARGAR
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(700);
const inGame = await page.locator(".round-chip").count();
const afterRound = await page.locator(".round-chip").innerText().catch(() => "");
const counterAfter = await page.getByText(/lo mejora/i).count();
console.log("Tras recargar → sigue en juego:", inGame > 0, "| ronda:", JSON.stringify(afterRound), "| en counter:", counterAfter > 0);

// SALIR de la partida
await page.locator(".exit-btn").click({ force: true });
await page.waitForTimeout(300);
await clickRe(/^Salir$/i);
await page.waitForTimeout(400);
const atHome = await page.getByRole("button", { name: /Jugar local/i }).count();
console.log("Tras Salir → en Home:", atHome > 0);

// Recargar tras salir: no debe volver a la partida.
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(600);
const stillHome = await page.getByRole("button", { name: /Jugar local/i }).count();
const noGame = await page.locator(".round-chip").count();
console.log("Tras salir + recargar → en Home:", stillHome > 0, "| sin partida:", noGame === 0);

await browser.close();
server.close();
