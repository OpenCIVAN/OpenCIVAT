/**
 * @file AppearanceSection.jsx
 * @description Appearance controls - opacity and representation
 */

import React, { memo } from 'react';
import { REPRESENTATIONS } from '../../constants';

/**
 * AppearanceSection - Opacity and representation controls
 */
export const AppearanceSection = memo(function AppearanceSection({
  opacity,
  representation,
  onOpacityChange,
  onRepresentationChange,
  disabled = false,
}) {
  return (
    <div className="appearance-section">
      {/* Opacity Slider */}
      <div className="appearance-section__opacity">
        <div className="appearance-section__opacity-header">
          <span className="appearance-section__opacity-label">Opacity</span>
          <span className="appearance-section__opacity-value">{opacity}%</span>
        </div>
        <input
          type="range"
          className="appearance-section__slider"
          min={0}
          max={100}
          value={opacity}
          onChange={(e) => onOpacityChange(parseInt(e.target.value))}
          disabled={disabled}
          style={{ '--slider-percent': `${opacity}%` }}
        />
      </div>

      {/* Representation Buttons */}
      <div className="appearance-section__representations">
        {REPRESENTATIONS.map(rep => (
          <button
            key={rep.id}
            className={`appearance-section__representation ${representation === rep.id ? 'appearance-section__representation--active' : ''}`}
            onClick={() => onRepresentationChange(rep.id)}
            disabled={disabled}
          >
            {rep.label}
          </button>
        ))}
      </div>
    </div>
  );
});

export default AppearanceSection;
