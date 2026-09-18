/** One-off: renders reference/asv07-demo.html at 1600×1000 into reference/golden.png. */
import { launch } from './lib/browser.mjs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(join(root, 'reference', 'asv07-demo.html')).href, { waitUntil: 'load' });
await page.waitForFunction(() => window.ASV && !window.ASV.S.fly, null, { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(Number(process.env.SHOT_WAIT ?? 1200));
await page.screenshot({ path: join(root, 'reference', 'golden.png') });
await browser.close();
console.log('golden → reference/golden.png');
