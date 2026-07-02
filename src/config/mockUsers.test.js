// src/config/mockUsers.test.js
// Dev mock user storage must be tab-scoped (sessionStorage), not shared
// across tabs (localStorage), so two local tabs can hold distinct identities.

import { describe, test, expect, beforeEach } from 'vitest';
import {
  MOCK_USER_STORAGE_KEY,
  getMockUserByExternalId,
  getStoredMockUserId,
  storeMockUserId,
  clearStoredMockUserId,
} from './mockUsers.js';

describe('mock user storage (tab-scoped)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  test('storeMockUserId writes to sessionStorage, not localStorage', () => {
    storeMockUserId('00000000-0000-0000-0000-000000000003');

    expect(sessionStorage.getItem(MOCK_USER_STORAGE_KEY)).toBe(
      '00000000-0000-0000-0000-000000000003'
    );
    expect(localStorage.getItem(MOCK_USER_STORAGE_KEY)).toBeNull();
  });

  test('getStoredMockUserId reads back what was stored', () => {
    storeMockUserId('00000000-0000-0000-0000-000000000004');
    expect(getStoredMockUserId()).toBe('00000000-0000-0000-0000-000000000004');
  });

  test('getStoredMockUserId returns null when nothing stored', () => {
    expect(getStoredMockUserId()).toBeNull();
  });

  test('clearStoredMockUserId removes the session-scoped value', () => {
    storeMockUserId('00000000-0000-0000-0000-000000000003');
    clearStoredMockUserId();
    expect(getStoredMockUserId()).toBeNull();
  });

  test('a value left in localStorage from an old session is ignored', () => {
    // Simulates pre-fix state / stale data — must not leak into the new
    // sessionStorage-backed read path.
    localStorage.setItem(MOCK_USER_STORAGE_KEY, '00000000-0000-0000-0000-000000000002');
    expect(getStoredMockUserId()).toBeNull();
  });
});

describe('getMockUserByExternalId', () => {
  test('resolves known externalIds used by ?devUser= query param', () => {
    expect(getMockUserByExternalId('alice')?.name).toBe('Alice Analyst');
    expect(getMockUserByExternalId('bob')?.name).toBe('Bob Builder');
    expect(getMockUserByExternalId('cia-admin')?.name).toBe('CIA Admin');
    expect(getMockUserByExternalId('viewer')?.name).toBe('View Only');
  });

  test('is case-insensitive', () => {
    expect(getMockUserByExternalId('ALICE')?.name).toBe('Alice Analyst');
  });

  test('returns undefined for unknown or missing externalId', () => {
    expect(getMockUserByExternalId('nobody')).toBeUndefined();
    expect(getMockUserByExternalId(null)).toBeUndefined();
    expect(getMockUserByExternalId('')).toBeUndefined();
  });
});
