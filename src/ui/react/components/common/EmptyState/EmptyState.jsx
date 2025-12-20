/**
 * @file EmptyState.jsx
 * @description Reusable empty state component for displaying placeholder content
 * when lists, searches, or data are empty.
 *
 * Features:
 * - Customizable icon (Lucide icons)
 * - Title and description text
 * - Optional action button
 * - Multiple size variants
 * - Muted, subtle styling that doesn't distract
 *
 * @example
 * // Basic usage
 * <EmptyState
 *   icon={Search}
 *   title="No results found"
 *   description="Try adjusting your search criteria"
 * />
 *
 * @example
 * // With action button
 * <EmptyState
 *   icon={FolderPlus}
 *   title="No projects yet"
 *   description="Create your first project to get started"
 *   action={{ label: 'Create Project', onClick: handleCreate }}
 * />
 *
 * @example
 * // Small variant for inline use
 * <EmptyState
 *   icon={MessageSquare}
 *   title="No messages"
 *   size="sm"
 * />
 */

import React, { memo } from 'react';
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
 * @property {React.ComponentType} [icon] - Lucide icon component
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
const ICON_SIZES = {
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
    icon: Icon,
    title,
    description,
    action,
    size = 'md',
    className = '',
    testId,
}) {
    const iconSize = ICON_SIZES[size] || ICON_SIZES.md;

    const classNames = [
        'empty-state',
        `empty-state--${size}`,
        className,
    ].filter(Boolean).join(' ');

    return (
        <div className={classNames} data-testid={testId}>
            {Icon && (
                <div className="empty-state__icon">
                    <Icon size={iconSize} />
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