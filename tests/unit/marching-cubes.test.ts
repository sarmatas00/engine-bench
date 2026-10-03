import {describe, expect, test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import vtkImageMarchingCubes from '@kitware/vtk.js/Filters/General/ImageMarchingCubes';
import vtkCaseTable from '@kitware/vtk.js/Filters/General/ImageMarchingCubes/caseTable';
import {MC_CASES, MC_EDGES} from '@lib/marching-cubes-tables';
import {marchingCubes, type ImageGrid} from '@lib/marching-cubes';

/** vtk.js's own answer: what page 19 draws. */
function vtkIso(g: ImageGrid, value: number, computeNormals: boolean, mergePoints: boolean) {
  const image = vtkImageData.newInstance();
  image.setDimensions([g.dims[0], g.dims[1], g.dims[2]]);
  image.setOrigin([g.origin[0], g.origin[1], g.origin[2]]);
  image.setSpacing([g.spacing[0], g.spacing[1], g.spacing[2]]);
  image.getPointData().setScalars(vtkDataArray.newInstance({name: 's', values: g.scalars as Float32Array, numberOfComponents: 1}));
  const f = vtkImageMarchingCubes.newInstance({contourValue: value, computeNormals, mergePoints});
  f.setInputData(image);
  const quiet = console.time; const quietEnd = console.timeEnd;
  console.time = () => {}; console.timeEnd = () => {};   // vtk.js logs "mcubes" on every run
  try {
    const out = f.getOutputData();
    const polys = out.getPolys().getData() as Uint32Array;
    const tris: number[] = [];
    for (let c = 0; c < polys.length; c += 4) { expect(polys[c]).toBe(3); tris.push(polys[c + 1], polys[c + 2], polys[c + 3]); }
    return {positions: out.getPoints().getData() as Float32Array, normals: out.getPointData().getNormals()?.getData() as Float32Array | undefined, tris};
  } finally { console.time = quiet; console.timeEnd = quietEnd; }
}

function expectSame(g: ImageGrid, value: number, computeNormals: boolean, mergePoints: boolean) {
  const ours = marchingCubes(g, value, {computeNormals, mergePoints});
  const theirs = vtkIso(g, value, computeNormals, mergePoints);
  expect(ours.positions.length).toBeGreaterThan(30);
  expect(ours.positions.length).toBe(theirs.positions.length);
  expect([...ours.triangles]).toEqual(theirs.tris);
  expect([...ours.positions]).toEqual([...theirs.positions]);
  if (computeNormals) expect([...ours.normals!]).toEqual([...theirs.normals!]);
  return ours;
}

const pressureDir = resolve(import.meta.dirname, '../../public/data/fields');
const meta = JSON.parse(readFileSync(resolve(pressureDir, 'pressure.json'), 'utf8')) as
  {dims: [number, number, number]; origin: number[]; spacing: number[]; frames: {file: string}[]};
const frame = (i: number): ImageGrid => {
  const b = readFileSync(resolve(pressureDir, meta.frames[i].file));
  return {dims: meta.dims, origin: meta.origin, spacing: meta.spacing,
          scalars: new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4)};
};

describe('marchingCubes is vtkImageMarchingCubes, ported', () => {
  test('the case and edge tables are vtk.js\'s, entry for entry', () => {
    for (let c = 0; c < 256; c++) {
      const full = vtkCaseTable.getCase(c) as number[];
      expect([...MC_CASES[c]]).toEqual(full.slice(0, full.indexOf(-1) < 0 ? full.length : full.indexOf(-1)));
    }
    for (let e = 0; e < 12; e++) expect([...MC_EDGES[e]]).toEqual(vtkCaseTable.getEdge(e) as number[]);
  });

  test('same surface on a small analytic field, every option combination', () => {
    const dims: [number, number, number] = [11, 9, 7];
    const s = new Float32Array(dims[0] * dims[1] * dims[2]);
    for (let k = 0; k < dims[2]; k++) for (let j = 0; j < dims[1]; j++) for (let i = 0; i < dims[0]; i++) {
      s[i + dims[0] * (j + dims[1] * k)] = Math.hypot(i - 5, (j - 4) * 1.3, (k - 3) * 1.7) + 0.3 * Math.sin(i * j);
    }
    const g = {dims, origin: [-2, 3, 0.5], spacing: [1.5, 1, 2]};
    for (const normals of [false, true]) for (const merge of [false, true]) expectSame({...g, scalars: s}, 3.2, normals, merge);
  });

  test('same surface on shipped pressure frames, as page 19 and 20 draw it', () => {
    for (const i of [0, 12]) expectSame(frame(i), ISO_TEST_VALUE, true, false);
  });
});

/** A low-pressure level that cuts the vortex cores; the pages read theirs from flagship-fields. */
const ISO_TEST_VALUE = -100;
