// src/ui/react/components/panels/AnalyzePanel.jsx
// Dimensionality Reduction Controls (PCA, t-SNE, UMAP)

import React from 'react';
import { useVTKFile } from '../../hooks/useVTKFile.js';
import { useVTKReduction } from '../../hooks/useVTKReduction.js';

export function AnalyzePanel() {
  const { isFileLoaded, filename, numPoints } = useVTKFile();
  const {
    method,
    setMethod,
    components,
    setComponents,
    isReductionApplied,
    toggleReduction,
    canApplyReduction
  } = useVTKReduction();

  const handleToggleReduction = async () => {
    await toggleReduction();
  };

  return (
    <div style={{ color: '#e0e0e0', padding: '4px' }}>
      {/* File Status */}
      <div style={{
        padding: '12px',
        marginBottom: '16px',
        backgroundColor: isFileLoaded ? '#1a3a1a' : '#3a1a1a',
        border: `1px solid ${isFileLoaded ? '#4CAF50' : '#663333'}`,
        borderRadius: '4px'
      }}>
        <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>
          DATA STATUS
        </div>
        <div style={{ fontSize: '13px' }}>
          {isFileLoaded ? (
            <>
              <div style={{ color: '#4CAF50', marginBottom: '4px' }}>
                ✓ File Loaded
              </div>
              <div style={{ fontSize: '12px', color: '#999' }}>
                {filename}
              </div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                {numPoints?.toLocaleString()} points
              </div>
            </>
          ) : (
            <div style={{ color: '#ff6666' }}>
              ✗ No file loaded
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                Load a VTP file from the Files panel first
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Algorithm Selection */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          fontSize: '13px',
          fontWeight: '600',
          marginBottom: '12px',
          color: '#aaa'
        }}>
          Dimensionality Reduction Algorithm
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { value: 'pca', label: 'PCA', desc: 'Fast, linear reduction' },
            { value: 'tsne', label: 't-SNE', desc: 'Preserves local structure' },
            { value: 'umap', label: 'UMAP', desc: 'Balances local & global' }
          ].map((algo) => (
            <button
              key={algo.value}
              onClick={() => setMethod(algo.value)}
              disabled={!canApplyReduction}
              style={{
                padding: '12px',
                backgroundColor: method === algo.value ? '#2a4a2a' : '#1a1a1a',
                border: `1px solid ${method === algo.value ? '#4CAF50' : '#333'}`,
                borderRadius: '4px',
                color: canApplyReduction ? '#e0e0e0' : '#666',
                fontSize: '13px',
                cursor: canApplyReduction ? 'pointer' : 'not-allowed',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (canApplyReduction) {
                  e.currentTarget.style.borderColor = '#4CAF50';
                }
              }}
              onMouseLeave={(e) => {
                if (method !== algo.value) {
                  e.currentTarget.style.borderColor = '#333';
                }
              }}
            >
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                {algo.label}
                {method === algo.value && ' ✓'}
              </div>
              <div style={{ fontSize: '11px', color: '#999' }}>
                {algo.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Components Selection */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          fontSize: '13px',
          fontWeight: '600',
          marginBottom: '12px',
          color: '#aaa'
        }}>
          Output Dimensions
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {[2, 3].map((num) => (
            <button
              key={num}
              onClick={() => setComponents(num)}
              disabled={!canApplyReduction}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: components === num ? '#2a4a2a' : '#1a1a1a',
                border: `1px solid ${components === num ? '#4CAF50' : '#333'}`,
                borderRadius: '4px',
                color: canApplyReduction ? '#e0e0e0' : '#666',
                fontSize: '14px',
                fontWeight: '600',
                cursor: canApplyReduction ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (canApplyReduction) {
                  e.currentTarget.style.borderColor = '#4CAF50';
                }
              }}
              onMouseLeave={(e) => {
                if (components !== num) {
                  e.currentTarget.style.borderColor = '#333';
                }
              }}
            >
              {num}D {components === num && '✓'}
            </button>
          ))}
        </div>

        <div style={{ fontSize: '11px', color: '#666', marginTop: '8px' }}>
          {components === 2
            ? '2D visualization (flat XY plane)'
            : '3D visualization (full spatial)'
          }
        </div>
      </div>

      {/* Apply Button */}
      <button
        onClick={handleToggleReduction}
        disabled={!canApplyReduction}
        style={{
          width: '100%',
          padding: '14px',
          backgroundColor: isReductionApplied ? '#3a2a1a' : '#2a4a2a',
          border: `2px solid ${isReductionApplied ? '#FFA726' : '#4CAF50'}`,
          borderRadius: '6px',
          color: canApplyReduction ? '#fff' : '#666',
          fontSize: '14px',
          fontWeight: '600',
          cursor: canApplyReduction ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s',
          marginBottom: '12px'
        }}
        onMouseEnter={(e) => {
          if (canApplyReduction) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.3)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {isReductionApplied
          ? `🔄 Reset to Original (Remove ${method.toUpperCase()})`
          : `✨ Apply ${method.toUpperCase()} Reduction`
        }
      </button>

      {/* Info */}
      <div style={{
        fontSize: '11px',
        color: '#666',
        textAlign: 'center',
        lineHeight: '1.4'
      }}>
        {isReductionApplied && (
          <div style={{ color: '#FFA726', marginBottom: '8px' }}>
            ⚡ Reduction applied - click again to reset
          </div>
        )}
        Dimensionality reduction helps visualize high-dimensional data by projecting it into 2D or 3D space.
      </div>

      {/* TODO: Future features stub */}
      {/* 
      TODO: Add advanced parameters panel:
      - PCA: explained variance threshold
      - t-SNE: perplexity, learning rate, iterations
      - UMAP: n_neighbors, min_dist, metric
      
      TODO: Add export transformed data button
      TODO: Add "Compare Methods" mode
      */}
    </div>
  );
}