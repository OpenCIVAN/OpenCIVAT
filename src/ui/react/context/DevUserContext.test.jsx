// src/ui/react/context/DevUserContext.test.jsx
// Two tabs must be able to resolve distinct dev identities via ?devUser=,
// and existing sessionStorage/default fallback behavior must be preserved.

import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DevUserProvider, useDevUser } from './DevUserContext.jsx';

// Mutable so a test can flip the identity revert flag. Hoisted because the
// static import of DevUserContext.jsx runs the mock factory first.
const mockConfig = vi.hoisted(() => ({
  devBypassAuth: true,
  identity: { deviceFallback: true },
}));
vi.mock('@Core/config/clientConfig.js', () => ({
  config: mockConfig,
  default: mockConfig,
}));

vi.mock('@Utils/logger.js', () => ({
  auth: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

function setLocation(search) {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { ...window.location, search },
  });
}

function Probe() {
  const { currentUser, isDevMode } = useDevUser();
  return (
    <div>
      <span data-testid="dev-mode">{String(isDevMode)}</span>
      <span data-testid="user-id">{currentUser?.id}</span>
      <span data-testid="user-name">{currentUser?.name}</span>
    </div>
  );
}

describe('DevUserProvider identity resolution', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    setLocation('');
  });

  test('?devUser=alice resolves to Alice for this tab', () => {
    setLocation('?devUser=alice');
    render(
      <DevUserProvider>
        <Probe />
      </DevUserProvider>
    );

    expect(screen.getByTestId('user-name').textContent).toBe('Alice Analyst');
  });

  test('?devUser=bob resolves to Bob (distinct from alice in another tab)', () => {
    setLocation('?devUser=bob');
    render(
      <DevUserProvider>
        <Probe />
      </DevUserProvider>
    );

    expect(screen.getByTestId('user-name').textContent).toBe('Bob Builder');
  });

  test('query param persists to sessionStorage for reload in the same tab', () => {
    setLocation('?devUser=alice');
    render(
      <DevUserProvider>
        <Probe />
      </DevUserProvider>
    );

    expect(sessionStorage.getItem('cia_dev_mock_user_id')).toBe(
      '00000000-0000-0000-0000-000000000003'
    );
  });

  test('without query param, falls back to sessionStorage value', () => {
    sessionStorage.setItem('cia_dev_mock_user_id', '00000000-0000-0000-0000-000000000004');
    render(
      <DevUserProvider>
        <Probe />
      </DevUserProvider>
    );

    expect(screen.getByTestId('user-name').textContent).toBe('Bob Builder');
  });

  test('without query param or storage, falls back to the per-device identity', () => {
    render(
      <DevUserProvider>
        <Probe />
      </DevUserProvider>
    );

    // NOT the shared default mock user: two headsets sharing ...0002 would
    // collapse into a single Y.js participant and be invisible to each other.
    expect(screen.getByTestId('user-id').textContent).not.toBe(
      '00000000-0000-0000-0000-000000000002'
    );
    expect(screen.getByTestId('user-id').textContent).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(screen.getByTestId('user-name').textContent).toBeTruthy();
  });

  test('unknown ?devUser= value falls back to the device identity rather than crashing', () => {
    setLocation('?devUser=nobody');
    render(
      <DevUserProvider>
        <Probe />
      </DevUserProvider>
    );

    expect(screen.getByTestId('user-id').textContent).not.toBe(
      '00000000-0000-0000-0000-000000000002'
    );
    expect(screen.getByTestId('user-name').textContent).toBeTruthy();
  });

  test('identity.deviceFallback=false reverts to the default mock user', () => {
    mockConfig.identity = { deviceFallback: false };
    try {
      render(
        <DevUserProvider>
          <Probe />
        </DevUserProvider>
      );

      expect(screen.getByTestId('user-name').textContent).toBe('CIA Admin');
    } finally {
      mockConfig.identity = { deviceFallback: true };
    }
  });
});
