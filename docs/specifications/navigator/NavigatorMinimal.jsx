import React, { useState } from 'react';

const colors = {
  bg: '#0a0a0f',
  bgSecondary: '#12121a',
  bgTertiary: '#1a1a24',
  border: 'rgba(255,255,255,0.08)',
  text: '#ffffff',
  textMuted: 'rgba(255,255,255,0.5)',
  blue: '#3b82f6',
  purple: '#a855f7',
  green: '#22c55e',
  amber: '#f59e0b',
  pink: '#ec4899',
  cyan: '#22d3ee',
  teal: '#14b8a6',
};

const VIEWS = [
  { id: '1', name: 'Axial Slice', color: colors.purple, position: 'A1' },
  { id: '2', name: 'Sagittal', color: colors.blue, position: 'B1' },
  { id: '3', name: '3D Volume', color: colors.green, position: 'A2' },
  { id: '4', name: 'Coronal', color: colors.amber, position: null },
];

export default function NavigatorMinimal() {
  const [tab, setTab] = useState('minimap');
  const [selectedId, setSelectedId] = useState(null);

  return (
    <div style={{
      width: 320,
      background: colors.bg,
      borderRadius: 8,
      fontFamily: 'system-ui, sans-serif',
      color: colors.text,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: 12,
        borderBottom: '1px solid ' + colors.border,
        fontWeight: 600,
        fontSize: 14,
      }}>
        🧭 Navigator V5
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid ' + colors.border }}>
        {['minimap', 'views', 'bookmarks'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: 10,
              border: 'none',
              borderBottom: tab === t ? '2px solid ' + colors.blue : '2px solid transparent',
              background: tab === t ? colors.bgSecondary : 'transparent',
              color: tab === t ? colors.blue : colors.textMuted,
              cursor: 'pointer',
              fontSize: 11,
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: 12 }}>
        {tab === 'minimap' && (
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr 1fr',
              gap: 4,
              marginBottom: 12,
            }}>
              {[...Array(16)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    aspectRatio: '1',
                    background: colors.bgTertiary,
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9,
                    color: colors.textMuted,
                  }}
                >
                  {String.fromCharCode(65 + (i % 4))}{Math.floor(i / 4) + 1}
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: colors.textMuted }}>
              Click cells to navigate. D-pad controls below.
            </p>
          </div>
        )}

        {tab === 'views' && (
          <div>
            <div style={{ marginBottom: 8, fontSize: 10, color: colors.green, fontWeight: 600 }}>
              ● ON CANVAS ({VIEWS.filter(v => v.position).length})
            </div>
            {VIEWS.filter(v => v.position).map(v => (
              <div
                key={v.id}
                onClick={() => setSelectedId(v.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  marginBottom: 4,
                  borderRadius: 6,
                  background: selectedId === v.id ? v.color + '20' : 'transparent',
                  borderLeft: '3px solid ' + (selectedId === v.id ? v.color : 'transparent'),
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  background: v.color + '30',
                  border: '2px solid ' + v.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                }}>▣</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{v.name}</div>
                </div>
                <span style={{
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: v.color + '30',
                  color: v.color,
                  fontSize: 10,
                  fontFamily: 'monospace',
                }}>{v.position}</span>
              </div>
            ))}

            <div style={{ marginTop: 16, marginBottom: 8, fontSize: 10, color: colors.textMuted, fontWeight: 600 }}>
              ○ NOT PLACED ({VIEWS.filter(v => !v.position).length})
            </div>
            {VIEWS.filter(v => !v.position).map(v => (
              <div
                key={v.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  opacity: 0.6,
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  background: v.color + '20',
                  border: '1px dashed ' + colors.border,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                }}>+</div>
                <span style={{ fontSize: 12, color: colors.textMuted }}>{v.name}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'bookmarks' && (
          <div>
            <div style={{ fontSize: 10, color: colors.textMuted, marginBottom: 8 }}>★ STARRED</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
              <span style={{ color: colors.amber }}>⭐</span>
              <span style={{ fontSize: 12 }}>Pre-surgery baseline</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
              <span style={{ color: colors.amber }}>⭐</span>
              <span style={{ fontSize: 12 }}>Tumor boundary review</span>
            </div>
            <button style={{
              marginTop: 16,
              width: '100%',
              padding: '10px 16px',
              borderRadius: 6,
              border: 'none',
              background: colors.amber,
              color: '#fff',
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
            }}>
              🔖 New Bookmark
            </button>
          </div>
        )}
      </div>

      {/* Footer info */}
      {selectedId && tab === 'views' && (
        <div style={{
          padding: 12,
          background: colors.bgSecondary,
          borderTop: '1px solid ' + colors.border,
          fontSize: 10,
          color: colors.textMuted,
        }}>
          Selected: {VIEWS.find(v => v.id === selectedId)?.name} → Use Instance Tools to adjust settings
        </div>
      )}
    </div>
  );
}
