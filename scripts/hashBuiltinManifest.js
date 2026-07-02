// scripts/hashBuiltinManifest.js
// Compute SHA-256 of each built-in VTP file and write real hashes + exact sizes
// into public/vtp_files/manifest.json.
//
// Usage:
//   node scripts/hashBuiltinManifest.js             # recompute and write
//   node scripts/hashBuiltinManifest.js --validate  # check without writing (CI)
//
// npm aliases:
//   npm run hash:builtin              # recompute and write
//   npm run build:dataset-manifest    # same as above
//   npm run build:dataset-manifest -- --validate    # validate mode
//
// When to run:
//   - After adding or replacing any .vtp file in public/vtp_files/
//   - Commit both the .vtp file and the updated manifest.json
//   - npm run build validates automatically via prebuild

import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Pure helper — exported so tests can import it without side effects
// ---------------------------------------------------------------------------

export function computeSha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const root    = join(dirname(fileURLToPath(import.meta.url)), '..');
const vtpDir  = join(root, 'public', 'vtp_files');
const manifestPath = join(vtpDir, 'manifest.json');

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const validateOnly = process.argv.includes('--validate');

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

// ── Detect manifest entries that point to missing files (always hard-fail) ──

for (const entry of manifest) {
  const filePath = join(root, 'public', entry.path.replace(/^\//, ''));
  if (!existsSync(filePath)) {
    console.error(`ERROR: File listed in manifest not found:`);
    console.error(`  entry id : ${entry.id}`);
    console.error(`  path     : ${filePath}`);
    console.error('');
    console.error('To fix:');
    console.error('  • Add the missing file, OR');
    console.error('  • Remove the entry from manifest.json');
    console.error('Then re-run: node scripts/hashBuiltinManifest.js');
    process.exit(1);
  }
}

// ── Detect VTP files not referenced by any manifest entry (warn only) ──

const mappedFiles = new Set(manifest.map(e => basename(e.path)));
const vtpFiles    = readdirSync(vtpDir).filter(f => f.endsWith('.vtp'));
const unmapped    = vtpFiles.filter(f => !mappedFiles.has(f));
if (unmapped.length > 0) {
  console.warn('WARN: VTP files in public/vtp_files/ with no manifest entry:');
  unmapped.forEach(f => console.warn(`  ${f}`));
  console.warn('Add these to manifest.json and re-run: node scripts/hashBuiltinManifest.js');
  console.warn('');
}

// ── Validate mode: check without writing ──

if (validateOnly) {
  let ok = 0, bad = 0;

  for (const entry of manifest) {
    const filePath = join(root, 'public', entry.path.replace(/^\//, ''));
    const actual = computeSha256(readFileSync(filePath));

    if (actual === entry.contentHash) {
      ok++;
    } else {
      console.error(`MISMATCH: ${entry.id}`);
      console.error(`  manifest : ${entry.contentHash ?? '(null)'}`);
      console.error(`  actual   : ${actual}`);
      bad++;
    }
  }

  console.log(`\nValidation: ${ok} OK, ${bad} failed (${manifest.length} total)`);

  if (bad > 0) {
    console.error('');
    console.error('Hashes are stale. Run to update:');
    console.error('  node scripts/hashBuiltinManifest.js');
    process.exit(1);
  }
  process.exit(0);
}

// ── Write mode: recompute and update manifest ──

let updated = 0;

for (const entry of manifest) {
  const filePath = join(root, 'public', entry.path.replace(/^\//, ''));
  const bytes = readFileSync(filePath);

  entry.contentHash = computeSha256(bytes);
  entry.size = bytes.length;
  updated++;

  console.log(`  ${entry.id}: ${entry.size.toLocaleString()} bytes — ${entry.contentHash.slice(0, 16)}…`);
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`\nDone. Updated ${updated} entries in ${manifestPath}`);
