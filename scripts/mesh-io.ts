import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import type {Mesh} from '../src/lib/scene';

type ArraySpec = {name: string; type: 'f32' | 'u32' | 'u8'; components: number; offset: number; length: number};
type MeshMeta = {bin: string; vertexCount: number; indexCount: number; byteLength: number; arrays: ArraySpec[]};

export type LoadedMesh = Mesh & {colors?: Uint8Array};

export function hasMeshPair(dir: string, name: string): boolean {
  return existsSync(resolve(dir, `${name}.mesh.json`)) && existsSync(resolve(dir, `${name}.mesh.bin`));
}

/** Reads a `.mesh.json` / `.mesh.bin` pair written by scripts/real/benchio.py. */
export function readMeshPair(dir: string, name: string): LoadedMesh {
  const meta = JSON.parse(readFileSync(resolve(dir, `${name}.mesh.json`), 'utf8')) as MeshMeta;
  const raw = readFileSync(resolve(dir, meta.bin));
  if (raw.byteLength !== meta.byteLength) {
    throw new Error(`${name}: byteLength ${meta.byteLength} but ${raw.byteLength} bytes on disk`);
  }
  // Copy out of Bun's pooled Buffer: the typed-array views below need a plain
  // ArrayBuffer they own, and Float32Array over a shared pool would alias.
  const bytes = new Uint8Array(raw.byteLength);
  bytes.set(raw);
  const view = (spec: ArraySpec) => {
    const sliced = bytes.slice(spec.offset, spec.offset + spec.length * (spec.type === 'u8' ? 1 : 4));
    if (spec.type === 'f32') return new Float32Array(sliced.buffer);
    if (spec.type === 'u32') return new Uint32Array(sliced.buffer);
    if (spec.type === 'u8') return sliced;
    // The byte-length arithmetic above assumes one of the three known types, so a new
    // type in the on-disk format must fail here rather than hand back mis-sized bytes.
    throw new Error(`${name}: array ${spec.name} has unknown type ${spec.type}`);
  };
  const byName = new Map(meta.arrays.map(a => [a.name, a]));
  const need = (n: string) => {
    const spec = byName.get(n);
    if (!spec) throw new Error(`${name}: no ${n} array`);
    return view(spec);
  };
  const out: LoadedMesh = {
    positions: need('positions') as Float32Array,
    normals: need('normals') as Float32Array,
    indices: need('indices') as Uint32Array
  };
  if (byName.has('temperature')) out.temperature = view(byName.get('temperature')!) as Float32Array;
  if (byName.has('colors')) out.colors = view(byName.get('colors')!) as Uint8Array;
  return out;
}
