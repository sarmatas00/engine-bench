import {describe, expect, test} from 'bun:test';
import {mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {readMeshPair, hasMeshPair} from '../../scripts/mesh-io';

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), 'meshio-'));
  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  const normals = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]);
  const indices = new Uint32Array([0, 1, 2]);
  const temperature = new Float32Array([18, 25, 32]);
  const colors = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const parts = [
    {name: 'positions', type: 'f32', components: 3, bytes: new Uint8Array(positions.buffer)},
    {name: 'normals', type: 'f32', components: 3, bytes: new Uint8Array(normals.buffer)},
    {name: 'indices', type: 'u32', components: 1, bytes: new Uint8Array(indices.buffer)},
    {name: 'temperature', type: 'f32', components: 1, bytes: new Uint8Array(temperature.buffer)},
    {name: 'colors', type: 'u8', components: 3, bytes: colors}
  ];
  const arrays: any[] = [];
  const chunks: Uint8Array[] = [];
  let offset = 0;
  for (const p of parts) {
    while (offset % 4) { chunks.push(new Uint8Array([0])); offset += 1; }
    arrays.push({name: p.name, type: p.type, components: p.components, offset, length: p.bytes.byteLength / (p.type === 'u8' ? 1 : 4)});
    chunks.push(p.bytes); offset += p.bytes.byteLength;
  }
  while (offset % 4) { chunks.push(new Uint8Array([0])); offset += 1; }
  const bin = new Uint8Array(offset);
  let at = 0;
  for (const c of chunks) { bin.set(c, at); at += c.byteLength; }
  writeFileSync(join(dir, 'demo.mesh.bin'), bin);
  writeFileSync(join(dir, 'demo.mesh.json'), JSON.stringify({bin: 'demo.mesh.bin', vertexCount: 3, indexCount: 3, byteLength: offset, arrays}));
  return dir;
}

describe('mesh-io', () => {
  test('hasMeshPair reports what exists', () => {
    const dir = fixture();
    expect(hasMeshPair(dir, 'demo')).toBe(true);
    expect(hasMeshPair(dir, 'missing')).toBe(false);
  });
  test('reads positions, normals, indices, temperature and colors', () => {
    const m = readMeshPair(fixture(), 'demo');
    expect(Array.from(m.positions)).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    expect(Array.from(m.normals.slice(0, 3))).toEqual([0, 0, 1]);
    expect(Array.from(m.indices)).toEqual([0, 1, 2]);
    expect(Array.from(m.temperature!)).toEqual([18, 25, 32]);
    expect(Array.from(m.colors!)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
  test('rejects a json whose byteLength disagrees with the bin', () => {
    const dir = fixture();
    writeFileSync(join(dir, 'demo.mesh.bin'), new Uint8Array(4));
    expect(() => readMeshPair(dir, 'demo')).toThrow(/byteLength/);
  });
});
