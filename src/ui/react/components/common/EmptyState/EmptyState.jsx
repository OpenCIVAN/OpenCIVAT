/**
 * @file EmptyState.jsx
 * @description Reusable empty state component for displaying placeholder content
 * when lists, searches, or data are empty.
 *
 * Features:
 * - Icon via string name (uses centralized Icon system)
 * - Title and description text
 * - Optional action button
 * - Multiple size variants
 * - Muted, subtle styling that doesn't distract
 *
 * @example
 * // Basic usage (icon as string name)
 * <EmptyState
 *   icon="search"
 *   title="No results found"
 *   description="Try adjusting your search criteria"
 * />
 *
 * @example
 * // With action button
 * <EmptyState
 *   icon="folderPlus"
 *   title="No projects yet"
 *   description="Create your first project to get started"
 *   action={{ label: 'Create Project', onClick: handleCreate }}
 * />
 *
 * @example
 * // Small variant for inline use
 * <EmptyState
 *   icon="messageSquare"
 *   title="No messages"
 *   size="sm"
 * />
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/common/Icon';
import { Button } from '../Button';
import './EmptyState.scss';

/**
 * @typedef {Object} EmptyStateAction
 * @property {string} label - Button label
 * @property {() => void} onClick - Click handler
 * @property {'primary'|'secondary'} [variant='primary'] - Button variant
 */

/**
 * @typedef {Object} EmptyStateProps
 * @property {string} [icon] - Icon name string (e.g., "search", "folder", "messageSquare")
 * @property {string} title - Main message
 * @property {string} [description] - Secondary description text
 * @property {EmptyStateAction} [action] - Optional action button
 * @property {'sm'|'md'|'lg'} [size='md'] - Size variant
 * @property {string} [className] - Additional CSS classes
 * @property {string} [testId] - Data-testid for testing
 */

/**
 * Icon sizes mapped to component sizes
 */
const EMPTY_STATE_ICON_SIZES = {
    sm: 24,
    md: 48,
    lg: 64,
};

/**
 * Empty state placeholder component.
 *
 * @param {EmptyStateProps} props - Component props
 * @returns {React.ReactElement} The rendered empty state
 */
function EmptyState({
    icon,           // Now a string like "search", not a component
    title,
    description,
    action,
    size = 'md',
    className = '',
    testId,
}) {
    const iconSize = EMPTY_STATE_ICON_SIZES[size] || EMPTY_STATE_ICON_SIZES.md;

    const classNames = [
        'empty-state',
        `empty-state--${size}`,
        className,
    ].filter(Boolean).join(' ');

    return (
        <div className={classNames} data-testid={testId}>
            {icon && (
                <div className="empty-state__icon">
                    <Icon name={icon} size={iconSize} />
                </div>
            )}

            <div className="empty-state__content">
                <h3 className="empty-state__title">{title}</h3>

                {description && (
                    <p className="empty-state__description">{description}</p>
                )}
            </div>

            {action && (
                <div className="empty-state__action">
                    <Button
                        variant={action.variant || 'primary'}
                        size={size === 'sm' ? 'sm' : 'md'}
                        onClick={action.onClick}
                    >
                        {action.label}
                    </Button>
                </div>
            )}
        </div>
    );
}

export default memo(EmptyState);
export { EmptyState };