// src/ui/react/context/DevUserContext.test.jsx
// Two tabs must be able to resolve distinct dev identities via ?devUser=,
// and existing sessionStorage/default fallback behavior must be preserved.

import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DevUserProvider, useDevUser } from './DevUserContext.jsx';

vi.mock('@Core/config/clientConfig.js', () => ({
  config: { devBypassAuth: true },
  default: { devBypassAuth: true },
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

  test('without query param or storage, falls back to default mock user', () => {
    render(
      <DevUserProvider>
        <Probe />
      </DevUserProvider>
    );

    expect(screen.getByTestId('user-name').textContent).toBe('CIA Admin');
  });

  test('unknown ?devUser= value falls back to default rather than crashing', () => {
    setLocation('?devUser=nobody');
    render(
      <DevUserProvider>
        <Probe />
      </DevUserProvider>
    );

    expect(screen.getByTestId('user-name').textContent).toBe('CIA Admin');
  });
});
