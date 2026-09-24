/**
 * One Chromium launch for every script. On CI there is no GPU, so ANGLE runs on
 * SwiftShader; locally ANGLE picks the platform backend.
 */
import { chromium } from 'playwright';

export const launch = () => chromium.launch({
  args: process.env.CI
    ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
    : ['--use-gl=angle', '--enable-unsafe-swiftshader'],
});

/**
 * A page with generous timeouts. Software rendering on CI can take a minute to reach a
 * frame Playwright will screenshot, and the default 30 s is not enough.
 */
export async function newPage(browser, opts = {}) {
  const page = await browser.newPage({ deviceScaleFactor: 1, ...opts });
  page.setDefaultTimeout(TIMEOUT);
  page.setDefaultNavigationTimeout(TIMEOUT);
  return page;
}

export const TIMEOUT = Number(process.env.SHOT_TIMEOUT ?? (process.env.CI ? 180_000 : 60_000));

/** Wait until a viewer or compare page has finished its opening fly-to (or the index is up). */
export const settled = page => page.waitForFunction(
  () => document.body.dataset.view === 'fleet' || (window.FLEET && !window.FLEET.rig.fly),
  null, { timeout: TIMEOUT },
);
