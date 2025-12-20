/**
 * @file PopoutButtons.jsx
 * @description Buttons to toggle floating popout panels.
 */

import React from 'react';
import { Map, StickyNote } from 'lucide-react';
import { Tooltip } from '@UI/react/components/common/Tooltip';

import './PopoutButtons.scss';

const POPOUTS = [
    { id: 'navigator', icon: Map, label: 'Canvas Navigator' },
    { id: 'scratchpad', icon: StickyNote, label: 'Scratchpad' },
];

/**
 * Popout toggle buttons component.
 *
 * @param {Object} props - Component props
 * @param {Array} [props.openPopouts] - List of open popout IDs
 * @param {Function} [props.onToggle] - Callback to toggle popout
 */
export function PopoutButtons({ openPopouts = [], onToggle }) {
    return (
        <div className="popout-buttons">
            {POPOUTS.map((popout) => {
                const isOpen = openPopouts.includes(popout.id);
                return (
                    <Tooltip key={popout.id} content={popout.label}>
                        <button
                            className={`popout-buttons__btn ${isOpen ? 'active' : ''
                                }`}
                            onClick={() => onToggle?.(popout.id)}
                            aria-pressed={isOpen}
                            type="button"
                        >
                            <popout.icon size={16} />
                        </button>
                    </Tooltip>
                );
            })}
        </div>
    );
}

export default PopoutButtons;