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

/** Wait until a viewer or compare page has finished its opening fly-to (or the index is up). */
export const settled = page => page.waitForFunction(
  () => document.body.dataset.view === 'fleet' || (window.FLEET && !window.FLEET.rig.fly),
  null, { timeout: 60000 },
);
