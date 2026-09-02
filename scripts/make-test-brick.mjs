/**
 * Generates ships/test-brick/model.glb: a plain box with three room_* empties.
 * The point of this ship is to prove the viewer needs nothing but a conforming glTF.
 */
import { writeFileSync } from 'node:fs';

const HX = 15, HY = 6, HZ = 6;
const faces = [
  { n: [1, 0, 0],  v: [[HX, -HY, -HZ], [HX, HY, -HZ], [HX, HY, HZ], [HX, -HY, HZ]] },
  { n: [-1, 0, 0], v: [[-HX, -HY, HZ], [-HX, HY, HZ], [-HX, HY, -HZ], [-HX, -HY, -HZ]] },
  { n: [0, 1, 0],  v: [[-HX, HY, -HZ], [-HX, HY, HZ], [HX, HY, HZ], [HX, HY, -HZ]] },
  { n: [0, -1, 0], v: [[-HX, -HY, HZ], [-HX, -HY, -HZ], [HX, -HY, -HZ], [HX, -HY, HZ]] },
  { n: [0, 0, 1],  v: [[-HX, -HY, HZ], [HX, -HY, HZ], [HX, HY, HZ], [-HX, HY, HZ]] },
  { n: [0, 0, -1], v: [[HX, -HY, -HZ], [-HX, -HY, -HZ], [-HX, HY, -HZ], [HX, HY, -HZ]] },
];

const pos = [], nor = [], idx = [];
for (const f of faces) {
  const base = pos.length / 3;
  for (const v of f.v) { pos.push(...v); nor.push(...f.n); }
  idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

const posBuf = Buffer.from(new Float32Array(pos).buffer);
const norBuf = Buffer.from(new Float32Array(nor).buffer);
const idxBuf = Buffer.from(new Uint16Array(idx).buffer);
const pad4 = b => (b.length % 4 ? Buffer.concat([b, Buffer.alloc(4 - (b.length % 4))]) : b);
const bin = Buffer.concat([posBuf, norBuf, pad4(idxBuf)]);

const gltf = {
  asset: { version: '2.0', generator: 'fleet-explorer/make-test-brick' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [
    { name: 'mod_body', children: [1, 2, 3, 4] },
    { name: 'hull_A_shell', mesh: 0 },
    { name: 'room_BOX-01', translation: [10, 0, 0] },
    { name: 'room_BOX-02', translation: [0, 0, 0] },
    { name: 'room_BOX-03', translation: [-10, 0, 0] },
  ],
  meshes: [{ name: 'hull_A_shell', primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0 }] }],
  materials: [{
    name: 'hull',
    pbrMetallicRoughness: { baseColorFactor: [0.72, 0.78, 0.84, 1], metallicFactor: 0.4, roughnessFactor: 0.55 },
    doubleSided: true,
  }],
  accessors: [
    { bufferView: 0, componentType: 5126, count: pos.length / 3, type: 'VEC3', min: [-HX, -HY, -HZ], max: [HX, HY, HZ] },
    { bufferView: 1, componentType: 5126, count: nor.length / 3, type: 'VEC3' },
    { bufferView: 2, componentType: 5123, count: idx.length, type: 'SCALAR' },
  ],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: posBuf.length, target: 34962 },
    { buffer: 0, byteOffset: posBuf.length, byteLength: norBuf.length, target: 34962 },
    { buffer: 0, byteOffset: posBuf.length + norBuf.length, byteLength: idxBuf.length, target: 34963 },
  ],
  buffers: [{ byteLength: bin.length }],
};

const json = pad4(Buffer.from(JSON.stringify(gltf), 'utf8'));
const chunk = (data, type) => {
  const head = Buffer.alloc(8);
  head.writeUInt32LE(data.length, 0);
  head.writeUInt32LE(type, 4);
  return Buffer.concat([head, data]);
};
const jsonChunk = chunk(json, 0x4e4f534a);
const binChunk = chunk(bin, 0x004e4942);
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + jsonChunk.length + binChunk.length, 8);

const out = new URL('../ships/test-brick/model.glb', import.meta.url);
writeFileSync(out, Buffer.concat([header, jsonChunk, binChunk]));
console.log(`wrote ${out.pathname} (${12 + jsonChunk.length + binChunk.length} bytes)`);
