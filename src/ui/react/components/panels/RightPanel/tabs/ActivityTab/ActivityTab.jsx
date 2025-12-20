/**
 * @file ActivityTab.jsx
 * @description Activity feed showing recent actions in the workspace.
 * Part of the Right Panel collaboration hub.
 *
 * Features:
 * - Activity feed with user actions and system events
 * - Filter by activity type (views, datasets, annotations, system)
 * - Session summary stats
 * - Collaboration history tracking
 *
 * @see Right_Panel_Design_Specification.md - Activity Tab section
 *
 * @example
 * <ActivityTab workspaceId="ws-1" activities={activities} />
 */

import React from 'react';
import { ResizableSections } from '@UI/react/components/common/ResizableSections';

import { useActivityTab } from './hooks/useActivityTab';
import { ActivityFilter } from './components/ActivityFilter';
import { ActivityCard } from './components/ActivityCard';
import { ActivityStats } from './components/ActivityStats';

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

    // Section definitions
    const sections = [
        {
            id: 'stats',
            title: 'Session Summary',
            defaultHeight: 80,
            minHeight: 70,
            content: <ActivityStats activities={activities} />,
        },
        {
            id: 'feed',
            title: 'Activity Feed',
            defaultHeight: 400,
            minHeight: 200,
            headerActions: (
                <ActivityFilter
                    filters={filters}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                />
            ),
            content: (
                <div className="activity-feed">
                    {filteredActivities.length === 0 ? (
                        <div className="activity-feed__empty">
                            <span>No activity yet</span>
                        </div>
                    ) : (
                        filteredActivities.map(activity => (
                            <ActivityCard key={activity.id} activity={activity} />
                        ))
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="activity-panel">
            <ResizableSections sections={sections} />
        </div>
    );
}

// Export with both names for backwards compatibility
export { ActivityTab as ActivityPanelContent };
export default ActivityTab;