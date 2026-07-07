// src/core/data/managers/__tests__/ViewConfigurationManager.visualization.test.js
import { describe, test, expect, beforeEach, vi } from 'vitest';

// ============================================================================
// Mocks for heavy dependencies (mirrors ViewConfigurationManager.conflict.test.js)
// ============================================================================

vi.mock('@Utils/logger.js', () => {
  const mkLog = () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() });
  return {
    view: mkLog(), viewGroup: mkLog(), annotation: mkLog(), sync: mkLog(),
    presence: mkLog(), app: mkLog(), wsa: mkLog(),
    createLogger: () => mkLog(),
  };
});

vi.mock('@Core/config/clientConfig.js', () => ({
  config: { defaultSessionId: 'project-1' },
  default: { defaultSessionId: 'project-1' },
}));

vi.mock('@Core/session/sessionManager.js', () => ({
  sessionManager: { getProjectId: vi.fn().mockReturnValue('project-1') },
}));

vi.mock('@Collaboration/presence/userManagement.js', () => ({
  getUserId: vi.fn().mockReturnValue('user-1'),
  getUserName: vi.fn().mockReturnValue('Test User'),
}));

vi.mock('@Collaboration/yjs/yjsSetup.js', () => ({
  ydoc: { getMap: vi.fn().mockReturnValue({ set: vi.fn() }), clientID: 1 },
}));

vi.mock('@Core/instances/types/instanceTypeRegistry.js', () => ({
  instanceTypeRegistry: { get: vi.fn() },
}));

vi.mock('@Services/apiClient.js', () => ({
  apiClient: { put: vi.fn(), post: vi.fn(), get: vi.fn() },
}));

import { ViewConfigurationManager } from '../ViewConfigurationManager.js';
import { ViewConfiguration } from '../../models/ViewConfiguration.js';
import { apiClient as mockApiClient } from '@Services/apiClient.js';

function makeManager() {
  // Use 1 not 0: syncThrottleMs uses || fallback so 0 would become 100ms default
  const mgr = new ViewConfigurationManager({ syncThrottleMs: 1 });
  mgr._projectId = 'project-1';
  return mgr;
}

describe('ViewConfigurationManager.updateVisualization', () => {
  let mgr;

  beforeEach(() => {
    mgr = makeManager();
    vi.clearAllMocks();
  });

  test('merges patch into view.visualization and queues a server sync', async () => {
    const view = new ViewConfiguration({ id: 'view-1', revision: 3 });
    mgr._viewConfigs.set(view.id, view);

    mockApiClient.put.mockResolvedValueOnce({ view: { id: 'view-1', revision: 4 } });

    mgr.updateVisualization('view-1', { opacity: 0.5 });
    expect(view.visualization).toEqual({ opacity: 0.5 });

    await new Promise((r) => setTimeout(r, 10));
    expect(mockApiClient.put).toHaveBeenCalledWith(
      '/views/view-1',
      expect.objectContaining({ visualization: { opacity: 0.5 } })
    );
  });

  test('shallow-merges successive patches at the top level (later patch wins per-key)', () => {
    const view = new ViewConfiguration({ id: 'view-1' });
    mgr._viewConfigs.set(view.id, view);

    mgr.updateVisualization('view-1', { opacity: 0.5 });
    mgr.updateVisualization('view-1', { representation: 'wireframe' });

    expect(view.visualization).toEqual({ opacity: 0.5, representation: 'wireframe' });
  });

  test('a nested key (e.g. transform) is replaced wholesale, not deep-merged', () => {
    const view = new ViewConfiguration({ id: 'view-1' });
    mgr._viewConfigs.set(view.id, view);

    mgr.updateVisualization('view-1', { transform: { position: [1, 2, 3] } });
    mgr.updateVisualization('view-1', { transform: { rotation: [0, 90, 0] } });

    // The second call's `transform` key replaces the first entirely —
    // callers must always send the full nested shape they want applied.
    expect(view.visualization.transform).toEqual({ rotation: [0, 90, 0] });
  });

  test('emits visualizationChanged with the raw patch', () => {
    const view = new ViewConfiguration({ id: 'view-1' });
    mgr._viewConfigs.set(view.id, view);

    const events = [];
    mgr.on('visualizationChanged', (e) => events.push(e));

    mgr.updateVisualization('view-1', { colormap: 'plasma' });

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ viewId: 'view-1', visualization: { colormap: 'plasma' } });
  });

  test('no-ops when the view does not exist', () => {
    expect(() => mgr.updateVisualization('missing-view', { opacity: 1 })).not.toThrow();
    expect(mockApiClient.put).not.toHaveBeenCalled();
  });

  test('_serverToClientFormat / _clientToServerFormat round-trip the visualization field', () => {
    const view = new ViewConfiguration({ id: 'view-1', visualization: { opacity: 0.75 } });

    const serverShape = mgr._clientToServerFormat(view);
    expect(serverShape.visualization).toEqual({ opacity: 0.75 });

    const clientShape = mgr._serverToClientFormat({ id: 'view-1', visualization: { opacity: 0.75 } });
    expect(clientShape.visualization).toEqual({ opacity: 0.75 });
  });
});
