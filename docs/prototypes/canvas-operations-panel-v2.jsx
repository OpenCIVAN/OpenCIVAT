import React, { useState, useCallback, useMemo } from 'react';

// =============================================================================
// DESIGN TOKENS
// =============================================================================
const tokens = {
  bgCanvas: '#06060a',
  bgPrimary: '#0a0a0f',
  bgSecondary: '#12121a',
  bgTertiary: '#1a1a24',
  bgPanel: 'rgba(12, 12, 18, 0.95)',
  borderSubtle: 'rgba(255,255,255,0.06)',
  borderDefault: 'rgba(255,255,255,0.1)',
  borderMedium: 'rgba(255,255,255,0.15)',
  textPrimary: '#f0f0f5',
  textSecondary: '#a0a0b0',
  textMuted: '#606070',
  accentBlue: '#60a5fa',
  accentGreen: '#4ade80',
  accentAmber: '#fbbf24',
  accentTeal: '#2dd4bf',
  accentPurple: '#a78bfa',
  accentRed: '#f87171',
  accentPink: '#f472b6',
};

// User colors - consistent per session
const USER_COLORS = {
  'You': tokens.accentTeal,
  'Alice': tokens.accentPink,
  'Bob': tokens.accentBlue,
  'Carol': tokens.accentPurple,
};

// =============================================================================
// ICONS
// =============================================================================
const Icon = ({ name, size = 16, color }) => {
  const paths = {
    home: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    check: <polyline points="20 6 9 17 4 12"/>,
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    undo: <><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></>,
    redo: <><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></>,
    save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>,
    clock: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    crosshair: <><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></>,
    navigation: <polygon points="3 11 22 2 13 21 11 13 3 11"/>,
    gitBranch: <><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></>,
    trash: <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,
    play: <polygon points="5 3 19 12 5 21 5 3"/>,
    chevronDown: <polyline points="6 9 12 15 18 9"/>,
    chevronRight: <polyline points="9 18 15 12 9 6"/>,
    chevronUp: <polyline points="18 15 12 9 6 15"/>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    merge: <><path d="M8 6L12 2L16 6"/><path d="M12 2v10"/><rect x="4" y="12" width="16" height="10" rx="2"/></>,
    move: <><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></>,
    swap: <><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></>,
    layers: <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
    filter: <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>,
    rotateCcw: <><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></>,
    list: <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>,
    grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>,
    sortDesc: <><path d="M11 5h10"/><path d="M11 9h7"/><path d="M11 13h4"/><path d="M3 17l3 3 3-3"/><path d="M6 18V4"/></>,
    sortAsc: <><path d="M11 5h4"/><path d="M11 9h7"/><path d="M11 13h10"/><path d="M3 7l3-3 3 3"/><path d="M6 6v14"/></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  };
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" 
      stroke={color || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
};

// =============================================================================
// OPERATION TYPE CONFIG
// =============================================================================
const OPERATION_TYPES = {
  MOVE: { icon: 'move', color: tokens.accentGreen, label: 'Move' },
  SWAP: { icon: 'swap', color: tokens.accentAmber, label: 'Swap' },
  MERGE: { icon: 'merge', color: tokens.accentPurple, label: 'Merge' },
  UNMERGE: { icon: 'layers', color: tokens.accentAmber, label: 'Unmerge' },
  PUSH: { icon: 'move', color: tokens.accentTeal, label: 'Push' },
  DELETE: { icon: 'trash', color: tokens.accentRed, label: 'Delete' },
  ADD: { icon: 'layers', color: tokens.accentBlue, label: 'Add' },
  RESIZE: { icon: 'layers', color: tokens.accentPurple, label: 'Resize' },
  REVERT: { icon: 'rotateCcw', color: tokens.accentAmber, label: 'Revert' },
};

// =============================================================================
// AUDIT VIEW MODES
// =============================================================================
const AUDIT_VIEW = {
  GROUPED: 'grouped',
  TIMELINE: 'timeline',
};

// =============================================================================
// DATE PRESETS
// =============================================================================
const DATE_PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 days', value: '7days' },
  { label: 'Last 30 days', value: '30days' },
  { label: 'All time', value: 'all' },
  { label: 'Custom...', value: 'custom' },
];

// =============================================================================
// TAB BUTTON
// =============================================================================
const TabButton = ({ icon, label, active, onClick, badge }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '8px 12px', borderRadius: 6,
      background: active ? `${tokens.accentBlue}15` : 'transparent',
      border: `1px solid ${active ? tokens.accentBlue + '40' : 'transparent'}`,
      color: active ? tokens.accentBlue : tokens.textMuted,
      cursor: 'pointer', fontSize: 11, fontWeight: 500,
      transition: 'all 0.15s ease',
      position: 'relative',
    }}
  >
    <Icon name={icon} size={14} />
    <span>{label}</span>
    {badge > 0 && (
      <span style={{
        position: 'absolute', top: -4, right: -4,
        minWidth: 16, height: 16, borderRadius: 8,
        background: tokens.accentRed, color: '#fff',
        fontSize: 9, fontWeight: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 4px',
      }}>
        {badge}
      </span>
    )}
  </button>
);

// =============================================================================
// TOGGLE BUTTON GROUP
// =============================================================================
const ToggleButtonGroup = ({ options, value, onChange, size = 'sm' }) => (
  <div style={{
    display: 'flex',
    background: tokens.bgTertiary,
    borderRadius: 4,
    padding: 2,
  }}>
    {options.map(opt => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        title={opt.title}
        style={{
          padding: size === 'sm' ? '4px 8px' : '6px 12px',
          borderRadius: 3,
          border: 'none',
          background: value === opt.value ? tokens.bgSecondary : 'transparent',
          color: value === opt.value ? tokens.textPrimary : tokens.textMuted,
          fontSize: 10,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {opt.icon && <Icon name={opt.icon} size={12} />}
        {opt.label}
      </button>
    ))}
  </div>
);

// =============================================================================
// MULTI-SELECT DROPDOWN
// =============================================================================
const MultiSelectDropdown = ({ label, options, selected, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedCount = selected.length;
  const allSelected = selectedCount === options.length;
  
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 10px', borderRadius: 4,
          background: tokens.bgTertiary,
          border: `1px solid ${selectedCount > 0 && !allSelected ? tokens.accentBlue : tokens.borderSubtle}`,
          color: tokens.textSecondary,
          fontSize: 11, cursor: 'pointer',
        }}
      >
        <span>{label}</span>
        {selectedCount > 0 && !allSelected && (
          <span style={{
            background: tokens.accentBlue,
            color: '#fff',
            borderRadius: 3,
            padding: '1px 5px',
            fontSize: 9,
            fontWeight: 600,
          }}>
            {selectedCount}
          </span>
        )}
        <Icon name="chevronDown" size={12} />
      </button>
      
      {isOpen && (
        <>
          <div 
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
            onClick={() => setIsOpen(false)}
          />
          <div style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 4,
            background: tokens.bgSecondary,
            border: `1px solid ${tokens.borderDefault}`,
            borderRadius: 6,
            padding: 4,
            minWidth: 150,
            zIndex: 100,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}>
            {options.map(opt => {
              const isSelected = selected.includes(opt.value);
              const config = OPERATION_TYPES[opt.value];
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    if (isSelected) {
                      onChange(selected.filter(v => v !== opt.value));
                    } else {
                      onChange([...selected, opt.value]);
                    }
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '6px 8px', borderRadius: 4,
                    background: isSelected ? `${tokens.accentBlue}15` : 'transparent',
                    border: 'none',
                    color: tokens.textPrimary,
                    fontSize: 11, cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 14, height: 14, borderRadius: 3,
                    border: `2px solid ${isSelected ? tokens.accentBlue : tokens.borderMedium}`,
                    background: isSelected ? tokens.accentBlue : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isSelected && <Icon name="check" size={8} color="#fff" />}
                  </div>
                  {config && (
                    <div style={{
                      width: 16, height: 16, borderRadius: 3,
                      background: `${config.color}20`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name={config.icon} size={10} color={config.color} />
                    </div>
                  )}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

// =============================================================================
// DATE RANGE PICKER
// =============================================================================
const DateRangePicker = ({ preset, customRange, onPresetChange, onCustomChange }) => {
  const [showCustom, setShowCustom] = useState(false);
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <select
        value={preset}
        onChange={(e) => {
          const val = e.target.value;
          if (val === 'custom') {
            setShowCustom(true);
          } else {
            setShowCustom(false);
          }
          onPresetChange(val);
        }}
        style={{
          padding: '6px 8px', borderRadius: 4,
          background: tokens.bgTertiary, border: `1px solid ${tokens.borderSubtle}`,
          color: tokens.textPrimary, fontSize: 11,
        }}
      >
        {DATE_PRESETS.map(p => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>
      
      {showCustom && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            type="date"
            value={customRange?.start || ''}
            onChange={(e) => onCustomChange({ ...customRange, start: e.target.value })}
            style={{
              padding: '4px 6px', borderRadius: 4,
              background: tokens.bgTertiary, border: `1px solid ${tokens.borderSubtle}`,
              color: tokens.textPrimary, fontSize: 10,
            }}
          />
          <span style={{ color: tokens.textMuted, fontSize: 10 }}>to</span>
          <input
            type="date"
            value={customRange?.end || ''}
            onChange={(e) => onCustomChange({ ...customRange, end: e.target.value })}
            style={{
              padding: '4px 6px', borderRadius: 4,
              background: tokens.bgTertiary, border: `1px solid ${tokens.borderSubtle}`,
              color: tokens.textPrimary, fontSize: 10,
            }}
          />
        </div>
      )}
    </div>
  );
};

// =============================================================================
// OPERATION ROW (for flat timeline)
// =============================================================================
const OperationRow = ({ operation, userColor, onRevert, isReverted, showUser = true }) => {
  const config = OPERATION_TYPES[operation.type] || OPERATION_TYPES.MOVE;
  
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 10px',
      background: isReverted ? `${tokens.bgTertiary}80` : tokens.bgTertiary,
      borderRadius: 6,
      borderLeft: `3px solid ${userColor}`,
      opacity: isReverted ? 0.6 : 1,
    }}>
      {/* Operation icon */}
      <div style={{
        width: 22, height: 22, borderRadius: 4,
        background: `${config.color}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon name={config.icon} size={11} color={config.color} />
      </div>
      
      {/* Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          fontSize: 11, 
          color: isReverted ? tokens.textMuted : tokens.textPrimary, 
          fontWeight: 500,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          textDecoration: isReverted ? 'line-through' : 'none',
        }}>
          {operation.detail}
        </div>
      </div>
      
      {/* User name (if showing) */}
      {showUser && operation.user && (
        <span style={{ 
          fontSize: 10, 
          color: userColor,
          fontWeight: 500,
          flexShrink: 0,
        }}>
          {operation.user}
        </span>
      )}
      
      {/* Timestamp */}
      <span style={{ 
        fontSize: 9, 
        color: tokens.textMuted,
        flexShrink: 0,
        minWidth: 24,
        textAlign: 'right',
      }}>
        {operation.timeAgo}
      </span>
      
      {/* Revert button or Reverted badge */}
      {isReverted ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '3px 6px', borderRadius: 4,
          background: `${tokens.accentGreen}15`,
          color: tokens.accentGreen,
          fontSize: 9,
          fontWeight: 500,
        }}>
          <Icon name="check" size={10} />
          Reverted
        </div>
      ) : (
        <button
          onClick={onRevert}
          title="Revert this operation"
          style={{
            width: 22, height: 22, borderRadius: 4,
            background: 'transparent', 
            border: `1px solid ${tokens.borderSubtle}`,
            color: tokens.textMuted, 
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon name="x" size={11} />
        </button>
      )}
    </div>
  );
};

// =============================================================================
// TRANSACTION BOX (for flat timeline)
// =============================================================================
const TransactionBox = ({ transaction, userColor, onUndoAll, onRevertOperation, revertedOps }) => {
  const opCount = transaction.operations.length;
  const revertedCount = transaction.operations.filter((_, i) => 
    revertedOps.has(`${transaction.id}-${i}`)
  ).length;
  const isFullyReverted = revertedCount === opCount;
  const isPartiallyReverted = revertedCount > 0 && revertedCount < opCount;
  
  return (
    <div style={{
      background: tokens.bgSecondary,
      border: `1px dashed ${isFullyReverted ? tokens.accentGreen + '40' : tokens.borderSubtle}`,
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      {/* Transaction header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 10px',
        borderBottom: `1px solid ${tokens.borderSubtle}`,
        background: tokens.bgTertiary,
      }}>
        {/* User indicator */}
        <div style={{
          width: 20, height: 20, borderRadius: '50%',
          background: `${userColor}30`,
          border: `2px solid ${userColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 600, color: userColor,
        }}>
          {transaction.user[0]}
        </div>
        
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 10, color: tokens.textSecondary }}>
            Transaction by <span style={{ color: userColor, fontWeight: 500 }}>{transaction.user}</span>
            {' • '}{opCount} op{opCount !== 1 ? 's' : ''}
          </span>
        </div>
        
        {/* Status badges */}
        {isFullyReverted && (
          <span style={{
            padding: '2px 6px', borderRadius: 4,
            background: `${tokens.accentGreen}15`,
            color: tokens.accentGreen,
            fontSize: 9, fontWeight: 500,
          }}>
            REVERTED
          </span>
        )}
        {isPartiallyReverted && (
          <span style={{
            padding: '2px 6px', borderRadius: 4,
            background: `${tokens.accentAmber}15`,
            color: tokens.accentAmber,
            fontSize: 9, fontWeight: 500,
          }}>
            PARTIAL
          </span>
        )}
        
        {/* Undo All button */}
        {!isFullyReverted && (
          <button
            onClick={onUndoAll}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 8px', borderRadius: 4,
              background: `${tokens.accentRed}15`, 
              border: `1px solid ${tokens.accentRed}30`,
              color: tokens.accentRed, 
              fontSize: 10, 
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Icon name="rotateCcw" size={10} />
            Undo All
          </button>
        )}
      </div>
      
      {/* Operations */}
      <div style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {transaction.operations.map((op, i) => {
          const opId = `${transaction.id}-${i}`;
          const isReverted = revertedOps.has(opId);
          return (
            <OperationRow
              key={i}
              operation={op}
              userColor={userColor}
              isReverted={isReverted}
              showUser={false}
              onRevert={() => onRevertOperation(opId)}
            />
          );
        })}
      </div>
    </div>
  );
};

// =============================================================================
// SINGLE OPERATION BOX (for single ops in flat timeline)
// =============================================================================
const SingleOperationBox = ({ operation, userColor, onRevert, isReverted }) => (
  <div style={{
    background: tokens.bgSecondary,
    border: `1px dashed ${isReverted ? tokens.accentGreen + '40' : tokens.borderSubtle}`,
    borderRadius: 8,
    padding: 6,
  }}>
    <OperationRow
      operation={operation}
      userColor={userColor}
      isReverted={isReverted}
      showUser={true}
      onRevert={onRevert}
    />
  </div>
);

// =============================================================================
// TIME SEGMENT HEADER
// =============================================================================
const TimeSegmentHeader = ({ label, count, isExpanded, onToggle, isSticky }) => (
  <button
    onClick={onToggle}
    style={{
      display: 'flex', alignItems: 'center', gap: 8,
      width: '100%',
      padding: '8px 12px',
      background: isSticky ? tokens.bgPanel : tokens.bgSecondary,
      border: 'none',
      borderBottom: `1px solid ${tokens.borderSubtle}`,
      cursor: 'pointer',
      position: isSticky ? 'sticky' : 'relative',
      top: isSticky ? 0 : 'auto',
      zIndex: isSticky ? 10 : 1,
    }}
  >
    <Icon 
      name={isExpanded ? 'chevronDown' : 'chevronRight'} 
      size={12} 
      color={tokens.textMuted} 
    />
    <span style={{ 
      fontSize: 11, 
      fontWeight: 600, 
      color: tokens.textSecondary,
      flex: 1,
      textAlign: 'left',
    }}>
      {label}
    </span>
    <span style={{
      fontSize: 10,
      color: tokens.textMuted,
      background: tokens.bgTertiary,
      padding: '2px 8px',
      borderRadius: 10,
    }}>
      {count}
    </span>
  </button>
);

// =============================================================================
// AUDIT LOG TAB - GROUPED VIEW
// =============================================================================
const AuditLogGroupedView = ({ transactions, onUndoTransaction, userFilter }) => {
  const [expandedTx, setExpandedTx] = useState(new Set([0])); // First one expanded by default
  
  const filteredTransactions = userFilter 
    ? transactions.filter(tx => tx.user === userFilter)
    : transactions;
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {filteredTransactions.map((tx, i) => (
        <TransactionGroup
          key={tx.id || i}
          transaction={tx}
          expanded={expandedTx.has(i)}
          onExpandToggle={() => {
            setExpandedTx(prev => {
              const next = new Set(prev);
              if (next.has(i)) next.delete(i);
              else next.add(i);
              return next;
            });
          }}
          onUndoTransaction={() => onUndoTransaction(i)}
        />
      ))}
    </div>
  );
};

// =============================================================================
// TRANSACTION GROUP (for grouped view)
// =============================================================================
const TransactionGroup = ({ transaction, onUndoTransaction, onExpandToggle, expanded }) => {
  const opCount = transaction.operations.length;
  const userColor = USER_COLORS[transaction.user] || tokens.accentBlue;
  
  return (
    <div style={{
      background: tokens.bgSecondary,
      border: `1px solid ${tokens.borderSubtle}`,
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <button
        onClick={onExpandToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 12px', background: 'transparent', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <Icon name={expanded ? 'chevronDown' : 'chevronRight'} size={14} color={tokens.textMuted} />
        <div style={{
          width: 24, height: 24, borderRadius: '50%',
          background: `${userColor}30`,
          border: `2px solid ${userColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 600, color: userColor,
        }}>
          {transaction.user[0]}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: tokens.textPrimary, fontWeight: 500 }}>
            {transaction.user} • {opCount} operation{opCount !== 1 ? 's' : ''}
          </div>
          <div style={{ fontSize: 9, color: tokens.textMuted }}>
            {transaction.timestamp}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onUndoTransaction(); }}
          title="Undo entire transaction"
          style={{
            padding: '4px 8px', borderRadius: 4,
            background: `${tokens.accentRed}15`, border: `1px solid ${tokens.accentRed}30`,
            color: tokens.accentRed, fontSize: 10, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <Icon name="rotateCcw" size={10} />
          Undo All
        </button>
      </button>
      
      {/* Expanded operations */}
      {expanded && (
        <div style={{ padding: '0 8px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {transaction.operations.map((op, i) => (
            <OperationRow 
              key={i} 
              operation={op} 
              userColor={userColor}
              showUser={false}
              onRevert={() => console.log('Revert', i)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// AUDIT LOG TAB - TIMELINE VIEW
// =============================================================================
const AuditLogTimelineView = ({ 
  transactions, 
  sortOrder,
  userFilter, 
  typeFilter,
  revertedOps,
  onRevertOperation,
  onUndoTransaction,
}) => {
  const [expandedSegments, setExpandedSegments] = useState(new Set(['today', 'yesterday']));
  
  // Group transactions by time segment
  const segments = useMemo(() => {
    let filtered = transactions;
    
    // Apply user filter
    if (userFilter) {
      filtered = filtered.filter(tx => tx.user === userFilter);
    }
    
    // Apply type filter
    if (typeFilter.length > 0 && typeFilter.length < Object.keys(OPERATION_TYPES).length) {
      filtered = filtered.map(tx => ({
        ...tx,
        operations: tx.operations.filter(op => typeFilter.includes(op.type))
      })).filter(tx => tx.operations.length > 0);
    }
    
    // Sort
    if (sortOrder === 'asc') {
      filtered = [...filtered].reverse();
    }
    
    // Group by segment (simplified for demo)
    const today = filtered.filter(tx => tx.segment === 'today');
    const yesterday = filtered.filter(tx => tx.segment === 'yesterday');
    const thisWeek = filtered.filter(tx => tx.segment === 'thisWeek');
    const earlier = filtered.filter(tx => tx.segment === 'earlier');
    
    return [
      { id: 'today', label: 'Today', items: today },
      { id: 'yesterday', label: 'Yesterday', items: yesterday },
      { id: 'thisWeek', label: 'This Week', items: thisWeek },
      { id: 'earlier', label: 'Earlier', items: earlier },
    ].filter(s => s.items.length > 0);
  }, [transactions, userFilter, typeFilter, sortOrder]);
  
  const toggleSegment = (segmentId) => {
    setExpandedSegments(prev => {
      const next = new Set(prev);
      if (next.has(segmentId)) next.delete(segmentId);
      else next.add(segmentId);
      return next;
    });
  };
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {segments.map(segment => (
        <div key={segment.id}>
          <TimeSegmentHeader
            label={segment.label}
            count={segment.items.reduce((acc, tx) => acc + tx.operations.length, 0)}
            isExpanded={expandedSegments.has(segment.id)}
            onToggle={() => toggleSegment(segment.id)}
            isSticky={segment.id === 'today' || segment.id === 'yesterday'}
          />
          
          {expandedSegments.has(segment.id) && (
            <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {segment.items.map((tx, txIndex) => {
                const userColor = USER_COLORS[tx.user] || tokens.accentBlue;
                
                // Single operation = simple box
                if (tx.operations.length === 1) {
                  const op = tx.operations[0];
                  const opId = `${tx.id}-0`;
                  return (
                    <SingleOperationBox
                      key={tx.id}
                      operation={op}
                      userColor={userColor}
                      isReverted={revertedOps.has(opId)}
                      onRevert={() => onRevertOperation(opId, tx.id)}
                    />
                  );
                }
                
                // Multiple operations = transaction box
                return (
                  <TransactionBox
                    key={tx.id}
                    transaction={tx}
                    userColor={userColor}
                    revertedOps={revertedOps}
                    onUndoAll={() => onUndoTransaction(tx.id)}
                    onRevertOperation={(opId) => onRevertOperation(opId, tx.id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// =============================================================================
// AUDIT LOG TAB (Main Component)
// =============================================================================
const AuditLogTab = ({ transactions, users }) => {
  // View state
  const [viewMode, setViewMode] = useState(AUDIT_VIEW.TIMELINE);
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Filter state
  const [userFilter, setUserFilter] = useState(null);
  const [typeFilter, setTypeFilter] = useState(Object.keys(OPERATION_TYPES));
  const [datePreset, setDatePreset] = useState('all');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  
  // Revert tracking (non-destructive)
  const [revertedOps, setRevertedOps] = useState(new Set());
  
  const handleRevertOperation = (opId, txId) => {
    setRevertedOps(prev => {
      const next = new Set(prev);
      next.add(opId);
      return next;
    });
    console.log('Created revert operation for:', opId, 'in transaction:', txId);
  };
  
  const handleUndoTransaction = (txId) => {
    // Mark all ops in this transaction as reverted
    const tx = transactions.find(t => t.id === txId);
    if (tx) {
      setRevertedOps(prev => {
        const next = new Set(prev);
        tx.operations.forEach((_, i) => next.add(`${txId}-${i}`));
        return next;
      });
    }
    console.log('Created revert transaction for:', txId);
  };
  
  const operationTypeOptions = Object.entries(OPERATION_TYPES)
    .filter(([key]) => key !== 'REVERT')
    .map(([key, config]) => ({
      value: key,
      label: config.label,
    }));
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar Row 1: View toggle + Sort */}
      <div style={{
        padding: '8px 12px',
        borderBottom: `1px solid ${tokens.borderSubtle}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <ToggleButtonGroup
          options={[
            { value: AUDIT_VIEW.GROUPED, icon: 'grid', label: 'Grouped' },
            { value: AUDIT_VIEW.TIMELINE, icon: 'list', label: 'Timeline' },
          ]}
          value={viewMode}
          onChange={setViewMode}
        />
        
        <ToggleButtonGroup
          options={[
            { value: 'desc', icon: 'sortDesc', title: 'Newest first' },
            { value: 'asc', icon: 'sortAsc', title: 'Oldest first' },
          ]}
          value={sortOrder}
          onChange={setSortOrder}
        />
      </div>
      
      {/* Toolbar Row 2: Filters */}
      <div style={{
        padding: '8px 12px',
        borderBottom: `1px solid ${tokens.borderSubtle}`,
        display: 'flex', alignItems: 'center', gap: 8,
        flexWrap: 'wrap',
      }}>
        {/* User filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icon name="user" size={12} color={tokens.textMuted} />
          <select
            value={userFilter || ''}
            onChange={(e) => setUserFilter(e.target.value || null)}
            style={{
              padding: '6px 8px', borderRadius: 4,
              background: tokens.bgTertiary, border: `1px solid ${tokens.borderSubtle}`,
              color: tokens.textPrimary, fontSize: 11,
            }}
          >
            <option value="">All users</option>
            {users.map(u => (
              <option key={u.name} value={u.name}>{u.name}</option>
            ))}
          </select>
        </div>
        
        {/* Operation type filter */}
        <MultiSelectDropdown
          label="Type"
          options={operationTypeOptions}
          selected={typeFilter}
          onChange={setTypeFilter}
        />
        
        {/* Date filter */}
        <DateRangePicker
          preset={datePreset}
          customRange={customDateRange}
          onPresetChange={setDatePreset}
          onCustomChange={setCustomDateRange}
        />
      </div>
      
      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: viewMode === AUDIT_VIEW.GROUPED ? 8 : 0 }}>
        {viewMode === AUDIT_VIEW.GROUPED ? (
          <AuditLogGroupedView
            transactions={transactions}
            userFilter={userFilter}
            onUndoTransaction={(i) => console.log('Undo transaction', i)}
          />
        ) : (
          <AuditLogTimelineView
            transactions={transactions}
            sortOrder={sortOrder}
            userFilter={userFilter}
            typeFilter={typeFilter}
            revertedOps={revertedOps}
            onRevertOperation={handleRevertOperation}
            onUndoTransaction={handleUndoTransaction}
          />
        )}
      </div>
    </div>
  );
};

// =============================================================================
// OPERATION ITEM (for transaction tab)
// =============================================================================
const OperationItem = ({ operation, isSelected, onToggle, onUndo, showCheckbox, showUser }) => {
  const config = OPERATION_TYPES[operation.type] || OPERATION_TYPES.MOVE;
  
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 10px', borderRadius: 6,
      background: isSelected ? `${tokens.accentBlue}10` : tokens.bgTertiary,
      border: `1px solid ${isSelected ? tokens.accentBlue + '30' : 'transparent'}`,
      transition: 'all 0.1s ease',
    }}>
      {showCheckbox && (
        <button
          onClick={onToggle}
          style={{
            width: 16, height: 16, borderRadius: 3,
            border: `2px solid ${isSelected ? tokens.accentBlue : tokens.borderMedium}`,
            background: isSelected ? tokens.accentBlue : 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {isSelected && <Icon name="check" size={10} color="#fff" />}
        </button>
      )}
      
      <div style={{
        width: 24, height: 24, borderRadius: 4,
        background: `${config.color}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon name={config.icon} size={12} color={config.color} />
      </div>
      
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          fontSize: 11, color: tokens.textPrimary, fontWeight: 500,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {operation.detail}
        </div>
        <div style={{ fontSize: 9, color: tokens.textMuted, display: 'flex', gap: 8 }}>
          <span style={{ color: config.color }}>{config.label}</span>
          {showUser && operation.user && (
            <span>by {operation.user}</span>
          )}
          {operation.timestamp && (
            <span>{operation.timestamp}</span>
          )}
        </div>
      </div>
      
      {onUndo && (
        <button
          onClick={onUndo}
          title="Undo this operation"
          style={{
            width: 24, height: 24, borderRadius: 4,
            background: 'transparent', border: `1px solid ${tokens.borderSubtle}`,
            color: tokens.textMuted, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon name="undo" size={12} />
        </button>
      )}
    </div>
  );
};

// =============================================================================
// CURRENT TRANSACTION TAB
// =============================================================================
const CurrentTransactionTab = ({ operations, selectedOps, onToggleOp, onApply, onCancel, hasChanges }) => {
  const selectedCount = selectedOps.filter(Boolean).length;
  
  if (!hasChanges) {
    return (
      <div style={{ 
        display: 'flex', flexDirection: 'column', 
        alignItems: 'center', justifyContent: 'center',
        height: '100%', gap: 12, padding: 24,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: tokens.bgTertiary,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="check" size={24} color={tokens.accentGreen} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: tokens.textPrimary, fontWeight: 500 }}>
            No pending changes
          </div>
          <div style={{ fontSize: 11, color: tokens.textMuted, marginTop: 4 }}>
            Drag views in the minimap to make changes
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '8px 12px',
        borderBottom: `1px solid ${tokens.borderSubtle}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11, color: tokens.textSecondary }}>
          {selectedCount} of {operations.length} selected
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => {/* Select all */}}
            style={{
              padding: '4px 8px', borderRadius: 4, fontSize: 10,
              background: 'transparent', border: `1px solid ${tokens.borderSubtle}`,
              color: tokens.textMuted, cursor: 'pointer',
            }}
          >
            Select All
          </button>
          <button
            onClick={() => {/* Deselect all */}}
            style={{
              padding: '4px 8px', borderRadius: 4, fontSize: 10,
              background: 'transparent', border: `1px solid ${tokens.borderSubtle}`,
              color: tokens.textMuted, cursor: 'pointer',
            }}
          >
            Clear
          </button>
        </div>
      </div>
      
      {/* Operations list */}
      <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {operations.map((op, i) => (
            <OperationItem
              key={i}
              operation={op}
              isSelected={selectedOps[i]}
              onToggle={() => onToggleOp(i)}
              showCheckbox={true}
              showUser={false}
            />
          ))}
        </div>
      </div>
      
      {/* Action buttons */}
      <div style={{
        padding: 12, borderTop: `1px solid ${tokens.borderSubtle}`,
        display: 'flex', gap: 8,
      }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1, padding: '10px 16px', borderRadius: 6,
            background: 'transparent', border: `1px solid ${tokens.borderSubtle}`,
            color: tokens.textSecondary, fontSize: 12, fontWeight: 500, cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          onClick={onApply}
          disabled={selectedCount === 0}
          style={{
            flex: 1, padding: '10px 16px', borderRadius: 6,
            background: selectedCount > 0 ? tokens.accentGreen : tokens.bgTertiary,
            border: 'none',
            color: selectedCount > 0 ? '#fff' : tokens.textMuted,
            fontSize: 12, fontWeight: 600,
            cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
          }}
        >
          Apply {selectedCount} Changes
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// USER ITEM
// =============================================================================
const UserItem = ({ user, onGoToViewport, onGoToCursor, onFollow, isFollowing }) => {
  const userColor = USER_COLORS[user.name] || tokens.accentBlue;
  
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px', borderRadius: 8,
      background: tokens.bgTertiary,
      border: `1px solid ${isFollowing ? userColor + '50' : 'transparent'}`,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: `${userColor}30`,
        border: `2px solid ${userColor}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 600, color: userColor,
        position: 'relative',
      }}>
        {user.name[0]}
        <div style={{
          position: 'absolute', bottom: -2, right: -2,
          width: 10, height: 10, borderRadius: '50%',
          background: user.online ? tokens.accentGreen : tokens.textMuted,
          border: `2px solid ${tokens.bgTertiary}`,
        }} />
      </div>
      
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: tokens.textPrimary, fontWeight: 500 }}>
          {user.name}
        </div>
        <div style={{ fontSize: 10, color: tokens.textMuted }}>
          {user.editing ? (
            <span style={{ color: tokens.accentAmber }}>✏️ Editing canvas</span>
          ) : (
            `Viewing (${user.viewport.col}, ${user.viewport.row})`
          )}
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          onClick={onGoToViewport}
          title="Go to their viewport"
          style={{
            width: 28, height: 28, borderRadius: 4,
            background: 'transparent', border: `1px solid ${tokens.borderSubtle}`,
            color: tokens.textMuted, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="navigation" size={12} />
        </button>
        <button
          onClick={onGoToCursor}
          title="Go to their cursor"
          style={{
            width: 28, height: 28, borderRadius: 4,
            background: 'transparent', border: `1px solid ${tokens.borderSubtle}`,
            color: tokens.textMuted, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="crosshair" size={12} />
        </button>
        <button
          onClick={onFollow}
          title={isFollowing ? "Stop following" : "Follow this user"}
          style={{
            width: 28, height: 28, borderRadius: 4,
            background: isFollowing ? `${userColor}20` : 'transparent',
            border: `1px solid ${isFollowing ? userColor : tokens.borderSubtle}`,
            color: isFollowing ? userColor : tokens.textMuted,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="eye" size={12} />
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// USERS TAB
// =============================================================================
const UsersTab = ({ users, followingUser, setFollowingUser, onGoToViewport, onGoToCursor }) => (
  <div style={{ padding: 8 }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {users.map((user, i) => (
        <UserItem
          key={i}
          user={user}
          isFollowing={followingUser === user.name}
          onGoToViewport={() => onGoToViewport(user)}
          onGoToCursor={() => onGoToCursor(user)}
          onFollow={() => setFollowingUser(followingUser === user.name ? null : user.name)}
        />
      ))}
    </div>
  </div>
);

// =============================================================================
// SAVE POINT ITEM
// =============================================================================
const SavePointItem = ({ savePoint, onRevert, onDelete, isCurrent }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', borderRadius: 8,
    background: isCurrent ? `${tokens.accentGreen}10` : tokens.bgTertiary,
    border: `1px solid ${isCurrent ? tokens.accentGreen + '30' : 'transparent'}`,
  }}>
    <div style={{
      width: 32, height: 32, borderRadius: 6,
      background: isCurrent ? `${tokens.accentGreen}20` : `${tokens.accentBlue}20`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon name={isCurrent ? 'check' : 'save'} size={14} color={isCurrent ? tokens.accentGreen : tokens.accentBlue} />
    </div>
    
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 12, color: tokens.textPrimary, fontWeight: 500 }}>
        {savePoint.name}
        {isCurrent && <span style={{ color: tokens.accentGreen, marginLeft: 8 }}>(Current)</span>}
      </div>
      <div style={{ fontSize: 10, color: tokens.textMuted }}>
        {savePoint.timestamp} • {savePoint.user} • {savePoint.viewCount} views
      </div>
    </div>
    
    <div style={{ display: 'flex', gap: 4 }}>
      {!isCurrent && (
        <button
          onClick={onRevert}
          title="Revert to this save point"
          style={{
            padding: '4px 8px', borderRadius: 4,
            background: `${tokens.accentAmber}15`, border: `1px solid ${tokens.accentAmber}30`,
            color: tokens.accentAmber, fontSize: 10, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <Icon name="rotateCcw" size={10} />
          Revert
        </button>
      )}
      <button
        onClick={onDelete}
        title="Delete save point"
        style={{
          width: 28, height: 28, borderRadius: 4,
          background: 'transparent', border: `1px solid ${tokens.borderSubtle}`,
          color: tokens.textMuted, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon name="trash" size={12} />
      </button>
    </div>
  </div>
);

// =============================================================================
// SAVE POINTS TAB
// =============================================================================
const SavePointsTab = ({ savePoints, currentSavePoint, onCreateSavePoint, onRevert, onDelete }) => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
    <div style={{ padding: '12px 12px 8px' }}>
      <button
        onClick={onCreateSavePoint}
        style={{
          width: '100%', padding: '10px 16px', borderRadius: 6,
          background: `${tokens.accentBlue}15`, border: `1px solid ${tokens.accentBlue}40`,
          color: tokens.accentBlue, fontSize: 12, fontWeight: 500, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        <Icon name="save" size={14} />
        Create Save Point
      </button>
    </div>
    
    <div style={{ flex: 1, overflow: 'auto', padding: '0 8px 8px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {savePoints.map((sp, i) => (
          <SavePointItem
            key={i}
            savePoint={sp}
            isCurrent={currentSavePoint === i}
            onRevert={() => onRevert(i)}
            onDelete={() => onDelete(i)}
          />
        ))}
      </div>
    </div>
  </div>
);

// =============================================================================
// MAIN PANEL COMPONENT
// =============================================================================
const CanvasOperationsPanel = ({ onClose, onMinimize }) => {
  const [activeTab, setActiveTab] = useState('audit');
  
  // Demo data
  const [pendingOps, setPendingOps] = useState([
    { type: 'MOVE', detail: 'Moved "Brain Scan" to (2, 1)', timestamp: 'Just now' },
    { type: 'SWAP', detail: 'Swapped (1, 1) ↔ (3, 2)', timestamp: 'Just now' },
  ]);
  const [selectedOps, setSelectedOps] = useState([true, true]);
  
  const transactions = [
    {
      id: 'tx1',
      user: 'Alice',
      timestamp: '2 minutes ago',
      segment: 'today',
      operations: [
        { type: 'MOVE', detail: 'Moved "Brain Scan" to (2, 1)', timeAgo: '2m' },
        { type: 'MOVE', detail: 'Moved "CT Data" to (2, 2)', timeAgo: '2m' },
      ],
    },
    {
      id: 'tx2',
      user: 'Bob',
      timestamp: '5 minutes ago',
      segment: 'today',
      operations: [
        { type: 'SWAP', detail: 'Swapped (1, 1) ↔ (3, 1)', timeAgo: '5m' },
      ],
    },
    {
      id: 'tx3',
      user: 'Alice',
      timestamp: '8 minutes ago',
      segment: 'today',
      operations: [
        { type: 'MERGE', detail: 'Merged cells (1, 1)-(1, 3)', timeAgo: '8m' },
        { type: 'PUSH', detail: 'Pushed "Scan A" → down', timeAgo: '8m' },
        { type: 'PUSH', detail: 'Pushed "Scan B" → down', timeAgo: '8m' },
      ],
    },
    {
      id: 'tx4',
      user: 'You',
      timestamp: 'Yesterday 3:45 PM',
      segment: 'yesterday',
      operations: [
        { type: 'RESIZE', detail: 'Resized canvas to 4×4', timeAgo: '1d' },
      ],
    },
    {
      id: 'tx5',
      user: 'Carol',
      timestamp: 'Yesterday 2:30 PM',
      segment: 'yesterday',
      operations: [
        { type: 'ADD', detail: 'Added "MRI Scan" to (1, 1)', timeAgo: '1d' },
        { type: 'ADD', detail: 'Added "X-Ray" to (1, 2)', timeAgo: '1d' },
      ],
    },
    {
      id: 'tx6',
      user: 'Bob',
      timestamp: 'Dec 20',
      segment: 'thisWeek',
      operations: [
        { type: 'DELETE', detail: 'Deleted "Old Scan" from (2, 2)', timeAgo: '5d' },
      ],
    },
  ];
  
  const users = [
    { name: 'You', online: true, editing: false, viewport: { row: 1, col: 1 }, cursor: { row: 1, col: 2 } },
    { name: 'Alice', online: true, editing: true, viewport: { row: 2, col: 1 }, cursor: { row: 2, col: 2 } },
    { name: 'Bob', online: true, editing: false, viewport: { row: 1, col: 3 }, cursor: { row: 1, col: 3 } },
    { name: 'Carol', online: false, editing: false, viewport: { row: 1, col: 1 }, cursor: { row: 1, col: 1 } },
  ];
  
  const [followingUser, setFollowingUser] = useState(null);
  const [userFilter, setUserFilter] = useState(null);
  
  const [savePoints, setSavePoints] = useState([
    { name: 'Before reorganization', timestamp: 'Today 10:30 AM', user: 'You', viewCount: 6 },
    { name: 'Initial layout', timestamp: 'Yesterday 9:00 AM', user: 'Alice', viewCount: 4 },
  ]);
  const [currentSavePoint, setCurrentSavePoint] = useState(null);
  
  const hasChanges = pendingOps.length > 0;
  
  return (
    <div style={{
      width: 380, height: 520,
      display: 'flex', flexDirection: 'column',
      background: tokens.bgPanel,
      border: `1px solid ${tokens.borderDefault}`,
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${tokens.borderSubtle}`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Icon name="layers" size={16} color={tokens.accentPurple} />
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: tokens.textPrimary }}>
          Canvas Operations
        </span>
        {hasChanges && (
          <div style={{
            padding: '2px 8px', borderRadius: 4,
            background: `${tokens.accentAmber}20`,
            fontSize: 10, fontWeight: 600, color: tokens.accentAmber,
          }}>
            {pendingOps.length} pending
          </div>
        )}
        <button
          onClick={onMinimize}
          style={{
            width: 24, height: 24, borderRadius: 4,
            background: 'transparent', border: 'none',
            color: tokens.textMuted, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="chevronDown" size={14} />
        </button>
        <button
          onClick={onClose}
          style={{
            width: 24, height: 24, borderRadius: 4,
            background: 'transparent', border: 'none',
            color: tokens.textMuted, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="x" size={14} />
        </button>
      </div>
      
      {/* Tabs */}
      <div style={{
        padding: '8px 12px',
        borderBottom: `1px solid ${tokens.borderSubtle}`,
        display: 'flex', gap: 4,
        overflowX: 'auto',
      }}>
        <TabButton 
          icon="layers" label="Transaction" 
          active={activeTab === 'transaction'} 
          onClick={() => setActiveTab('transaction')}
          badge={hasChanges ? pendingOps.length : 0}
        />
        <TabButton 
          icon="clock" label="Audit Log" 
          active={activeTab === 'audit'} 
          onClick={() => setActiveTab('audit')}
        />
        <TabButton 
          icon="users" label="Users" 
          active={activeTab === 'users'} 
          onClick={() => setActiveTab('users')}
          badge={users.filter(u => u.online && u.name !== 'You').length}
        />
        <TabButton 
          icon="save" label="Save Points" 
          active={activeTab === 'savepoints'} 
          onClick={() => setActiveTab('savepoints')}
        />
      </div>
      
      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'transaction' && (
          <CurrentTransactionTab
            operations={pendingOps}
            selectedOps={selectedOps}
            onToggleOp={(i) => {
              setSelectedOps(prev => {
                const next = [...prev];
                next[i] = !next[i];
                return next;
              });
            }}
            onApply={() => {
              console.log('Apply selected operations');
              setPendingOps([]);
              setSelectedOps([]);
            }}
            onCancel={() => {
              console.log('Cancel transaction');
              setPendingOps([]);
              setSelectedOps([]);
            }}
            hasChanges={hasChanges}
          />
        )}
        
        {activeTab === 'audit' && (
          <AuditLogTab
            transactions={transactions}
            users={users}
          />
        )}
        
        {activeTab === 'users' && (
          <UsersTab
            users={users}
            followingUser={followingUser}
            setFollowingUser={setFollowingUser}
            onGoToViewport={(user) => console.log('Go to viewport', user)}
            onGoToCursor={(user) => console.log('Go to cursor', user)}
          />
        )}
        
        {activeTab === 'savepoints' && (
          <SavePointsTab
            savePoints={savePoints}
            currentSavePoint={currentSavePoint}
            onCreateSavePoint={() => {
              setSavePoints(prev => [{
                name: `Save point ${prev.length + 1}`,
                timestamp: 'Just now',
                user: 'You',
                viewCount: 8,
              }, ...prev]);
              setCurrentSavePoint(0);
            }}
            onRevert={(i) => {
              console.log('Revert to', i);
              setCurrentSavePoint(i);
            }}
            onDelete={(i) => {
              setSavePoints(prev => prev.filter((_, idx) => idx !== i));
            }}
          />
        )}
      </div>
    </div>
  );
};

// =============================================================================
// DEMO APP
// =============================================================================
export default function CanvasOperationsPanelDemo() {
  return (
    <div style={{
      minHeight: '100vh',
      background: tokens.bgCanvas,
      padding: 32,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      <div>
        <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600, color: tokens.textPrimary }}>
          Canvas Operations Panel v2
        </h1>
        <p style={{ margin: '0 0 24px', fontSize: 13, color: tokens.textMuted }}>
          Audit Log with Grouped &amp; Timeline views, non-destructive undo, transaction boxing.
        </p>
        
        <CanvasOperationsPanel 
          onClose={() => console.log('Close')}
          onMinimize={() => console.log('Minimize')}
        />
      </div>
      
      <style>{`
        button:hover:not(:disabled) { filter: brightness(1.1); }
        button:active:not(:disabled) { transform: scale(0.98); }
        * { box-sizing: border-box; }
        select { outline: none; }
        input[type="date"] { outline: none; color-scheme: dark; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${tokens.borderMedium}; border-radius: 3px; }
      `}</style>
    </div>
  );
}
