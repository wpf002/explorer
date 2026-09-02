/**
 * Playwright screenshot of the running app at 1600×1000, saved to shots/current.png
 * and diffed against reference/golden.png. Rendering differences do not fail the run;
 * the number is there so a human looks at the image.
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const hash = args.find(a => a.startsWith('#')) ?? '';
const outName = args.find(a => a.endsWith('.png')) ?? 'current.png';
const WAIT = Number(process.env.SHOT_WAIT ?? 1200);

mkdirSync(join(root, 'shots'), { recursive: true });

const server = await createServer({ root, server: { port: 5199, strictPort: true } });
await server.listen();
const url = `http://localhost:5199/${hash}`;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => m.type() === 'error' && errors.push(m.text()));

await page.goto(url, { waitUntil: 'load' });
// Wait for the opening fly-to to finish so the frame is deterministic, then settle.
await page.waitForFunction(() => window.FLEET && !window.FLEET.rig.fly, null, { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(WAIT);

const outPath = join(root, 'shots', outName);
await page.screenshot({ path: outPath });
await browser.close();
await server.close();

if (errors.length) {
  console.error('page errors:');
  for (const e of errors) console.error('  ' + e);
}
console.log(`shot → shots/${outName}`);

const golden = join(root, 'reference', 'golden.png');
if (!existsSync(golden)) {
  console.log('no reference/golden.png yet — nothing to diff against');
  process.exit(errors.length ? 1 : 0);
}

const a = PNG.sync.read(readFileSync(golden));
const b = PNG.sync.read(readFileSync(outPath));
if (a.width !== b.width || a.height !== b.height) {
  console.log(`size differs: golden ${a.width}×${a.height}, current ${b.width}×${b.height}`);
  process.exit(errors.length ? 1 : 0);
}
const diff = new PNG({ width: a.width, height: a.height });
const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.12 });
writeFileSync(join(root, 'shots', 'diff.png'), PNG.sync.write(diff));
console.log(`diff vs golden: ${(100 * n / (a.width * a.height)).toFixed(2)}% of pixels → shots/diff.png`);
process.exit(errors.length ? 1 : 0);
