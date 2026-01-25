import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ChevronDown, ChevronRight, X, Plus, MoreHorizontal, Search,
  LayoutGrid, Layers, Square, Maximize2, Minimize2, ExternalLink,
  Edit3, Copy, Save, Trash2, Eye, EyeOff, Move, GripVertical,
  PanelTop, Grid, ArrowUp, Check, Pencil, Filter, Home,
  RotateCcw, Camera, Compass, Grid3X3, Box, BarChart3, Lock,
  Undo2, Redo2, Ruler, Wrench, MousePointer, ZoomIn, Hand,
  Target, Circle, Triangle, Link2, Menu, Sun, RefreshCw,
  Mic, MicOff, MessageSquare, Users, Volume2, VolumeX,
  Phone, PhoneOff, LogOut, LogIn, Headphones, Clock
} from 'lucide-react';

// =============================================================================
// DESIGN TOKENS (VR-First)
// =============================================================================
const tokens = {
  colors: {
    bg: { 
      primary: '#0a0a0f', 
      secondary: '#12121a', 
      tertiary: '#1a1a24',
      elevated: '#1e1e2a',
      glass: 'rgba(10, 10, 15, 0.95)',
      popout: 'rgba(18, 18, 26, 0.98)',
    },
    border: { 
      subtle: 'rgba(255,255,255,0.06)', 
      default: 'rgba(255,255,255,0.1)',
      strong: 'rgba(255,255,255,0.15)',
      focus: 'rgba(255,255,255,0.25)',
    },
    text: { 
      primary: '#ffffff', 
      secondary: 'rgba(255,255,255,0.7)', 
      muted: 'rgba(255,255,255,0.4)',
      disabled: 'rgba(255,255,255,0.25)',
    },
    accent: { 
      purple: '#a855f7', 
      blue: '#3b82f6', 
      cyan: '#22d3ee', 
      green: '#22c55e', 
      amber: '#f59e0b', 
      pink: '#ec4899', 
      red: '#ef4444', 
      teal: '#14b8a6',
    },
  },
  sizing: {
    touchTarget: 44,
    touchTargetLg: 56,
    iconSm: 14,
    iconMd: 16,
    iconLg: 20,
    iconStroke: 1.75,
    minCanvasWidth: 280,
    minCanvasHeight: 200,
    minPopoutWidth: 200,
    minPopoutHeight: 150,
  },
  radius: { sm: 4, md: 6, lg: 8, xl: 12 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  snap: {
    threshold: 20,  // Pixels to trigger snap
    gridSize: 50,   // Grid snap size
  },
};

// Aliases
const ScanLine = Menu;
const RotateCw = RefreshCw;

// =============================================================================
// MOCK DATA
// =============================================================================
const MOCK_ROOMS = [
  { id: 'r1', name: 'Lab Meeting', color: tokens.colors.accent.purple, usersOnline: 5 },
  { id: 'r2', name: 'Analysis Session', color: tokens.colors.accent.blue, usersOnline: 2 },
  { id: 'r3', name: 'Personal', color: tokens.colors.accent.green, usersOnline: 1 },
  { id: 'r4', name: 'Tumor Review', color: tokens.colors.accent.amber, usersOnline: 3 },
];

const MOCK_WORKSPACES = [
  { id: 'ws1', name: 'Main Analysis', type: 'workspace', isOpen: true, hasChanges: false, hasBreakout: true, breakoutUsers: 3 },
  { id: 'ws2', name: 'Tumor Regions', type: 'subset', isOpen: true, hasChanges: true, hasBreakout: false, breakoutUsers: 0 },
  { id: 'ws3', name: 'Scratch Pad', type: 'scratch', isOpen: false, hasChanges: false, hasBreakout: false, breakoutUsers: 0 },
  { id: 'ws4', name: 'Comparison View', type: 'workspace', isOpen: false, hasChanges: false, hasBreakout: false, breakoutUsers: 0 },
  { id: 'ws5', name: 'Patient Overview', type: 'workspace', isOpen: false, hasChanges: false, hasBreakout: false, breakoutUsers: 0 },
];

const MOCK_POPOUTS = [
  { id: 'pop1', viewName: 'Axial Slice', viewType: 'vtk-slice', color: tokens.colors.accent.purple },
  { id: 'pop2', viewName: '3D Volume', viewType: 'vtk-volume', color: tokens.colors.accent.green },
];

const MOCK_VIEWS = [
  { id: 'v1', name: 'Axial Slice', type: 'vtk-slice', color: tokens.colors.accent.purple },
  { id: 'v2', name: 'Sagittal View', type: 'vtk-slice', color: tokens.colors.accent.blue },
  { id: 'v3', name: '3D Volume', type: 'vtk-volume', color: tokens.colors.accent.green },
];

const MOCK_VIEW_GROUPS = [
  { id: 'g1', name: 'MRI Slices', color: tokens.colors.accent.purple, linked: true },
  { id: 'g2', name: 'Analysis', color: tokens.colors.accent.green, linked: false },
];

// =============================================================================
// SHARED COMPONENTS
// =============================================================================

function IconButton({ 
  icon: Icon, 
  size = tokens.sizing.iconMd, 
  buttonSize = 28, 
  active, 
  disabled, 
  onClick, 
  title, 
  color,
  subtle,
  badge,
  badgeColor,
  badgeText,
  danger,
}) {
  const [hovered, setHovered] = useState(false);
  const activeColor = color || tokens.colors.accent.cyan;
  
  let bgColor = 'transparent';
  if (active) bgColor = activeColor + '20';
  else if (hovered && !disabled) bgColor = 'rgba(255,255,255,0.08)';
  
  let textColor = tokens.colors.text.secondary;
  if (disabled) textColor = tokens.colors.text.disabled;
  else if (danger && hovered) textColor = tokens.colors.accent.red;
  else if (active) textColor = activeColor;
  else if (subtle) textColor = tokens.colors.text.muted;
  else if (hovered) textColor = tokens.colors.text.primary;
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        width: buttonSize,
        height: buttonSize,
        minWidth: buttonSize,
        borderRadius: tokens.radius.md,
        border: 'none',
        background: bgColor,
        color: textColor,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s ease',
        flexShrink: 0,
      }}
    >
      <Icon size={size} strokeWidth={tokens.sizing.iconStroke} />
      {(badge || badgeText) && (
        <span style={{
          position: 'absolute',
          top: badgeText ? 0 : 4,
          right: badgeText ? 0 : 4,
          minWidth: badgeText ? 16 : 8,
          height: badgeText ? 16 : 8,
          padding: badgeText ? '0 4px' : 0,
          borderRadius: badgeText ? 8 : '50%',
          background: badgeColor || tokens.colors.accent.cyan,
          border: '2px solid ' + tokens.colors.bg.primary,
          fontSize: 10,
          fontWeight: 600,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {badgeText}
        </span>
      )}
    </button>
  );
}

function Separator({ height = 24, margin = 8, subtle, vertical = true }) {
  if (!vertical) {
    return <div style={{ height: 1, width: '100%', background: subtle ? tokens.colors.border.subtle : tokens.colors.border.default, margin: `${margin}px 0` }} />;
  }
  return <div style={{ width: 1, height, background: subtle ? tokens.colors.border.subtle : tokens.colors.border.default, margin: `0 ${margin}px`, flexShrink: 0 }} />;
}

function Dropdown({ trigger, children, isOpen, onClose, align = 'left', width = 280 }) {
  const ref = useRef(null);
  
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);
  
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {trigger}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          [align]: 0,
          marginTop: 4,
          width,
          background: tokens.colors.bg.elevated,
          border: '1px solid ' + tokens.colors.border.default,
          borderRadius: tokens.radius.lg,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 1000,
          overflow: 'hidden',
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ROOM HEADER
// =============================================================================

function RoomHeader({ 
  rooms, 
  viewingRoomId, 
  voiceRoomId,
  onSelectRoom, 
  onJoinVoice, 
  onLeaveVoice,
  onSwitchVoice,
  isMuted,
  onToggleMute,
  unreadMessages,
  onOpenChat,
}) {
  const [showMoreRooms, setShowMoreRooms] = useState(false);
  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false);
  
  const voiceRoom = rooms.find(r => r.id === voiceRoomId);
  const isInVoice = !!voiceRoomId;
  
  const prioritizedRooms = [...rooms].sort((a, b) => {
    if (a.id === viewingRoomId) return -1;
    if (b.id === viewingRoomId) return 1;
    if (a.id === voiceRoomId) return -1;
    if (b.id === voiceRoomId) return 1;
    return 0;
  });
  
  const visibleRooms = prioritizedRooms.slice(0, 3);
  const overflowRooms = prioritizedRooms.slice(3);
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      height: 44,
      padding: '0 12px',
      background: tokens.colors.bg.secondary,
      borderBottom: '1px solid ' + tokens.colors.border.default,
      gap: 8,
    }}>
      {/* Room Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {visibleRooms.map((room) => {
          const isViewing = room.id === viewingRoomId;
          const isVoiceRoom = room.id === voiceRoomId;
          
          return (
            <button
              key={room.id}
              onClick={() => onSelectRoom(room.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: tokens.radius.md,
                border: isViewing ? '1px solid ' + room.color + '50' : '1px solid transparent',
                background: isViewing ? room.color + '15' : 'transparent',
                color: isViewing ? tokens.colors.text.primary : tokens.colors.text.secondary,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: isViewing ? 500 : 400,
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: room.color }} />
              <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {room.name}
              </span>
              {isViewing && <Eye size={12} style={{ color: tokens.colors.accent.cyan }} />}
              {isVoiceRoom && <Mic size={12} style={{ color: tokens.colors.accent.green }} />}
            </button>
          );
        })}
        
        {overflowRooms.length > 0 && (
          <Dropdown
            isOpen={showMoreRooms}
            onClose={() => setShowMoreRooms(false)}
            width={180}
            trigger={
              <button
                onClick={() => setShowMoreRooms(!showMoreRooms)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 10px',
                  borderRadius: tokens.radius.md,
                  border: 'none',
                  background: 'transparent',
                  color: tokens.colors.text.muted,
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                +{overflowRooms.length} more
                <ChevronDown size={12} />
              </button>
            }
          >
            <div style={{ padding: 4 }}>
              {overflowRooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => { onSelectRoom(room.id); setShowMoreRooms(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '8px 10px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: tokens.radius.md,
                    cursor: 'pointer',
                    color: tokens.colors.text.secondary,
                    fontSize: 12,
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: room.color }} />
                  {room.name}
                </button>
              ))}
            </div>
          </Dropdown>
        )}
        
        <IconButton icon={Plus} buttonSize={28} size={14} title="Create Room" subtle />
      </div>
      
      <div style={{ flex: 1 }} />
      
      {/* Presence */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Users size={14} style={{ color: tokens.colors.text.muted }} />
        <span style={{ fontSize: 12, color: tokens.colors.text.secondary }}>
          {rooms.find(r => r.id === viewingRoomId)?.usersOnline || 0}
        </span>
      </div>
      
      <Separator height={20} margin={8} subtle />
      
      {/* Voice Controls */}
      {isInVoice ? (
        <Dropdown
          isOpen={showVoiceDropdown}
          onClose={() => setShowVoiceDropdown(false)}
          align="right"
          width={220}
          trigger={
            <button
              onClick={() => setShowVoiceDropdown(!showVoiceDropdown)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: tokens.radius.md,
                border: '1px solid ' + tokens.colors.accent.green + '40',
                background: tokens.colors.accent.green + '15',
                color: tokens.colors.accent.green,
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              <Mic size={14} />
              In: {voiceRoom?.name}
              <ChevronDown size={12} />
            </button>
          }
        >
          <div style={{ padding: tokens.spacing.sm }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: tokens.colors.text.muted, textTransform: 'uppercase', marginBottom: 8, padding: '0 4px' }}>
              Switch Voice To
            </div>
            {rooms.filter(r => r.id !== voiceRoomId).map(room => (
              <button
                key={room.id}
                onClick={() => { onSwitchVoice(room.id); setShowVoiceDropdown(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '8px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: tokens.radius.md,
                  cursor: 'pointer',
                  color: tokens.colors.text.secondary,
                  fontSize: 12,
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: room.color }} />
                {room.name}
              </button>
            ))}
            <Separator vertical={false} margin={8} subtle />
            <button
              onClick={() => { onLeaveVoice(); setShowVoiceDropdown(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '8px',
                background: 'transparent',
                border: 'none',
                borderRadius: tokens.radius.md,
                cursor: 'pointer',
                color: tokens.colors.accent.red,
                fontSize: 12,
              }}
            >
              <PhoneOff size={14} />
              Leave Voice
            </button>
          </div>
        </Dropdown>
      ) : (
        <button
          onClick={() => onJoinVoice(viewingRoomId)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: tokens.radius.md,
            border: '1px solid ' + tokens.colors.border.subtle,
            background: 'transparent',
            color: tokens.colors.text.secondary,
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          <Phone size={14} />
          Join Voice
        </button>
      )}
      
      {/* Mute button when in voice */}
      {isInVoice && (
        <IconButton
          icon={isMuted ? MicOff : Mic}
          buttonSize={32}
          size={16}
          onClick={onToggleMute}
          color={isMuted ? tokens.colors.accent.red : tokens.colors.accent.green}
          active={!isMuted}
          title={isMuted ? 'Unmute' : 'Mute'}
        />
      )}
      
      <Separator height={20} margin={8} subtle />
      
      {/* Chat */}
      <IconButton
        icon={MessageSquare}
        buttonSize={32}
        size={16}
        onClick={onOpenChat}
        badge={unreadMessages > 0}
        badgeColor={tokens.colors.accent.pink}
        title="Chat"
      />
    </div>
  );
}

// =============================================================================
// CANVAS TAB COMPONENT
// =============================================================================

function CanvasTab({ 
  workspace, 
  isActive, 
  onSelect, 
  onClose, 
  onRename,
  onContextMenu,
  onDragOver,
  onDrop,
  isDragTarget,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(workspace.name);
  const inputRef = useRef(null);
  
  const typeConfig = {
    workspace: { icon: null, prefix: null, color: tokens.colors.accent.blue },
    subset: { icon: Filter, prefix: 'Subset:', color: tokens.colors.accent.amber },
    scratch: { icon: Pencil, prefix: null, color: tokens.colors.accent.green },
  };
  
  const config = typeConfig[workspace.type] || typeConfig.workspace;
  const TypeIcon = config.icon;
  
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);
  
  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditName(workspace.name);
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { onRename(editName); setIsEditing(false); }
    else if (e.key === 'Escape') { setIsEditing(false); setEditName(workspace.name); }
  };
  
  return (
    <div
      draggable={!isEditing}
      onDragStart={(e) => e.dataTransfer.setData('text/plain', workspace.id)}
      onDragOver={(e) => { e.preventDefault(); onDragOver?.(workspace.id); }}
      onDrop={(e) => { e.preventDefault(); onDrop?.(e.dataTransfer.getData('text/plain'), workspace.id); }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => !isEditing && onSelect()}
      onDoubleClick={handleDoubleClick}
      onContextMenu={onContextMenu}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 12px',
        height: 36,
        minWidth: 80,
        maxWidth: 180,
        background: isActive ? tokens.colors.bg.tertiary : isDragTarget ? tokens.colors.accent.cyan + '15' : isHovered ? 'rgba(255,255,255,0.04)' : 'transparent',
        borderRadius: tokens.radius.md,
        border: isActive ? '1px solid ' + tokens.colors.border.default : isDragTarget ? '1px dashed ' + tokens.colors.accent.cyan + '50' : '1px solid transparent',
        cursor: isEditing ? 'text' : 'grab',
        transition: 'all 0.15s ease',
        userSelect: 'none',
      }}
    >
      {isHovered && !isEditing && <GripVertical size={10} style={{ color: tokens.colors.text.muted, marginLeft: -4, opacity: 0.5 }} />}
      
      {TypeIcon && <TypeIcon size={12} strokeWidth={2} style={{ color: config.color, flexShrink: 0 }} />}
      
      {workspace.hasChanges && <div style={{ width: 6, height: 6, borderRadius: '50%', background: tokens.colors.accent.amber, flexShrink: 0 }} />}
      
      {/* Voice breakout indicator */}
      {workspace.hasBreakout && (
        <Mic size={11} style={{ color: tokens.colors.accent.green, flexShrink: 0 }} />
      )}
      
      {isEditing ? (
        <input
          ref={inputRef}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (editName.trim()) onRename(editName); setIsEditing(false); }}
          onClick={(e) => e.stopPropagation()}
          style={{ flex: 1, minWidth: 60, background: 'transparent', border: 'none', outline: 'none', color: tokens.colors.text.primary, fontSize: 12, fontWeight: 500, padding: 0 }}
        />
      ) : (
        <span style={{ flex: 1, fontSize: 12, fontWeight: isActive ? 500 : 400, color: isActive ? tokens.colors.text.primary : tokens.colors.text.secondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {config.prefix && <span style={{ color: config.color, marginRight: 4 }}>{config.prefix}</span>}
          {workspace.name}
        </span>
      )}
      
      {(isHovered || isActive) && !isEditing && (
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          style={{ width: 18, height: 18, borderRadius: tokens.radius.sm, border: 'none', background: 'transparent', color: tokens.colors.text.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <X size={12} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

// =============================================================================
// BREAKOUT MANAGER (like Popout Manager but for voice breakouts)
// =============================================================================

function BreakoutManager({ workspaces, onJoinBreakout, onLeaveBreakout, currentBreakoutId }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const breakouts = workspaces.filter(w => w.isOpen && w.hasBreakout);
  if (breakouts.length === 0) return null;
  
  const inBreakout = !!currentBreakoutId;
  const currentBreakout = workspaces.find(w => w.id === currentBreakoutId);
  
  return (
    <Dropdown
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      align="right"
      width={240}
      trigger={
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            height: 32,
            background: inBreakout ? tokens.colors.accent.green + '15' : tokens.colors.bg.secondary,
            border: '1px solid ' + (inBreakout ? tokens.colors.accent.green + '40' : 'transparent'),
            borderRadius: tokens.radius.md,
            cursor: 'pointer',
            color: inBreakout ? tokens.colors.accent.green : tokens.colors.text.secondary,
            fontSize: 11,
          }}
        >
          <Mic size={14} />
          {inBreakout ? currentBreakout?.name : breakouts.length}
          <ChevronDown size={12} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
        </button>
      }
    >
      <div style={{ padding: tokens.spacing.sm }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: tokens.colors.text.muted, textTransform: 'uppercase', marginBottom: 8, padding: '0 4px' }}>
          Workspace Breakouts ({breakouts.length})
        </div>
        
        {breakouts.map(ws => (
          <div
            key={ws.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px',
              borderRadius: tokens.radius.md,
              background: currentBreakoutId === ws.id ? tokens.colors.accent.green + '15' : 'rgba(255,255,255,0.02)',
              marginBottom: 4,
            }}
          >
            <Mic size={12} style={{ color: tokens.colors.accent.green }} />
            <span style={{ flex: 1, fontSize: 12, color: tokens.colors.text.secondary }}>{ws.name}</span>
            <span style={{ fontSize: 10, color: tokens.colors.text.muted }}>{ws.breakoutUsers}</span>
            
            {currentBreakoutId === ws.id ? (
              <button
                onClick={() => { onLeaveBreakout(); setIsOpen(false); }}
                style={{ padding: '4px 8px', borderRadius: tokens.radius.sm, border: 'none', background: tokens.colors.accent.red + '20', color: tokens.colors.accent.red, cursor: 'pointer', fontSize: 10 }}
              >
                Leave
              </button>
            ) : (
              <button
                onClick={() => { onJoinBreakout(ws.id); setIsOpen(false); }}
                style={{ padding: '4px 8px', borderRadius: tokens.radius.sm, border: 'none', background: tokens.colors.accent.green + '20', color: tokens.colors.accent.green, cursor: 'pointer', fontSize: 10 }}
              >
                Join
              </button>
            )}
          </div>
        ))}
      </div>
    </Dropdown>
  );
}

// =============================================================================
// CREATE/OPEN POPOVER
// =============================================================================

function CreateOpenPopover({ isOpen, onClose, workspaces, onCreateWorkspace, onOpenWorkspace }) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const closedWorkspaces = workspaces.filter(w => !w.isOpen);
  const filteredWorkspaces = closedWorkspaces.filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase()));
  
  const createOptions = [
    { id: 'empty', label: 'Empty Workspace', icon: Square, description: 'Start with a blank canvas' },
    { id: 'subset', label: 'From Subset...', icon: Filter, description: 'Opens SubsetSelectorModal' },
    { id: 'scratch', label: 'Scratch Pad', icon: Pencil, description: 'Personal temporary workspace' },
  ];
  
  if (!isOpen) return null;
  
  return (
    <div style={{
      position: 'absolute',
      top: '100%',
      left: 0,
      marginTop: 4,
      width: 300,
      background: tokens.colors.bg.elevated,
      border: '1px solid ' + tokens.colors.border.default,
      borderRadius: tokens.radius.lg,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      zIndex: 1000,
    }}>
      <div style={{ padding: tokens.spacing.sm }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: tokens.colors.text.muted, textTransform: 'uppercase', marginBottom: 8, padding: '0 4px' }}>Create New</div>
        {createOptions.map(option => {
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              onClick={() => { onCreateWorkspace(option.id); onClose(); }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 8px', background: 'transparent', border: 'none', borderRadius: tokens.radius.md, cursor: 'pointer', textAlign: 'left' }}
            >
              <div style={{ width: 32, height: 32, borderRadius: tokens.radius.md, background: tokens.colors.accent.cyan + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.colors.accent.cyan }}>
                <Icon size={16} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: tokens.colors.text.primary }}>{option.label}</div>
                <div style={{ fontSize: 11, color: tokens.colors.text.muted }}>{option.description}</div>
              </div>
            </button>
          );
        })}
      </div>
      
      <div style={{ height: 1, background: tokens.colors.border.subtle }} />
      
      <div style={{ padding: tokens.spacing.sm }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '0 4px' }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: tokens.colors.text.muted, textTransform: 'uppercase' }}>Open Existing</span>
          <span style={{ fontSize: 10, color: tokens.colors.text.muted }}>{closedWorkspaces.length} available</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: tokens.colors.bg.secondary, borderRadius: tokens.radius.md, marginBottom: 8 }}>
          <Search size={14} style={{ color: tokens.colors.text.muted }} />
          <input
            type="text"
            placeholder="Search workspaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: tokens.colors.text.primary, fontSize: 12 }}
          />
        </div>
        
        <div style={{ maxHeight: 150, overflowY: 'auto' }}>
          {filteredWorkspaces.slice(0, 5).map(workspace => {
            const typeConfig = { workspace: { icon: Square, color: tokens.colors.accent.blue }, subset: { icon: Filter, color: tokens.colors.accent.amber }, scratch: { icon: Pencil, color: tokens.colors.accent.green } };
            const config = typeConfig[workspace.type] || typeConfig.workspace;
            const TypeIcon = config.icon;
            return (
              <button
                key={workspace.id}
                onClick={() => { onOpenWorkspace(workspace.id); onClose(); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px', background: 'transparent', border: 'none', borderRadius: tokens.radius.md, cursor: 'pointer', textAlign: 'left' }}
              >
                <TypeIcon size={14} style={{ color: config.color }} />
                <span style={{ flex: 1, fontSize: 12, color: tokens.colors.text.secondary }}>{workspace.name}</span>
                <span style={{ fontSize: 10, color: tokens.colors.accent.cyan }}>Open</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MODE TOGGLE
// =============================================================================

function ModeToggle({ mode, onModeChange }) {
  const modes = [
    { id: 'tile', icon: LayoutGrid, label: 'Tile' },
    { id: 'tabs', icon: Square, label: 'Tabs' },
  ];
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: 2, background: tokens.colors.bg.secondary, borderRadius: tokens.radius.md }}>
      {modes.map(m => {
        const Icon = m.icon;
        const isActive = mode === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onModeChange(m.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', height: 32, background: isActive ? tokens.colors.bg.tertiary : 'transparent', border: 'none', borderRadius: tokens.radius.sm, cursor: 'pointer', color: isActive ? tokens.colors.text.primary : tokens.colors.text.muted, fontSize: 11, fontWeight: isActive ? 500 : 400 }}
          >
            <Icon size={14} />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// POPOUT MANAGER
// =============================================================================

function PopoutManager({ popouts, onBringToFront, onClose, onTileAll, onCloseAll, snapEnabled, onToggleSnap, gridSnapEnabled, onToggleGridSnap }) {
  const [isOpen, setIsOpen] = useState(false);
  
  if (popouts.length === 0) return null;
  
  return (
    <Dropdown isOpen={isOpen} onClose={() => setIsOpen(false)} align="right" width={280} trigger={
      <button onClick={() => setIsOpen(!isOpen)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', height: 32, background: isOpen ? tokens.colors.bg.tertiary : tokens.colors.bg.secondary, border: '1px solid ' + (isOpen ? tokens.colors.border.default : 'transparent'), borderRadius: tokens.radius.md, cursor: 'pointer', color: tokens.colors.text.secondary, fontSize: 11 }}>
        <ExternalLink size={14} />
        {popouts.length}
        <ChevronDown size={12} style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </button>
    }>
      <div style={{ padding: tokens.spacing.sm }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: tokens.colors.text.muted, textTransform: 'uppercase', marginBottom: 8, padding: '0 4px' }}>
          Active Popouts ({popouts.length})
        </div>
        
        {/* Snap Settings */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, padding: '0 4px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: tokens.colors.text.muted, cursor: 'pointer' }}>
            <input type="checkbox" checked={snapEnabled} onChange={onToggleSnap} style={{ accentColor: tokens.colors.accent.cyan }} />
            Edge Snap
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: tokens.colors.text.muted, cursor: 'pointer' }}>
            <input type="checkbox" checked={gridSnapEnabled} onChange={onToggleGridSnap} style={{ accentColor: tokens.colors.accent.cyan }} />
            Grid Snap
          </label>
        </div>
        
        <div style={{ fontSize: 10, color: tokens.colors.text.muted, padding: '4px 4px 8px', fontStyle: 'italic' }}>
          💡 Hold Shift while dragging to disable snap
        </div>
        
        {popouts.map(popout => (
          <div key={popout.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px', borderRadius: tokens.radius.md, background: 'rgba(255,255,255,0.02)', marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: popout.color }} />
            <span style={{ flex: 1, fontSize: 12, color: tokens.colors.text.secondary }}>{popout.viewName}</span>
            <button onClick={() => onBringToFront(popout.id)} title="Bring to front" style={{ width: 24, height: 24, borderRadius: tokens.radius.sm, border: 'none', background: 'transparent', color: tokens.colors.text.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowUp size={12} />
            </button>
            <button onClick={() => onClose(popout.id)} title="Close" style={{ width: 24, height: 24, borderRadius: tokens.radius.sm, border: 'none', background: 'transparent', color: tokens.colors.text.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={12} />
            </button>
          </div>
        ))}
        
        <div style={{ display: 'flex', gap: 8, marginTop: 8, paddingTop: 8, borderTop: '1px solid ' + tokens.colors.border.subtle }}>
          <button onClick={() => { onTileAll(); setIsOpen(false); }} style={{ flex: 1, padding: '8px', background: tokens.colors.bg.secondary, border: '1px solid ' + tokens.colors.border.subtle, borderRadius: tokens.radius.md, cursor: 'pointer', fontSize: 11, color: tokens.colors.text.secondary, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <LayoutGrid size={12} />Tile All
          </button>
          <button onClick={() => { onCloseAll(); setIsOpen(false); }} style={{ flex: 1, padding: '8px', background: tokens.colors.bg.secondary, border: '1px solid ' + tokens.colors.border.subtle, borderRadius: tokens.radius.md, cursor: 'pointer', fontSize: 11, color: tokens.colors.accent.red, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <X size={12} />Close All
          </button>
        </div>
      </div>
    </Dropdown>
  );
}

// =============================================================================
// CANVAS TABS BAR
// =============================================================================

function CanvasTabsBar({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  onOpenWorkspace,
  onCloseWorkspace,
  onRenameWorkspace,
  onReorderWorkspaces,
  mode,
  onModeChange,
  popouts,
  onPopoutBringToFront,
  onPopoutClose,
  onPopoutTileAll,
  onPopoutCloseAll,
  snapEnabled,
  onToggleSnap,
  gridSnapEnabled,
  onToggleGridSnap,
  currentBreakoutId,
  onJoinBreakout,
  onLeaveBreakout,
}) {
  const [showCreatePopover, setShowCreatePopover] = useState(false);
  const [dragTargetId, setDragTargetId] = useState(null);
  const [closeConfirmation, setCloseConfirmation] = useState(null);
  
  const openWorkspaces = workspaces.filter(w => w.isOpen);
  const maxVisibleTabs = 4;
  const visibleWorkspaces = openWorkspaces.slice(0, maxVisibleTabs);
  const overflowWorkspaces = openWorkspaces.slice(maxVisibleTabs);
  
  const handleClose = (workspace) => {
    if (workspace.hasChanges) {
      setCloseConfirmation(workspace);
    } else {
      onCloseWorkspace(workspace.id);
    }
  };
  
  const handleDrop = (draggedId, targetId) => {
    if (draggedId !== targetId) onReorderWorkspaces(draggedId, targetId);
    setDragTargetId(null);
  };
  
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', height: 48, padding: '0 12px', background: tokens.colors.bg.secondary, borderBottom: '1px solid ' + tokens.colors.border.subtle, gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 }}>
          {visibleWorkspaces.map(workspace => (
            <CanvasTab
              key={workspace.id}
              workspace={workspace}
              isActive={workspace.id === activeWorkspaceId}
              onSelect={() => onSelectWorkspace(workspace.id)}
              onClose={() => handleClose(workspace)}
              onRename={(name) => onRenameWorkspace(workspace.id, name)}
              onContextMenu={(e) => e.preventDefault()}
              onDragOver={(id) => setDragTargetId(id)}
              onDrop={handleDrop}
              isDragTarget={dragTargetId === workspace.id}
            />
          ))}
          
          {overflowWorkspaces.length > 0 && (
            <Dropdown isOpen={false} onClose={() => {}} width={200} trigger={
              <button style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 10px', height: 36, background: 'transparent', border: 'none', borderRadius: tokens.radius.md, cursor: 'pointer', color: tokens.colors.text.muted, fontSize: 12 }}>
                +{overflowWorkspaces.length}
                <ChevronDown size={12} />
              </button>
            }>
              <div />
            </Dropdown>
          )}
          
          <div style={{ position: 'relative' }}>
            <IconButton icon={Plus} buttonSize={32} size={16} title="New workspace" onClick={() => setShowCreatePopover(!showCreatePopover)} active={showCreatePopover} />
            <CreateOpenPopover isOpen={showCreatePopover} onClose={() => setShowCreatePopover(false)} workspaces={workspaces} onCreateWorkspace={onCreateWorkspace} onOpenWorkspace={onOpenWorkspace} />
          </div>
        </div>
        
        <Separator height={24} margin={8} subtle />
        <ModeToggle mode={mode} onModeChange={onModeChange} />
        
        <PopoutManager
          popouts={popouts}
          onBringToFront={onPopoutBringToFront}
          onClose={onPopoutClose}
          onTileAll={onPopoutTileAll}
          onCloseAll={onPopoutCloseAll}
          snapEnabled={snapEnabled}
          onToggleSnap={onToggleSnap}
          gridSnapEnabled={gridSnapEnabled}
          onToggleGridSnap={onToggleGridSnap}
        />
        
        <BreakoutManager
          workspaces={workspaces}
          currentBreakoutId={currentBreakoutId}
          onJoinBreakout={onJoinBreakout}
          onLeaveBreakout={onLeaveBreakout}
        />
      </div>
      
      {/* Close Confirmation Modal */}
      {closeConfirmation && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: tokens.colors.bg.elevated, border: '1px solid ' + tokens.colors.border.default, borderRadius: tokens.radius.xl, padding: tokens.spacing.xl, width: 360 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: tokens.colors.text.primary, marginBottom: 12 }}>Unsaved Changes</div>
            <div style={{ fontSize: 13, color: tokens.colors.text.secondary, marginBottom: 20 }}>"{closeConfirmation.name}" has unsaved changes.</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setCloseConfirmation(null)} style={{ padding: '10px 16px', background: tokens.colors.bg.secondary, border: '1px solid ' + tokens.colors.border.default, borderRadius: tokens.radius.md, cursor: 'pointer', fontSize: 13, color: tokens.colors.text.secondary }}>Cancel</button>
              <button onClick={() => { onCloseWorkspace(closeConfirmation.id); setCloseConfirmation(null); }} style={{ padding: '10px 16px', background: tokens.colors.accent.red, border: 'none', borderRadius: tokens.radius.md, cursor: 'pointer', fontSize: 13, color: '#fff' }}>Close Without Saving</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// =============================================================================
// POPOUT WINDOW (with resize and snap)
// =============================================================================

function PopoutWindow({ 
  popout, 
  position, 
  size,
  onPositionChange,
  onSizeChange,
  onClose, 
  isFocused,
  onFocus,
  snapEnabled,
  gridSnapEnabled,
  containerBounds,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [snapIndicator, setSnapIndicator] = useState(null);
  
  const viewTypeIcons = { 'vtk-slice': Layers, 'vtk-volume': Box, 'table': BarChart3 };
  const ViewIcon = viewTypeIcons[popout.viewType] || Square;
  
  // Snap calculation
  const calculateSnap = useCallback((pos, currentSize, shiftHeld) => {
    if (shiftHeld || (!snapEnabled && !gridSnapEnabled)) return { pos, indicator: null };
    
    let snappedPos = { ...pos };
    let indicator = null;
    const threshold = tokens.snap.threshold;
    
    if (gridSnapEnabled) {
      snappedPos.x = Math.round(pos.x / tokens.snap.gridSize) * tokens.snap.gridSize;
      snappedPos.y = Math.round(pos.y / tokens.snap.gridSize) * tokens.snap.gridSize;
      return { pos: snappedPos, indicator: 'grid' };
    }
    
    if (snapEnabled && containerBounds) {
      // Left edge
      if (Math.abs(pos.x) < threshold) {
        snappedPos.x = 0;
        indicator = 'left';
      }
      // Right edge
      if (Math.abs(pos.x + currentSize.width - containerBounds.width) < threshold) {
        snappedPos.x = containerBounds.width - currentSize.width;
        indicator = 'right';
      }
      // Top edge
      if (Math.abs(pos.y) < threshold) {
        snappedPos.y = 0;
        indicator = indicator ? indicator + '-top' : 'top';
      }
      // Bottom edge
      if (Math.abs(pos.y + currentSize.height - containerBounds.height) < threshold) {
        snappedPos.y = containerBounds.height - currentSize.height;
        indicator = indicator ? indicator + '-bottom' : 'bottom';
      }
      // Center horizontal
      const centerX = (containerBounds.width - currentSize.width) / 2;
      if (Math.abs(pos.x - centerX) < threshold) {
        snappedPos.x = centerX;
        indicator = 'center-h';
      }
      // Center vertical
      const centerY = (containerBounds.height - currentSize.height) / 2;
      if (Math.abs(pos.y - centerY) < threshold) {
        snappedPos.y = centerY;
        indicator = indicator === 'center-h' ? 'center' : 'center-v';
      }
    }
    
    return { pos: snappedPos, indicator };
  }, [snapEnabled, gridSnapEnabled, containerBounds]);
  
  // Drag handling
  const handleDragStart = (e) => {
    if (e.target.closest('button')) return;
    setIsDragging(true);
    setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
    onFocus();
  };
  
  useEffect(() => {
    if (!isDragging) return;
    
    const handleMouseMove = (e) => {
      const rawPos = { x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y };
      const { pos, indicator } = calculateSnap(rawPos, size, e.shiftKey);
      onPositionChange(pos);
      setSnapIndicator(indicator);
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      setSnapIndicator(null);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, calculateSnap, size, onPositionChange]);
  
  // Resize handling
  const handleResizeStart = (e) => {
    e.stopPropagation();
    setIsResizing(true);
    onFocus();
  };
  
  useEffect(() => {
    if (!isResizing) return;
    
    const handleMouseMove = (e) => {
      const newWidth = Math.max(tokens.sizing.minPopoutWidth, e.clientX - position.x);
      const newHeight = Math.max(tokens.sizing.minPopoutHeight, e.clientY - position.y);
      onSizeChange({ width: newWidth, height: newHeight });
    };
    
    const handleMouseUp = () => setIsResizing(false);
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, position, onSizeChange]);
  
  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={onFocus}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        background: tokens.colors.bg.popout,
        border: '1px solid ' + (isFocused ? tokens.colors.accent.cyan + '50' : tokens.colors.border.default),
        borderRadius: tokens.radius.lg,
        boxShadow: isFocused ? '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ' + tokens.colors.accent.cyan + '30' : '0 4px 16px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        zIndex: isFocused ? 100 : 50,
      }}
    >
      {/* Snap indicator */}
      {snapIndicator && (
        <div style={{
          position: 'absolute',
          inset: -2,
          border: '2px dashed ' + tokens.colors.accent.cyan,
          borderRadius: tokens.radius.lg + 2,
          pointerEvents: 'none',
          zIndex: 10,
        }} />
      )}
      
      {/* Header */}
      <div
        onMouseDown={handleDragStart}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: tokens.colors.bg.tertiary,
          borderBottom: '1px solid ' + tokens.colors.border.subtle,
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: popout.color }} />
        <ViewIcon size={14} style={{ color: tokens.colors.text.muted }} />
        <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: tokens.colors.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {popout.viewName}
        </span>
        <ExternalLink size={12} style={{ color: tokens.colors.text.muted, opacity: 0.5 }} />
        <button onClick={onClose} style={{ width: 24, height: 24, borderRadius: tokens.radius.sm, border: 'none', background: isHovered ? 'rgba(255,255,255,0.1)' : 'transparent', color: tokens.colors.text.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={14} />
        </button>
      </div>
      
      {/* Content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tokens.colors.bg.primary }}>
        <div style={{ textAlign: 'center', color: tokens.colors.text.muted }}>
          <ViewIcon size={40} strokeWidth={1} style={{ opacity: 0.3, marginBottom: 8 }} />
          <div style={{ fontSize: 11 }}>{popout.viewType}</div>
          <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4 }}>Tools in Footer 1 ↓</div>
        </div>
      </div>
      
      {/* Resize handle */}
      <div
        onMouseDown={handleResizeStart}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 20,
          height: 20,
          cursor: 'nwse-resize',
          opacity: isHovered || isResizing ? 1 : 0,
          transition: 'opacity 0.15s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path d="M10 12L12 10M6 12L12 6M2 12L12 2" stroke={tokens.colors.text.muted} strokeWidth="1.5" fill="none" />
        </svg>
      </div>
    </div>
  );
}

// =============================================================================
// MINI CANVAS HEADER (for tile mode)
// =============================================================================

function MiniCanvasHeader({ workspace, isActive, onActivate, onClose, currentBreakoutId, onJoinBreakout }) {
  const [isHovered, setIsHovered] = useState(false);
  
  const typeConfig = {
    workspace: { icon: null, color: tokens.colors.accent.blue },
    subset: { icon: Filter, color: tokens.colors.accent.amber },
    scratch: { icon: Pencil, color: tokens.colors.accent.green },
  };
  const config = typeConfig[workspace.type] || typeConfig.workspace;
  const TypeIcon = config.icon;
  const isInThisBreakout = currentBreakoutId === workspace.id;
  
  return (
    <div
      onClick={onActivate}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        background: isActive ? tokens.colors.bg.tertiary : tokens.colors.bg.secondary,
        borderBottom: '1px solid ' + tokens.colors.border.subtle,
        cursor: 'pointer',
        minHeight: 36,
      }}
    >
      {TypeIcon && <TypeIcon size={12} style={{ color: config.color }} />}
      {workspace.hasChanges && <div style={{ width: 6, height: 6, borderRadius: '50%', background: tokens.colors.accent.amber }} />}
      
      <span style={{ flex: 1, fontSize: 11, fontWeight: isActive ? 500 : 400, color: isActive ? tokens.colors.text.primary : tokens.colors.text.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {workspace.name}
      </span>
      
      {/* Breakout indicator */}
      {workspace.hasBreakout && (
        <button
          onClick={(e) => { e.stopPropagation(); if (!isInThisBreakout) onJoinBreakout(workspace.id); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 6px',
            borderRadius: tokens.radius.sm,
            border: 'none',
            background: isInThisBreakout ? tokens.colors.accent.green + '20' : 'transparent',
            color: tokens.colors.accent.green,
            cursor: 'pointer',
            fontSize: 10,
          }}
          title={isInThisBreakout ? 'In breakout' : 'Join breakout'}
        >
          <Mic size={10} />
          {workspace.breakoutUsers}
        </button>
      )}
      
      {(isHovered || isActive) && (
        <div style={{ display: 'flex', gap: 2 }}>
          <IconButton icon={Maximize2} buttonSize={24} size={12} title="Maximize" subtle />
          <IconButton icon={X} buttonSize={24} size={12} title="Close" subtle danger onClick={(e) => { e.stopPropagation(); onClose(); }} />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// TILED CANVAS VIEW
// =============================================================================

function TiledCanvasView({ workspaces, activeWorkspaceId, onSelectWorkspace, onCloseWorkspace, currentBreakoutId, onJoinBreakout }) {
  const openWorkspaces = workspaces.filter(w => w.isOpen);
  const count = Math.min(openWorkspaces.length, 4);
  const [splitRatio, setSplitRatio] = useState({ h: 0.5, v: 0.5 });
  const [isDragging, setIsDragging] = useState(null);
  const containerRef = useRef(null);
  
  const handleDividerMouseDown = (type) => (e) => {
    e.preventDefault();
    setIsDragging(type);
  };
  
  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (isDragging === 'h') setSplitRatio(prev => ({ ...prev, h: Math.max(0.2, Math.min(0.8, (e.clientX - rect.left) / rect.width)) }));
      else if (isDragging === 'v') setSplitRatio(prev => ({ ...prev, v: Math.max(0.2, Math.min(0.8, (e.clientY - rect.top) / rect.height)) }));
    };
    const handleMouseUp = () => setIsDragging(null);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
  }, [isDragging]);
  
  const viewTypeIcons = { workspace: LayoutGrid, subset: Filter, scratch: Pencil };
  
  const renderCanvas = (workspace) => {
    const isActive = workspace.id === activeWorkspaceId;
    const Icon = viewTypeIcons[workspace.type] || LayoutGrid;
    return (
      <div key={workspace.id} style={{ display: 'flex', flexDirection: 'column', background: tokens.colors.bg.secondary, border: isActive ? '2px solid ' + tokens.colors.accent.cyan + '50' : '2px solid transparent', borderRadius: tokens.radius.md, overflow: 'hidden', minWidth: tokens.sizing.minCanvasWidth, minHeight: tokens.sizing.minCanvasHeight }}>
        <MiniCanvasHeader workspace={workspace} isActive={isActive} onActivate={() => onSelectWorkspace(workspace.id)} onClose={() => onCloseWorkspace(workspace.id)} currentBreakoutId={currentBreakoutId} onJoinBreakout={onJoinBreakout} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tokens.colors.bg.primary }}>
          <div style={{ textAlign: 'center', color: tokens.colors.text.muted }}>
            <Icon size={32} strokeWidth={1} style={{ opacity: 0.3, marginBottom: 8 }} />
            <div style={{ fontSize: 11 }}>{workspace.name}</div>
          </div>
        </div>
      </div>
    );
  };
  
  const Divider = ({ type }) => (
    <div
      onMouseDown={handleDividerMouseDown(type)}
      style={{
        [type === 'h' ? 'width' : 'height']: 6,
        background: isDragging === type ? tokens.colors.accent.cyan + '30' : 'transparent',
        cursor: type === 'h' ? 'col-resize' : 'row-resize',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ [type === 'h' ? 'width' : 'height']: 2, [type === 'h' ? 'height' : 'width']: 40, background: tokens.colors.border.default, borderRadius: 1 }} />
    </div>
  );
  
  if (count === 1) return <div ref={containerRef} style={{ flex: 1, padding: 2, background: tokens.colors.bg.primary }}>{renderCanvas(openWorkspaces[0])}</div>;
  
  if (count === 2) {
    return (
      <div ref={containerRef} style={{ display: 'flex', flex: 1, background: tokens.colors.bg.primary }}>
        <div style={{ width: `${splitRatio.h * 100}%`, padding: 2 }}>{renderCanvas(openWorkspaces[0])}</div>
        <Divider type="h" />
        <div style={{ flex: 1, padding: 2 }}>{renderCanvas(openWorkspaces[1])}</div>
      </div>
    );
  }
  
  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', flex: 1, background: tokens.colors.bg.primary }}>
      <div style={{ display: 'flex', height: `${splitRatio.v * 100}%` }}>
        <div style={{ width: `${splitRatio.h * 100}%`, padding: 2 }}>{renderCanvas(openWorkspaces[0])}</div>
        <Divider type="h" />
        <div style={{ flex: 1, padding: 2 }}>{openWorkspaces[1] && renderCanvas(openWorkspaces[1])}</div>
      </div>
      <Divider type="v" />
      <div style={{ display: 'flex', flex: 1 }}>
        <div style={{ width: `${splitRatio.h * 100}%`, padding: 2 }}>{openWorkspaces[2] && renderCanvas(openWorkspaces[2])}</div>
        <div style={{ width: 6 }} />
        <div style={{ flex: 1, padding: 2 }}>{openWorkspaces[3] && renderCanvas(openWorkspaces[3])}</div>
      </div>
    </div>
  );
}

// =============================================================================
// TABBED CANVAS VIEW
// =============================================================================

function TabbedCanvasView({ workspace, onClose, currentBreakoutId, onJoinBreakout, onLeaveBreakout }) {
  if (!workspace) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tokens.colors.bg.primary, color: tokens.colors.text.muted }}>
        <div style={{ textAlign: 'center' }}>
          <LayoutGrid size={48} strokeWidth={1} style={{ opacity: 0.3, marginBottom: 12 }} />
          <div style={{ fontSize: 13 }}>No workspace selected</div>
        </div>
      </div>
    );
  }
  
  const viewTypeIcons = { workspace: LayoutGrid, subset: Filter, scratch: Pencil };
  const typeConfig = { workspace: { icon: null, color: tokens.colors.accent.blue }, subset: { icon: Filter, color: tokens.colors.accent.amber }, scratch: { icon: Pencil, color: tokens.colors.accent.green } };
  const config = typeConfig[workspace.type] || typeConfig.workspace;
  const TypeIcon = config.icon;
  const Icon = viewTypeIcons[workspace.type] || LayoutGrid;
  const isInBreakout = currentBreakoutId === workspace.id;
  
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: tokens.colors.bg.primary }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', background: tokens.colors.bg.secondary, borderBottom: '1px solid ' + tokens.colors.border.subtle }}>
        {TypeIcon && <TypeIcon size={14} style={{ color: config.color }} />}
        {workspace.hasChanges && <div style={{ width: 6, height: 6, borderRadius: '50%', background: tokens.colors.accent.amber }} />}
        <span style={{ fontSize: 14, fontWeight: 500, color: tokens.colors.text.primary }}>{workspace.name}</span>
        
        {/* Breakout controls */}
        {workspace.hasBreakout && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8, padding: '4px 10px', borderRadius: tokens.radius.md, background: isInBreakout ? tokens.colors.accent.green + '15' : tokens.colors.bg.tertiary, border: '1px solid ' + (isInBreakout ? tokens.colors.accent.green + '40' : tokens.colors.border.subtle) }}>
            <Mic size={14} style={{ color: tokens.colors.accent.green }} />
            <span style={{ fontSize: 11, color: isInBreakout ? tokens.colors.accent.green : tokens.colors.text.secondary }}>
              Breakout ({workspace.breakoutUsers})
            </span>
            {isInBreakout ? (
              <button onClick={onLeaveBreakout} style={{ padding: '2px 8px', borderRadius: tokens.radius.sm, border: 'none', background: tokens.colors.accent.red + '20', color: tokens.colors.accent.red, cursor: 'pointer', fontSize: 10 }}>Leave</button>
            ) : (
              <button onClick={() => onJoinBreakout(workspace.id)} style={{ padding: '2px 8px', borderRadius: tokens.radius.sm, border: 'none', background: tokens.colors.accent.green + '20', color: tokens.colors.accent.green, cursor: 'pointer', fontSize: 10 }}>Join</button>
            )}
          </div>
        )}
        
        <div style={{ flex: 1 }} />
        <IconButton icon={LayoutGrid} buttonSize={32} size={14} title="Grid: 2×2" />
        <IconButton icon={Eye} buttonSize={32} size={14} title="Show ViewGroups" />
        <IconButton icon={Maximize2} buttonSize={32} size={14} title="Fullscreen" />
        <Separator height={20} margin={8} subtle />
        <IconButton icon={X} buttonSize={32} size={14} title="Close workspace" danger onClick={onClose} />
      </div>
      
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: tokens.colors.text.muted }}>
          <Icon size={64} strokeWidth={1} style={{ opacity: 0.2, marginBottom: 16 }} />
          <div style={{ fontSize: 14 }}>{workspace.name}</div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// FOOTER 1: INTERACTION
// =============================================================================

function InteractionFooter({ activeView, isPopoutFocused, focusedPopout }) {
  const [activeTool, setActiveTool] = useState('pan');
  
  const displayView = isPopoutFocused && focusedPopout 
    ? { id: focusedPopout.id, name: focusedPopout.viewName, color: focusedPopout.color }
    : activeView;
  
  const tools = [
    { id: 'select', icon: MousePointer, label: 'Select' },
    { id: 'pan', icon: Hand, label: 'Pan' },
    { id: 'zoom', icon: ZoomIn, label: 'Zoom' },
    { id: 'rotate', icon: RotateCcw, label: 'Rotate' },
  ];
  
  const measurements = [
    { id: 'distance', icon: Ruler, label: 'Distance' },
    { id: 'angle', icon: Triangle, label: 'Angle' },
    { id: 'probe', icon: Target, label: 'Probe' },
  ];
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: 44, padding: '0 12px', background: tokens.colors.bg.secondary, borderTop: '1px solid ' + tokens.colors.border.subtle, gap: 8 }}>
      <div style={{ display: 'flex', gap: 2 }}>
        <IconButton icon={Undo2} buttonSize={32} size={14} title="Undo" />
        <IconButton icon={Redo2} buttonSize={32} size={14} title="Redo" />
      </div>
      
      <Separator height={20} margin={4} subtle />
      
      <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', height: 32, background: tokens.colors.bg.tertiary, border: '1px solid ' + tokens.colors.border.default, borderRadius: tokens.radius.md, cursor: isPopoutFocused ? 'default' : 'pointer', color: tokens.colors.text.primary, fontSize: 12, minWidth: 140 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: displayView?.color || tokens.colors.accent.cyan }} />
        <span style={{ flex: 1, textAlign: 'left' }}>{displayView?.name || 'No selection'}</span>
        {isPopoutFocused ? (
          <>
            <Lock size={10} style={{ color: tokens.colors.text.muted }} />
            <ExternalLink size={10} style={{ color: tokens.colors.accent.cyan }} />
          </>
        ) : (
          <ChevronDown size={12} style={{ color: tokens.colors.text.muted }} />
        )}
      </button>
      
      {isPopoutFocused && <span style={{ fontSize: 10, color: tokens.colors.accent.cyan, fontStyle: 'italic' }}>Popout focused</span>}
      
      <Separator height={20} margin={4} subtle />
      
      <div style={{ display: 'flex', gap: 2 }}>
        {tools.map(tool => (
          <IconButton key={tool.id} icon={tool.icon} buttonSize={32} size={14} title={tool.label} active={activeTool === tool.id} onClick={() => setActiveTool(tool.id)} />
        ))}
      </div>
      
      <Separator height={20} margin={4} subtle />
      
      <div style={{ display: 'flex', gap: 2 }}>
        {measurements.map(m => <IconButton key={m.id} icon={m.icon} buttonSize={32} size={14} title={m.label} />)}
      </div>
      
      <div style={{ flex: 1 }} />
      
      <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: tokens.radius.md, border: 'none', background: tokens.colors.accent.purple + '20', color: tokens.colors.accent.purple, cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>
        <Wrench size={14} />
        Instance Tools
      </button>
    </div>
  );
}

// =============================================================================
// FOOTER 2: VIEW & CANVAS (simplified)
// =============================================================================

function ViewCanvasFooter({ activeViewGroup, links, onToggleLink, linksWidth }) {
  const linkTypes = [
    { id: 'camera', label: 'Camera', icon: Eye, linkedTo: links.camera },
    { id: 'filters', label: 'Filters', icon: ScanLine, linkedTo: links.filters },
    { id: 'widgets', label: 'Widgets', icon: Box, linkedTo: links.widgets },
    { id: 'cursors', label: 'Cursors', icon: MousePointer, linkedTo: links.cursors },
  ];
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: 40, padding: '0 12px', background: tokens.colors.bg.tertiary, borderTop: '1px solid ' + tokens.colors.border.subtle, gap: 8 }}>
      {/* Focus & Subset */}
      <IconButton icon={Target} buttonSize={28} size={14} title="Focus Mode" />
      <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: tokens.radius.md, border: '1px solid ' + tokens.colors.border.subtle, background: 'transparent', color: tokens.colors.text.secondary, cursor: 'pointer', fontSize: 11 }}>
        <Filter size={12} />
        Subset
        <ChevronDown size={10} />
      </button>
      
      <Separator height={16} margin={8} subtle />
      
      {/* Universal */}
      <IconButton icon={Camera} buttonSize={28} size={14} title="Snapshot" />
      <IconButton icon={RotateCw} buttonSize={28} size={14} title="Reset View" />
      
      <Separator height={16} margin={8} subtle />
      
      {/* Type-specific */}
      <IconButton icon={Compass} buttonSize={28} size={14} title="Orientation" />
      <IconButton icon={Grid3X3} buttonSize={28} size={14} title="Grid" />
      
      <div style={{ flex: 1 }} />
      
      {/* ViewGroup */}
      <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: tokens.radius.md, border: '1px solid ' + (activeViewGroup?.color || tokens.colors.border.subtle), background: (activeViewGroup?.color || tokens.colors.accent.cyan) + '10', color: activeViewGroup?.color || tokens.colors.text.secondary, cursor: 'pointer', fontSize: 11 }}>
        <div style={{ width: 8, height: 8, borderRadius: 2, background: activeViewGroup?.color || tokens.colors.accent.cyan }} />
        {activeViewGroup?.name || 'ViewGroup'}
        <ChevronDown size={10} />
      </button>
      
      <Separator height={16} margin={8} subtle />
      
      {/* Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Link2 size={12} style={{ color: tokens.colors.text.muted }} />
        <span style={{ fontSize: 10, color: tokens.colors.text.muted }}>Links:</span>
        {linkTypes.map(link => (
          <IconButton
            key={link.id}
            icon={link.icon}
            size={11}
            buttonSize={22}
            title={link.label + (link.linkedTo ? ': ' + link.linkedTo : '')}
            onClick={() => onToggleLink(link.id)}
            color={link.linkedTo ? tokens.colors.accent.cyan : undefined}
            active={!!link.linkedTo}
          />
        ))}
      </div>
      
      <Separator height={16} margin={8} subtle />
      
      {/* VR */}
      <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: tokens.radius.md, border: '1px solid ' + tokens.colors.accent.teal + '40', background: tokens.colors.accent.teal + '10', color: tokens.colors.accent.teal, cursor: 'pointer', fontSize: 11 }}>
        🥽 VR
      </button>
    </div>
  );
}

// =============================================================================
// MAIN DEMO
// =============================================================================

export default function ComprehensiveCanvasDemo() {
  // Room state
  const [viewingRoomId, setViewingRoomId] = useState('r1');
  const [voiceRoomId, setVoiceRoomId] = useState('r1');
  const [isMuted, setIsMuted] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(3);
  
  // Workspace state
  const [workspaces, setWorkspaces] = useState(MOCK_WORKSPACES);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('ws1');
  const [mode, setMode] = useState('tile');
  const [currentBreakoutId, setCurrentBreakoutId] = useState(null);
  
  // Popout state
  const [popouts, setPopouts] = useState(MOCK_POPOUTS);
  const [focusedPopoutId, setFocusedPopoutId] = useState(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [gridSnapEnabled, setGridSnapEnabled] = useState(false);
  const [popoutPositions, setPopoutPositions] = useState({ pop1: { x: 50, y: 80 }, pop2: { x: 380, y: 120 } });
  const [popoutSizes, setPopoutSizes] = useState({ pop1: { width: 300, height: 220 }, pop2: { width: 280, height: 200 } });
  
  // View state
  const [activeViewId, setActiveViewId] = useState('v1');
  const [links, setLinks] = useState({ camera: 'Sagittal', filters: null, widgets: null, cursors: '3D Vol' });
  
  const canvasRef = useRef(null);
  const [containerBounds, setContainerBounds] = useState(null);
  
  useEffect(() => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setContainerBounds({ width: rect.width, height: rect.height });
    }
  }, [mode]);
  
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const focusedPopout = popouts.find(p => p.id === focusedPopoutId);
  const activeView = MOCK_VIEWS.find(v => v.id === activeViewId);
  const activeViewGroup = MOCK_VIEW_GROUPS[0];
  
  // Handlers
  const handleCreateWorkspace = (type) => {
    const newId = 'ws' + (workspaces.length + 1);
    const typeNames = { empty: 'New Workspace', subset: 'New Subset', scratch: 'Scratch Pad' };
    const typeMap = { empty: 'workspace', subset: 'subset', scratch: 'scratch' };
    setWorkspaces([...workspaces, { id: newId, name: typeNames[type], type: typeMap[type], isOpen: true, hasChanges: false, hasBreakout: false, breakoutUsers: 0 }]);
    setActiveWorkspaceId(newId);
  };
  
  const handleOpenWorkspace = (id) => {
    setWorkspaces(workspaces.map(w => w.id === id ? { ...w, isOpen: true } : w));
    setActiveWorkspaceId(id);
  };
  
  const handleCloseWorkspace = (id) => {
    setWorkspaces(workspaces.map(w => w.id === id ? { ...w, isOpen: false } : w));
    if (activeWorkspaceId === id) {
      const remaining = workspaces.filter(w => w.isOpen && w.id !== id);
      if (remaining.length > 0) setActiveWorkspaceId(remaining[0].id);
    }
  };
  
  const handleRenameWorkspace = (id, name) => setWorkspaces(workspaces.map(w => w.id === id ? { ...w, name } : w));
  
  const handleReorderWorkspaces = (draggedId, targetId) => {
    const newWorkspaces = [...workspaces];
    const draggedIndex = newWorkspaces.findIndex(w => w.id === draggedId);
    const targetIndex = newWorkspaces.findIndex(w => w.id === targetId);
    const [dragged] = newWorkspaces.splice(draggedIndex, 1);
    newWorkspaces.splice(targetIndex, 0, dragged);
    setWorkspaces(newWorkspaces);
  };
  
  const handlePopoutPositionChange = (id, pos) => setPopoutPositions(prev => ({ ...prev, [id]: pos }));
  const handlePopoutSizeChange = (id, size) => setPopoutSizes(prev => ({ ...prev, [id]: size }));
  const handlePopoutClose = (id) => { setPopouts(popouts.filter(p => p.id !== id)); if (focusedPopoutId === id) setFocusedPopoutId(null); };
  
  const toggleLink = (id) => setLinks(prev => ({ ...prev, [id]: prev[id] ? null : 'Linked View' }));
  
  return (
    <div style={{ minHeight: '100vh', background: tokens.colors.bg.primary, color: tokens.colors.text.primary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* App Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', height: 48, background: tokens.colors.bg.secondary, borderBottom: '1px solid ' + tokens.colors.border.default }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>CIA Web</span>
        <div style={{ flex: 1 }} />
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: tokens.colors.accent.purple, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>U</div>
      </div>
      
      {/* Room Header */}
      <RoomHeader
        rooms={MOCK_ROOMS}
        viewingRoomId={viewingRoomId}
        voiceRoomId={voiceRoomId}
        onSelectRoom={setViewingRoomId}
        onJoinVoice={setVoiceRoomId}
        onLeaveVoice={() => setVoiceRoomId(null)}
        onSwitchVoice={(id) => { setVoiceRoomId(id); setViewingRoomId(id); }}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted(!isMuted)}
        unreadMessages={unreadMessages}
        onOpenChat={() => setUnreadMessages(0)}
      />
      
      {/* Canvas Tabs Bar */}
      <CanvasTabsBar
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onSelectWorkspace={setActiveWorkspaceId}
        onCreateWorkspace={handleCreateWorkspace}
        onOpenWorkspace={handleOpenWorkspace}
        onCloseWorkspace={handleCloseWorkspace}
        onRenameWorkspace={handleRenameWorkspace}
        onReorderWorkspaces={handleReorderWorkspaces}
        mode={mode}
        onModeChange={setMode}
        popouts={popouts}
        onPopoutBringToFront={setFocusedPopoutId}
        onPopoutClose={handlePopoutClose}
        onPopoutTileAll={() => console.log('Tile all')}
        onPopoutCloseAll={() => { setPopouts([]); setFocusedPopoutId(null); }}
        snapEnabled={snapEnabled}
        onToggleSnap={() => setSnapEnabled(!snapEnabled)}
        gridSnapEnabled={gridSnapEnabled}
        onToggleGridSnap={() => setGridSnapEnabled(!gridSnapEnabled)}
        currentBreakoutId={currentBreakoutId}
        onJoinBreakout={setCurrentBreakoutId}
        onLeaveBreakout={() => setCurrentBreakoutId(null)}
      />
      
      {/* Canvas Area */}
      <div ref={canvasRef} onClick={() => setFocusedPopoutId(null)} style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 220px)', position: 'relative' }}>
        {mode === 'tile' ? (
          <TiledCanvasView workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} onSelectWorkspace={setActiveWorkspaceId} onCloseWorkspace={handleCloseWorkspace} currentBreakoutId={currentBreakoutId} onJoinBreakout={setCurrentBreakoutId} />
        ) : (
          <TabbedCanvasView workspace={activeWorkspace} onClose={() => handleCloseWorkspace(activeWorkspaceId)} currentBreakoutId={currentBreakoutId} onJoinBreakout={setCurrentBreakoutId} onLeaveBreakout={() => setCurrentBreakoutId(null)} />
        )}
        
        {/* Popout Windows */}
        {popouts.map(popout => (
          <PopoutWindow
            key={popout.id}
            popout={popout}
            position={popoutPositions[popout.id] || { x: 100, y: 100 }}
            size={popoutSizes[popout.id] || { width: 300, height: 220 }}
            onPositionChange={(pos) => handlePopoutPositionChange(popout.id, pos)}
            onSizeChange={(size) => handlePopoutSizeChange(popout.id, size)}
            onClose={() => handlePopoutClose(popout.id)}
            isFocused={popout.id === focusedPopoutId}
            onFocus={() => setFocusedPopoutId(popout.id)}
            snapEnabled={snapEnabled}
            gridSnapEnabled={gridSnapEnabled}
            containerBounds={containerBounds}
          />
        ))}
      </div>
      
      {/* Footer 1 */}
      <InteractionFooter activeView={activeView} isPopoutFocused={!!focusedPopoutId} focusedPopout={focusedPopout} />
      
      {/* Footer 2 */}
      <ViewCanvasFooter activeViewGroup={activeViewGroup} links={links} onToggleLink={toggleLink} linksWidth={200} />
      
      {/* Instructions */}
      <div style={{ position: 'fixed', top: 160, right: 16, width: 300, background: tokens.colors.bg.elevated, border: '1px solid ' + tokens.colors.accent.blue + '30', borderRadius: tokens.radius.lg, padding: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', zIndex: 200, maxHeight: 'calc(100vh - 240px)', overflowY: 'auto' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: tokens.colors.accent.blue, marginBottom: 12, textTransform: 'uppercase' }}>Comprehensive Demo v3</div>
        <ul style={{ fontSize: 10, color: tokens.colors.text.secondary, margin: 0, paddingLeft: 14, lineHeight: 1.7 }}>
          <li><strong>Room tabs:</strong> Click to switch viewing room</li>
          <li><strong>Voice dropdown:</strong> Switch/leave room voice</li>
          <li><strong>Workspace tabs:</strong> Drag to reorder, double-click to rename</li>
          <li><strong>🎙️ on tabs:</strong> Workspace has voice breakout</li>
          <li><strong>Breakout manager:</strong> Join/leave workspace breakouts</li>
          <li><strong>Tile dividers:</strong> Drag to resize canvases</li>
          <li><strong>Popouts:</strong> Drag header to move, corner to resize</li>
          <li><strong>Snap settings:</strong> Edge/Grid snap in popout manager</li>
          <li><strong>Shift+drag:</strong> Temporarily disable snap</li>
          <li><strong>Footer 1:</strong> Locked when popout focused</li>
        </ul>
      </div>
    </div>
  );
}
