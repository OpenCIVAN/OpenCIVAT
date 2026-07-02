// server/src/__tests__/permissions.test.js
// Unit tests for the centralized permission model.
// No database required — pure function tests.

'use strict';

const { PERMISSIONS, ROLE_PERMISSIONS, hasPermission } = require('../utils/permissions');

// ============================================================================
// PERMISSIONS constant
// ============================================================================

describe('PERMISSIONS constants', () => {
  test('all values are non-empty strings', () => {
    for (const [key, value] of Object.entries(PERMISSIONS)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
      expect(value).toContain(':');
    }
  });

  test('is frozen (immutable)', () => {
    expect(Object.isFrozen(PERMISSIONS)).toBe(true);
  });

  test('contains all expected permission keys', () => {
    const expected = [
      'WORKSPACE_READ', 'WORKSPACE_UPDATE', 'WORKSPACE_MANAGE_MEMBERS', 'WORKSPACE_DELETE',
      'ROOM_READ', 'ROOM_CREATE', 'ROOM_UPDATE', 'ROOM_DELETE', 'ROOM_MANAGE_MEMBERS',
      'ROOM_JOIN', 'ROOM_LEAVE',
      'VIEW_READ', 'VIEW_CREATE', 'VIEW_UPDATE', 'VIEW_DELETE',
      'VIEW_CONTROL_CAMERA', 'VIEW_MODIFY_CONFIGURATION',
      'ANNOTATION_CREATE', 'ANNOTATION_UPDATE', 'ANNOTATION_DELETE',
      'DATASET_READ', 'DATASET_UPLOAD', 'DATASET_DELETE',
      'BREAKOUT_CREATE', 'BREAKOUT_MERGE', 'BREAKOUT_DELETE',
    ];
    for (const key of expected) {
      expect(PERMISSIONS).toHaveProperty(key);
    }
  });
});

// ============================================================================
// ROLE_PERMISSIONS mapping
// ============================================================================

describe('ROLE_PERMISSIONS mapping', () => {
  test('all expected roles are defined', () => {
    const roles = ['owner', 'admin', 'editor', 'member', 'viewer', 'observer'];
    for (const role of roles) {
      expect(ROLE_PERMISSIONS[role]).toBeInstanceOf(Set);
      expect(ROLE_PERMISSIONS[role].size).toBeGreaterThan(0);
    }
  });

  test('owner has all permissions', () => {
    const all = Object.values(PERMISSIONS);
    for (const perm of all) {
      expect(ROLE_PERMISSIONS.owner.has(perm)).toBe(true);
    }
  });

  test('owner is a superset of admin', () => {
    for (const perm of ROLE_PERMISSIONS.admin) {
      expect(ROLE_PERMISSIONS.owner.has(perm)).toBe(true);
    }
  });

  test('admin is a superset of editor', () => {
    for (const perm of ROLE_PERMISSIONS.editor) {
      expect(ROLE_PERMISSIONS.admin.has(perm)).toBe(true);
    }
  });

  test('member has same permissions as editor (backward compat)', () => {
    expect(ROLE_PERMISSIONS.member).toBe(ROLE_PERMISSIONS.editor); // same Set reference
  });

  test('viewer cannot create annotations', () => {
    expect(ROLE_PERMISSIONS.viewer.has(PERMISSIONS.ANNOTATION_CREATE)).toBe(false);
  });

  test('viewer cannot upload datasets', () => {
    expect(ROLE_PERMISSIONS.viewer.has(PERMISSIONS.DATASET_UPLOAD)).toBe(false);
  });

  test('viewer cannot manage workspace members', () => {
    expect(ROLE_PERMISSIONS.viewer.has(PERMISSIONS.WORKSPACE_MANAGE_MEMBERS)).toBe(false);
  });

  test('viewer can read workspace and views', () => {
    expect(ROLE_PERMISSIONS.viewer.has(PERMISSIONS.WORKSPACE_READ)).toBe(true);
    expect(ROLE_PERMISSIONS.viewer.has(PERMISSIONS.VIEW_READ)).toBe(true);
    expect(ROLE_PERMISSIONS.viewer.has(PERMISSIONS.DATASET_READ)).toBe(true);
  });

  test('observer has fewer permissions than viewer', () => {
    // Observer cannot join/leave rooms
    expect(ROLE_PERMISSIONS.observer.has(PERMISSIONS.ROOM_JOIN)).toBe(false);
    expect(ROLE_PERMISSIONS.observer.has(PERMISSIONS.ROOM_LEAVE)).toBe(false);
  });

  test('editor can create annotations', () => {
    expect(ROLE_PERMISSIONS.editor.has(PERMISSIONS.ANNOTATION_CREATE)).toBe(true);
  });

  test('editor can create breakout workspaces', () => {
    expect(ROLE_PERMISSIONS.editor.has(PERMISSIONS.BREAKOUT_CREATE)).toBe(true);
  });

  test('admin can merge breakouts', () => {
    expect(ROLE_PERMISSIONS.admin.has(PERMISSIONS.BREAKOUT_MERGE)).toBe(true);
  });

  test('editor cannot delete workspace', () => {
    expect(ROLE_PERMISSIONS.editor.has(PERMISSIONS.WORKSPACE_DELETE)).toBe(false);
  });

  test('owner can delete workspace', () => {
    expect(ROLE_PERMISSIONS.owner.has(PERMISSIONS.WORKSPACE_DELETE)).toBe(true);
  });
});

// ============================================================================
// hasPermission function
// ============================================================================

describe('hasPermission()', () => {
  test('owner has every permission', () => {
    for (const perm of Object.values(PERMISSIONS)) {
      expect(hasPermission('owner', perm)).toBe(true);
    }
  });

  test('viewer cannot create annotations', () => {
    expect(hasPermission('viewer', PERMISSIONS.ANNOTATION_CREATE)).toBe(false);
  });

  test('member can create annotations (same as editor)', () => {
    expect(hasPermission('member', PERMISSIONS.ANNOTATION_CREATE)).toBe(true);
  });

  test('null role returns false', () => {
    expect(hasPermission(null, PERMISSIONS.WORKSPACE_READ)).toBe(false);
  });

  test('undefined role returns false', () => {
    expect(hasPermission(undefined, PERMISSIONS.WORKSPACE_READ)).toBe(false);
  });

  test('unknown role returns false', () => {
    expect(hasPermission('superuser', PERMISSIONS.WORKSPACE_READ)).toBe(false);
  });

  test('null permission returns false', () => {
    expect(hasPermission('owner', null)).toBe(false);
  });

  test('nonexistent permission string returns false for owner', () => {
    expect(hasPermission('owner', 'nonexistent:action')).toBe(false);
  });

  test('viewer cannot delete workspace', () => {
    expect(hasPermission('viewer', PERMISSIONS.WORKSPACE_DELETE)).toBe(false);
  });

  test('admin cannot delete workspace (only owner can)', () => {
    expect(hasPermission('admin', PERMISSIONS.WORKSPACE_DELETE)).toBe(false);
  });

  test('observer cannot join rooms', () => {
    expect(hasPermission('observer', PERMISSIONS.ROOM_JOIN)).toBe(false);
  });

  test('editor can upload datasets', () => {
    expect(hasPermission('editor', PERMISSIONS.DATASET_UPLOAD)).toBe(true);
  });

  test('viewer cannot upload datasets', () => {
    expect(hasPermission('viewer', PERMISSIONS.DATASET_UPLOAD)).toBe(false);
  });
});
