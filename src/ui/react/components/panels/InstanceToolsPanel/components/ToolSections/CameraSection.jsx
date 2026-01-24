/**
 * @file CameraSection.jsx
 * @description Camera preset grid and camera transform controls
 */

import React, { memo, useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { CAMERA_PRESETS } from '../../constants';

/**
 * CameraSlider - Individual camera axis slider
 */
const CameraSlider = memo(function CameraSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  disabled,
  color = 'cyan',
}) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="camera-section__slider-row">
      <div className="camera-section__slider-header">
        <span className="camera-section__slider-label">{label}</span>
        <span className={`camera-section__slider-value camera-section__slider-value--${color}`}>
          {typeof value === 'number' ? value.toFixed(1) : value}
        </span>
      </div>
      <input
        type="range"
        className={`camera-section__slider camera-section__slider--${color}`}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        style={{ '--slider-percent': `${percentage}%` }}
      />
    </div>
  );
});

/**
 * CameraTransformSubsection - Collapsible camera position/orientation controls
 */
const CameraTransformSubsection = memo(function CameraTransformSubsection({
  cameraState,
  onCameraPositionChange,
  onCameraFocalPointChange,
  onCameraViewAngleChange,
  onReset,
  expanded,
  onToggleExpanded,
  disabled = false,
}) {
  const { position = [0, 0, 0], focalPoint = [0, 0, 0], viewAngle = 30 } = cameraState || {};

  return (
    <div className="camera-section__subsection">
      <div className="camera-section__subsection-row">
        <button
          className={`camera-section__subsection-header ${expanded ? 'camera-section__subsection-header--expanded' : ''}`}
          onClick={onToggleExpanded}
        >
          <Icon
            name="chevronRight"
            size={10}
            className={`camera-section__subsection-chevron ${expanded ? 'camera-section__subsection-chevron--expanded' : ''}`}
          />
          <Icon name="video" size={12} className="camera-section__subsection-icon" />
          <span>Camera Transform</span>
        </button>
        <button
          className="camera-section__reset-btn"
          onClick={onReset}
          disabled={disabled}
          title="Reset camera"
        >
          <Icon name="refreshCcw" size={12} />
        </button>
      </div>

      {expanded && (
        <div className="camera-section__subsection-content">
          {/* Camera Position */}
          <div className="camera-section__group">
            <div className="camera-section__group-label">Position</div>
            <CameraSlider
              label="X"
              value={position[0]}
              min={-1000}
              max={1000}
              step={1}
              onChange={(v) => onCameraPositionChange?.('x', v)}
              disabled={disabled}
              color="red"
            />
            <CameraSlider
              label="Y"
              value={position[1]}
              min={-1000}
              max={1000}
              step={1}
              onChange={(v) => onCameraPositionChange?.('y', v)}
              disabled={disabled}
              color="green"
            />
            <CameraSlider
              label="Z"
              value={position[2]}
              min={-1000}
              max={1000}
              step={1}
              onChange={(v) => onCameraPositionChange?.('z', v)}
              disabled={disabled}
              color="blue"
            />
          </div>

          {/* Focal Point */}
          <div className="camera-section__group">
            <div className="camera-section__group-label">Focal Point</div>
            <CameraSlider
              label="X"
              value={focalPoint[0]}
              min={-500}
              max={500}
              step={1}
              onChange={(v) => onCameraFocalPointChange?.('x', v)}
              disabled={disabled}
              color="red"
            />
            <CameraSlider
              label="Y"
              value={focalPoint[1]}
              min={-500}
              max={500}
              step={1}
              onChange={(v) => onCameraFocalPointChange?.('y', v)}
              disabled={disabled}
              color="green"
            />
            <CameraSlider
              label="Z"
              value={focalPoint[2]}
              min={-500}
              max={500}
              step={1}
              onChange={(v) => onCameraFocalPointChange?.('z', v)}
              disabled={disabled}
              color="blue"
            />
          </div>

          {/* View Angle */}
          <div className="camera-section__group">
            <div className="camera-section__group-label">View</div>
            <CameraSlider
              label="Angle"
              value={viewAngle}
              min={1}
              max={120}
              step={1}
              onChange={(v) => onCameraViewAngleChange?.(v)}
              disabled={disabled}
              color="cyan"
            />
          </div>
        </div>
      )}
    </div>
  );
});

/**
 * SavedCameraStates - Collapsible list of saved camera states
 */
const SavedCameraStates = memo(function SavedCameraStates({
  savedStates = [],
  onSave,
  onRestore,
  onDelete,
  expanded,
  onToggleExpanded,
  disabled = false,
}) {
  return (
    <div className="camera-section__subsection">
      <div className="camera-section__saved-header">
        <button
          className={`camera-section__subsection-header ${expanded ? 'camera-section__subsection-header--expanded' : ''}`}
          onClick={onToggleExpanded}
        >
          <Icon
            name="chevronRight"
            size={10}
            className={`camera-section__subsection-chevron ${expanded ? 'camera-section__subsection-chevron--expanded' : ''}`}
          />
          <Icon name="bookmark" size={12} className="camera-section__subsection-icon" />
          <span>Saved Views ({savedStates.length}/5)</span>
        </button>
        <button
          className="camera-section__save-btn"
          onClick={onSave}
          disabled={disabled || savedStates.length >= 5}
          title="Save current view"
        >
          <Icon name="plus" size={12} />
        </button>
      </div>

      {expanded && (
        <div className="camera-section__saved-list">
          {savedStates.length === 0 ? (
            <div className="camera-section__saved-empty">
              No saved views. Click + to save current view.
            </div>
          ) : (
            savedStates.map((state) => (
              <div key={state.id} className="camera-section__saved-item">
                <button
                  className="camera-section__saved-restore"
                  onClick={() => onRestore(state)}
                  title={`Restore ${state.name}`}
                >
                  <Icon name="image" size={12} />
                  <span className="camera-section__saved-name">{state.name}</span>
                  <span className="camera-section__saved-time">{state.timestamp}</span>
                </button>
                <button
                  className="camera-section__saved-delete"
                  onClick={() => onDelete(state.id)}
                  title="Delete saved view"
                >
                  <Icon name="x" size={10} />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
});

/**
 * CameraSection - Grid of camera preset buttons + camera transform controls
 */
export const CameraSection = memo(function CameraSection({
  onPresetClick,
  cameraState,
  cameraTransformExpanded,
  onToggleCameraTransform,
  onCameraPositionChange,
  onCameraFocalPointChange,
  onCameraViewAngleChange,
  savedCameraStates = [],
  savedStatesExpanded,
  onToggleSavedStates,
  onSaveCameraState,
  onRestoreCameraState,
  onDeleteCameraState,
  disabled = false,
}) {
  const [localSavedExpanded, setLocalSavedExpanded] = useState(false);
  const handleToggleSavedStates = onToggleSavedStates || (() => setLocalSavedExpanded(prev => !prev));
  const isSavedExpanded = savedStatesExpanded !== undefined ? savedStatesExpanded : localSavedExpanded;

  return (
    <div className="camera-section">
      {/* Preset Grid */}
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

      {/* Saved Camera States */}
      <SavedCameraStates
        savedStates={savedCameraStates}
        onSave={onSaveCameraState}
        onRestore={onRestoreCameraState}
        onDelete={onDeleteCameraState}
        expanded={isSavedExpanded}
        onToggleExpanded={handleToggleSavedStates}
        disabled={disabled}
      />

      {/* Camera Transform Subsection */}
      <CameraTransformSubsection
        cameraState={cameraState}
        onCameraPositionChange={onCameraPositionChange}
        onCameraFocalPointChange={onCameraFocalPointChange}
        onCameraViewAngleChange={onCameraViewAngleChange}
        onReset={() => onPresetClick?.('reset')}
        expanded={cameraTransformExpanded}
        onToggleExpanded={onToggleCameraTransform}
        disabled={disabled}
      />
    </div>
  );
});

export default CameraSection;
