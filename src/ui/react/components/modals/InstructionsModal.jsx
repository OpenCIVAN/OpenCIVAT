import React from 'react';

export function InstructionsModal({ isOpen, onClose, onDontShowAgain }) {
  if (!isOpen) return null;

  const handleDontShow = () => {
    localStorage.setItem('annotation_skip_instructions', 'true');
    onDontShowAgain();
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10001
    }}>
      <div style={{
        backgroundColor: '#2a2a2a',
        border: '2px solid #4CAF50',
        borderRadius: '8px',
        padding: '24px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            color: '#4CAF50'
          }}>
            📍 Annotation Mode
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#999',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0 8px'
            }}
          >
            ×
          </button>
        </div>

        {/* Instructions */}
        <div style={{
          fontSize: '14px',
          color: '#e0e0e0',
          lineHeight: '1.6',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px',
            backgroundColor: '#1a3a1a',
            borderRadius: '6px',
            marginBottom: '16px',
            border: '1px solid #4CAF50'
          }}>
            <div style={{ fontSize: '32px' }}>🎯</div>
            <div>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                Your cursor will change to a crosshair
              </div>
              <div style={{ fontSize: '12px', color: '#aaa' }}>
                Click anywhere on the 3D model to place your annotation
              </div>
            </div>
          </div>

          <div style={{
            fontSize: '13px',
            color: '#999',
            padding: '12px',
            backgroundColor: '#1a1a1a',
            borderRadius: '4px',
            border: '1px solid #333'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '8px' }}>💡 Tips:</div>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li style={{ marginBottom: '4px' }}>Rotate the model to find the best angle</li>
              <li style={{ marginBottom: '4px' }}>Click directly on the surface for precise placement</li>
              <li style={{ marginBottom: '4px' }}>Press ESC to cancel annotation mode</li>
            </ul>
          </div>
        </div>

        {/* Don't show again checkbox */}
        <div style={{
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px',
          backgroundColor: '#1a1a1a',
          borderRadius: '4px',
          border: '1px solid #333'
        }}>
          <input
            type="checkbox"
            id="dontShowInstructions"
            style={{ cursor: 'pointer' }}
            onChange={handleDontShow}
          />
          <label
            htmlFor="dontShowInstructions"
            style={{
              fontSize: '12px',
              color: '#999',
              cursor: 'pointer'
            }}
          >
            Don't show these instructions again
          </label>
        </div>

        {/* Button */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#2a4a2a',
            border: '2px solid #4CAF50',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#3a5a3a';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#2a4a2a';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          Got it! Let me place an annotation
        </button>

        {/* Keyboard shortcut hint */}
        <div style={{
          marginTop: '16px',
          fontSize: '11px',
          color: '#666',
          textAlign: 'center'
        }}>
          Press <kbd style={{ padding: '2px 6px', backgroundColor: '#333', borderRadius: '3px' }}>Esc</kbd> to close
        </div>
      </div>
    </div>
  );
}