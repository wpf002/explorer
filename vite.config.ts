import { defineConfig } from 'vite';

// GPU=1 swaps three for its node build, so the whole app runs the WebGPU pipeline
// (with an automatic WebGL2 backend where WebGPU is missing).
const gpu = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.GPU === '1';

export default defineConfig({
  base: '/',
  define: { __GPU__: JSON.stringify(gpu) },
  // Exact match only: `three/addons/...` and `three/tsl` must resolve normally.
  resolve: gpu ? { alias: [{ find: /^three$/, replacement: 'three/webgpu' }] } : {},
  server: { port: 5173, fs: { allow: ['.'] } },
  build: { target: 'es2022', outDir: 'dist', assetsInlineLimit: 0 },
});
