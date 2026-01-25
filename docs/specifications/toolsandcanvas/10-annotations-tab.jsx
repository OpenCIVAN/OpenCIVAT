import React, { useState } from 'react';

// =============================================================================
// DESIGN: Annotations Tab
// =============================================================================
// Features:
// - Scope toggle (Instance vs Workspace)
// - Annotation creation tools (Text, Marker, Arrow, Region, Freehand, Callout)
// - List of existing annotations with management
// - Color picker for annotations
// - Visibility, lock, edit, delete controls
// - Multi-select for bulk operations
// - Filter by scope/author
// =============================================================================

const tokens = {
  colors: {
    bg: { primary: '#0a0a0f', secondary: '#12121a', tertiary: '#1a1a24', glass: 'rgba(255,255,255,0.03)' },
    border: { subtle: 'rgba(255,255,255,0.06)', default: 'rgba(255,255,255,0.1)' },
    text: { primary: '#ffffff', secondary: 'rgba(255,255,255,0.7)', muted: 'rgba(255,255,255,0.4)' },
    accent: { 
      purple: '#a855f7', blue: '#3b82f6', cyan: '#22d3ee', green: '#22c55e', 
      amber: '#f59e0b', pink: '#ec4899', red: '#ef4444', teal: '#14b8a6',
      orange: '#f97316', yellow: '#eab308',
    },
  },
};

// =============================================================================
// ANNOTATION TYPES
// =============================================================================

const ANNOTATION_TOOLS = [
  { 
    id: 'text', 
    name: 'Text', 
    icon: '💬', 
    shortcut: 'T',
    description: 'Add text annotation at a point',
    instructions: 'Click to place, then type',
  },
  { 
    id: 'marker', 
    name: 'Marker', 
    icon: '📌', 
    shortcut: 'M',
    description: 'Mark a point of interest',
    instructions: 'Click to place marker',
  },
  { 
    id: 'arrow', 
    name: 'Arrow', 
    icon: '➤', 
    shortcut: 'W',
    description: 'Point to something',
    instructions: 'Click start, drag to end',
  },
  { 
    id: 'region', 
    name: 'Region', 
    icon: '⬡', 
    shortcut: 'R',
    description: 'Outline an area',
    instructions: 'Click points, Enter to close',
  },
  { 
    id: 'freehand', 
    name: 'Draw', 
    icon: '✏️', 
    shortcut: 'D',
    description: 'Freeform drawing',
    instructions: 'Click and drag',
  },
  { 
    id: 'callout', 
    name: 'Callout', 
    icon: '💭', 
    shortcut: 'C',
    description: 'Text with leader line',
    instructions: 'Click target, place text',
  },
];

const ANNOTATION_COLORS = [
  '#ef4444', // red
  '#f59e0b', // amber
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#a855f7', // purple
  '#ec4899', // pink
  '#ffffff', // white
];

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_ANNOTATIONS = [
  { 
    id: 'a-1', 
    type: 'text', 
    text: 'Suspicious lesion - needs follow-up', 
    color: '#ef4444', 
    scope: 'workspace',
    visible: true, 
    locked: false,
    author: 'Dr. Smith',
    authorId: 'user-2',
    timestamp: '2 hours ago',
  },
  { 
    id: 'a-2', 
    type: 'marker', 
    text: 'Injection site', 
    color: '#22c55e', 
    scope: 'instance',
    visible: true, 
    locked: false,
    author: 'You',
    authorId: 'user-1',
    timestamp: '1 hour ago',
  },
  { 
    id: 'a-3', 
    type: 'arrow', 
    text: 'Main blood vessel', 
    color: '#3b82f6', 
    scope: 'workspace',
    visible: true, 
    locked: true,
    author: 'Dr. Jones',
    authorId: 'user-3',
    timestamp: 'Yesterday',
  },
  { 
    id: 'a-4', 
    type: 'region', 
    text: 'ROI for analysis', 
    color: '#f59e0b', 
    scope: 'workspace',
    visible: false, 
    locked: false,
    author: 'You',
    authorId: 'user-1',
    timestamp: '3 days ago',
  },
  { 
    id: 'a-5', 
    type: 'callout', 
    text: 'Measure this area next session', 
    color: '#a855f7', 
    scope: 'instance',
    visible: true, 
    locked: false,
    author: 'You',
    authorId: 'user-1',
    timestamp: '30 min ago',
  },
];

// =============================================================================
// SCOPE TOGGLE
// =============================================================================

function ScopeToggle({ scope, onChange }) {
  return (
    <div style={{
      display: 'flex',
      padding: 3,
      background: tokens.colors.bg.tertiary,
      borderRadius: 6,
      gap: 2,
    }}>
      <button
        onClick={() => onChange('instance')}
        title="Annotations visible only in this view"
        style={{
          flex: 1,
          padding: '6px 12px',
          borderRadius: 4,
          border: 'none',
          background: scope === 'instance' ? tokens.colors.accent.pink + '25' : 'transparent',
          color: scope === 'instance' ? tokens.colors.accent.pink : tokens.colors.text.muted,
          fontSize: 10,
          fontWeight: scope === 'instance' ? 600 : 400,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        }}
      >
        <span>🖼</span>
        <span>This View</span>
      </button>
      <button
        onClick={() => onChange('workspace')}
        title="Annotations shared across workspace"
        style={{
          flex: 1,
          padding: '6px 12px',
          borderRadius: 4,
          border: 'none',
          background: scope === 'workspace' ? tokens.colors.accent.teal + '25' : 'transparent',
          color: scope === 'workspace' ? tokens.colors.accent.teal : tokens.colors.text.muted,
          fontSize: 10,
          fontWeight: scope === 'workspace' ? 600 : 400,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        }}
      >
        <span>👥</span>
        <span>Workspace</span>
      </button>
    </div>
  );
}

// =============================================================================
// TOOL PALETTE
// =============================================================================

function ToolPalette({ selectedTool, onSelectTool, selectedColor, onSelectColor, scope }) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  return (
    <div style={{ marginBottom: 16 }}>
      {/* Scope indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
        padding: '6px 10px',
        background: scope === 'workspace' ? tokens.colors.accent.teal + '15' : tokens.colors.accent.pink + '15',
        borderRadius: 4,
        border: `1px solid ${scope === 'workspace' ? tokens.colors.accent.teal + '30' : tokens.colors.accent.pink + '30'}`,
      }}>
        <span style={{ fontSize: 10 }}>{scope === 'workspace' ? '👥' : '🖼'}</span>
        <span style={{ fontSize: 9, color: scope === 'workspace' ? tokens.colors.accent.teal : tokens.colors.accent.pink }}>
          New annotations will be {scope === 'workspace' ? 'shared with workspace' : 'visible only in this view'}
        </span>
      </div>
      
      {/* Tool Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 4,
        marginBottom: 10,
      }}>
        {ANNOTATION_TOOLS.map(tool => (
          <button
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            title={`${tool.name} (${tool.shortcut})\n${tool.description}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '8px 4px',
              borderRadius: 6,
              border: `1px solid ${selectedTool === tool.id ? tokens.colors.accent.pink : tokens.colors.border.subtle}`,
              background: selectedTool === tool.id ? tokens.colors.accent.pink + '20' : tokens.colors.bg.glass,
              color: selectedTool === tool.id ? tokens.colors.accent.pink : tokens.colors.text.secondary,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 16 }}>{tool.icon}</span>
            <span style={{ fontSize: 9 }}>{tool.name}</span>
          </button>
        ))}
      </div>
      
      {/* Color Picker Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{ fontSize: 9, color: tokens.colors.text.muted }}>Color:</span>
        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          {ANNOTATION_COLORS.map(color => (
            <button
              key={color}
              onClick={() => onSelectColor(color)}
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                background: color,
                border: `2px solid ${selectedColor === color ? '#fff' : 'transparent'}`,
                cursor: 'pointer',
                boxShadow: selectedColor === color ? `0 0 0 1px ${tokens.colors.bg.primary}, 0 0 0 3px ${color}` : 'none',
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Active Tool Instructions */}
      {selectedTool && (
        <div style={{
          marginTop: 10,
          padding: '8px 10px',
          background: tokens.colors.accent.pink + '10',
          borderRadius: 4,
          border: `1px solid ${tokens.colors.accent.pink}30`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 12 }}>{ANNOTATION_TOOLS.find(t => t.id === selectedTool)?.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: tokens.colors.accent.pink }}>
              {ANNOTATION_TOOLS.find(t => t.id === selectedTool)?.name}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 9, color: tokens.colors.text.muted }}>
              Press Esc to cancel
            </span>
          </div>
          <div style={{ fontSize: 9, color: tokens.colors.text.secondary }}>
            {ANNOTATION_TOOLS.find(t => t.id === selectedTool)?.instructions}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ANNOTATION LIST ITEM
// =============================================================================

function AnnotationItem({ item, isSelected, onToggleSelect, onToggleVisible, onToggleLock, onEdit, onDelete, onColorChange }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  const isOwner = item.authorId === 'user-1'; // Mock: current user
  
  const handleSave = () => {
    onEdit(editText);
    setIsEditing(false);
  };
  
  const toolIcon = ANNOTATION_TOOLS.find(t => t.id === item.type)?.icon || '◆';
  
  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setShowColorPicker(false); }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 6,
        padding: '8px 10px',
        marginBottom: 2,
        background: isSelected 
          ? tokens.colors.accent.pink + '15' 
          : item.locked 
            ? tokens.colors.accent.cyan + '08'
            : item.visible 
              ? tokens.colors.bg.glass 
              : 'transparent',
        borderRadius: 6,
        opacity: item.visible ? 1 : 0.5,
        border: `1px solid ${isSelected ? tokens.colors.accent.pink + '40' : isHovered ? tokens.colors.border.default : 'transparent'}`,
        transition: 'all 0.15s',
      }}
    >
      {/* Checkbox for multi-select */}
      <button
        onClick={onToggleSelect}
        style={{
          width: 16,
          height: 16,
          borderRadius: 3,
          border: `1px solid ${isSelected ? tokens.colors.accent.pink : tokens.colors.border.default}`,
          background: isSelected ? tokens.colors.accent.pink : 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        {isSelected && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
      </button>
      
      {/* Visibility */}
      <button
        onClick={onToggleVisible}
        style={{
          width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', border: 'none',
          color: item.visible ? tokens.colors.accent.pink : tokens.colors.text.muted,
          cursor: 'pointer', fontSize: 10, flexShrink: 0,
        }}
      >
        {item.visible ? '👁' : '○'}
      </button>
      
      {/* Lock */}
      <button
        onClick={onToggleLock}
        disabled={!isOwner}
        title={!isOwner ? "Only the author can lock/unlock" : item.locked ? "Unlock" : "Lock"}
        style={{
          width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', border: 'none',
          color: item.locked ? tokens.colors.accent.cyan : tokens.colors.text.muted,
          cursor: isOwner ? 'pointer' : 'not-allowed', fontSize: 9, flexShrink: 0,
          opacity: isOwner ? 1 : 0.5,
        }}
      >
        {item.locked ? '🔒' : '🔓'}
      </button>
      
      {/* Color indicator */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => !item.locked && isOwner && setShowColorPicker(!showColorPicker)}
          disabled={item.locked || !isOwner}
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            background: item.color,
            border: 'none',
            cursor: item.locked || !isOwner ? 'not-allowed' : 'pointer',
            opacity: item.locked || !isOwner ? 0.7 : 1,
          }}
        />
        {showColorPicker && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            padding: 6,
            background: tokens.colors.bg.secondary,
            borderRadius: 6,
            border: `1px solid ${tokens.colors.border.default}`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 100,
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 3,
          }}>
            {ANNOTATION_COLORS.map(color => (
              <button
                key={color}
                onClick={() => { onColorChange(color); setShowColorPicker(false); }}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 3,
                  background: color,
                  border: `1px solid ${item.color === color ? '#fff' : 'transparent'}`,
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Icon */}
      <span style={{ fontSize: 11, flexShrink: 0 }}>{toolIcon}</span>
      
      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {isEditing ? (
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
              style={{
                flex: 1,
                background: tokens.colors.bg.primary,
                border: `1px solid ${tokens.colors.accent.pink}`,
                borderRadius: 3,
                padding: '3px 6px',
                fontSize: 10,
                color: tokens.colors.text.primary,
                outline: 'none',
              }}
            />
            <button
              onClick={handleSave}
              style={{
                padding: '3px 8px',
                background: tokens.colors.accent.pink,
                border: 'none',
                borderRadius: 3,
                color: '#fff',
                fontSize: 9,
                cursor: 'pointer',
              }}
            >✓</button>
          </div>
        ) : (
          <>
            <div
              onDoubleClick={() => isOwner && !item.locked && setIsEditing(true)}
              style={{
                fontSize: 10,
                color: tokens.colors.text.primary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                cursor: isOwner && !item.locked ? 'text' : 'default',
              }}
            >
              {item.text}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 2,
            }}>
              <span style={{
                fontSize: 8,
                padding: '1px 4px',
                borderRadius: 3,
                background: item.scope === 'workspace' ? tokens.colors.accent.teal + '20' : tokens.colors.accent.pink + '20',
                color: item.scope === 'workspace' ? tokens.colors.accent.teal : tokens.colors.accent.pink,
              }}>
                {item.scope === 'workspace' ? '👥' : '🖼'}
              </span>
              <span style={{ fontSize: 8, color: tokens.colors.text.muted }}>
                {item.author} • {item.timestamp}
              </span>
            </div>
          </>
        )}
      </div>
      
      {/* Actions (on hover) */}
      <div style={{
        display: 'flex',
        gap: 2,
        opacity: isHovered ? 1 : 0,
        transition: 'opacity 0.15s',
        flexShrink: 0,
      }}>
        <button
          onClick={() => !item.locked && isOwner && setIsEditing(true)}
          disabled={item.locked || !isOwner}
          title={!isOwner ? "Only author can edit" : item.locked ? "Unlock to edit" : "Edit"}
          style={{
            width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none',
            color: item.locked || !isOwner ? tokens.colors.text.muted + '50' : tokens.colors.accent.blue,
            cursor: item.locked || !isOwner ? 'not-allowed' : 'pointer', fontSize: 10,
          }}
        >✎</button>
        <button
          onClick={() => !item.locked && isOwner && onDelete()}
          disabled={item.locked || !isOwner}
          title={!isOwner ? "Only author can delete" : item.locked ? "Unlock to delete" : "Delete"}
          style={{
            width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none',
            color: item.locked || !isOwner ? tokens.colors.text.muted + '50' : tokens.colors.accent.red,
            cursor: item.locked || !isOwner ? 'not-allowed' : 'pointer', fontSize: 10,
          }}
        >🗑</button>
      </div>
    </div>
  );
}

// =============================================================================
// FILTER BAR
// =============================================================================

function FilterBar({ filter, onFilterChange, annotationCount }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginBottom: 10,
    }}>
      <select
        value={filter}
        onChange={(e) => onFilterChange(e.target.value)}
        style={{
          padding: '4px 8px',
          borderRadius: 4,
          border: `1px solid ${tokens.colors.border.subtle}`,
          background: tokens.colors.bg.tertiary,
          color: tokens.colors.text.secondary,
          fontSize: 9,
          cursor: 'pointer',
        }}
      >
        <option value="all">All ({annotationCount.all})</option>
        <option value="workspace">Workspace ({annotationCount.workspace})</option>
        <option value="instance">This View ({annotationCount.instance})</option>
        <option value="mine">My Annotations ({annotationCount.mine})</option>
      </select>
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 9, color: tokens.colors.text.muted }}>
        {annotationCount.visible} visible
      </span>
    </div>
  );
}

// =============================================================================
// BULK ACTIONS BAR
// =============================================================================

function BulkActionsBar({ selectedCount, onHide, onShow, onDelete, onClearSelection }) {
  if (selectedCount === 0) return null;
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 10px',
      background: tokens.colors.accent.pink + '15',
      borderRadius: 6,
      marginBottom: 10,
      border: `1px solid ${tokens.colors.accent.pink}30`,
    }}>
      <span style={{ fontSize: 10, color: tokens.colors.accent.pink, fontWeight: 600 }}>
        {selectedCount} selected
      </span>
      <div style={{ flex: 1 }} />
      <button
        onClick={onShow}
        style={{
          padding: '4px 8px', borderRadius: 4, border: 'none',
          background: tokens.colors.bg.tertiary, color: tokens.colors.text.secondary,
          fontSize: 9, cursor: 'pointer',
        }}
      >Show</button>
      <button
        onClick={onHide}
        style={{
          padding: '4px 8px', borderRadius: 4, border: 'none',
          background: tokens.colors.bg.tertiary, color: tokens.colors.text.secondary,
          fontSize: 9, cursor: 'pointer',
        }}
      >Hide</button>
      <button
        onClick={onDelete}
        style={{
          padding: '4px 8px', borderRadius: 4, border: 'none',
          background: tokens.colors.accent.red + '20', color: tokens.colors.accent.red,
          fontSize: 9, cursor: 'pointer',
        }}
      >Delete</button>
      <button
        onClick={onClearSelection}
        style={{
          padding: '4px 8px', borderRadius: 4, border: 'none',
          background: 'transparent', color: tokens.colors.text.muted,
          fontSize: 9, cursor: 'pointer',
        }}
      >✕</button>
    </div>
  );
}

// =============================================================================
// MAIN ANNOTATIONS TAB
// =============================================================================

function AnnotationsTab() {
  const [scope, setScope] = useState('workspace');
  const [selectedTool, setSelectedTool] = useState(null);
  const [selectedColor, setSelectedColor] = useState('#ef4444');
  const [annotations, setAnnotations] = useState(MOCK_ANNOTATIONS);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filter, setFilter] = useState('all');
  
  // Filter annotations
  const filteredAnnotations = annotations.filter(a => {
    if (filter === 'workspace') return a.scope === 'workspace';
    if (filter === 'instance') return a.scope === 'instance';
    if (filter === 'mine') return a.authorId === 'user-1';
    return true;
  });
  
  // Counts
  const annotationCount = {
    all: annotations.length,
    workspace: annotations.filter(a => a.scope === 'workspace').length,
    instance: annotations.filter(a => a.scope === 'instance').length,
    mine: annotations.filter(a => a.authorId === 'user-1').length,
    visible: annotations.filter(a => a.visible).length,
  };
  
  // Handlers
  const toggleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };
  
  const toggleVisible = (id) => {
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, visible: !a.visible } : a));
  };
  
  const toggleLock = (id) => {
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, locked: !a.locked } : a));
  };
  
  const deleteAnnotation = (id) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
    selectedIds.delete(id);
    setSelectedIds(new Set(selectedIds));
  };
  
  const editAnnotation = (id, newText) => {
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, text: newText } : a));
  };
  
  const changeColor = (id, color) => {
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, color } : a));
  };
  
  // Bulk actions
  const bulkHide = () => {
    setAnnotations(prev => prev.map(a => selectedIds.has(a.id) ? { ...a, visible: false } : a));
  };
  
  const bulkShow = () => {
    setAnnotations(prev => prev.map(a => selectedIds.has(a.id) ? { ...a, visible: true } : a));
  };
  
  const bulkDelete = () => {
    setAnnotations(prev => prev.filter(a => !selectedIds.has(a.id) || a.locked || a.authorId !== 'user-1'));
    setSelectedIds(new Set());
  };
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Scope Toggle */}
      <div style={{ padding: '12px 12px 8px' }}>
        <ScopeToggle scope={scope} onChange={setScope} />
      </div>
      
      {/* Tool Palette */}
      <div style={{ padding: '0 12px' }}>
        <ToolPalette
          selectedTool={selectedTool}
          onSelectTool={(tool) => setSelectedTool(selectedTool === tool ? null : tool)}
          selectedColor={selectedColor}
          onSelectColor={setSelectedColor}
          scope={scope}
        />
      </div>
      
      {/* Divider */}
      <div style={{ height: 1, background: tokens.colors.border.subtle, margin: '0 12px' }} />
      
      {/* Annotation List */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 12px 0' }}>
          <FilterBar
            filter={filter}
            onFilterChange={setFilter}
            annotationCount={annotationCount}
          />
          
          <BulkActionsBar
            selectedCount={selectedIds.size}
            onHide={bulkHide}
            onShow={bulkShow}
            onDelete={bulkDelete}
            onClearSelection={() => setSelectedIds(new Set())}
          />
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px' }}>
          {filteredAnnotations.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '24px',
              color: tokens.colors.text.muted,
            }}>
              <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.5 }}>📝</div>
              <div style={{ fontSize: 11 }}>No annotations yet</div>
              <div style={{ fontSize: 10, marginTop: 4 }}>Select a tool above to create one</div>
            </div>
          ) : (
            filteredAnnotations.map(annotation => (
              <AnnotationItem
                key={annotation.id}
                item={annotation}
                isSelected={selectedIds.has(annotation.id)}
                onToggleSelect={() => toggleSelect(annotation.id)}
                onToggleVisible={() => toggleVisible(annotation.id)}
                onToggleLock={() => toggleLock(annotation.id)}
                onEdit={(text) => editAnnotation(annotation.id, text)}
                onDelete={() => deleteAnnotation(annotation.id)}
                onColorChange={(color) => changeColor(annotation.id, color)}
              />
            ))
          )}
        </div>
      </div>
      
      {/* Keyboard Shortcuts */}
      <div style={{
        padding: '6px 12px',
        background: tokens.colors.bg.tertiary,
        borderTop: `1px solid ${tokens.colors.border.subtle}`,
        fontSize: 9,
        color: tokens.colors.text.muted,
        display: 'flex',
        gap: 12,
      }}>
        <span>T/M/W/R/D/C = Tools</span>
        <span>H = Hide</span>
        <span>Del = Delete</span>
      </div>
    </div>
  );
}

// =============================================================================
// DEMO WRAPPER
// =============================================================================

export default function AnnotationsTabArtifact() {
  return (
    <div style={{
      minHeight: '100vh',
      background: tokens.colors.bg.primary,
      padding: 24,
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{
            padding: '4px 8px', borderRadius: 4,
            background: tokens.colors.accent.pink + '30', color: tokens.colors.accent.pink,
            fontSize: 10, fontWeight: 600,
          }}>DESIGN 4 OF 7</span>
        </div>
        <h1 style={{ color: tokens.colors.text.primary, fontSize: 20, marginBottom: 8 }}>
          Annotations Tab
        </h1>
        <p style={{ color: tokens.colors.text.muted, fontSize: 12, maxWidth: 600 }}>
          Scope toggle (This View vs Workspace), tool palette with 6 annotation types,
          color picker, list with multi-select, filtering, and bulk actions.
        </p>
      </div>
      
      {/* Mock Panel */}
      <div style={{
        width: 340,
        height: 600,
        background: tokens.colors.bg.secondary,
        borderRadius: 8,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <AnnotationsTab />
      </div>
      
      {/* Design Notes */}
      <div style={{ marginTop: 24, padding: 16, background: tokens.colors.bg.secondary, borderRadius: 8, maxWidth: 500 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: tokens.colors.accent.pink, marginBottom: 8 }}>FEATURES</div>
        <ul style={{ fontSize: 11, color: tokens.colors.text.secondary, margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
          <li><strong>Scope toggle:</strong> Instance (this view only) vs Workspace (shared)</li>
          <li><strong>6 tools:</strong> Text, Marker, Arrow, Region, Freehand, Callout</li>
          <li><strong>Color picker:</strong> 9 colors, changeable per annotation</li>
          <li><strong>Multi-select:</strong> Checkboxes + bulk show/hide/delete</li>
          <li><strong>Filtering:</strong> All, Workspace, This View, My Annotations</li>
          <li><strong>Permissions:</strong> Only author can edit/delete/lock their annotations</li>
        </ul>
      </div>
      
      {/* Interaction Guide */}
      <div style={{
        marginTop: 16, padding: 16, background: tokens.colors.accent.blue + '10',
        borderRadius: 8, border: `1px solid ${tokens.colors.accent.blue}30`, maxWidth: 500,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: tokens.colors.accent.blue, marginBottom: 8 }}>TRY IT</div>
        <ul style={{ fontSize: 11, color: tokens.colors.text.secondary, margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
          <li>Toggle scope between "This View" and "Workspace"</li>
          <li>Select annotation tools (notice instructions appear)</li>
          <li>Click color swatches to change annotation color</li>
          <li>Click checkboxes to multi-select, then use bulk actions</li>
          <li>Use the filter dropdown to show subsets</li>
          <li>Double-click "Injection site" or "Callout" text to edit (your annotations)</li>
          <li>Hover over "Main blood vessel" - can't edit/delete (not your annotation)</li>
        </ul>
      </div>
      
      {/* Questions */}
      <div style={{
        marginTop: 16, padding: 16, background: tokens.colors.accent.purple + '10',
        borderRadius: 8, border: `1px solid ${tokens.colors.accent.purple}30`, maxWidth: 500,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: tokens.colors.accent.purple, marginBottom: 8 }}>QUESTIONS</div>
        <ul style={{ fontSize: 11, color: tokens.colors.text.secondary, margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
          <li>Should annotations from other users be editable with permission?</li>
          <li>Want a "reply" or "thread" feature for annotations?</li>
          <li>Should there be annotation templates/presets?</li>
        </ul>
      </div>
    </div>
  );
}
