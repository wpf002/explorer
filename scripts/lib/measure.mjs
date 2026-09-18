/**
 * Loads each ship in a headless browser and reads its geometry stats. Used by the
 * validator for the budgets that need real geometry: triangles, draw calls, scale.
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';

export async function measureShips(root, ids) {
  const server = await createServer({ root, logLevel: 'silent', server: { port: 5194, strictPort: true } });
  await server.listen();
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
  const out = {};
  try {
    for (const id of ids) {
      const page = await browser.newPage({ viewport: { width: 800, height: 500 } });
      const errors = [];
      page.on('pageerror', e => errors.push(String(e)));
      await page.goto(`http://localhost:5194/${(process.env.MEASURE_PATH ?? "#ship=ID").replace("ID", id)}`);
      try {
        await page.waitForFunction(() => window.FLEET?.stats, null, { timeout: 30000 });
        out[id] = await page.evaluate(() => window.FLEET.stats());
      } catch {
        out[id] = { error: errors[0] ?? 'viewer did not finish loading' };
      }
      await page.close();
    }
  } finally {
    await browser.close();
    await server.close();
  }
  return out;
}
