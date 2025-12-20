/**
 * @file ViewModeToggle.jsx
 * @description Toggle between canvas view modes.
 *
 * View Modes:
 * - Normal: All instances visible
 * - Isolation: Single instance fullscreen
 * - Subset: Selected subset only
 */

import React from 'react';
import { LayoutGrid, Maximize2, Layers } from 'lucide-react';
import { Tooltip } from '@UI/react/components/common/Tooltip';

import './ViewModeToggle.scss';

const VIEW_MODES = [
    {
        id: 'normal',
        icon: LayoutGrid,
        label: 'Normal View',
        color: 'blue',
    },
    {
        id: 'isolation',
        icon: Maximize2,
        label: 'Isolation Mode',
        color: 'amber',
    },
    {
        id: 'subset',
        icon: Layers,
        label: 'Subset View',
        color: 'purple',
    },
];

/**
 * View mode toggle component.
 *
 * @param {Object} props - Component props
 * @param {string} [props.mode] - Current view mode
 * @param {Function} [props.onChange] - Callback when mode changes
 */
export function ViewModeToggle({ mode = 'normal', onChange }) {
    return (
        <div className="view-mode-toggle" role="group" aria-label="View mode">
            {VIEW_MODES.map((viewMode) => (
                <Tooltip key={viewMode.id} content={viewMode.label}>
                    <button
                        className={`view-mode-toggle__btn ${mode === viewMode.id ? 'active' : ''
                            }`}
                        onClick={() => onChange?.(viewMode.id)}
                        data-color={viewMode.color}
                        aria-pressed={mode === viewMode.id}
                        type="button"
                    >
                        <viewMode.icon size={14} />
                    </button>
                </Tooltip>
            ))}
        </div>
    );
}

export default ViewModeToggle;