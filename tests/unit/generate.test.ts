import {describe, expect, test, beforeAll} from 'bun:test';
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {NodeIO} from '@gltf-transform/core';

const DATA = resolve(import.meta.dir, '../../public/data');
const io = new NodeIO();

beforeAll(async () => {
  const proc = Bun.spawnSync(['bun', resolve(import.meta.dir, '../../scripts/generate.ts')]);
  if (proc.exitCode !== 0) throw new Error(proc.stderr.toString());
});

describe('generate', () => {
  test('writes all six files', () => {
    for (const f of ['blocks.glb', 'blocks-draped.glb', 'field.glb', 'field-baked.glb', 'field.grid.json', 'field.grid.f32'])
      expect(existsSync(resolve(DATA, f))).toBe(true);
  });
  test('field.glb carries _TEMPERATURE and no COLOR_0', async () => {
    const doc = await io.read(resolve(DATA, 'field.glb'));
    const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
    expect(prim.getAttribute('_TEMPERATURE')).not.toBeNull();
    expect(prim.getAttribute('COLOR_0')).toBeNull();
    expect(prim.getAttribute('_TEMPERATURE')!.getCount()).toBe(41 * 41);
  });
  test('field-baked.glb carries COLOR_0 and no _TEMPERATURE', async () => {
    const doc = await io.read(resolve(DATA, 'field-baked.glb'));
    const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
    expect(prim.getAttribute('COLOR_0')).not.toBeNull();
    expect(prim.getAttribute('_TEMPERATURE')).toBeNull();
  });
  test('blocks-draped bases sit on h(), blocks bases sit at 0 (glTF Y-up)', async () => {
    const flat = await io.read(resolve(DATA, 'blocks.glb'));
    const draped = await io.read(resolve(DATA, 'blocks-draped.glb'));
    const ys = (d: any) => { const a = d.getRoot().listMeshes()[0].listPrimitives()[0].getAttribute('POSITION')!.getArray()!; const out: number[] = []; for (let i = 1; i < a.length; i += 3) out.push(a[i]); return out; };
    expect(Math.min(...ys(flat))).toBe(0);
    expect(Math.min(...ys(draped))).toBeGreaterThan(5);
  });
  test('grid json + raw sizes agree', () => {
    const j = JSON.parse(readFileSync(resolve(DATA, 'field.grid.json'), 'utf8'));
    expect(j.dims).toEqual([64, 64, 32]);
    expect(readFileSync(resolve(DATA, 'field.grid.f32')).byteLength).toBe(64 * 64 * 32 * 4);
  });
});
