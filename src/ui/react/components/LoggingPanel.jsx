// src/ui/react/components/LoggingPanel.jsx
// System Logs Display Component

import React, { useRef, useEffect } from 'react';
import { useLogging, LogType } from '../hooks/useLogging.js';

export function LoggingPanel() {
  const { logs, clearLogs } = useLogging();
  const logsEndRef = useRef(null);
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (isExpanded) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isExpanded]);

  const getLogStyle = (type) => {
    const styles = {
      [LogType.INFO]: { color: '#2196F3', emoji: 'ℹ️' },
      [LogType.SUCCESS]: { color: '#4CAF50', emoji: '✅' },
      [LogType.WARNING]: { color: '#FFA726', emoji: '⚠️' },
      [LogType.ERROR]: { color: '#f44336', emoji: '❌' },
      [LogType.PROGRESS]: { color: '#9C27B0', emoji: '⏳' }
    };
    return styles[type] || { color: '#999', emoji: '📋' };
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      left: '10px',
      width: isExpanded ? '400px' : '200px',
      maxHeight: isExpanded ? '300px' : '40px',
      backgroundColor: '#1a1a1a',
      border: '1px solid #333',
      borderRadius: '6px',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      zIndex: 900,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        backgroundColor: '#0a0a0a',
        borderBottom: isExpanded ? '1px solid #333' : 'none',
        cursor: 'pointer'
      }} onClick={() => setIsExpanded(!isExpanded)}>
        <div style={{
          fontSize: '12px',
          fontWeight: '600',
          color: '#aaa',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>📋 SYSTEM LOGS</span>
          <span style={{
            fontSize: '10px',
            backgroundColor: '#333',
            padding: '2px 6px',
            borderRadius: '3px'
          }}>
            {logs.length}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {logs.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearLogs();
              }}
              title="Clear logs"
              style={{
                background: 'none',
                border: '1px solid #666',
                borderRadius: '3px',
                padding: '4px 8px',
                color: '#999',
                fontSize: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#ff6666';
                e.currentTarget.style.color = '#ff6666';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#666';
                e.currentTarget.style.color = '#999';
              }}
            >
              Clear
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            style={{
              background: 'none',
              border: '1px solid #666',
              borderRadius: '3px',
              padding: '4px 8px',
              color: '#999',
              fontSize: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#4CAF50';
              e.currentTarget.style.color = '#4CAF50';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#666';
              e.currentTarget.style.color = '#999';
            }}
          >
            {isExpanded ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {/* Logs Content */}
      {isExpanded && (
        <div style={{
          padding: '8px 12px',
          maxHeight: '250px',
          overflowY: 'auto',
          fontSize: '11px',
          fontFamily: 'monospace',
          lineHeight: '1.6'
        }}>
          {logs.length === 0 ? (
            <div style={{ color: '#666', textAlign: 'center', padding: '20px 0' }}>
              No logs yet
            </div>
          ) : (
            logs.map((log) => {
              const style = getLogStyle(log.type);
              return (
                <div
                  key={log.id}
                  style={{
                    marginBottom: '6px',
                    paddingBottom: '6px',
                    borderBottom: '1px solid #222'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'start',
                    gap: '6px'
                  }}>
                    <span>{style.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: style.color, marginBottom: '2px' }}>
                        {log.message}
                      </div>
                      <div style={{ color: '#555', fontSize: '10px' }}>
                        {log.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={logsEndRef} />
        </div>
      )}
    </div>
  );
}