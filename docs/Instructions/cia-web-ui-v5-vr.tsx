import React, { useState } from 'react';
import { 
  Database, ChevronDown, ChevronRight, ChevronLeft, X, Plus,
  Users, MessageSquare, Mic, MicOff, Activity, Eye, EyeOff, Settings,
  Map, Layers, Grid, LayoutGrid, Maximize2, Copy, MoreVertical, Search,
  Headphones, Glasses, Monitor, Move, Crosshair, Square, CheckSquare,
  Scissors, GripVertical, Trash2, Volume2, Link2, Unlink, Bell,
  ZoomIn, ZoomOut, RotateCcw, Hand, MousePointer2, Navigation,
  Expand, Shrink, PanelRight, BoxSelect, Image, StickyNote, Bookmark
} from 'lucide-react';

// Canvas configuration
const CANVAS = { rows: 5, cols: 6 };

// Mock views with spanning support
const mockViews = [
  { id: 'v1', name: 'Brain MRI - Main', dataset: 'Brain MRI', row: 0, col: 0, rowSpan: 2, colSpan: 2 },
  { id: 'v2', name: 'Brain MRI - Axial', dataset: 'Brain MRI', row: 0, col: 2, rowSpan: 1, colSpan: 1 },
  { id: 'v3', name: 'Brain MRI - Coronal', dataset: 'Brain MRI', row: 0, col: 3, rowSpan: 1, colSpan: 1 },
  { id: 'v4', name: 'Brain MRI - Sagittal', dataset: 'Brain MRI', row: 1, col: 2, rowSpan: 1, colSpan: 2 },
  { id: 'v5', name: 'Chest CT Analysis', dataset: 'Chest CT', row: 2, col: 0, rowSpan: 1, colSpan: 3 },
  { id: 'v6', name: 'Comparison Notes', dataset: null, row: 2, col: 3, rowSpan: 1, colSpan: 1, type: 'notes' },
  { id: 'v7', name: 'Heart Model', dataset: 'Heart DICOM', row: 3, col: 0, rowSpan: 2, colSpan: 1 },
  { id: 'v8', name: 'Reference Image', dataset: null, row: 3, col: 1, rowSpan: 1, colSpan: 1, type: 'image' },
];

const mockUsers = [
  { id: 'u1', name: 'Beth', avatar: '👩‍🔬', color: '#6eb6ff', mode: 'desktop', activeView: 'v1' },
  { id: 'u2', name: 'Alex', avatar: '👨‍💻', color: '#4caf50', mode: 'vr', activeView: 'v1' },
  { id: 'u3', name: 'Sam', avatar: '👩‍⚕️', color: '#ff9800', mode: 'desktop', activeView: 'v5' },
];

const mockSubsets = [
  { id: 's1', name: 'MRI Deep Dive', viewIds: ['v1', 'v2', 'v3', 'v4'], notes: 'Investigating anomaly in temporal lobe', created: '2h ago' },
  { id: 's2', name: 'Cross-Reference', viewIds: ['v5', 'v6'], notes: null, created: '30m ago' },
];

export default function CIAWebUIv5() {
  // Viewport state
  const [viewport, setViewport] = useState({ row: 0, col: 0, rows: 3, cols: 4 });
  
  // Panel states
  const [rightTab, setRightTab] = useState('layout');
  const [layoutSubTab, setLayoutSubTab] = useState('map');
  
  // Selection & subset state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedViews, setSelectedViews] = useState(new Set());
  const [activeSubset, setActiveSubset] = useState(null);
  
  // View mode
  const [userMode, setUserMode] = useState('desktop'); // 'desktop' | 'vr'
  const [vrIsolatedView, setVrIsolatedView] = useState(null);
  
  // Resize mode for a view
  const [resizingView, setResizingView] = useState(null);
  
  // Cursor visibility
  const [showAllCursors, setShowAllCursors] = useState(true);

  // Check if view is in viewport
  const isInViewport = (view) => {
    const viewEnd = { row: view.row + (view.rowSpan || 1), col: view.col + (view.colSpan || 1) };
    const vpEnd = { row: viewport.row + viewport.rows, col: viewport.col + viewport.cols };
    return view.row < vpEnd.row && viewEnd.row > viewport.row &&
           view.col < vpEnd.col && viewEnd.col > viewport.col;
  };

  // Get views visible in current viewport
  const visibleViews = mockViews.filter(isInViewport);

  // Toggle view selection
  const toggleSelect = (id) => {
    setSelectedViews(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Move viewport
  const moveViewport = (dr, dc) => {
    setViewport(v => ({
      ...v,
      row: Math.max(0, Math.min(CANVAS.rows - v.rows, v.row + dr)),
      col: Math.max(0, Math.min(CANVAS.cols - v.cols, v.col + dc))
    }));
  };

  // Render mini-map
  const renderMiniMap = () => {
    const cells = [];
    for (let r = 0; r < CANVAS.rows; r++) {
      for (let c = 0; c < CANVAS.cols; c++) {
        const view = mockViews.find(v => 
          r >= v.row && r < v.row + (v.rowSpan || 1) &&
          c >= v.col && c < v.col + (v.colSpan || 1)
        );
        const isViewOrigin = view && view.row === r && view.col === c;
        const inVP = r >= viewport.row && r < viewport.row + viewport.rows &&
                     c >= viewport.col && c < viewport.col + viewport.cols;
        const isSelected = view && selectedViews.has(view.id);
        
        cells.push(
          <div
            key={`${r}-${c}`}
            onClick={() => view && isSelecting && toggleSelect(view.id)}
            className={`
              w-5 h-4 rounded-sm border transition-all
              ${view ? (view.type === 'notes' ? 'bg-yellow-500/30 border-yellow-500/40' : 
                        view.type === 'image' ? 'bg-purple-500/30 border-purple-500/40' :
                        'bg-blue-500/30 border-blue-500/40') : 'bg-white/5 border-white/10'}
              ${inVP ? 'ring-1 ring-green-400' : ''}
              ${isSelected ? 'ring-2 ring-yellow-400' : ''}
              ${isSelecting && view ? 'cursor-pointer hover:brightness-125' : ''}
            `}
            title={view ? `${view.name} (${view.rowSpan||1}×${view.colSpan||1})` : `Empty (${r},${c})`}
          />
        );
      }
    }
    return cells;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-200 overflow-hidden">
      {/* ===== TOP BAR ===== */}
      <div className="h-12 bg-gray-900/95 border-b border-white/10 flex items-center px-4 gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-500/30" />
          <span className="font-semibold text-sm">CIA Web</span>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center bg-white/5 rounded p-0.5">
          <button
            onClick={() => setUserMode('desktop')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
              userMode === 'desktop' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Monitor size={14} />
            Desktop
          </button>
          <button
            onClick={() => setUserMode('vr')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
              userMode === 'vr' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Glasses size={14} />
            VR Mode
          </button>
        </div>

        {/* Workspace Tabs */}
        <div className="flex items-center gap-1 border-l border-white/10 pl-3">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded text-sm bg-blue-500/20 text-blue-400 border border-blue-500/40">
            <Users size={12} />
            Project Room
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded text-sm text-gray-500 hover:bg-white/10">
            <Users size={12} />
            MRI Team
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded text-sm text-gray-500 hover:bg-white/10">
            <Monitor size={12} />
            My Workspace
          </button>
          <button className="p-1.5 rounded text-gray-600 hover:bg-white/10 hover:text-gray-400">
            <Plus size={14} />
          </button>
        </div>

        {/* Viewport Info */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded text-xs">
          <Map size={12} className="text-green-400" />
          <span className="font-mono text-gray-300">{viewport.cols}×{viewport.rows}</span>
          <span className="text-gray-600">@</span>
          <span className="font-mono text-gray-300">({viewport.col},{viewport.row})</span>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1 border-l border-white/10 pl-3">
          <button onClick={() => moveViewport(-1, 0)} className="p-1.5 rounded hover:bg-white/10 text-gray-500 disabled:opacity-30" disabled={viewport.row === 0}>
            <ChevronDown size={14} className="rotate-180" />
          </button>
          <button onClick={() => moveViewport(1, 0)} className="p-1.5 rounded hover:bg-white/10 text-gray-500 disabled:opacity-30" disabled={viewport.row >= CANVAS.rows - viewport.rows}>
            <ChevronDown size={14} />
          </button>
          <button onClick={() => moveViewport(0, -1)} className="p-1.5 rounded hover:bg-white/10 text-gray-500 disabled:opacity-30" disabled={viewport.col === 0}>
            <ChevronLeft size={14} />
          </button>
          <button onClick={() => moveViewport(0, 1)} className="p-1.5 rounded hover:bg-white/10 text-gray-500 disabled:opacity-30" disabled={viewport.col >= CANVAS.cols - viewport.cols}>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="flex-1" />

        {/* Active Users */}
        <div className="flex items-center gap-1">
          {mockUsers.map(u => (
            <div key={u.id} className="relative" title={`${u.name} (${u.mode})`}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ backgroundColor: u.color }}>
                {u.avatar}
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-gray-900 flex items-center justify-center ${
                u.mode === 'vr' ? 'bg-purple-500' : 'bg-blue-500'
              }`}>
                {u.mode === 'vr' ? <Glasses size={8} /> : <Monitor size={8} />}
              </div>
            </div>
          ))}
        </div>

        <button className="p-2 rounded hover:bg-white/10 text-gray-500 relative">
          <Bell size={16} />
        </button>
        <button className="p-2 rounded hover:bg-white/10 text-gray-500">
          <Settings size={16} />
        </button>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* ===== LEFT PANEL (collapsed) ===== */}
        <div className="w-12 bg-gray-900/70 border-r border-white/10 flex flex-col items-center py-3 gap-2" style={{ borderLeft: '3px solid #6eb6ff' }}>
          <button className="p-2.5 rounded hover:bg-white/10 text-blue-400 bg-blue-500/10">
            <Database size={18} />
          </button>
          <button className="p-2.5 rounded hover:bg-white/10 text-gray-500">
            <Layers size={18} />
          </button>
          <button className="p-2.5 rounded hover:bg-white/10 text-gray-500">
            <Bookmark size={18} />
          </button>
        </div>

        {/* ===== CENTER: WORKSPACE GRID ===== */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Grid Header */}
          <div className="h-10 flex items-center justify-between px-4 bg-gray-900/50 border-b border-white/5">
            <div className="flex items-center gap-3">
              {activeSubset ? (
                <div className="flex items-center gap-2 px-2 py-1 bg-purple-500/20 rounded text-purple-400 text-xs">
                  <BoxSelect size={12} />
                  <span>Focus: {mockSubsets.find(s => s.id === activeSubset)?.name}</span>
                  <button onClick={() => setActiveSubset(null)} className="hover:text-white">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <span className="text-xs text-gray-500">Canvas {CANVAS.cols}×{CANVAS.rows}</span>
              )}
              <span className="text-xs text-gray-600">•</span>
              <span className="text-xs text-gray-500">{visibleViews.length} views rendering</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Viewport:</span>
              {[[2,2], [3,3], [3,4], [4,4]].map(([r,c]) => (
                <button
                  key={`${c}x${r}`}
                  onClick={() => setViewport(v => ({ ...v, rows: r, cols: c }))}
                  className={`px-2 py-1 rounded text-xs ${
                    viewport.rows === r && viewport.cols === c
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                      : 'text-gray-500 hover:bg-white/10'
                  }`}
                >
                  {c}×{r}
                </button>
              ))}
            </div>
          </div>

          {/* The Grid - showing views with spanning */}
          <div className="flex-1 p-3 overflow-hidden">
            <div className="w-full h-full relative bg-black/20 rounded-lg border border-white/5">
              {/* Render visible views */}
              {visibleViews.map(view => {
                // Calculate position within viewport
                const relRow = view.row - viewport.row;
                const relCol = view.col - viewport.col;
                const cellW = 100 / viewport.cols;
                const cellH = 100 / viewport.rows;
                
                // Clamp spans to viewport bounds
                const visibleRowSpan = Math.min(view.rowSpan || 1, viewport.rows - relRow);
                const visibleColSpan = Math.min(view.colSpan || 1, viewport.cols - relCol);
                
                const isSelected = selectedViews.has(view.id);
                const isIsolated = vrIsolatedView === view.id;
                
                return (
                  <div
                    key={view.id}
                    className={`absolute rounded-lg border overflow-hidden flex flex-col transition-all ${
                      isSelected ? 'border-yellow-400 ring-2 ring-yellow-400/30 z-10' : 'border-white/10'
                    } ${isSelecting ? 'cursor-pointer' : ''}`}
                    style={{
                      left: `calc(${relCol * cellW}% + 6px)`,
                      top: `calc(${relRow * cellH}% + 6px)`,
                      width: `calc(${visibleColSpan * cellW}% - 12px)`,
                      height: `calc(${visibleRowSpan * cellH}% - 12px)`,
                    }}
                    onClick={() => isSelecting && toggleSelect(view.id)}
                  >
                    {/* Header */}
                    <div className={`h-7 flex items-center justify-between px-2 border-b border-white/5 shrink-0 ${
                      view.type === 'notes' ? 'bg-yellow-500/10' : 
                      view.type === 'image' ? 'bg-purple-500/10' : 'bg-black/40'
                    }`}>
                      <div className="flex items-center gap-2 min-w-0">
                        {isSelecting && (
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                            isSelected ? 'bg-yellow-400 border-yellow-400' : 'border-gray-500'
                          }`}>
                            {isSelected && <CheckSquare size={10} className="text-gray-900" />}
                          </div>
                        )}
                        {view.type === 'notes' && <StickyNote size={12} className="text-yellow-400 shrink-0" />}
                        {view.type === 'image' && <Image size={12} className="text-purple-400 shrink-0" />}
                        <span className="text-xs font-medium truncate">{view.name}</span>
                        {(view.rowSpan > 1 || view.colSpan > 1) && (
                          <span className="text-xs text-gray-600 shrink-0">
                            {view.colSpan||1}×{view.rowSpan||1}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {/* Presence indicators */}
                        {mockUsers.filter(u => u.activeView === view.id).map(u => (
                          <div key={u.id} className="w-5 h-5 rounded-full flex items-center justify-center text-xs border border-gray-800" style={{ backgroundColor: u.color }}>
                            {u.mode === 'vr' ? <Glasses size={8} /> : null}
                          </div>
                        ))}
                        <button className="p-1 hover:bg-white/10 rounded text-gray-500">
                          <Expand size={10} />
                        </button>
                        <button className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-red-400">
                          <X size={10} />
                        </button>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className={`flex-1 flex items-center justify-center ${
                      view.type === 'notes' ? 'bg-yellow-900/20' :
                      view.type === 'image' ? 'bg-purple-900/20' :
                      'bg-gradient-to-br from-gray-800/50 to-gray-900/50'
                    }`}>
                      {view.type === 'notes' ? (
                        <div className="p-3 text-xs text-yellow-200/70">
                          <p>📝 Research notes here...</p>
                        </div>
                      ) : view.type === 'image' ? (
                        <div className="text-center">
                          <Image size={24} className="mx-auto mb-1 text-purple-400/50" />
                          <span className="text-xs text-purple-400/50">Reference</span>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="text-2xl mb-1">🧠</div>
                          <span className="text-xs text-gray-500">{view.dataset}</span>
                          <div className="flex items-center justify-center gap-1 mt-1">
                            <Eye size={10} className="text-green-400" />
                            <span className="text-xs text-green-400">Live</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Resize handle (bottom-right) */}
                    <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize group">
                      <div className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-white/20 group-hover:border-blue-400" />
                    </div>
                  </div>
                );
              })}

              {/* Empty slot indicators */}
              {Array.from({ length: viewport.rows * viewport.cols }).map((_, i) => {
                const r = viewport.row + Math.floor(i / viewport.cols);
                const c = viewport.col + (i % viewport.cols);
                const hasView = mockViews.some(v => 
                  r >= v.row && r < v.row + (v.rowSpan || 1) &&
                  c >= v.col && c < v.col + (v.colSpan || 1)
                );
                if (hasView) return null;
                
                const cellW = 100 / viewport.cols;
                const cellH = 100 / viewport.rows;
                const relR = r - viewport.row;
                const relC = c - viewport.col;
                
                return (
                  <div
                    key={`empty-${r}-${c}`}
                    className="absolute border border-dashed border-white/10 rounded-lg flex items-center justify-center text-gray-700 hover:bg-white/5 hover:border-white/20 cursor-pointer"
                    style={{
                      left: `calc(${relC * cellW}% + 6px)`,
                      top: `calc(${relR * cellH}% + 6px)`,
                      width: `calc(${cellW}% - 12px)`,
                      height: `calc(${cellH}% - 12px)`,
                    }}
                  >
                    <Plus size={20} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ===== RIGHT PANEL ===== */}
        <div className="w-72 bg-gray-900/70 border-l border-white/10 flex flex-col" style={{ borderRight: '3px solid #a855f7' }}>
          {/* Tabs */}
          <div className="flex border-b border-white/5 shrink-0">
            {[
              { id: 'layout', icon: Map, label: 'Layout' },
              { id: 'people', icon: Users, label: 'People', badge: mockUsers.length },
              { id: 'chat', icon: MessageSquare, label: 'Chat', badge: 3 },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setRightTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-2 relative ${
                  rightTab === tab.id ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <tab.icon size={16} />
                <span className="text-xs">{tab.label}</span>
                {tab.badge && (
                  <span className="absolute top-1 right-3 w-4 h-4 bg-purple-500 rounded-full text-xs flex items-center justify-center text-white font-medium">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {rightTab === 'layout' && (
              <div className="p-3 space-y-4">
                {/* Sub-tabs */}
                <div className="flex bg-white/5 rounded p-0.5">
                  {['map', 'subsets'].map(t => (
                    <button
                      key={t}
                      onClick={() => setLayoutSubTab(t)}
                      className={`flex-1 py-1.5 rounded text-xs capitalize ${
                        layoutSubTab === t ? 'bg-purple-500/20 text-purple-400' : 'text-gray-500'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {layoutSubTab === 'map' && (
                  <>
                    {/* Mini-map */}
                    <div className="p-3 bg-black/30 rounded-lg border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-400">Canvas Map</span>
                        <span className="text-xs text-gray-600">{mockViews.length} views</span>
                      </div>
                      <div className="grid gap-0.5 mx-auto" style={{ gridTemplateColumns: `repeat(${CANVAS.cols}, 1fr)` }}>
                        {renderMiniMap()}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-2.5 h-2.5 rounded-sm bg-blue-500/30" />
                          <span className="text-gray-600">View</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2.5 h-2.5 rounded-sm ring-1 ring-green-400" />
                          <span className="text-gray-600">Viewport</span>
                        </div>
                      </div>
                    </div>

                    {/* Selection Mode */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-400">Selection Mode</span>
                        <button
                          onClick={() => { setIsSelecting(!isSelecting); setSelectedViews(new Set()); }}
                          className={`px-2 py-1 rounded text-xs ${
                            isSelecting ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/10 text-gray-400'
                          }`}
                        >
                          {isSelecting ? 'Done' : 'Select'}
                        </button>
                      </div>
                      {isSelecting && selectedViews.size > 0 && (
                        <button className="w-full py-2 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs hover:bg-purple-500/30">
                          <Scissors size={12} className="inline mr-1" />
                          Create Subset ({selectedViews.size})
                        </button>
                      )}
                    </div>

                    {/* VR Mode Info */}
                    {userMode === 'vr' && (
                      <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
                        <div className="flex items-center gap-2 mb-2">
                          <Glasses size={14} className="text-purple-400" />
                          <span className="text-xs font-medium text-purple-400">VR Mode Active</span>
                        </div>
                        <p className="text-xs text-purple-300/70 mb-2">
                          Views surround you in a curved grid. Point and pull a view to enter Isolation Mode.
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Hand size={12} />
                          <span>Grab to isolate</span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {layoutSubTab === 'subsets' && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 mb-3">
                      Focus on specific views for deep analysis
                    </p>
                    {mockSubsets.map(subset => (
                      <div 
                        key={subset.id}
                        className={`p-3 rounded-lg border ${
                          activeSubset === subset.id ? 'bg-purple-500/20 border-purple-500/50' : 'bg-white/5 border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{subset.name}</span>
                          <span className="text-xs text-gray-600">{subset.viewIds.length} views</span>
                        </div>
                        {subset.notes && (
                          <p className="text-xs text-gray-500 mb-2 line-clamp-2">{subset.notes}</p>
                        )}
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setActiveSubset(activeSubset === subset.id ? null : subset.id)}
                            className={`flex-1 py-1.5 rounded text-xs ${
                              activeSubset === subset.id ? 'bg-purple-500 text-white' : 'bg-white/10 text-gray-300'
                            }`}
                          >
                            {activeSubset === subset.id ? 'Exit Focus' : 'Focus'}
                          </button>
                          <button className="px-2 py-1.5 rounded bg-white/10 text-gray-400">
                            <MoreVertical size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {rightTab === 'people' && (
              <div className="p-3 space-y-2">
                {mockUsers.map(user => (
                  <div key={user.id} className="flex items-center gap-3 p-2 rounded hover:bg-white/5">
                    <div className="relative">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: user.color }}>
                        {user.avatar}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-gray-900 flex items-center justify-center ${
                        user.mode === 'vr' ? 'bg-purple-500' : 'bg-blue-500'
                      }`}>
                        {user.mode === 'vr' ? <Glasses size={8} /> : <Monitor size={8} />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{user.name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {user.mode === 'vr' ? '🥽 VR' : '🖥️ Desktop'} • {mockViews.find(v => v.id === user.activeView)?.name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== STATUS BAR ===== */}
      <div className="h-7 bg-gray-900/95 border-t border-white/10 flex items-center px-3 gap-4 text-xs shrink-0">
        <div className="flex items-center gap-1.5 text-green-400">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span>Connected</span>
        </div>
        <div className="w-px h-4 bg-white/10" />
        <div className="flex items-center gap-1.5 text-gray-500">
          <Eye size={12} className="text-green-400" />
          <span>{visibleViews.length} rendering</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-500">
          <EyeOff size={12} />
          <span>{mockViews.length - visibleViews.length} dormant</span>
        </div>
        <div className="w-px h-4 bg-white/10" />
        <button 
          onClick={() => setShowAllCursors(!showAllCursors)}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded ${showAllCursors ? 'text-blue-400 bg-blue-500/10' : 'text-gray-500'}`}
        >
          <MousePointer2 size={12} />
          <span>Cursors</span>
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 text-gray-500">
          <span>{userMode === 'vr' ? '🥽 VR Mode' : '🖥️ Desktop'}</span>
        </div>
      </div>
    </div>
  );
}
