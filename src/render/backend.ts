/**
 * True in the node-pipeline build (`npm run dev:gpu`). It is a compile-time constant, so
 * the branch that is not taken — and the three.js build behind it — never reaches the bundle.
 */
declare const __GPU__: boolean;
export const GPU = __GPU__;
