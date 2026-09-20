import {describe, expect, test} from 'bun:test';
import {createHash} from 'node:crypto';
import {mkdtempSync, mkdirSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {validateScientificBundle} from './validate';

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/** A minimal but structurally real bundle: one scientific.bin, one manifest
 * next to it, and one dependency file one directory up (mirroring
 * public/data/scientific/scientific-manifest.json referencing
 * ../real/dataset.json), all with correct byteLength/sha256. */
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'scientific-validate-'));
  const scientificDir = join(root, 'scientific');
  const realDir = join(root, 'real');
  mkdirSync(scientificDir, {recursive: true});
  mkdirSync(realDir, {recursive: true});

  const binary = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
  writeFileSync(join(scientificDir, 'scientific.bin'), binary);

  const dependency = new TextEncoder().encode('{"dataset": true}');
  writeFileSync(join(realDir, 'dataset.json'), dependency);

  const manifest = {
    schemaVersion: 1,
    binary: {path: 'scientific.bin', byteLength: binary.byteLength, sha256: sha256(binary)},
    dependencies: [
      {path: '../real/dataset.json', byteLength: dependency.byteLength, sha256: sha256(dependency)},
    ],
  };
  const manifestPath = join(scientificDir, 'scientific-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  return {manifestPath, manifest, binary, dependency, scientificDir};
}

describe('validateScientificBundle', () => {
  test('a valid, freshly written bundle has no errors', () => {
    const {manifestPath} = fixture();
    const result = validateScientificBundle(manifestPath);
    expect(result.errors).toEqual([]);
    expect(result.schemaVersion).toBe(1);
    expect(result.dependencyCount).toBe(1);
  });

  test('rejects a manifest with the wrong schema version', () => {
    const {manifestPath, manifest} = fixture();
    writeFileSync(manifestPath, JSON.stringify({...manifest, schemaVersion: 2}));
    const result = validateScientificBundle(manifestPath);
    expect(result.errors.some(e => e.includes('schemaVersion'))).toBe(true);
  });

  test('rejects a binary whose length disagrees with the manifest', () => {
    const {manifestPath, manifest} = fixture();
    writeFileSync(manifestPath, JSON.stringify({
      ...manifest,
      binary: {...manifest.binary, byteLength: manifest.binary.byteLength + 1},
    }));
    const result = validateScientificBundle(manifestPath);
    expect(result.errors.some(e => e.includes('byteLength mismatch'))).toBe(true);
  });

  test('rejects a manifest whose binary file is missing', () => {
    const {manifestPath, manifest} = fixture();
    writeFileSync(manifestPath, JSON.stringify({
      ...manifest,
      binary: {...manifest.binary, path: 'does-not-exist.bin'},
    }));
    const result = validateScientificBundle(manifestPath);
    expect(result.errors.some(e => e.includes('does not exist'))).toBe(true);
  });

  test('rejects a binary whose sha256 disagrees with the manifest', () => {
    const {manifestPath, manifest} = fixture();
    writeFileSync(manifestPath, JSON.stringify({
      ...manifest,
      binary: {...manifest.binary, sha256: '0'.repeat(64)},
    }));
    const result = validateScientificBundle(manifestPath);
    expect(result.errors.some(e => e.includes('sha256 mismatch'))).toBe(true);
  });

  test('rejects a dependency whose sha256 disagrees with the manifest', () => {
    const {manifestPath, manifest} = fixture();
    writeFileSync(manifestPath, JSON.stringify({
      ...manifest,
      dependencies: [{...manifest.dependencies[0], sha256: '0'.repeat(64)}],
    }));
    const result = validateScientificBundle(manifestPath);
    expect(result.errors.some(e => e.includes('../real/dataset.json') && e.includes('sha256 mismatch'))).toBe(true);
  });

  test('rejects a dependency that does not exist on disk', () => {
    const {manifestPath, manifest} = fixture();
    writeFileSync(manifestPath, JSON.stringify({
      ...manifest,
      dependencies: [{...manifest.dependencies[0], path: '../real/missing.json'}],
    }));
    const result = validateScientificBundle(manifestPath);
    expect(result.errors.some(e => e.includes('../real/missing.json') && e.includes('does not exist'))).toBe(true);
  });

  test('reports a missing manifest file without throwing', () => {
    const result = validateScientificBundle('/nonexistent/scientific-manifest.json');
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain('not found');
  });

  test('the actual committed bundle validates clean', () => {
    const manifestPath = join(import.meta.dir, '../../public/data/scientific/scientific-manifest.json');
    const result = validateScientificBundle(manifestPath);
    expect(result.errors).toEqual([]);
    expect(result.schemaVersion).toBe(1);
  });
});
