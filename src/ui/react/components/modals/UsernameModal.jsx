// src/ui/react/components/UsernameModal.jsx
// Beautiful username prompt that matches the UI theme

import React, { useState, useEffect, useRef } from 'react';

export function UsernameModal({ onSubmit }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    // Auto-focus input when modal appears
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    const trimmed = username.trim();
    if (!trimmed) {
      setError('Please enter a name');
      return;
    }

    if (trimmed.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    if (trimmed.length > 20) {
      setError('Name must be 20 characters or less');
      return;
    }

    onSubmit(trimmed);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        backgroundColor: '#242424',
        borderRadius: '12px',
        padding: '40px',
        width: '90%',
        maxWidth: '400px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        border: '1px solid #333'
      }}>
        {/* Logo */}
        <div style={{
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '10px'
          }}>
            🎨
          </div>
          <h1 style={{
            margin: 0,
            fontSize: '24px',
            color: '#e0e0e0',
            fontWeight: '600'
          }}>
            CIA Web App
          </h1>
          <p style={{
            margin: '8px 0 0 0',
            fontSize: '14px',
            color: '#999'
          }}>
            Collaborative Immersive Analysis
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              color: '#aaa',
              fontWeight: '500'
            }}>
              Enter your display name
            </label>
            <input
              ref={inputRef}
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              onKeyPress={handleKeyPress}
              placeholder="e.g., Sarah Chen"
              maxLength={20}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '16px',
                backgroundColor: '#1a1a1a',
                border: error ? '2px solid #f44336' : '2px solid #333',
                borderRadius: '6px',
                color: '#e0e0e0',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                if (!error) {
                  e.target.style.borderColor = '#4CAF50';
                }
              }}
              onBlur={(e) => {
                if (!error) {
                  e.target.style.borderColor = '#333';
                }
              }}
            />
            {error && (
              <div style={{
                marginTop: '8px',
                fontSize: '13px',
                color: '#f44336'
              }}>
                {error}
              </div>
            )}
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '16px',
              fontWeight: '600',
              backgroundColor: '#4CAF50',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#45a049';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#4CAF50';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            Enter Web App
          </button>
        </form>

        {/* Hint */}
        <div style={{
          marginTop: '20px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#666'
        }}>
          Your teammates will see this name
        </div>
      </div>
    </div>
  );
}