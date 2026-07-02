// src/services/__tests__/builtInDatasetHash.test.js
// DR2: Unit tests for SHA-256 hash computation used in built-in dataset manifest.
//
// These tests are pure — no file I/O, no manifest reads.
// They verify the algorithm used by scripts/hashBuiltinManifest.js.

import { describe, test, expect } from 'vitest';
import { createHash } from 'crypto';

// Inline the same one-liner used in the script.
// If the script's implementation changes, update this too.
const computeSha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

// ─── SHA-256 computation ──────────────────────────────────────────────────────

describe('computeSha256', () => {
  test('produces 64-char lowercase hex string', () => {
    const hash = computeSha256(Buffer.from('hello'));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  test('is deterministic', () => {
    const bytes = Buffer.from('test data');
    expect(computeSha256(bytes)).toBe(computeSha256(bytes));
  });

  test('different byte content produces different hashes', () => {
    expect(computeSha256(Buffer.from('a'))).not.toBe(computeSha256(Buffer.from('b')));
  });

  test('single-byte difference changes hash entirely', () => {
    const a = Buffer.from('hello world');
    const b = Buffer.from('hello World'); // capital W
    expect(computeSha256(a)).not.toBe(computeSha256(b));
  });

  test('known SHA-256 of empty input (well-known constant)', () => {
    expect(computeSha256(Buffer.alloc(0)))
      .toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  test('known SHA-256 of "The quick brown fox…" (well-known constant)', () => {
    const payload = Buffer.from('The quick brown fox jumps over the lazy dog');
    expect(computeSha256(payload))
      .toBe('d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592');
  });

  test('large input (1 MB zeros) produces valid hash', () => {
    const hash = computeSha256(Buffer.alloc(1024 * 1024));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  test('Uint8Array input produces same result as Buffer', () => {
    const arr  = new Uint8Array([1, 2, 3, 4, 5]);
    const buf  = Buffer.from([1, 2, 3, 4, 5]);
    expect(computeSha256(arr)).toBe(computeSha256(buf));
  });
});

// ─── Manifest entry validation ────────────────────────────────────────────────

describe('manifest entry contentHash validation', () => {
  const HASH_RE = /^[0-9a-f]{64}$/;

  test('valid contentHash passes regex', () => {
    const entry = {
      id:          'builtin-bones',
      contentHash: 'c1d3e2a88c5bc9ea30616030db1c2d46db0b98f33b2da877256035a56473bca3',
    };
    expect(entry.contentHash).toMatch(HASH_RE);
  });

  test('null contentHash fails validation', () => {
    const entry = { id: 'builtin-bones', contentHash: null };
    const isValid = typeof entry.contentHash === 'string' && HASH_RE.test(entry.contentHash);
    expect(isValid).toBe(false);
  });

  test('empty string contentHash fails validation', () => {
    const entry = { id: 'builtin-bones', contentHash: '' };
    expect(HASH_RE.test(entry.contentHash)).toBe(false);
  });

  test('63-char hex string fails (too short)', () => {
    expect(HASH_RE.test('a'.repeat(63))).toBe(false);
  });

  test('65-char hex string fails (too long)', () => {
    expect(HASH_RE.test('a'.repeat(65))).toBe(false);
  });

  test('uppercase hex fails (must be lowercase)', () => {
    expect(HASH_RE.test('A'.repeat(64))).toBe(false);
  });

  test('a real hash from computeSha256 always passes validation', () => {
    const hash = computeSha256(Buffer.from('any content'));
    expect(HASH_RE.test(hash)).toBe(true);
  });

  test('mismatch detection: different bytes → known hash mismatch', () => {
    const originalBytes    = Buffer.from('original file bytes');
    const replacementBytes = Buffer.from('different file bytes');
    const storedHash = computeSha256(originalBytes);
    const actualHash = computeSha256(replacementBytes);
    expect(storedHash).not.toBe(actualHash); // mismatch is detectable
  });
});
