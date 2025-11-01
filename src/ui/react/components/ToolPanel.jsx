import React from 'react';

export default function ToolPanel({ isOpen, title, icon, onClose, children }) {
    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: isOpen ? '60px' : '-350px', // Slide from left toolbar
                bottom: 0,
                width: '350px',
                backgroundColor: '#242424',
                borderRight: '1px solid #333',
                transition: 'left 0.3s ease',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: isOpen ? '4px 0 12px rgba(0,0,0,0.3)' : 'none'
            }}
        >
            {/* Panel Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '15px 20px',
                borderBottom: '1px solid #333',
                backgroundColor: '#2a2a2a'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <span style={{ fontSize: '20px' }}>{icon}</span>
                    <h3 style={{
                        margin: 0,
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#e0e0e0'
                    }}>
                        {title}
                    </h3>
                </div>

                <button
                    onClick={onClose}
                    style={{
                        background: 'none',
                        border: '1px solid #444',
                        color: '#999',
                        padding: '4px 8px',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '18px',
                        lineHeight: '1'
                    }}
                >
                    ×
                </button>
            </div>

            {/* Panel Content */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: '20px',
                boxSizing: 'border-box'
            }}>
                {children}
            </div>
        </div>
    );
}