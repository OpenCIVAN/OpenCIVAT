/**
 * Adaptive Camera Grid Component
 *
 * Grid of camera thumbnails for layout selection.
 */
import React from 'react';
import { useMode } from '../ModeContext';
import Icon from '../Icon/Icon';
import './AdaptiveCameraGrid.scss';

const AdaptiveCameraGrid = ({
    cameras = [],
    selectedIds = [],
    onSelect,
    onDoubleClick,
    columns = 3,
    showLabels = true,
    className = '',
    ...props
}) => {
    const { tokens, mode } = useMode();

    // Scale thumbnail size based on mode
    const thumbnailSize = mode === 'vr' ? 120 : 80;

    const gridStyle = {
        '--thumbnail-size': `${thumbnailSize}px`,
        '--gap': `${tokens.gap}px`,
        '--font-size': `${tokens.fontSize}px`,
        '--columns': columns,
    };

    const iconWeight = mode === 'vr' ? 'light' : 'regular';

    const isSelected = (cameraId) => selectedIds.includes(cameraId);

    const handleClick = (camera, e) => {
        if (onSelect) {
            const multiSelect = e.ctrlKey || e.metaKey;
            onSelect(camera, multiSelect);
        }
    };

    const handleDoubleClick = (camera) => {
        onDoubleClick?.(camera);
    };

    return (
        <div
            className={`
        adaptive-camera-grid
        adaptive-camera-grid--${mode}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
            style={gridStyle}
            role="grid"
            {...props}
        >
            {cameras.map((camera) => {
                const selected = isSelected(camera.id);
                return (
                    <button
                        key={camera.id}
                        type="button"
                        role="gridcell"
                        aria-selected={selected}
                        className={`
              adaptive-camera-grid__item
              ${selected ? 'adaptive-camera-grid__item--selected' : ''}
              ${camera.active ? 'adaptive-camera-grid__item--active' : ''}
            `.trim()}
                        onClick={(e) => handleClick(camera, e)}
                        onDoubleClick={() => handleDoubleClick(camera)}
                    >
                        <div className="adaptive-camera-grid__thumbnail">
                            {camera.thumbnail ? (
                                <img src={camera.thumbnail} alt={camera.name} />
                            ) : (
                                <Icon name="camera" weight={iconWeight} size={tokens.iconSizeLg} />
                            )}
                            {camera.recording && (
                                <span className="adaptive-camera-grid__recording">
                                    <Icon name="record" weight="bold" size={12} />
                                </span>
                            )}
                            {selected && (
                                <span className="adaptive-camera-grid__check">
                                    <Icon name="check" weight="bold" size={16} />
                                </span>
                            )}
                        </div>
                        {showLabels && (
                            <span className="adaptive-camera-grid__label">{camera.name}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default AdaptiveCameraGrid;