/** Frames each ship and saves ships/<id>/hero.webp for the fleet index. */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ids = readdirSync(join(root, 'ships'), { withFileTypes: true })
  .filter(d => d.isDirectory()).map(d => d.name).sort();

const server = await createServer({ root, server: { port: 5198, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });

for (const id of ids) {
  await page.goto(`http://localhost:5198/#ship=${id}`, { waitUntil: 'load' });
  await page.waitForTimeout(5000);
  await page.keyboard.press('h'); // hide the UI chrome
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(root, 'ships', id, 'hero.webp'), type: 'webp', quality: 82 });
  console.log(`hero → ships/${id}/hero.webp`);
}

await browser.close();
await server.close();
