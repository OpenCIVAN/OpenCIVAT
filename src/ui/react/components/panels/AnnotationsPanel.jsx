// src/ui/react/components/panels/AnnotationsPanel.jsx
// Collaborative Annotation System

import React, { useState, useRef } from 'react';
import { useVTKFile } from '../../hooks/useVTKFile.js';
import { useVTKAnnotations } from '../../hooks/useVTKAnnotations.js';
import { getUserId } from '../../../../collaboration/userManagement.js';

export default function AnnotationsPanel() {
  const { isFileLoaded } = useVTKFile();
  const {
    annotations,
    createAnnotation,
    deleteAnnotation,
    selectAnnotation,
    selectedAnnotation
  } = useVTKAnnotations();

  const [annotationText, setAnnotationText] = useState('');
  const [annotationType, setAnnotationType] = useState('note');
  const [isCreating, setIsCreating] = useState(false);
  const textInputRef = useRef(null);

  const handleCreateAnnotation = () => {
    if (!annotationText.trim()) {
      alert('Please enter annotation text');
      return;
    }

    // For now, create annotation at a default position
    // TODO: Implement click-to-place mode
    const defaultPosition = { x: 0, y: 0, z: 0 };

    createAnnotation(defaultPosition, annotationText, annotationType);

    // Reset form
    setAnnotationText('');
    setIsCreating(false);
  };

  const handleDeleteAnnotation = (annotationId, annotation) => {
    if (annotation.userId !== getUserId()) {
      alert('You can only delete your own annotations');
      return;
    }

    if (confirm('Delete this annotation?')) {
      deleteAnnotation(annotationId);
    }
  };

  const myAnnotations = annotations.filter(a => a.userId === getUserId());
  const otherAnnotations = annotations.filter(a => a.userId !== getUserId());

  return (
    <div style={{ color: '#e0e0e0', padding: '4px' }}>
      {/* File Status */}
      {!isFileLoaded && (
        <div style={{
          padding: '12px',
          marginBottom: '16px',
          backgroundColor: '#3a1a1a',
          border: '1px solid #663333',
          borderRadius: '4px'
        }}>
          <div style={{ fontSize: '13px', color: '#ff6666' }}>
            ⚠️ Load a file first to add annotations
          </div>
        </div>
      )}

      {/* Summary */}
      <div style={{
        padding: '12px',
        marginBottom: '16px',
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: '4px',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ fontSize: '11px', color: '#999' }}>TOTAL</div>
          <div style={{ fontSize: '20px', fontWeight: '600' }}>
            {annotations.length}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#999' }}>MINE</div>
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#4CAF50' }}>
            {myAnnotations.length}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#999' }}>OTHERS</div>
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#2196F3' }}>
            {otherAnnotations.length}
          </div>
        </div>
      </div>

      {/* Create Annotation */}
      {!isCreating ? (
        <button
          onClick={() => {
            setIsCreating(true);
            setTimeout(() => textInputRef.current?.focus(), 100);
          }}
          disabled={!isFileLoaded}
          style={{
            width: '100%',
            padding: '14px',
            marginBottom: '16px',
            backgroundColor: '#2a4a2a',
            border: '2px solid #4CAF50',
            borderRadius: '6px',
            color: isFileLoaded ? '#fff' : '#666',
            fontSize: '14px',
            fontWeight: '600',
            cursor: isFileLoaded ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (isFileLoaded) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          ➕ New Annotation
        </button>
      ) : (
        <div style={{
          marginBottom: '16px',
          padding: '12px',
          backgroundColor: '#1a1a1a',
          border: '1px solid #4CAF50',
          borderRadius: '4px'
        }}>
          <div style={{
            fontSize: '13px',
            fontWeight: '600',
            marginBottom: '8px',
            color: '#aaa'
          }}>
            Create Annotation
          </div>

          {/* Type Selection */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: '#999', marginBottom: '6px' }}>
              TYPE
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { value: 'note', label: '📝 Note', color: '#4CAF50' },
                { value: 'warning', label: '⚠️ Warning', color: '#FFA726' },
                { value: 'info', label: 'ℹ️ Info', color: '#2196F3' },
                { value: 'measurement', label: '📐 Measurement', color: '#9C27B0' }
              ].map((type) => (
                <button
                  key={type.value}
                  onClick={() => setAnnotationType(type.value)}
                  style={{
                    padding: '6px 10px',
                    backgroundColor: annotationType === type.value ? type.color + '33' : '#0a0a0a',
                    border: `1px solid ${annotationType === type.value ? type.color : '#333'}`,
                    borderRadius: '3px',
                    color: '#e0e0e0',
                    fontSize: '11px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text Input */}
          <textarea
            ref={textInputRef}
            value={annotationText}
            onChange={(e) => setAnnotationText(e.target.value)}
            placeholder="Enter annotation text..."
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '8px',
              marginBottom: '12px',
              backgroundColor: '#0a0a0a',
              border: '1px solid #333',
              borderRadius: '3px',
              color: '#e0e0e0',
              fontSize: '13px',
              fontFamily: 'inherit',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleCreateAnnotation}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: '#2a4a2a',
                border: '1px solid #4CAF50',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Create
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setAnnotationText('');
              }}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: '#1a1a1a',
                border: '1px solid #666',
                borderRadius: '4px',
                color: '#999',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>

          {/* TODO: Add click-to-place mode */}
          <div style={{
            marginTop: '12px',
            fontSize: '11px',
            color: '#666',
            textAlign: 'center'
          }}>
            🚧 Click-to-place coming soon<br />
            Annotations currently placed at origin
          </div>
        </div>
      )}

      {/* My Annotations */}
      {myAnnotations.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            fontSize: '13px',
            fontWeight: '600',
            marginBottom: '8px',
            color: '#4CAF50'
          }}>
            My Annotations ({myAnnotations.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {myAnnotations.map((annotation) => (
              <div
                key={annotation.id}
                onClick={() => selectAnnotation(annotation.id)}
                style={{
                  padding: '10px',
                  backgroundColor: selectedAnnotation === annotation.id ? '#2a4a2a' : '#1a1a1a',
                  border: `1px solid ${selectedAnnotation === annotation.id ? '#4CAF50' : '#333'}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  marginBottom: '4px'
                }}>
                  <div style={{ fontSize: '11px', color: '#999' }}>
                    {annotation.type === 'note' && '📝'}
                    {annotation.type === 'warning' && '⚠️'}
                    {annotation.type === 'info' && 'ℹ️'}
                    {annotation.type === 'measurement' && '📐'}
                    {' '}{annotation.type.toUpperCase()}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAnnotation(annotation.id, annotation);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ff6666',
                      cursor: 'pointer',
                      fontSize: '12px',
                      padding: '0 4px'
                    }}
                    title="Delete annotation"
                  >
                    ✕
                  </button>
                </div>
                <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                  {annotation.text}
                </div>
                <div style={{ fontSize: '10px', color: '#666' }}>
                  {new Date(annotation.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Others' Annotations */}
      {otherAnnotations.length > 0 && (
        <div>
          <div style={{
            fontSize: '13px',
            fontWeight: '600',
            marginBottom: '8px',
            color: '#2196F3'
          }}>
            Team Annotations ({otherAnnotations.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {otherAnnotations.map((annotation) => (
              <div
                key={annotation.id}
                onClick={() => selectAnnotation(annotation.id)}
                style={{
                  padding: '10px',
                  backgroundColor: selectedAnnotation === annotation.id ? '#1a2a3a' : '#1a1a1a',
                  border: `1px solid ${selectedAnnotation === annotation.id ? '#2196F3' : '#333'}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  marginBottom: '4px'
                }}>
                  <div style={{ fontSize: '11px', color: '#999' }}>
                    {annotation.type === 'note' && '📝'}
                    {annotation.type === 'warning' && '⚠️'}
                    {annotation.type === 'info' && 'ℹ️'}
                    {annotation.type === 'measurement' && '📐'}
                    {' '}{annotation.type.toUpperCase()}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: annotation.userColor,
                    fontWeight: '600'
                  }}>
                    {annotation.userName}
                  </div>
                </div>
                <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                  {annotation.text}
                </div>
                <div style={{ fontSize: '10px', color: '#666' }}>
                  {new Date(annotation.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {annotations.length === 0 && isFileLoaded && (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          color: '#666',
          fontSize: '13px'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📍</div>
          <div>No annotations yet</div>
          <div style={{ fontSize: '11px', marginTop: '8px' }}>
            Click "New Annotation" to get started
          </div>
        </div>
      )}

      {/* TODO: Future features */}
      {/* 
      TODO: Implement click-to-place annotation mode
      TODO: Add annotation filtering (by type, user, date)
      TODO: Add annotation threading (replies to annotations)
      TODO: Add annotation attachments (images, links)
      TODO: Add annotation search
      TODO: Add bulk operations (hide all, show all, export)
      */}
    </div>
  );
}