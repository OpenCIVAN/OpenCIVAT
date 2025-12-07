/**
 * ButtonGroup Component (v3 Design)
 *
 * Group of icon buttons with optional divider.
 * Supports both children pattern and buttons array for backwards compatibility.
 */

import React, { memo } from 'react';
import './ButtonGroup.scss';

export const ButtonGroup = memo(function ButtonGroup({
    children,
    buttons = [],
    onHover,
    showDivider = false,
}) {
    return (
        <>
            <div className="button-group">
                {children || buttons.map((button) => {
                    const Icon = button.icon;
                    return (
                        <button
                            key={button.id}
                            className={`button-group__btn ${button.isActive ? 'button-group__btn--active' : ''}`}
                            onClick={button.onClick}
                            onMouseEnter={() => onHover?.(button.label)}
                            onMouseLeave={() => onHover?.(null)}
                            title={button.label}
                        >
                            <Icon size={12} />
                        </button>
                    );
                })}
            </div>
            {showDivider && <div className="button-group__divider" />}
        </>
    );
});

export default ButtonGroup;