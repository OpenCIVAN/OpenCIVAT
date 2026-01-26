import React, { useState } from 'react';
import { 
  Eye, Mic, MicOff, ChevronDown, Plus, Users, MessageSquare,
  Phone, PhoneOff, Globe, User, Check, Pin,
  Volume2, Headphones, Layers, Layout, Split, X, Maximize2,
  Grid, Square, Copy
} from 'lucide-react';

// =============================================================================
// DESIGN TOKENS
// =============================================================================
const tokens = {
  colors: {
    bg: { 
      primary: '#0a0a0f', 
      secondary: '#12121a', 
      tertiary: '#1a1a24',
      elevated: '#1e1e2a',
    },
    border: { 
      subtle: 'rgba(255,255,255,0.06)', 
      default: 'rgba(255,255,255,0.1)',
    },
    text: { 
      primary: '#ffffff', 
      secondary: 'rgba(255,255,255,0.7)', 
      muted: 'rgba(255,255,255,0.4)',
    },
    accent: { 
      purple: '#a855f7', 
      blue: '#3b82f6', 
      cyan: '#22d3ee', 
      green: '#22c55e', 
      amber: '#f59e0b', 
      pink: '#ec4899', 
      red: '#ef4444',
    },
  },
  radius: { sm: 4, md: 6, lg: 8 },
};

// =============================================================================
// MOCK DATA
// =============================================================================
const MOCK_ROOMS = [
  { id: 'r1', name: 'Lab Meeting', color: tokens.colors.accent.purple, usersOnline: 5, usersInVoice: 3, type: 'main' },
  { id: 'r2', name: 'Analysis Session', color: tokens.colors.accent.blue, usersOnline: 2, usersInVoice: 2, type: 'main' },
  { id: 'r3', name: 'Personal', color: tokens.colors.accent.green, usersOnline: 1, usersInVoice: 0, type: 'personal' },
  { id: 'r4', name: 'Tumor Review', color: tokens.colors.accent.amber, usersOnline: 3, usersInVoice: 1, type: 'main' },
];

const MOCK_WORKSPACES = [
  { id: 'ws1', name: 'Main Analysis', usersViewing: 3, hasChanges: false, hasBreakout: true, breakoutUsers: 2 },
  { id: 'ws2', name: 'Tumor Regions', usersViewing: 1, hasChanges: true, hasBreakout: false, breakoutUsers: 0 },
  { id: 'ws3', name: 'Comparison', usersViewing: 0, hasChanges: false, hasBreakout: false, breakoutUsers: 0 },
];

const MOCK_BREAKOUTS = [
  { id: 'b1', name: 'Main Analysis', workspaceId: 'ws1', usersInVoice: 2 },
];

const MOCK_POPOUTS = [
  { id: 'p1', name: 'Axial View', color: tokens.colors.accent.cyan },
  { id: 'p2', name: '3D Volume', color: tokens.colors.accent.green },
];

// =============================================================================
// SHARED COMPONENTS
// =============================================================================

function Dropdown({ isOpen, onClose, trigger, children, align = 'left', width = 200 }) {
  return (
    <div style={{ position: 'relative' }}>
      {trigger}
      {isOpen && (
        <>
          <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
          <div style={{
            position: 'absolute',
            top: '100%',
            [align]: 0,
            marginTop: 4,
            width,
            background: tokens.colors.bg.elevated,
            border: '1px solid ' + tokens.colors.border.default,
            borderRadius: tokens.radius.lg,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            zIndex: 100,
            maxHeight: 360,
            overflowY: 'auto',
          }}>
            {children}
          </div>
        </>
      )}
    </div>
  );
}

function SectionLabel({ children, width, align = 'center' }) {
  return (
    <div style={{
      width,
      fontSize: 9,
      fontWeight: 600,
      color: tokens.colors.text.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      textAlign: align,
      whiteSpace: 'nowrap',
      padding: '0 8px',
    }}>
      {children}
    </div>
  );
}

function SectionDivider() {
  return (
    <div style={{
      width: 1,
      alignSelf: 'stretch',
      background: tokens.colors.border.subtle,
    }} />
  );
}

// =============================================================================
// ROOM HEADER
// =============================================================================

function RoomHeader({ 
  rooms, 
  viewingRoomId, 
  voiceRoomId,
  activeBreakoutId,
  breakouts,
  pinnedRoomIds,
  onSelectRoom, 
  onJoinVoice,
  onJoinBreakout,
  onLeaveVoice,
  onTogglePin,
  isMuted, 
  onToggleMute,
}) {
  const [showViewingDropdown, setShowViewingDropdown] = useState(false);
  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false);
  const [showJoinDropdown, setShowJoinDropdown] = useState(false);
  
  const viewingRoom = rooms.find(r => r.id === viewingRoomId);
  const voiceRoom = rooms.find(r => r.id === voiceRoomId);
  const pinnedRooms = rooms.filter(r => pinnedRoomIds.includes(r.id) && r.id !== viewingRoomId);
  const activeBreakout = breakouts.find(b => b.id === activeBreakoutId);
  
  const isInVoice = !!voiceRoomId || !!activeBreakoutId;
  const isInBreakout = !!activeBreakoutId;
  
  const mainRooms = rooms.filter(r => r.type === 'main');
  const personalRooms = rooms.filter(r => r.type === 'personal');
  
  const currentVoiceName = isInBreakout ? `⎇ ${activeBreakout?.name}` : voiceRoom?.name;
  const currentVoiceUsers = isInBreakout ? activeBreakout?.usersInVoice : voiceRoom?.usersInVoice;

  return (
    <div style={{ background: tokens.colors.bg.secondary, borderBottom: '1px solid ' + tokens.colors.border.default }}>
      {/* Section Labels Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        height: 18,
        padding: '0 16px',
        background: tokens.colors.bg.tertiary,
        borderBottom: '1px solid ' + tokens.colors.border.subtle,
      }}>
        <SectionLabel width={180} align="left">Room</SectionLabel>
        <SectionDivider />
        <SectionLabel width={160} align="left">Pinned</SectionLabel>
        <div style={{ flex: 1 }} />
        <SectionDivider />
        <SectionLabel width={260} align="center">Voice</SectionLabel>
        <SectionDivider />
        <SectionLabel width={40} align="center">Chat</SectionLabel>
      </div>
      
      {/* Content Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        height: 44,
        padding: '0 16px',
      }}>
        {/* ===== ROOM SECTION (Viewing + Presence) ===== */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 180 }}>
          <Dropdown
            isOpen={showViewingDropdown}
            onClose={() => setShowViewingDropdown(false)}
            width={240}
            trigger={
              <button
                onClick={() => setShowViewingDropdown(!showViewingDropdown)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  borderRadius: tokens.radius.md,
                  border: '1px solid ' + tokens.colors.border.subtle,
                  background: 'rgba(255,255,255,0.03)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ 
                  width: 20, 
                  height: 20, 
                  borderRadius: tokens.radius.sm, 
                  background: viewingRoom?.color + '30',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Eye size={12} style={{ color: viewingRoom?.color }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: tokens.colors.text.primary, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {viewingRoom?.name}
                </span>
                <ChevronDown size={12} style={{ color: tokens.colors.text.muted }} />
              </button>
            }
          >
            <div style={{ padding: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: tokens.colors.accent.blue, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Globe size={10} />
                Project Rooms
              </div>
              {mainRooms.map(room => {
                const isViewing = room.id === viewingRoomId;
                const isPinned = pinnedRoomIds.includes(room.id);
                const isVoice = room.id === voiceRoomId;
                return (
                  <div key={room.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px', borderRadius: tokens.radius.md, background: isViewing ? tokens.colors.accent.cyan + '15' : 'transparent' }}>
                    <button
                      onClick={() => { onSelectRoom(room.id); setShowViewingDropdown(false); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, padding: '6px', background: 'transparent', border: 'none', borderRadius: tokens.radius.md, cursor: 'pointer', color: tokens.colors.text.secondary, fontSize: 12 }}
                    >
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: room.color }} />
                      <span style={{ flex: 1, textAlign: 'left' }}>{room.name}</span>
                      {isViewing && <Check size={12} style={{ color: tokens.colors.accent.cyan }} />}
                      {isVoice && <Mic size={10} style={{ color: tokens.colors.accent.green }} />}
                      <span style={{ fontSize: 10, color: tokens.colors.text.muted }}>{room.usersOnline}</span>
                    </button>
                    <button onClick={() => onTogglePin(room.id)} title={isPinned ? 'Unpin' : 'Pin to header'} style={{ width: 24, height: 24, borderRadius: tokens.radius.sm, border: 'none', background: 'transparent', color: isPinned ? tokens.colors.accent.amber : tokens.colors.text.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isPinned ? 1 : 0.4 }}>
                      <Pin size={10} style={{ transform: isPinned ? 'rotate(-45deg)' : 'none' }} />
                    </button>
                  </div>
                );
              })}
              
              {personalRooms.length > 0 && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 600, color: tokens.colors.accent.green, padding: '4px 8px', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <User size={10} />
                    Personal
                  </div>
                  {personalRooms.map(room => (
                    <button key={room.id} onClick={() => { onSelectRoom(room.id); setShowViewingDropdown(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 8px', background: room.id === viewingRoomId ? tokens.colors.accent.green + '15' : 'transparent', border: 'none', borderRadius: tokens.radius.md, cursor: 'pointer', color: tokens.colors.text.secondary, fontSize: 12 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: room.color }} />
                      <span style={{ flex: 1, textAlign: 'left' }}>{room.name}</span>
                      {room.id === viewingRoomId && <Check size={12} style={{ color: tokens.colors.accent.cyan }} />}
                    </button>
                  ))}
                </>
              )}
              
              <div style={{ borderTop: '1px solid ' + tokens.colors.border.subtle, margin: '8px 0' }} />
              <button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px', background: 'transparent', border: 'none', borderRadius: tokens.radius.md, cursor: 'pointer', color: tokens.colors.text.muted, fontSize: 12 }}>
                <Plus size={12} />
                Create Room
              </button>
            </div>
          </Dropdown>
          
          {/* Presence - RIGHT NEXT to viewing room */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 4,
            padding: '4px 8px',
            borderRadius: tokens.radius.sm,
            background: 'rgba(255,255,255,0.03)',
          }}>
            <Users size={12} style={{ color: tokens.colors.text.muted }} />
            <span style={{ fontSize: 11, color: tokens.colors.text.secondary, fontWeight: 500 }}>
              {viewingRoom?.usersOnline}
            </span>
          </div>
        </div>
        
        <SectionDivider />
        
        {/* ===== PINNED SECTION ===== */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: 160, paddingLeft: 8 }}>
          {pinnedRooms.length > 0 ? (
            <>
              {pinnedRooms.map(room => {
                const isVoice = room.id === voiceRoomId;
                return (
                  <button
                    key={room.id}
                    onClick={() => onSelectRoom(room.id)}
                    title={room.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 8px',
                      borderRadius: tokens.radius.sm,
                      border: 'none',
                      background: 'rgba(255,255,255,0.04)',
                      color: tokens.colors.text.muted,
                      cursor: 'pointer',
                      fontSize: 11,
                    }}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: room.color }} />
                    <span style={{ maxWidth: 50, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {room.name}
                    </span>
                    {isVoice && <Mic size={9} style={{ color: tokens.colors.accent.green }} />}
                  </button>
                );
              })}
            </>
          ) : (
            <span style={{ fontSize: 10, color: tokens.colors.text.muted, fontStyle: 'italic' }}>
              No pinned rooms
            </span>
          )}
        </div>
        
        {/* ===== SPACER ===== */}
        <div style={{ flex: 1 }} />
        
        <SectionDivider />
        
        {/* ===== VOICE SECTION ===== */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 260, justifyContent: 'center' }}>
          {isInVoice ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 6px',
              borderRadius: tokens.radius.lg,
              background: isInBreakout ? tokens.colors.accent.purple + '10' : tokens.colors.accent.green + '10',
              border: '1px solid ' + (isInBreakout ? tokens.colors.accent.purple : tokens.colors.accent.green) + '30',
            }}>
              <Dropdown
                isOpen={showVoiceDropdown}
                onClose={() => setShowVoiceDropdown(false)}
                align="right"
                width={260}
                trigger={
                  <button
                    onClick={() => setShowVoiceDropdown(!showVoiceDropdown)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 8px',
                      borderRadius: tokens.radius.md,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: isInBreakout ? tokens.colors.accent.purple : tokens.colors.accent.green,
                    }}
                  >
                    {isInBreakout ? <Split size={14} /> : <Headphones size={14} />}
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 8, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {isInBreakout ? 'Breakout' : 'Voice'}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 500, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {currentVoiceName}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, opacity: 0.7 }}>({currentVoiceUsers})</span>
                    <ChevronDown size={12} />
                  </button>
                }
              >
                <div style={{ padding: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: tokens.colors.accent.green, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Headphones size={10} />
                    Room Voice
                  </div>
                  <button
                    onClick={() => { onJoinVoice(viewingRoomId); setShowVoiceDropdown(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px',
                      background: voiceRoomId === viewingRoomId && !isInBreakout ? tokens.colors.accent.green + '15' : 'transparent',
                      border: 'none', borderRadius: tokens.radius.md, cursor: 'pointer', color: tokens.colors.text.secondary, fontSize: 12,
                    }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: viewingRoom?.color }} />
                    <span style={{ flex: 1, textAlign: 'left' }}>{viewingRoom?.name}</span>
                    {voiceRoomId === viewingRoomId && !isInBreakout && <Check size={12} style={{ color: tokens.colors.accent.green }} />}
                    <span style={{ fontSize: 10, color: tokens.colors.accent.green }}>{viewingRoom?.usersInVoice} in voice</span>
                  </button>
                  
                  {breakouts.length > 0 && (
                    <>
                      <div style={{ fontSize: 10, fontWeight: 600, color: tokens.colors.accent.purple, padding: '4px 8px', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Split size={10} />
                        Workspace Breakouts
                      </div>
                      {breakouts.map(breakout => (
                        <button
                          key={breakout.id}
                          onClick={() => { onJoinBreakout(breakout.id); setShowVoiceDropdown(false); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px',
                            background: activeBreakoutId === breakout.id ? tokens.colors.accent.purple + '15' : 'transparent',
                            border: 'none', borderRadius: tokens.radius.md, cursor: 'pointer', color: tokens.colors.text.secondary, fontSize: 12,
                          }}
                        >
                          <Split size={12} style={{ color: tokens.colors.accent.purple }} />
                          <span style={{ flex: 1, textAlign: 'left' }}>⎇ {breakout.name}</span>
                          {activeBreakoutId === breakout.id && <Check size={12} style={{ color: tokens.colors.accent.purple }} />}
                          <span style={{ fontSize: 10, color: tokens.colors.accent.purple }}>{breakout.usersInVoice}</span>
                        </button>
                      ))}
                    </>
                  )}
                  
                  <div style={{ borderTop: '1px solid ' + tokens.colors.border.subtle, margin: '8px 0' }} />
                  <button onClick={() => { onLeaveVoice(); setShowVoiceDropdown(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px', background: 'transparent', border: 'none', borderRadius: tokens.radius.md, cursor: 'pointer', color: tokens.colors.accent.red, fontSize: 12 }}>
                    <PhoneOff size={12} />
                    Leave Voice
                  </button>
                </div>
              </Dropdown>
              
              <div style={{ width: 1, height: 20, background: tokens.colors.border.subtle, margin: '0 4px' }} />
              
              <button onClick={onToggleMute} title={isMuted ? 'Unmute' : 'Mute'} style={{ width: 28, height: 28, borderRadius: tokens.radius.md, border: 'none', background: isMuted ? tokens.colors.accent.red + '20' : 'transparent', color: isMuted ? tokens.colors.accent.red : isInBreakout ? tokens.colors.accent.purple : tokens.colors.accent.green, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
              </button>
              
              <button title="Deafen" style={{ width: 28, height: 28, borderRadius: tokens.radius.md, border: 'none', background: 'transparent', color: tokens.colors.text.secondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Volume2 size={14} />
              </button>
              
              <button onClick={onLeaveVoice} title="Leave Voice" style={{ width: 28, height: 28, borderRadius: tokens.radius.md, border: 'none', background: tokens.colors.accent.red + '15', color: tokens.colors.accent.red, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PhoneOff size={14} />
              </button>
            </div>
          ) : (
            <Dropdown
              isOpen={showJoinDropdown}
              onClose={() => setShowJoinDropdown(false)}
              align="right"
              width={240}
              trigger={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <button
                    onClick={() => onJoinVoice(viewingRoomId)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                      borderRadius: `${tokens.radius.md}px 0 0 ${tokens.radius.md}px`,
                      border: '1px solid ' + tokens.colors.border.subtle, borderRight: 'none',
                      background: 'transparent', color: tokens.colors.text.secondary, cursor: 'pointer', fontSize: 12,
                    }}
                  >
                    <Phone size={14} />
                    Join Voice
                  </button>
                  <button
                    onClick={() => setShowJoinDropdown(!showJoinDropdown)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 32,
                      borderRadius: `0 ${tokens.radius.md}px ${tokens.radius.md}px 0`,
                      border: '1px solid ' + tokens.colors.border.subtle,
                      background: showJoinDropdown ? 'rgba(255,255,255,0.05)' : 'transparent',
                      color: tokens.colors.text.muted, cursor: 'pointer',
                    }}
                  >
                    <ChevronDown size={12} />
                  </button>
                </div>
              }
            >
              <div style={{ padding: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: tokens.colors.text.muted, padding: '4px 8px', textTransform: 'uppercase' }}>Join Voice In</div>
                <button
                  onClick={() => { onJoinVoice(viewingRoomId); setShowJoinDropdown(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px',
                    background: tokens.colors.accent.cyan + '10', border: '1px solid ' + tokens.colors.accent.cyan + '30',
                    borderRadius: tokens.radius.md, cursor: 'pointer', color: tokens.colors.text.primary, fontSize: 12, marginBottom: 4,
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: viewingRoom?.color }} />
                  <span style={{ flex: 1, textAlign: 'left' }}>{viewingRoom?.name}</span>
                  <span style={{ fontSize: 9, color: tokens.colors.accent.cyan, background: tokens.colors.accent.cyan + '20', padding: '2px 6px', borderRadius: 4 }}>Current</span>
                </button>
                
                {breakouts.length > 0 && (
                  <>
                    <div style={{ fontSize: 9, color: tokens.colors.accent.purple, padding: '8px 8px 4px', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Split size={10} />
                      Active Breakouts
                    </div>
                    {breakouts.map(breakout => (
                      <button key={breakout.id} onClick={() => { onJoinBreakout(breakout.id); setShowJoinDropdown(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px', background: 'transparent', border: 'none', borderRadius: tokens.radius.md, cursor: 'pointer', color: tokens.colors.text.secondary, fontSize: 12 }}>
                        <Split size={12} style={{ color: tokens.colors.accent.purple }} />
                        <span style={{ flex: 1, textAlign: 'left' }}>⎇ {breakout.name}</span>
                        <span style={{ fontSize: 10, color: tokens.colors.accent.purple }}>{breakout.usersInVoice} active</span>
                      </button>
                    ))}
                  </>
                )}
                
                <div style={{ fontSize: 9, color: tokens.colors.text.muted, padding: '8px 8px 4px' }}>Other Rooms</div>
                {rooms.filter(r => r.id !== viewingRoomId && r.type !== 'personal').map(room => (
                  <button key={room.id} onClick={() => { onJoinVoice(room.id); setShowJoinDropdown(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px', background: 'transparent', border: 'none', borderRadius: tokens.radius.md, cursor: 'pointer', color: tokens.colors.text.muted, fontSize: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: room.color }} />
                    <span style={{ flex: 1, textAlign: 'left' }}>{room.name}</span>
                    {room.usersInVoice > 0 && <span style={{ fontSize: 10, color: tokens.colors.accent.green }}>{room.usersInVoice} in voice</span>}
                  </button>
                ))}
              </div>
            </Dropdown>
          )}
        </div>
        
        <SectionDivider />
        
        {/* ===== CHAT SECTION ===== */}
        <div style={{ width: 40, display: 'flex', justifyContent: 'center' }}>
          <button title="Room Chat" style={{ width: 32, height: 32, borderRadius: tokens.radius.md, border: 'none', background: 'transparent', color: tokens.colors.text.secondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <MessageSquare size={16} />
            <span style={{ position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: '50%', background: tokens.colors.accent.pink, border: '2px solid ' + tokens.colors.bg.secondary }} />
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// CANVAS TABS BAR - CLARIFIED
// =============================================================================

function CanvasTabsBar({ 
  workspaces, 
  activeWorkspaceId, 
  onSelectWorkspace,
  onCreateWorkspace,
  popouts,
  breakouts,
  canvasMode,
  onModeChange,
}) {
  const [showPopoutDropdown, setShowPopoutDropdown] = useState(false);
  const [showBreakoutDropdown, setShowBreakoutDropdown] = useState(false);
  
  const hasPopouts = popouts.length > 0;
  const hasBreakouts = breakouts.length > 0;
  
  return (
    <div style={{ background: tokens.colors.bg.tertiary, borderBottom: '1px solid ' + tokens.colors.border.subtle }}>
      {/* Section Labels */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        height: 18,
        padding: '0 16px',
        background: tokens.colors.bg.secondary,
        borderBottom: '1px solid ' + tokens.colors.border.subtle,
      }}>
        <SectionLabel align="left">Workspace</SectionLabel>
        <div style={{ flex: 1 }} />
        <SectionDivider />
        <SectionLabel width={70}>Mode</SectionLabel>
        {hasPopouts && (
          <>
            <SectionDivider />
            <SectionLabel width={60}>Popouts</SectionLabel>
          </>
        )}
        {hasBreakouts && (
          <>
            <SectionDivider />
            <SectionLabel width={80}>Breakouts</SectionLabel>
          </>
        )}
      </div>
      
      {/* Content */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        height: 40,
        padding: '0 16px',
        gap: 4,
      }}>
        {/* Workspace Tabs */}
        {workspaces.map(ws => {
          const isActive = ws.id === activeWorkspaceId;
          return (
            <button
              key={ws.id}
              onClick={() => onSelectWorkspace(ws.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: tokens.radius.md,
                border: isActive ? '1px solid ' + tokens.colors.border.default : '1px solid transparent',
                background: isActive ? tokens.colors.bg.secondary : 'transparent',
                color: isActive ? tokens.colors.text.primary : tokens.colors.text.secondary,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: isActive ? 500 : 400,
              }}
            >
              <Layers size={12} style={{ opacity: 0.5 }} />
              <span>{ws.name}</span>
              
              {ws.hasChanges && <div style={{ width: 6, height: 6, borderRadius: '50%', background: tokens.colors.accent.amber }} title="Unsaved changes" />}
              
              {ws.hasBreakout && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '2px 5px', borderRadius: 8, background: tokens.colors.accent.purple + '20' }} title="Has active breakout">
                  <Split size={9} style={{ color: tokens.colors.accent.purple }} />
                  <span style={{ fontSize: 9, color: tokens.colors.accent.purple }}>{ws.breakoutUsers}</span>
                </div>
              )}
              
              {ws.usersViewing > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '2px 5px', borderRadius: 8, background: tokens.colors.accent.cyan + '15' }} title="Users viewing this workspace">
                  <Users size={9} style={{ color: tokens.colors.accent.cyan }} />
                  <span style={{ fontSize: 9, color: tokens.colors.accent.cyan }}>{ws.usersViewing}</span>
                </div>
              )}
            </button>
          );
        })}
        
        {/* New Workspace Button - CLEARLY labeled */}
        <button
          onClick={onCreateWorkspace}
          title="New Workspace"
          style={{
            width: 28,
            height: 28,
            borderRadius: tokens.radius.md,
            border: '1px dashed ' + tokens.colors.border.subtle,
            background: 'transparent',
            color: tokens.colors.text.muted,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 4,
          }}
        >
          <Plus size={14} />
        </button>
        
        <div style={{ flex: 1 }} />
        
        <SectionDivider />
        
        {/* Mode Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px', background: tokens.colors.bg.secondary, borderRadius: tokens.radius.md, width: 70, justifyContent: 'center' }}>
          <button 
            onClick={() => onModeChange('tile')}
            title="Tile Mode"
            style={{ 
              width: 26, height: 24, borderRadius: tokens.radius.sm, border: 'none', 
              background: canvasMode === 'tile' ? tokens.colors.accent.cyan + '20' : 'transparent', 
              color: canvasMode === 'tile' ? tokens.colors.accent.cyan : tokens.colors.text.muted, 
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}
          >
            <Grid size={12} />
          </button>
          <button 
            onClick={() => onModeChange('tabs')}
            title="Tab Mode"
            style={{ 
              width: 26, height: 24, borderRadius: tokens.radius.sm, border: 'none', 
              background: canvasMode === 'tabs' ? tokens.colors.accent.cyan + '20' : 'transparent', 
              color: canvasMode === 'tabs' ? tokens.colors.accent.cyan : tokens.colors.text.muted, 
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}
          >
            <Layers size={12} />
          </button>
        </div>
        
        {/* Popout Manager */}
        {hasPopouts && (
          <>
            <SectionDivider />
            <Dropdown
              isOpen={showPopoutDropdown}
              onClose={() => setShowPopoutDropdown(false)}
              align="right"
              width={200}
              trigger={
                <button
                  onClick={() => setShowPopoutDropdown(!showPopoutDropdown)}
                  title="Manage Popouts"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 10px',
                    borderRadius: tokens.radius.md,
                    border: 'none',
                    background: tokens.colors.bg.secondary,
                    color: tokens.colors.text.secondary,
                    cursor: 'pointer',
                    fontSize: 11,
                    width: 60,
                    justifyContent: 'center',
                  }}
                >
                  <Copy size={12} />
                  <span>{popouts.length}</span>
                </button>
              }
            >
              <div style={{ padding: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: tokens.colors.text.muted, padding: '4px 8px', textTransform: 'uppercase' }}>
                  Floating Windows
                </div>
                {popouts.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: tokens.radius.md }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                    <span style={{ flex: 1, fontSize: 12, color: tokens.colors.text.secondary }}>{p.name}</span>
                    <button style={{ width: 20, height: 20, borderRadius: tokens.radius.sm, border: 'none', background: 'transparent', color: tokens.colors.text.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Maximize2 size={10} />
                    </button>
                    <button style={{ width: 20, height: 20, borderRadius: tokens.radius.sm, border: 'none', background: 'transparent', color: tokens.colors.text.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={10} />
                    </button>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid ' + tokens.colors.border.subtle, margin: '8px 0' }} />
                <button style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '6px 8px', background: 'transparent', border: 'none', borderRadius: tokens.radius.md, cursor: 'pointer', color: tokens.colors.text.muted, fontSize: 11 }}>
                  <Grid size={10} />
                  Tile All
                </button>
                <button style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '6px 8px', background: 'transparent', border: 'none', borderRadius: tokens.radius.md, cursor: 'pointer', color: tokens.colors.accent.red, fontSize: 11 }}>
                  <X size={10} />
                  Close All
                </button>
              </div>
            </Dropdown>
          </>
        )}
        
        {/* Breakout Manager */}
        {hasBreakouts && (
          <>
            <SectionDivider />
            <Dropdown
              isOpen={showBreakoutDropdown}
              onClose={() => setShowBreakoutDropdown(false)}
              align="right"
              width={220}
              trigger={
                <button
                  onClick={() => setShowBreakoutDropdown(!showBreakoutDropdown)}
                  title="Manage Breakouts"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 10px',
                    borderRadius: tokens.radius.md,
                    border: 'none',
                    background: tokens.colors.accent.purple + '15',
                    color: tokens.colors.accent.purple,
                    cursor: 'pointer',
                    fontSize: 11,
                    width: 80,
                    justifyContent: 'center',
                  }}
                >
                  <Split size={12} />
                  <span>{breakouts.length}</span>
                </button>
              }
            >
              <div style={{ padding: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: tokens.colors.accent.purple, padding: '4px 8px', textTransform: 'uppercase' }}>
                  Workspace Breakouts
                </div>
                {breakouts.map(b => (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px', borderRadius: tokens.radius.md, background: 'rgba(255,255,255,0.02)', marginBottom: 4 }}>
                    <Split size={12} style={{ color: tokens.colors.accent.purple }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: tokens.colors.text.secondary }}>⎇ {b.name}</div>
                      <div style={{ fontSize: 10, color: tokens.colors.text.muted }}>{b.usersInVoice} in voice</div>
                    </div>
                    <button style={{ padding: '4px 8px', borderRadius: tokens.radius.sm, border: 'none', background: tokens.colors.accent.purple + '20', color: tokens.colors.accent.purple, cursor: 'pointer', fontSize: 10 }}>
                      Join
                    </button>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid ' + tokens.colors.border.subtle, margin: '8px 0' }} />
                <button style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '6px 8px', background: 'transparent', border: 'none', borderRadius: tokens.radius.md, cursor: 'pointer', color: tokens.colors.accent.purple, fontSize: 11 }}>
                  <Plus size={10} />
                  Create Breakout for Current Workspace
                </button>
              </div>
            </Dropdown>
          </>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN DEMO
// =============================================================================

export default function ClarifiedLayoutDemo() {
  const [viewingRoomId, setViewingRoomId] = useState('r1');
  const [voiceRoomId, setVoiceRoomId] = useState('r1');
  const [activeBreakoutId, setActiveBreakoutId] = useState(null);
  const [breakouts, setBreakouts] = useState(MOCK_BREAKOUTS);
  const [pinnedRoomIds, setPinnedRoomIds] = useState(['r2', 'r4']);
  const [isMuted, setIsMuted] = useState(false);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('ws1');
  const [canvasMode, setCanvasMode] = useState('tile');
  const [popouts, setPopouts] = useState(MOCK_POPOUTS);
  
  const handleTogglePin = (roomId) => {
    if (pinnedRoomIds.includes(roomId)) {
      setPinnedRoomIds(pinnedRoomIds.filter(id => id !== roomId));
    } else if (pinnedRoomIds.length < 3) {
      setPinnedRoomIds([...pinnedRoomIds, roomId]);
    }
  };
  
  const handleJoinVoice = (roomId) => {
    setVoiceRoomId(roomId);
    setActiveBreakoutId(null);
  };
  
  const handleJoinBreakout = (breakoutId) => {
    setActiveBreakoutId(breakoutId);
    setVoiceRoomId(null);
  };
  
  const handleLeaveVoice = () => {
    setVoiceRoomId(null);
    setActiveBreakoutId(null);
  };
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: tokens.colors.bg.primary, 
      color: tokens.colors.text.primary,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Controls */}
      <div style={{ padding: 24, borderBottom: '1px solid ' + tokens.colors.border.subtle }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
          Clarified Section Layout
        </h1>
        <p style={{ fontSize: 12, color: tokens.colors.text.secondary, marginBottom: 16, maxWidth: 700 }}>
          <strong>Room Header:</strong> ROOM (with presence) | PINNED | VOICE | CHAT<br/>
          <strong>Workspace Bar:</strong> WORKSPACE tabs + [+] | MODE | POPOUTS | BREAKOUTS
        </p>
        
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: tokens.colors.text.secondary, cursor: 'pointer' }}>
            <input type="checkbox" checked={popouts.length > 0} onChange={() => setPopouts(popouts.length > 0 ? [] : MOCK_POPOUTS)} />
            Show Popouts section
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: tokens.colors.text.secondary, cursor: 'pointer' }}>
            <input type="checkbox" checked={breakouts.length > 0} onChange={() => setBreakouts(breakouts.length > 0 ? [] : MOCK_BREAKOUTS)} />
            Show Breakouts section
          </label>
        </div>
      </div>
      
      {/* Simulated App */}
      <div style={{ border: '2px solid ' + tokens.colors.accent.purple + '30', margin: 24, borderRadius: tokens.radius.lg, overflow: 'hidden' }}>
        {/* App Header */}
        <div style={{ height: 48, background: tokens.colors.bg.secondary, borderBottom: '1px solid ' + tokens.colors.border.default, display: 'flex', alignItems: 'center', padding: '0 16px' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>CIA Web</span>
          <div style={{ flex: 1 }} />
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: tokens.colors.accent.purple }} />
        </div>
        
        {/* Room Header */}
        <RoomHeader
          rooms={MOCK_ROOMS}
          viewingRoomId={viewingRoomId}
          voiceRoomId={voiceRoomId}
          activeBreakoutId={activeBreakoutId}
          breakouts={breakouts}
          pinnedRoomIds={pinnedRoomIds}
          onSelectRoom={setViewingRoomId}
          onJoinVoice={handleJoinVoice}
          onJoinBreakout={handleJoinBreakout}
          onLeaveVoice={handleLeaveVoice}
          onTogglePin={handleTogglePin}
          isMuted={isMuted}
          onToggleMute={() => setIsMuted(!isMuted)}
        />
        
        {/* Canvas Tabs Bar */}
        <CanvasTabsBar
          workspaces={MOCK_WORKSPACES}
          activeWorkspaceId={activeWorkspaceId}
          onSelectWorkspace={setActiveWorkspaceId}
          onCreateWorkspace={() => console.log('Create workspace')}
          popouts={popouts}
          breakouts={breakouts}
          canvasMode={canvasMode}
          onModeChange={setCanvasMode}
        />
        
        {/* Canvas Area */}
        <div style={{ height: 300, background: tokens.colors.bg.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: tokens.colors.text.muted }}>
            <Layers size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
            <div style={{ fontSize: 12 }}>Canvas Area ({canvasMode} mode)</div>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div style={{ padding: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Section Breakdown</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          <div style={{ padding: 12, background: tokens.colors.bg.secondary, borderRadius: tokens.radius.md }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: tokens.colors.accent.cyan, marginBottom: 8 }}>ROOM Header Sections</div>
            <table style={{ fontSize: 11, color: tokens.colors.text.secondary, width: '100%' }}>
              <tbody>
                <tr><td style={{ padding: '4px 0' }}><strong>ROOM</strong></td><td>Viewing dropdown + 👥 presence</td></tr>
                <tr><td style={{ padding: '4px 0' }}><strong>PINNED</strong></td><td>Quick-access room pills</td></tr>
                <tr><td style={{ padding: '4px 0' }}><strong>VOICE</strong></td><td>Channel + mute/deafen/leave</td></tr>
                <tr><td style={{ padding: '4px 0' }}><strong>CHAT</strong></td><td>Room chat shortcut</td></tr>
              </tbody>
            </table>
          </div>
          <div style={{ padding: 12, background: tokens.colors.bg.secondary, borderRadius: tokens.radius.md }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: tokens.colors.accent.cyan, marginBottom: 8 }}>WORKSPACE Bar Sections</div>
            <table style={{ fontSize: 11, color: tokens.colors.text.secondary, width: '100%' }}>
              <tbody>
                <tr><td style={{ padding: '4px 0' }}><strong>WORKSPACE</strong></td><td>Tabs + [+] for NEW workspace</td></tr>
                <tr><td style={{ padding: '4px 0' }}><strong>MODE</strong></td><td>Tile / Tabs toggle</td></tr>
                <tr><td style={{ padding: '4px 0' }}><strong>POPOUTS</strong></td><td>Floating window manager (if any)</td></tr>
                <tr><td style={{ padding: '4px 0' }}><strong>BREAKOUTS</strong></td><td>Voice breakout manager (if any)</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
