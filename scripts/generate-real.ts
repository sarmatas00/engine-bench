import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {writeGlb} from './gltf-writer';
import {readMeshPair, hasMeshPair} from './mesh-io';

const OUT = resolve(import.meta.dir, '../public/data/real');

if (!existsSync(resolve(OUT, 'dataset.json'))) {
  console.log('generate:real  skipped — public/data/real/dataset.json is absent.');
  console.log('               run: .venv/bin/python scripts/real/stage1_build.py');
  process.exit(0);
}

const dataset = JSON.parse(readFileSync(resolve(OUT, 'dataset.json'), 'utf8'));
const put = (name: string, bytes: Uint8Array) => { writeFileSync(resolve(OUT, name), bytes); console.log('wrote', name); };

// Same four files as the synthetic pipeline, same meanings:
// blocks.glb        = buildings re-based to z = 0  (pages 02, 03, 09)
// blocks-draped.glb = buildings as built, on the terrain (page 06)
put('blocks.glb', await writeGlb(readMeshPair(OUT, 'buildings-flat')));
put('blocks-draped.glb', await writeGlb(readMeshPair(OUT, 'buildings')));

if (hasMeshPair(OUT, 'field') && hasMeshPair(OUT, 'field-baked')) {
  const field = readMeshPair(OUT, 'field');
  put('field.glb', await writeGlb(field, {temperature: true}));
  const baked = readMeshPair(OUT, 'field-baked');
  if (!baked.colors) throw new Error('field-baked.mesh.json has no colors array');
  put('field-baked.glb', await writeGlb(baked, {colors: baked.colors}));
} else {
  console.log('generate:real  no field for this dataset — stage 2 has not run.');
  console.log(`               dataset.json stages.stage2 = ${JSON.stringify(dataset.stages?.stage2 ?? null)}`);
}
