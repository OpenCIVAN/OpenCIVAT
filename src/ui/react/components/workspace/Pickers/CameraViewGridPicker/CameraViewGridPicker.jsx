// src/ui/react/components/workspace/CameraViewGridPicker.jsx

import React, { useState } from 'react';
import {
  Box,
  Camera,
  Square,
  Triangle,
  Maximize2
} from 'lucide-react';

/**
 * CameraViewGridPicker
 * 
 * Receives plain data from VTKInstanceHandler, renders 3x3 grid.
 * Core layer knows nothing about this React component!
 */
export function CameraViewGridPicker({
  views = [],           // Array of view objects from core
  disabled = false,     // Boolean from core
  onViewChange,         // Callback to core
}) {
  const [hoveredCell, setHoveredCell] = useState(null);

  // Map icon strings to Lucide components
  const iconMap = {
    'camera': Camera,
    'box': Box,
    'square': Square,
    'triangle': Triangle,
    'maximize-2': Maximize2,
  };

  // Build map for easy lookup
  const viewsMap = views.reduce((acc, view) => {
    acc[view.id] = view;
    return acc;
  }, {});

  // Define 3x3 grid layout
  const grid = [
    [viewsMap.top, viewsMap.isometric, null],           // Top row
    [viewsMap.left, viewsMap.reset, viewsMap.right],    // Middle row
    [viewsMap.bottom, viewsMap.front, viewsMap.back],   // Bottom row
  ];

  const handleCellClick = (view) => {
    if (disabled || !view) return;
    if (onViewChange) {
      onViewChange(view.id);
    }
  };

  return (
    <div className="camera-view-grid-container">
      <div
        className="camera-view-grid"
        style={{ opacity: disabled ? 0.4 : 1 }}
      >
        {grid.map((row, rowIndex) => (
          <div key={rowIndex} className="camera-view-row">
            {row.map((view, colIndex) => {
              // Empty cell
              if (!view) {
                return (
                  <div
                    key={`empty-${rowIndex}-${colIndex}`}
                    className="camera-view-cell empty"
                  />
                );
              }

              // Get the icon component
              const IconComponent = iconMap[view.icon] || Camera;
              const isHovered = hoveredCell === view.id;

              return (
                <div
                  key={view.id}
                  className={`camera-view-cell ${view.special ? 'special' : ''} ${isHovered ? 'hovered' : ''}`}
                  onClick={() => handleCellClick(view)}
                  onMouseEnter={() => !disabled && setHoveredCell(view.id)}
                  onMouseLeave={() => setHoveredCell(null)}
                  title={view.label}
                >
                  <IconComponent size={16} className="camera-view-icon" />
                  <span className="camera-view-label">{view.label}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Show hint on hover */}
      {hoveredCell && (
        <div className="camera-view-hint">
          Switch to {hoveredCell} view
        </div>
      )}
    </div>
  );
}