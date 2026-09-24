/** Frames each ship and saves ships/<id>/hero.webp for the fleet index. */
import { launch, newPage, TIMEOUT } from './lib/browser.mjs';
import { createServer } from 'vite';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ids = readdirSync(join(root, 'ships'), { withFileTypes: true })
  .filter(d => d.isDirectory()).map(d => d.name).sort();

const server = await createServer({ root, logLevel: 'silent', server: { port: 5198, strictPort: true } });
await server.listen();
const browser = await launch();

for (const id of ids) {
  // A fresh page each time: a hash-only change would not reload the viewer.
  const page = await newPage(browser, { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:5198/${(process.env.HERO_PATH ?? 'ship/ID').replace('ID', id)}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.FLEET && !window.FLEET.rig.fly, null, { timeout: TIMEOUT });
  await page.evaluate(() => {
    const h = window.FLEET.spec.camera.hero;
    if (h) window.FLEET.pose(h.pos, h.target);
  });
  await page.waitForTimeout(1500);
  await page.keyboard.press('h'); // hide the UI chrome
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(root, 'ships', id, 'hero.webp'), type: 'webp', quality: 82, timeout: TIMEOUT });
  console.log(`hero → ships/${id}/hero.webp`);
  await page.close();
}

await browser.close();
await server.close();
