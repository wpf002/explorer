/**
 * CI screenshots: every ship × preset (solid, x-ray, section) at 1280×800, diffed against
 * reference/goldens/<ship>-<preset>.png. Differences are reported, never fatal; page errors
 * are. `--update` rewrites the goldens.
 */
import { createServer } from 'vite';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { launch, newPage, settled, TIMEOUT } from './lib/browser.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const update = args.includes('--update');
// `--presets solid` and `--ships asv-07,bcf-4` keep the CI matrix small; SwiftShader is slow.
const PRESETS = (flag('--presets') ?? 'solid,xray,section').split(',');
const pick = flag('--ships')?.split(',');
const out = join(root, 'shots', 'ci'), gold = join(root, 'reference', 'goldens');
mkdirSync(out, { recursive: true }); mkdirSync(gold, { recursive: true });

const ids = readdirSync(join(root, 'ships'), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)
  .filter(id => !pick || pick.includes(id)).sort();

const server = await createServer({ root, logLevel: 'silent', server: { port: 5188, strictPort: true } });
await server.listen();
const browser = await launch();
const rows = [], errors = [];
for (const id of ids) {
  for (const preset of PRESETS) {
    const page = await newPage(browser, { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    page.on('pageerror', e => errors.push(`${id}/${preset}: ${e}`));
    await page.goto(`http://localhost:5188/ship/${id}?quality=high`);
    await settled(page).catch(() => errors.push(`${id}/${preset}: viewer did not settle`));
    await page.click(`#presetSeg button[data-preset="${preset}"]`);
    await page.keyboard.press('h');
    await page.waitForTimeout(900);
    const file = join(out, `${id}-${preset}.png`);
    await page.screenshot({ path: file, timeout: TIMEOUT });
    await page.close();

    const g = join(gold, `${id}-${preset}.png`);
    if (update || !existsSync(g)) { copyFileSync(file, g); rows.push([id, preset, update ? 'updated' : 'new golden']); continue; }
    const a = PNG.sync.read(readFileSync(g)), b = PNG.sync.read(readFileSync(file));
    if (a.width !== b.width || a.height !== b.height) { rows.push([id, preset, 'size changed']); continue; }
    const diff = new PNG({ width: a.width, height: a.height });
    const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.12 });
    writeFileSync(join(out, `${id}-${preset}.diff.png`), PNG.sync.write(diff));
    rows.push([id, preset, `${(100 * n / (a.width * a.height)).toFixed(2)}%`]);
  }
}
await browser.close();
await server.close();

const table = ['| ship | preset | diff vs golden |', '|---|---|---|', ...rows.map(r => `| ${r.join(' | ')} |`)].join('\n');
writeFileSync(join(out, 'summary.md'), table + (errors.length ? `\n\n**Page errors**\n\n${errors.map(e => '- ' + e).join('\n')}\n` : '\n'));
console.log(table);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
