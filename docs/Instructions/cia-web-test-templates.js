// =============================================================================
// CIA Web - Test Templates
// Use these as starting points for testing new components
// =============================================================================

// -----------------------------------------------------------------------------
// TEMPLATE 1: Data Model Tests
// File: src/core/data/models/__tests__/WorkspaceCanvas.test.js
// -----------------------------------------------------------------------------

import { WorkspaceCanvas } from '../WorkspaceCanvas';
import { CanvasPlacement } from '../CanvasPlacement';

describe('WorkspaceCanvas', () => {
  // Test data
  const mockCanvasData = {
    id: 'canvas_001',
    projectId: 'project_001',
    name: 'Test Canvas',
    dimensions: { rows: 3, cols: 3 },
    ownership: { type: 'personal', ownerId: 'user_001' },
    placements: [
      { id: 'p1', row: 0, col: 0, rowSpan: 1, colSpan: 1, content: { type: 'view', viewConfigurationId: 'v1' } },
      { id: 'p2', row: 0, col: 1, rowSpan: 2, colSpan: 2, content: { type: 'view', viewConfigurationId: 'v2' } },
    ],
  };

  describe('constructor', () => {
    it('should create canvas with provided data', () => {
      const canvas = new WorkspaceCanvas(mockCanvasData);
      
      expect(canvas.id).toBe('canvas_001');
      expect(canvas.name).toBe('Test Canvas');
      expect(canvas.dimensions.rows).toBe(3);
      expect(canvas.placements).toHaveLength(2);
    });

    it('should use defaults when no data provided', () => {
      const canvas = new WorkspaceCanvas({ projectId: 'proj' });
      
      expect(canvas.id).toBeNull();
      expect(canvas.name).toBe('Untitled Workspace');
      expect(canvas.dimensions).toEqual({ rows: 3, cols: 3 });
      expect(canvas.placements).toEqual([]);
    });

    it('should convert placement objects to CanvasPlacement instances', () => {
      const canvas = new WorkspaceCanvas(mockCanvasData);
      
      expect(canvas.placements[0]).toBeInstanceOf(CanvasPlacement);
      expect(canvas.placements[1]).toBeInstanceOf(CanvasPlacement);
    });
  });

  describe('addRow', () => {
    it('should increment row count', () => {
      const canvas = new WorkspaceCanvas(mockCanvasData);
      const initialRows = canvas.dimensions.rows;
      
      canvas.addRow();
      
      expect(canvas.dimensions.rows).toBe(initialRows + 1);
    });
  });

  describe('addColumn', () => {
    it('should increment column count', () => {
      const canvas = new WorkspaceCanvas(mockCanvasData);
      const initialCols = canvas.dimensions.cols;
      
      canvas.addColumn();
      
      expect(canvas.dimensions.cols).toBe(initialCols + 1);
    });
  });

  describe('getPlacementAt', () => {
    it('should return placement at exact position', () => {
      const canvas = new WorkspaceCanvas(mockCanvasData);
      
      const placement = canvas.getPlacementAt(0, 0);
      
      expect(placement.id).toBe('p1');
    });

    it('should return spanning placement when position is within span', () => {
      const canvas = new WorkspaceCanvas(mockCanvasData);
      
      // p2 spans from (0,1) to (1,2)
      const placement = canvas.getPlacementAt(1, 2);
      
      expect(placement.id).toBe('p2');
    });

    it('should return undefined for empty position', () => {
      const canvas = new WorkspaceCanvas(mockCanvasData);
      
      const placement = canvas.getPlacementAt(2, 2);
      
      expect(placement).toBeUndefined();
    });
  });

  describe('isPositionAvailable', () => {
    it('should return true for empty position', () => {
      const canvas = new WorkspaceCanvas(mockCanvasData);
      
      expect(canvas.isPositionAvailable(2, 0)).toBe(true);
    });

    it('should return false for occupied position', () => {
      const canvas = new WorkspaceCanvas(mockCanvasData);
      
      expect(canvas.isPositionAvailable(0, 0)).toBe(false);
    });

    it('should return false if span would overlap existing', () => {
      const canvas = new WorkspaceCanvas(mockCanvasData);
      
      // Try to place 2x2 at (1,0) - would overlap with p2 at (0,1)
      expect(canvas.isPositionAvailable(1, 0, 1, 2)).toBe(false);
    });

    it('should return true if excluding the current placement', () => {
      const canvas = new WorkspaceCanvas(mockCanvasData);
      
      // Position is occupied by p1, but we're checking for p1's resize
      expect(canvas.isPositionAvailable(0, 0, 1, 1, 'p1')).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('should serialize all properties', () => {
      const canvas = new WorkspaceCanvas(mockCanvasData);
      const json = canvas.toJSON();
      
      expect(json.id).toBe('canvas_001');
      expect(json.placements).toHaveLength(2);
      expect(json.placements[0].id).toBe('p1');
    });
  });
});


// -----------------------------------------------------------------------------
// TEMPLATE 2: Manager Tests
// File: src/core/data/managers/__tests__/CanvasManager.test.js
// -----------------------------------------------------------------------------

import { CanvasManager } from '../CanvasManager';
import { WorkspaceCanvas } from '../../models/WorkspaceCanvas';

// Mock fetch
global.fetch = jest.fn();

// Mock session manager
jest.mock('@Core/session/sessionManager', () => ({
  sessionManager: {
    getUserId: () => 'user_001',
    getToken: () => 'mock-token',
  },
}));

// Mock config
jest.mock('@Core/config/clientConfig', () => ({
  config: {
    apiBaseUrl: 'http://localhost:3000',
  },
}));

describe('CanvasManager', () => {
  let manager;

  beforeEach(() => {
    manager = new CanvasManager();
    fetch.mockClear();
  });

  describe('getPersonalCanvas', () => {
    it('should fetch personal canvas from API if not cached', async () => {
      const mockCanvas = {
        id: 'canvas_001',
        projectId: 'project_001',
        name: 'My Workspace',
        ownership: { type: 'personal', ownerId: 'user_001' },
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockCanvas]),
      });

      const canvas = await manager.getPersonalCanvas('project_001');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/projects/project_001/canvases?type=personal',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
          }),
        })
      );
      expect(canvas).toBeInstanceOf(WorkspaceCanvas);
      expect(canvas.id).toBe('canvas_001');
    });

    it('should return cached canvas if available', async () => {
      // First call - fetches from API
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{
          id: 'canvas_001',
          projectId: 'project_001',
          ownership: { type: 'personal', ownerId: 'user_001' },
        }]),
      });

      await manager.getPersonalCanvas('project_001');
      
      // Second call - should use cache
      const canvas = await manager.getPersonalCanvas('project_001');

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(canvas.id).toBe('canvas_001');
    });

    it('should create new canvas if none exists', async () => {
      // First fetch returns empty array
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      // Create call
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'canvas_new',
          projectId: 'project_001',
          name: 'My Workspace',
        }),
      });

      const canvas = await manager.getPersonalCanvas('project_001');

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(canvas.id).toBe('canvas_new');
    });
  });

  describe('addPlacement', () => {
    it('should POST to API and update cache', async () => {
      // Setup: create canvas first
      manager._canvases.set('canvas_001', new WorkspaceCanvas({
        id: 'canvas_001',
        projectId: 'project_001',
        placements: [],
      }));

      const newPlacement = {
        row: 0,
        col: 0,
        content: { type: 'view', viewConfigurationId: 'view_001' },
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'placement_001',
          ...newPlacement,
          rowSpan: 1,
          colSpan: 1,
        }),
      });

      const placement = await manager.addPlacement('canvas_001', newPlacement);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/canvases/canvas_001/placements',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newPlacement),
        })
      );
      expect(placement.id).toBe('placement_001');
      
      // Verify cache updated
      const canvas = manager._canvases.get('canvas_001');
      expect(canvas.placements).toHaveLength(1);
    });
  });

  describe('getVisiblePlacements', () => {
    it('should return only placements within viewport', () => {
      const canvas = new WorkspaceCanvas({
        id: 'canvas_001',
        placements: [
          { id: 'p1', row: 0, col: 0, rowSpan: 1, colSpan: 1, content: { type: 'view', viewConfigurationId: 'v1' } },
          { id: 'p2', row: 0, col: 2, rowSpan: 1, colSpan: 1, content: { type: 'view', viewConfigurationId: 'v2' } },
          { id: 'p3', row: 3, col: 0, rowSpan: 1, colSpan: 1, content: { type: 'view', viewConfigurationId: 'v3' } },
        ],
      });

      const viewport = { row: 0, col: 0, rows: 2, cols: 2 };
      const visible = manager.getVisiblePlacements(canvas, viewport);

      expect(visible).toHaveLength(1);
      expect(visible[0].id).toBe('p1');
    });

    it('should include spanning placements that overlap viewport', () => {
      const canvas = new WorkspaceCanvas({
        id: 'canvas_001',
        placements: [
          { id: 'p1', row: 0, col: 1, rowSpan: 2, colSpan: 2, content: { type: 'view', viewConfigurationId: 'v1' } },
        ],
      });

      // Viewport starts at (1, 2) - p1 spans into this area
      const viewport = { row: 1, col: 2, rows: 2, cols: 2 };
      const visible = manager.getVisiblePlacements(canvas, viewport);

      expect(visible).toHaveLength(1);
      expect(visible[0].id).toBe('p1');
    });
  });

  describe('events', () => {
    it('should emit events when placements are added', async () => {
      manager._canvases.set('canvas_001', new WorkspaceCanvas({
        id: 'canvas_001',
        placements: [],
      }));

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'p1', row: 0, col: 0 }),
      });

      const listener = jest.fn();
      manager.on('placementAdded', listener);

      await manager.addPlacement('canvas_001', { row: 0, col: 0 });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          canvas: expect.any(WorkspaceCanvas),
          placement: expect.objectContaining({ id: 'p1' }),
        })
      );
    });
  });
});


// -----------------------------------------------------------------------------
// TEMPLATE 3: React Component Tests
// File: src/ui/react/components/workspace/CanvasCell/__tests__/CanvasCell.test.jsx
// -----------------------------------------------------------------------------

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CanvasCell } from '../CanvasCell';
import { CanvasPlacement } from '@Core/data/models/CanvasPlacement';

// Mock the hooks
jest.mock('@UI/react/hooks/useInstanceHandler', () => ({
  useInstanceHandler: () => ({
    getToolbarConfig: () => ({ position: 'top', groups: [] }),
    getHeaderActions: () => [],
  }),
}));

describe('CanvasCell', () => {
  const mockViewPlacement = new CanvasPlacement({
    id: 'p1',
    row: 0,
    col: 0,
    rowSpan: 1,
    colSpan: 1,
    content: { type: 'view', viewConfigurationId: 'view_001' },
  });

  const mockEmptyPlacement = new CanvasPlacement({
    id: 'p2',
    row: 1,
    col: 0,
    content: { type: 'empty' },
  });

  const mockNotesPlacement = new CanvasPlacement({
    id: 'p3',
    row: 0,
    col: 1,
    content: { type: 'notes', notesBlockId: 'notes_001' },
  });

  const mockViewport = { row: 0, col: 0, rows: 2, cols: 2 };

  describe('rendering', () => {
    it('should render view cell with header', () => {
      render(<CanvasCell placement={mockViewPlacement} viewport={mockViewport} />);
      
      expect(screen.getByTestId('canvas-cell')).toBeInTheDocument();
      expect(screen.getByTestId('canvas-cell-header')).toBeInTheDocument();
    });

    it('should render empty cell with placeholder', () => {
      render(<CanvasCell placement={mockEmptyPlacement} viewport={mockViewport} />);
      
      expect(screen.getByText(/click to add/i)).toBeInTheDocument();
    });

    it('should render notes cell with notes indicator', () => {
      render(<CanvasCell placement={mockNotesPlacement} viewport={mockViewport} />);
      
      expect(screen.getByTestId('canvas-cell')).toHaveClass('canvas-cell--notes');
    });
  });

  describe('spanning', () => {
    it('should apply spanning class for multi-cell placement', () => {
      const spanningPlacement = new CanvasPlacement({
        id: 'p4',
        row: 0,
        col: 0,
        rowSpan: 2,
        colSpan: 2,
        content: { type: 'view', viewConfigurationId: 'view_001' },
      });

      render(<CanvasCell placement={spanningPlacement} viewport={mockViewport} />);
      
      expect(screen.getByTestId('canvas-cell')).toHaveClass('canvas-cell--spanning');
    });

    it('should display span size in header', () => {
      const spanningPlacement = new CanvasPlacement({
        id: 'p4',
        rowSpan: 2,
        colSpan: 3,
        content: { type: 'view', viewConfigurationId: 'view_001' },
      });

      render(<CanvasCell placement={spanningPlacement} viewport={mockViewport} />);
      
      expect(screen.getByText('3×2')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onSelect when clicked in selection mode', () => {
      const onSelect = jest.fn();
      
      render(
        <CanvasCell 
          placement={mockViewPlacement} 
          viewport={mockViewport}
          isSelecting={true}
          onSelect={onSelect}
        />
      );
      
      fireEvent.click(screen.getByTestId('canvas-cell'));
      
      expect(onSelect).toHaveBeenCalledWith(mockViewPlacement.id);
    });

    it('should show action buttons on hover', async () => {
      render(<CanvasCell placement={mockViewPlacement} viewport={mockViewport} />);
      
      const cell = screen.getByTestId('canvas-cell');
      fireEvent.mouseEnter(cell);
      
      expect(screen.getByTestId('close-button')).toBeVisible();
    });
  });

  describe('selection', () => {
    it('should apply selected class when selected', () => {
      render(
        <CanvasCell 
          placement={mockViewPlacement} 
          viewport={mockViewport}
          isSelected={true}
        />
      );
      
      expect(screen.getByTestId('canvas-cell')).toHaveClass('canvas-cell--selected');
    });
  });
});


// -----------------------------------------------------------------------------
// TEMPLATE 4: Hook Tests
// File: src/ui/react/hooks/__tests__/useCanvas.test.js
// -----------------------------------------------------------------------------

import { renderHook, act } from '@testing-library/react-hooks';
import { useCanvas } from '../useCanvas';
import { CanvasProvider } from '../../contexts/CanvasContext';
import { canvasManager } from '@Core/data/managers/CanvasManager';

// Mock the canvas manager
jest.mock('@Core/data/managers/CanvasManager', () => ({
  canvasManager: {
    getPersonalCanvas: jest.fn(),
    getVisiblePlacements: jest.fn(),
    on: jest.fn(() => jest.fn()), // Returns cleanup function
  },
}));

describe('useCanvas', () => {
  const wrapper = ({ children }) => (
    <CanvasProvider projectId="project_001">
      {children}
    </CanvasProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    canvasManager.getPersonalCanvas.mockResolvedValue({
      id: 'canvas_001',
      dimensions: { rows: 3, cols: 3 },
      placements: [],
    });
    canvasManager.getVisiblePlacements.mockReturnValue([]);
  });

  it('should provide canvas state', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useCanvas(), { wrapper });
    
    await waitForNextUpdate();
    
    expect(result.current.canvas).toBeDefined();
    expect(result.current.canvas.id).toBe('canvas_001');
  });

  it('should provide viewport state', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useCanvas(), { wrapper });
    
    await waitForNextUpdate();
    
    expect(result.current.viewport).toEqual({
      row: 0,
      col: 0,
      rows: 3,
      cols: 3,
    });
  });

  it('should update viewport when moveViewport is called', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useCanvas(), { wrapper });
    
    await waitForNextUpdate();
    
    act(() => {
      result.current.moveViewport(1, 1);
    });
    
    expect(result.current.viewport.row).toBe(1);
    expect(result.current.viewport.col).toBe(1);
  });

  it('should not allow viewport to go negative', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useCanvas(), { wrapper });
    
    await waitForNextUpdate();
    
    act(() => {
      result.current.moveViewport(-5, -5);
    });
    
    expect(result.current.viewport.row).toBe(0);
    expect(result.current.viewport.col).toBe(0);
  });

  it('should calculate visible placements', async () => {
    const mockPlacements = [{ id: 'p1' }, { id: 'p2' }];
    canvasManager.getVisiblePlacements.mockReturnValue(mockPlacements);
    
    const { result, waitForNextUpdate } = renderHook(() => useCanvas(), { wrapper });
    
    await waitForNextUpdate();
    
    expect(result.current.visiblePlacements).toEqual(mockPlacements);
  });
});


// -----------------------------------------------------------------------------
// TEMPLATE 5: VR Stub Tests
// File: src/core/vr/__tests__/VRManager.test.js
// -----------------------------------------------------------------------------

import { VRManager, vrManager } from '../VRManager';

describe('VRManager', () => {
  let manager;

  beforeEach(() => {
    manager = new VRManager();
  });

  describe('isVRSupported', () => {
    it('should return false when navigator.xr is undefined', () => {
      // Default JSDOM doesn't have WebXR
      expect(manager.isVRSupported()).toBe(false);
    });

    it('should return true when WebXR is available', () => {
      // Mock WebXR
      global.navigator.xr = {
        isSessionSupported: jest.fn(),
      };

      expect(manager.isVRSupported()).toBe(true);

      // Cleanup
      delete global.navigator.xr;
    });
  });

  describe('getState', () => {
    it('should return initial state', () => {
      const state = manager.getState();

      expect(state).toEqual({
        mode: 'inactive',
        isolatedViewId: null,
        hasSession: false,
      });
    });
  });

  describe('enterVR', () => {
    it('should throw not implemented error (stub)', async () => {
      await expect(manager.enterVR()).rejects.toThrow('VR mode not yet implemented');
    });
  });

  describe('enterIsolationMode', () => {
    it('should update state (stub behavior)', () => {
      manager.enterIsolationMode('view_001');

      const state = manager.getState();
      expect(state.mode).toBe('isolated');
      expect(state.isolatedViewId).toBe('view_001');
    });
  });

  describe('exitIsolationMode', () => {
    it('should reset isolation state', () => {
      manager.enterIsolationMode('view_001');
      manager.exitIsolationMode();

      const state = manager.getState();
      expect(state.mode).toBe('grid');
      expect(state.isolatedViewId).toBeNull();
    });
  });

  describe('singleton', () => {
    it('should export a singleton instance', () => {
      expect(vrManager).toBeInstanceOf(VRManager);
    });
  });
});
