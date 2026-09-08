import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {blocksMesh, fieldSurface, fieldGrid, h} from '../src/lib/scene';
import {colormap} from '../src/lib/colormap';
import {writeGlb} from './gltf-writer';

const OUT = resolve(import.meta.dir, '../public/data/synthetic');
mkdirSync(OUT, {recursive: true});
const put = (name: string, bytes: Uint8Array | string) => { writeFileSync(resolve(OUT, name), bytes); console.log('wrote', name); };

// Blocks: at sea level, and pre-draped (fix A2 — sample the DEM in the pipeline).
put('blocks.glb', await writeGlb(blocksMesh(() => 0)));
put('blocks-draped.glb', await writeGlb(blocksMesh((x, y) => h(x, y))));

// Field: raw values as _TEMPERATURE (limitation 2 / fix B1), and baked colours (fix B2).
const field = fieldSurface();
put('field.glb', await writeGlb(field, {temperature: true}));
const colors = new Uint8Array(field.temperature!.length * 3);
field.temperature!.forEach((t, i) => colors.set(colormap(t, 10, 35), i * 3));
put('field-baked.glb', await writeGlb(field, {colors}));

// Regular grid: one conversion, two consumers (Cesium voxels, VTK.js).
const g = fieldGrid();
put('field.grid.f32', new Uint8Array(g.data.buffer));
put('field.grid.json', JSON.stringify({dims: g.dims, origin: g.origin, spacing: g.spacing, min: g.min, max: g.max, dataUrl: '/data/synthetic/field.grid.f32'}, null, 2));
