import React, { useState, useRef } from 'react';
import { 
  Database, ChevronDown, ChevronRight, ChevronLeft, X, Plus, Minus,
  Users, Grid, LayoutGrid, Maximize2, Copy, MoreVertical, Search,
  Map, Move, Crosshair, ZoomIn, ZoomOut, Layers, Eye, EyeOff,
  PanelLeftClose, PanelLeft, Square, CheckSquare, Scissors, Merge,
  ArrowUpRight, GripVertical, Lock, Unlock, Trash2, Settings
} from 'lucide-react';

// Mock canvas data - imagine a 5x4 grid of possible view slots
const CANVAS_ROWS = 4;
const CANVAS_COLS = 5;

const mockViews = [
  { id: 'v1', name: 'Brain MRI - Axial', dataset: 'Brain MRI', row: 0, col: 0 },
  { id: 'v2', name: 'Brain MRI - Sagittal', dataset: 'Brain MRI', row: 0, col: 1 },
  { id: 'v3', name: 'Brain MRI - Coronal', dataset: 'Brain MRI', row: 0, col: 2 },
  { id: 'v4', name: 'Chest CT - Main', dataset: 'Chest CT', row: 1, col: 0 },
  { id: 'v5', name: 'Chest CT - Slice', dataset: 'Chest CT', row: 1, col: 1 },
  { id: 'v6', name: 'Spine Model', dataset: 'Spine VTK', row: 2, col: 0 },
  { id: 'v7', name: 'Heart Segmentation', dataset: 'Heart DICOM', row: 2, col: 3 },
  { id: 'v8', name: 'Lung Analysis', dataset: 'Lung CT', row: 3, col: 1 },
  { id: 'v9', name: 'Tumor Comparison', dataset: 'Tumor Series', row: 3, col: 2 },
];

export default function LayoutConfigConcept() {
  // Viewport position (which 3x3 area we're viewing)
  const [viewportRow, setViewportRow] = useState(0);
  const [viewportCol, setViewportCol] = useState(0);
  const [viewportSize, setViewportSize] = useState({ rows: 2, cols: 3 }); // Currently viewing 2x3
  
  // Selection for subset creation
  const [selectedViews, setSelectedViews] = useState(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  
  // Panel states
  const [layoutPanelOpen, setLayoutPanelOpen] = useState(true);
  const [configTab, setConfigTab] = useState('map'); // 'map' | 'views' | 'subsets'
  
  // Subsets (focused grids)
  const [subsets, setSubsets] = useState([
    { id: 'sub1', name: 'MRI Comparison', viewIds: ['v1', 'v2', 'v3'], created: '2 hours ago' }
  ]);
  const [activeSubset, setActiveSubset] = useState(null);
  
  // Drag state for mini-map
  const [isDraggingViewport, setIsDraggingViewport] = useState(false);

  // Helper to check if a view is in current viewport
  const isInViewport = (view) => {
    return view.row >= viewportRow && 
           view.row < viewportRow + viewportSize.rows &&
           view.col >= viewportCol && 
           view.col < viewportCol + viewportSize.cols;
  };

  // Helper to get view at position
  const getViewAt = (row, col) => mockViews.find(v => v.row === row && v.col === col);

  // Toggle view selection
  const toggleViewSelection = (viewId) => {
    setSelectedViews(prev => {
      const next = new Set(prev);
      if (next.has(viewId)) next.delete(viewId);
      else next.add(viewId);
      return next;
    });
  };

  // Create subset from selection
  const createSubset = () => {
    if (selectedViews.size === 0) return;
    const newSubset = {
      id: `sub${Date.now()}`,
      name: `Focus Group ${subsets.length + 1}`,
      viewIds: Array.from(selectedViews),
      created: 'Just now'
    };
    setSubsets([...subsets, newSubset]);
    setSelectedViews(new Set());
    setIsSelecting(false);
  };

  // Navigate viewport
  const moveViewport = (dRow, dCol) => {
    setViewportRow(Math.max(0, Math.min(CANVAS_ROWS - viewportSize.rows, viewportRow + dRow)));
    setViewportCol(Math.max(0, Math.min(CANVAS_COLS - viewportSize.cols, viewportCol + dCol)));
  };

  // Render mini-map cell
  const renderMiniMapCell = (row, col) => {
    const view = getViewAt(row, col);
    const inViewport = row >= viewportRow && row < viewportRow + viewportSize.rows &&
                       col >= viewportCol && col < viewportCol + viewportSize.cols;
    const isSelected = view && selectedViews.has(view.id);
    
    return (
      <div
        key={`${row}-${col}`}
        onClick={() => view && isSelecting && toggleViewSelection(view.id)}
        className={`
          w-8 h-6 rounded-sm border transition-all cursor-pointer
          ${view ? 'bg-blue-500/30 border-blue-500/50' : 'bg-white/5 border-white/10'}
          ${inViewport ? 'ring-2 ring-green-400 ring-offset-1 ring-offset-gray-900' : ''}
          ${isSelected ? 'bg-yellow-500/50 border-yellow-400' : ''}
          ${!view && 'hover:bg-white/10'}
        `}
        title={view ? view.name : 'Empty slot'}
      >
        {view && (
          <div className="w-full h-full flex items-center justify-center">
            {isSelected && <CheckSquare size={10} className="text-yellow-400" />}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-200 overflow-hidden">
      {/* Top Bar */}
      <div className="h-12 bg-gray-900/95 border-b border-white/10 flex items-center px-4 gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-400 to-blue-600" />
          <span className="font-semibold text-sm">CIA Web</span>
        </div>
        <div className="flex-1" />
        
        {/* Viewport indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded text-sm">
          <Map size={14} className="text-blue-400" />
          <span className="text-gray-400">Viewing:</span>
          <span className="font-mono">
            ({viewportRow},{viewportCol}) → ({viewportRow + viewportSize.rows - 1},{viewportCol + viewportSize.cols - 1})
          </span>
        </div>
        
        {/* Canvas navigation */}
        <div className="flex items-center gap-1">
          <button onClick={() => moveViewport(-1, 0)} disabled={viewportRow === 0}
            className="p-1.5 rounded hover:bg-white/10 disabled:opacity-30">
            <ChevronDown size={16} className="rotate-180" />
          </button>
          <button onClick={() => moveViewport(1, 0)} disabled={viewportRow >= CANVAS_ROWS - viewportSize.rows}
            className="p-1.5 rounded hover:bg-white/10 disabled:opacity-30">
            <ChevronDown size={16} />
          </button>
          <button onClick={() => moveViewport(0, -1)} disabled={viewportCol === 0}
            className="p-1.5 rounded hover:bg-white/10 disabled:opacity-30">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => moveViewport(0, 1)} disabled={viewportCol >= CANVAS_COLS - viewportSize.cols}
            className="p-1.5 rounded hover:bg-white/10 disabled:opacity-30">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left: Dataset Panel (collapsed for this demo) */}
        <div className="w-12 bg-gray-900/70 border-r border-white/10 flex flex-col items-center py-2 gap-2">
          <button className="p-2 rounded hover:bg-white/10 text-gray-500">
            <Database size={18} />
          </button>
          <button className="p-2 rounded hover:bg-white/10 text-gray-500">
            <Layers size={18} />
          </button>
        </div>

        {/* Center: Workspace Grid */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Grid Header */}
          <div className="h-10 flex items-center justify-between px-4 bg-gray-900/50 border-b border-white/5">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">Canvas: {CANVAS_COLS}×{CANVAS_ROWS}</span>
              <span className="text-xs text-gray-600">|</span>
              <span className="text-xs text-gray-500">Viewport: {viewportSize.cols}×{viewportSize.rows}</span>
            </div>
            
            {/* Viewport size controls */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Viewport size:</span>
              {[[2,2], [2,3], [3,3]].map(([r,c]) => (
                <button
                  key={`${r}x${c}`}
                  onClick={() => setViewportSize({ rows: r, cols: c })}
                  className={`px-2 py-1 rounded text-xs ${
                    viewportSize.rows === r && viewportSize.cols === c
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                      : 'text-gray-500 hover:bg-white/10'
                  }`}
                >
                  {c}×{r}
                </button>
              ))}
            </div>
          </div>

          {/* The Viewport Grid */}
          <div className="flex-1 p-3 overflow-hidden">
            <div 
              className="w-full h-full grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${viewportSize.cols}, 1fr)`,
                gridTemplateRows: `repeat(${viewportSize.rows}, 1fr)`
              }}
            >
              {Array.from({ length: viewportSize.rows * viewportSize.cols }).map((_, i) => {
                const row = viewportRow + Math.floor(i / viewportSize.cols);
                const col = viewportCol + (i % viewportSize.cols);
                const view = getViewAt(row, col);
                const isSelected = view && selectedViews.has(view.id);
                
                return (
                  <div 
                    key={i}
                    className={`
                      relative bg-gray-900/50 rounded-lg border overflow-hidden flex flex-col
                      ${isSelected ? 'border-yellow-400 ring-2 ring-yellow-400/30' : 'border-white/10'}
                      ${isSelecting && view ? 'cursor-pointer' : ''}
                    `}
                    onClick={() => isSelecting && view && toggleViewSelection(view.id)}
                  >
                    {view ? (
                      <>
                        <div className="h-8 flex items-center justify-between px-2 bg-black/30 border-b border-white/5">
                          <div className="flex items-center gap-2 min-w-0">
                            {isSelecting && (
                              <div className={`w-4 h-4 rounded border ${isSelected ? 'bg-yellow-400 border-yellow-400' : 'border-gray-500'}`}>
                                {isSelected && <CheckSquare size={14} className="text-gray-900" />}
                              </div>
                            )}
                            <span className="text-xs font-medium truncate">{view.name}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <span className="font-mono">({row},{col})</span>
                          </div>
                        </div>
                        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                          <div className="text-center">
                            <div className="text-3xl mb-1">🧠</div>
                            <span className="text-xs text-gray-500">{view.dataset}</span>
                            <div className="flex items-center justify-center gap-1 mt-1">
                              <Eye size={10} className="text-green-400" />
                              <span className="text-xs text-green-400">Rendering</span>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
                        <Plus size={20} className="mb-1" />
                        <span className="text-xs">Empty ({row},{col})</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Layout Configuration Panel */}
        <div 
          className={`shrink-0 flex flex-col bg-gray-900/70 border-l border-white/10 transition-all duration-200 ${layoutPanelOpen ? 'w-72' : 'w-12'}`}
          style={{ borderRight: '3px solid #a855f7' }}
        >
          <div className="h-10 flex items-center justify-between px-3 border-b border-white/5">
            <button onClick={() => setLayoutPanelOpen(!layoutPanelOpen)} className="p-1 rounded hover:bg-white/10 text-gray-500">
              {layoutPanelOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
            {layoutPanelOpen && <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Layout</span>}
          </div>

          {layoutPanelOpen && (
            <>
              {/* Tabs */}
              <div className="flex border-b border-white/5">
                {[
                  { id: 'map', icon: Map, label: 'Map' },
                  { id: 'views', icon: Layers, label: 'Views' },
                  { id: 'subsets', icon: Grid, label: 'Subsets' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setConfigTab(tab.id)}
                    className={`flex-1 flex flex-col items-center gap-1 py-2 ${
                      configTab === tab.id ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <tab.icon size={16} />
                    <span className="text-xs">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-3">
                
                {/* MAP TAB */}
                {configTab === 'map' && (
                  <div className="space-y-4">
                    {/* Mini-map */}
                    <div className="p-3 bg-black/30 rounded-lg border border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-gray-400">Canvas Overview</span>
                        <span className="text-xs text-gray-600">{mockViews.length} views</span>
                      </div>
                      
                      {/* Grid mini-map */}
                      <div 
                        className="grid gap-1 mx-auto"
                        style={{ 
                          gridTemplateColumns: `repeat(${CANVAS_COLS}, 1fr)`,
                          maxWidth: `${CANVAS_COLS * 36}px`
                        }}
                      >
                        {Array.from({ length: CANVAS_ROWS * CANVAS_COLS }).map((_, i) => 
                          renderMiniMapCell(Math.floor(i / CANVAS_COLS), i % CANVAS_COLS)
                        )}
                      </div>
                      
                      {/* Legend */}
                      <div className="flex items-center gap-4 mt-3 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-sm bg-blue-500/30 border border-blue-500/50" />
                          <span className="text-gray-500">Has view</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-sm ring-2 ring-green-400" />
                          <span className="text-gray-500">Viewport</span>
                        </div>
                      </div>
                    </div>

                    {/* Selection Mode */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-400">Selection Mode</span>
                        <button
                          onClick={() => {
                            setIsSelecting(!isSelecting);
                            if (isSelecting) setSelectedViews(new Set());
                          }}
                          className={`px-2 py-1 rounded text-xs ${
                            isSelecting ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/10 text-gray-400'
                          }`}
                        >
                          {isSelecting ? 'Cancel' : 'Select Views'}
                        </button>
                      </div>
                      
                      {isSelecting && (
                        <div className="p-2 bg-yellow-500/10 rounded border border-yellow-500/30 text-xs text-yellow-400">
                          Click views on the map or grid to select them. Selected: {selectedViews.size}
                        </div>
                      )}
                      
                      {selectedViews.size > 0 && (
                        <button
                          onClick={createSubset}
                          className="w-full py-2 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 text-sm hover:bg-purple-500/30"
                        >
                          <Scissors size={14} className="inline mr-2" />
                          Create Subset ({selectedViews.size} views)
                        </button>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-gray-400">Canvas Actions</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button className="flex items-center justify-center gap-1 py-2 rounded bg-white/5 text-gray-400 text-xs hover:bg-white/10">
                          <Plus size={12} />
                          Add Row
                        </button>
                        <button className="flex items-center justify-center gap-1 py-2 rounded bg-white/5 text-gray-400 text-xs hover:bg-white/10">
                          <Plus size={12} />
                          Add Column
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* VIEWS TAB */}
                {configTab === 'views' && (
                  <div className="space-y-2">
                    <div className="text-xs text-gray-500 mb-3">
                      Drag views to rearrange on canvas
                    </div>
                    {mockViews.map(view => (
                      <div 
                        key={view.id}
                        className="flex items-center gap-2 p-2 rounded bg-white/5 border border-white/10 hover:bg-white/10 cursor-grab"
                      >
                        <GripVertical size={14} className="text-gray-600" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">{view.name}</div>
                          <div className="text-xs text-gray-600">{view.dataset}</div>
                        </div>
                        <span className="text-xs text-gray-500 font-mono">
                          ({view.row},{view.col})
                        </span>
                        {isInViewport(view) && (
                          <Eye size={12} className="text-green-400" />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* SUBSETS TAB */}
                {configTab === 'subsets' && (
                  <div className="space-y-3">
                    <div className="text-xs text-gray-500">
                      Focus on specific views for detailed work
                    </div>
                    
                    {subsets.map(subset => (
                      <div 
                        key={subset.id}
                        className={`p-3 rounded-lg border ${
                          activeSubset === subset.id 
                            ? 'bg-purple-500/20 border-purple-500/50' 
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{subset.name}</span>
                          <button className="p-1 rounded hover:bg-white/10 text-gray-500">
                            <MoreVertical size={14} />
                          </button>
                        </div>
                        <div className="text-xs text-gray-500 mb-2">
                          {subset.viewIds.length} views • Created {subset.created}
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setActiveSubset(activeSubset === subset.id ? null : subset.id)}
                            className={`flex-1 py-1.5 rounded text-xs ${
                              activeSubset === subset.id
                                ? 'bg-purple-500 text-white'
                                : 'bg-white/10 text-gray-300 hover:bg-white/20'
                            }`}
                          >
                            {activeSubset === subset.id ? 'Exit Focus' : 'Focus'}
                          </button>
                          <button className="px-2 py-1.5 rounded bg-white/10 text-gray-400 hover:bg-white/20">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    <button className="w-full py-2 rounded border border-dashed border-white/20 text-gray-500 text-sm hover:border-white/30 hover:text-gray-300">
                      <Plus size={14} className="inline mr-1" />
                      Create from Selection
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom Status */}
      <div className="h-7 bg-gray-900/95 border-t border-white/10 flex items-center px-3 gap-4 text-xs shrink-0">
        <div className="flex items-center gap-1.5 text-gray-500">
          <Map size={12} />
          <span>Canvas: {CANVAS_COLS}×{CANVAS_ROWS}</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-500">
          <Eye size={12} className="text-green-400" />
          <span>{mockViews.filter(v => isInViewport(v)).length} rendering</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-500">
          <EyeOff size={12} />
          <span>{mockViews.filter(v => !isInViewport(v)).length} dormant</span>
        </div>
        {activeSubset && (
          <>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-1.5 text-purple-400">
              <Grid size={12} />
              <span>Focus Mode Active</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
