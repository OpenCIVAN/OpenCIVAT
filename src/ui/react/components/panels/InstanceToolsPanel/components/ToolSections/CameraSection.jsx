/**
 * @file CameraSection.jsx
 * @description Camera preset grid section
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { CAMERA_PRESETS } from '../../constants';

/**
 * CameraSection - Grid of camera preset buttons
 */
export const CameraSection = memo(function CameraSection({
  onPresetClick,
  disabled = false,
}) {
  return (
    <div className="camera-section">
      <div className="camera-section__grid">
        {CAMERA_PRESETS.map((preset, index) => {
          if (!preset) {
            return <div key={index} className="camera-section__cell camera-section__cell--empty" />;
          }

          return (
            <button
              key={preset.id}
              className={`camera-section__cell ${preset.special ? 'camera-section__cell--special' : ''}`}
              onClick={() => onPresetClick?.(preset.id)}
              disabled={disabled}
              title={preset.label}
            >
              <Icon name={preset.icon} size={14} />
              <span>{preset.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

export default CameraSection;
