// Sirve el build de /dist y recorre el flujo del duelo capturando cada fase.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const DIST = new URL("../dist/", import.meta.url).pathname;
const PORT = 4317;
const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
};

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent((req.url || "/").split("?")[0]);
    if (p === "/") p = "/index.html";
    const data = await readFile(join(DIST, normalize(p)));
    res.writeHead(200, { "content-type": TYPES[extname(join(DIST, p))] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 412, height: 900 }, deviceScaleFactor: 2 });
const shot = (name) => page.screenshot({ path: `snapshots/${name}.png` });
const click = async (re) => {
  const b = page.getByRole("button", { name: re }).first();
  await b.click({ force: true });
};
// Selecciona una pieza tocando casillas hasta que aparezca el resaltado.
async function selectAPiece() {
  const tiles = page.locator(".tile");
  const n = await tiles.count();
  for (let i = 0; i < n; i++) {
    await tiles.nth(i).click({ force: true });
    await page.waitForTimeout(120);
    if (await page.locator(".piece-slot--sel").count()) return true;
  }
  return false;
}

await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await shot("01-home");

await click(/Jugar local/i);
await page.waitForTimeout(700);
await shot("02-race");

await click(/Jugador 1/i);
await page.waitForTimeout(500);
await shot("03-bid");

await page.getByRole("button", { name: "5", exact: true }).first().click({ force: true });
await page.waitForTimeout(500);
await shot("04-counter");

await click(/Paso/i);
await page.waitForTimeout(500);
await shot("05-execute");

// Selecciona una pieza para ver destinos resaltados.
await selectAPiece();
await page.waitForTimeout(400);
await shot("06-execute-selected");

// Escenario corto para ver el overlay de resultado: apuesta 1, sin contra, 1 mov.
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await click(/Jugar local/i);
await page.waitForTimeout(400);
await click(/Jugador 1/i);
await page.waitForTimeout(300);
await page.getByRole("button", { name: "1", exact: true }).first().click({ force: true });
await page.waitForTimeout(300);
await click(/Paso/i); // presupuesto = 1
await page.waitForTimeout(300);
await selectAPiece();
await page.waitForTimeout(200);
const hi = page.locator(".tile--hi").first();
if (await hi.count()) await hi.click({ force: true });
await page.waitForTimeout(700);
await shot("07-result");

await browser.close();
server.close();
console.log("OK: capturas 01..07");
