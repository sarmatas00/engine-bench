// Browser-side integrity check for the committed scientific artifact bundle.
//
// No Python, no dtcc-core: this only re-reads what scripts/scientific/generate.py
// already wrote and re-derives what a browser loader will also re-derive --
// schema version, the scientific binary's byteLength/sha256, and every
// dependency's byteLength/sha256 (files under public/data/real/ that Task 1
// committed). It exists so `bun run build` fails fast on a stale or corrupt
// commit instead of shipping a page that fails to load scientific data.
//
//     bun run validate:scientific
//     bun scripts/scientific/validate.ts

import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';

export interface ValidationResult {
  errors: string[];
  schemaVersion: unknown;
  dependencyCount: number;
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function checkFile(
  errors: string[],
  label: string,
  path: string,
  expectedByteLength: unknown,
  expectedSha256: unknown,
): void {
  if (!existsSync(path)) {
    errors.push(`${label}: file does not exist at ${path}`);
    return;
  }
  const bytes = readFileSync(path);
  if (bytes.byteLength !== expectedByteLength) {
    errors.push(`${label}: byteLength mismatch -- manifest says ${expectedByteLength}, file is ${bytes.byteLength}`);
  }
  const hash = sha256(bytes);
  if (hash !== expectedSha256) {
    errors.push(`${label}: sha256 mismatch -- manifest says ${expectedSha256}, file hashes to ${hash}`);
  }
}

/**
 * Validate a scientific-manifest.json in place: schema version 1, the
 * scientific binary it names, and every dependency it lists, purely from the
 * filesystem next to the manifest.
 */
export function validateScientificBundle(manifestPath: string): ValidationResult {
  const errors: string[] = [];

  if (!existsSync(manifestPath)) {
    return {errors: [`manifest not found: ${manifestPath}`], schemaVersion: undefined, dependencyCount: 0};
  }

  let manifest: any;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    return {errors: [`manifest is not valid JSON: ${(e as Error).message}`], schemaVersion: undefined, dependencyCount: 0};
  }

  const dir = dirname(manifestPath);

  if (manifest.schemaVersion !== 1) {
    errors.push(`schemaVersion: expected 1, got ${JSON.stringify(manifest.schemaVersion)}`);
  }

  const binary = manifest.binary;
  if (!binary || typeof binary.path !== 'string') {
    errors.push('binary: manifest is missing a well-formed "binary" section');
  } else {
    checkFile(errors, `binary ${binary.path}`, resolve(dir, binary.path), binary.byteLength, binary.sha256);
  }

  const dependencies = manifest.dependencies;
  if (!Array.isArray(dependencies)) {
    errors.push('dependencies: manifest is missing a "dependencies" array');
  } else {
    for (const dep of dependencies) {
      if (!dep || typeof dep.path !== 'string') {
        errors.push(`dependencies: malformed entry ${JSON.stringify(dep)}`);
        continue;
      }
      checkFile(errors, `dependency ${dep.path}`, resolve(dir, dep.path), dep.byteLength, dep.sha256);
    }
  }

  return {
    errors,
    schemaVersion: manifest.schemaVersion,
    dependencyCount: Array.isArray(dependencies) ? dependencies.length : 0,
  };
}

if (import.meta.main) {
  const manifestPath = resolve(import.meta.dir, '../../public/data/scientific/scientific-manifest.json');
  const result = validateScientificBundle(manifestPath);
  if (result.errors.length) {
    console.error(`validate:scientific  FAILED (${result.errors.length} issue${result.errors.length === 1 ? '' : 's'}):`);
    for (const error of result.errors) console.error(`  - ${error}`);
    process.exit(1);
  }
  console.log(`validate:scientific  OK -- schema v${result.schemaVersion}, binary + ${result.dependencyCount} dependencies verified.`);
}
