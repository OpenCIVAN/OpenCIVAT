/**
 * @file ActivityTab.jsx
 * @description Activity feed showing recent actions in the workspace.
 * Part of the Right Panel collaboration hub.
 *
 * Features:
 * - Activity feed with user actions and system events
 * - Filter by activity type (views, datasets, annotations, system)
 * - Catch-up card for unread activity
 * - Collaboration history tracking
 *
 * @see Right_Panel_Design_Specification.md - Activity Tab section
 *
 * @example
 * <ActivityTab workspaceId="ws-1" activities={activities} />
 */

import React, { useState, useMemo } from 'react';
import {
    DismissibleCard,
    SectionHeader,
    AdaptiveButton,
    Icon,
} from '@UI/react/components/adaptive';

import { useActivityTab } from './hooks/useActivityTab';
import { ActivityFilter } from './components/ActivityFilter';
import { ActivityCard } from './components/ActivityCard';

import './ActivityTab.scss';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * @typedef {Object} ActivityTabProps
 * @property {string} [workspaceId] - Current workspace ID
 * @property {Array} [activities] - Activity items
 * @property {Array} [filters] - Available filters
 */

/**
 * Activity tab component.
 * Displays recent actions and system events.
 *
 * @param {ActivityTabProps} props - Component props
 * @returns {React.ReactElement} The rendered tab
 */
export function ActivityTab({
    workspaceId,
    activities: propActivities,
    filters: propFilters,
}) {
    const {
        activities,
        filters,
        activeFilter,
        setActiveFilter,
        filteredActivities,
    } = useActivityTab({
        activities: propActivities,
        filters: propFilters,
    });

    // Catch-up state
    const [catchUpDismissed, setCatchUpDismissed] = useState(false);
    // All caught up dismissal state
    const [caughtUpDismissed, setCaughtUpDismissed] = useState(false);

    // Generate catch-up items from activities (simulated - would come from real data)
    const catchUpItems = useMemo(() => {
        // Group activities by type for catch-up summary
        const unreadActivities = activities.filter(a => !a.isRead);
        if (unreadActivities.length === 0) return [];

        const byType = unreadActivities.reduce((acc, activity) => {
            const type = activity.type || 'other';
            if (!acc[type]) acc[type] = [];
            acc[type].push(activity);
            return acc;
        }, {});

        return Object.entries(byType).map(([type, items]) => ({
            type: type === 'annotation' ? 'annotations' : type + 's',
            count: items.length,
            description: type === 'annotation' ? 'were added' : 'occurred',
        }));
    }, [activities]);

    const hasCatchUp = catchUpItems.length > 0;

    const handleDismissCatchUp = () => {
        setCatchUpDismissed(true);
        // Would also call markAllRead() here
    };

    return (
        <div className="activity-panel">
            {/* Catch-Up Card - Dismissible */}
            <div className="activity-panel__header">
                {!catchUpDismissed && hasCatchUp ? (
                    <DismissibleCard
                        icon="sparkles"
                        title="Catch Up"
                        color="amber"
                        onDismiss={handleDismissCatchUp}
                    >
                        <div className="catch-up__content">
                            While you were away:
                            <ul className="catch-up__list">
                                {catchUpItems.map((item, i) => (
                                    <li key={i}>
                                        <strong>{item.count} {item.type}</strong> {item.description}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="catch-up__actions">
                            <AdaptiveButton
                                icon="eye"
                                variant="primary"
                                onClick={() => { /* navigate to first unread */ }}
                            >
                                Review All
                            </AdaptiveButton>
                            <button
                                className="catch-up__mark-read"
                                onClick={handleDismissCatchUp}
                            >
                                Mark as Read
                            </button>
                        </div>
                    </DismissibleCard>
                ) : !caughtUpDismissed ? (
                    <DismissibleCard
                        icon="check"
                        title="All caught up!"
                        color="green"
                        onDismiss={() => setCaughtUpDismissed(true)}
                    >
                        <span className="activity-panel__caught-up-text">
                            You've seen all recent activity
                        </span>
                    </DismissibleCard>
                ) : null}
            </div>

            {/* Activity List Section */}
            <div className="activity-panel__list">
                <SectionHeader
                    icon="activity"
                    color="var(--color-accent-amber)"
                    count={filteredActivities.length}
                    actions={
                        <ActivityFilter
                            filters={filters}
                            activeFilter={activeFilter}
                            onFilterChange={setActiveFilter}
                        />
                    }
                >
                    Recent Activity
                </SectionHeader>
                <div className="activity-feed">
                    {filteredActivities.length === 0 ? (
                        <div className="activity-feed__empty">
                            <Icon name="activity" size={24} />
                            <span>No activity yet</span>
                        </div>
                    ) : (
                        filteredActivities.map(activity => (
                            <ActivityCard key={activity.id} activity={activity} />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// Export with both names for backwards compatibility
export { ActivityTab as ActivityPanelContent };
export default ActivityTab;