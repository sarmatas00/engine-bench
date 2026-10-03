import {describe, expect, test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import vtkPolyData from '@kitware/vtk.js/Common/DataModel/PolyData';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import vtkImageStreamline from '@kitware/vtk.js/Filters/General/ImageStreamline';
import {
  STREAMLINE_MAX_STEPS, STREAMLINE_STEP_S, traceStreamlines, type VelocityGrid, type VelocityGridJson,
} from '@lib/flagship-volume';

/** vtk.js's own answer for the same grid and seeds: what page 17 draws. */
function vtkTrace(grid: VelocityGrid, seeds: number[][], step: number, maxSteps: number) {
  const image = vtkImageData.newInstance();
  image.setDimensions(grid.meta.dims);
  image.setOrigin(grid.meta.origin);
  image.setSpacing(grid.meta.spacing);
  image.getPointData().setVectors(vtkDataArray.newInstance({name: 'v', values: grid.data, numberOfComponents: 3}));
  const seedPd = vtkPolyData.newInstance();
  seedPd.getPoints().setData(Float32Array.from(seeds.flat()), 3);
  const f = vtkImageStreamline.newInstance();
  f.setIntegrationStep(step);
  f.setMaximumNumberOfSteps(maxSteps);
  f.setInputData(image, 0);
  f.setInputData(seedPd, 1);
  const out = f.getOutputData();
  return {points: out.getPoints().getData() as Float32Array, lines: out.getNumberOfLines()};
}

describe('traceStreamlines is vtkImageStreamline, ported', () => {
  test('same points on a swirling synthetic field, including lines that leave the box', () => {
    const dims: [number, number, number] = [12, 10, 6];
    const data = new Float32Array(dims[0] * dims[1] * dims[2] * 3);
    for (let k = 0; k < dims[2]; k++) for (let j = 0; j < dims[1]; j++) for (let i = 0; i < dims[0]; i++) {
      const n = i + dims[0] * (j + dims[1] * k);
      data[n * 3] = 1 + 0.3 * Math.sin(j); data[n * 3 + 1] = 0.5 * Math.cos(i); data[n * 3 + 2] = 0.05 * (k - 2);
    }
    const grid = {meta: {dims, origin: [-3, 2, 0.5], spacing: [2, 1.5, 3]} as unknown as VelocityGridJson, data};
    const seeds = [[-2, 3, 2], [5, 8, 5], [0, 0, 0], [30, 30, 30]];
    const ours = traceStreamlines(grid, seeds, 0.7, 200);
    const theirs = vtkTrace(grid, seeds, 0.7, 200);
    expect(ours.lineStarts.length - 1).toBe(theirs.lines);
    expect(ours.positions.length).toBeGreaterThan(30);
    expect([...ours.positions]).toEqual([...theirs.points]);
  });

  test('same points on the shipped flagship velocity grid and seeds', () => {
    const dir = resolve(import.meta.dirname, '../../public/data/flagship/volume');
    const meta = JSON.parse(readFileSync(resolve(dir, 'velocity.grid.json'), 'utf8')) as VelocityGridJson;
    const bytes = readFileSync(resolve(dir, 'velocity.grid.f32'));
    const data = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
    const grid = {meta, data};
    const ours = traceStreamlines(grid, meta.seeds, STREAMLINE_STEP_S, STREAMLINE_MAX_STEPS);
    const theirs = vtkTrace(grid, meta.seeds, STREAMLINE_STEP_S, STREAMLINE_MAX_STEPS);
    expect(ours.lineStarts.length - 1).toBe(meta.seeds.length);
    expect(theirs.lines).toBe(meta.seeds.length);
    expect(ours.positions.length).toBe(theirs.points.length);
    expect([...ours.positions]).toEqual([...theirs.points]);
  });

  test('same points on every frame of the animated velocity series (pages 19/20)', () => {
    const dir = resolve(import.meta.dirname, '../../public/data/fields');
    const meta = JSON.parse(readFileSync(resolve(dir, 'velocity.json'), 'utf8')) as
      {dims: [number, number, number]; origin: number[]; spacing: number[]; seeds: number[][]; frames: {file: string}[]};
    expect(meta.frames.length).toBe(25);
    for (const {file} of meta.frames) {
      const bytes = readFileSync(resolve(dir, file));
      const grid = {meta: meta as unknown as VelocityGridJson, data: new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4)};
      const ours = traceStreamlines(grid, meta.seeds, STREAMLINE_STEP_S, STREAMLINE_MAX_STEPS);
      const theirs = vtkTrace(grid, meta.seeds, STREAMLINE_STEP_S, STREAMLINE_MAX_STEPS);
      expect(ours.lineStarts.length - 1, file).toBe(theirs.lines);
      expect(ours.positions.length, file).toBe(theirs.points.length);
      expect([...ours.positions], file).toEqual([...theirs.points]);
    }
  });
});
