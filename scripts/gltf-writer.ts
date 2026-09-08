import {Document, NodeIO, Accessor, Primitive, type TypedArray} from '@gltf-transform/core';
import type {Mesh} from '../src/lib/scene';

/**
 * TS 5.9's typed arrays are generic over their backing buffer, and the bare
 * `Float32Array`/`Uint32Array`/`Uint8Array` annotations used by `Mesh` (and by
 * this file's own return types) resolve to the widened `<ArrayBufferLike>`
 * form. `@gltf-transform/core`'s `TypedArray` alias requires the narrower
 * `<ArrayBuffer>` form. Every array here is a freshly allocated, plain
 * `ArrayBuffer`-backed typed array (never a `SharedArrayBuffer`), so this
 * narrowing cast is safe.
 */
const asTypedArray = (a: Float32Array | Uint32Array | Uint8Array): TypedArray => a as unknown as TypedArray;

/** Local z-up → glTF Y-up: (x, y, z) → (x, z, -y). */
function toYUp(a: Float32Array): Float32Array {
  const out = new Float32Array(a.length);
  for (let i = 0; i < a.length; i += 3) { out[i] = a[i]; out[i + 1] = a[i + 2]; out[i + 2] = -a[i + 1]; }
  return out;
}

export async function writeGlb(mesh: Mesh, opts: {temperature?: boolean; colors?: Uint8Array} = {}): Promise<Uint8Array> {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const pos = doc.createAccessor('POSITION').setType(Accessor.Type.VEC3).setArray(asTypedArray(toYUp(mesh.positions))).setBuffer(buffer);
  const nrm = doc.createAccessor('NORMAL').setType(Accessor.Type.VEC3).setArray(asTypedArray(toYUp(mesh.normals))).setBuffer(buffer);
  const idx = doc.createAccessor('indices').setType(Accessor.Type.SCALAR).setArray(asTypedArray(mesh.indices)).setBuffer(buffer);
  const prim = doc.createPrimitive().setMode(Primitive.Mode.TRIANGLES).setAttribute('POSITION', pos).setAttribute('NORMAL', nrm).setIndices(idx);
  if (opts.temperature) {
    if (!mesh.temperature) throw new Error('mesh has no temperature');
    prim.setAttribute('_TEMPERATURE', doc.createAccessor('_TEMPERATURE').setType(Accessor.Type.SCALAR).setArray(asTypedArray(mesh.temperature)).setBuffer(buffer));
  }
  if (opts.colors) {
    prim.setAttribute('COLOR_0', doc.createAccessor('COLOR_0').setType(Accessor.Type.VEC3).setArray(asTypedArray(opts.colors)).setNormalized(true).setBuffer(buffer));
  }
  const material = doc.createMaterial('flat').setBaseColorFactor([0.8, 0.8, 0.8, 1]).setMetallicFactor(0).setRoughnessFactor(1);
  prim.setMaterial(material);
  const node = doc.createNode('scene-root').setMesh(doc.createMesh('mesh').addPrimitive(prim));
  doc.createScene('scene').addChild(node);
  return new NodeIO().writeBinary(doc);
}
