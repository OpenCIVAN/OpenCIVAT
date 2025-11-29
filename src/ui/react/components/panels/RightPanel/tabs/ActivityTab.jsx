// src/ui/react/components/panels/RightPanel/tabs/ActivityTab.jsx
// Activity feed showing recent actions in the workspace
// Displays user actions, system events, and collaboration history

import React, { useState, useCallback } from 'react';
import {
    Clock,
    User,
    Database,
    Eye,
    MessageSquare,
    Share2,
    Upload,
    Download,
    Trash2,
    Edit3,
    Filter,
    RefreshCw,
    ChevronDown,
    Circle,
} from 'lucide-react';
import { ResizableSectionsContainer } from "@UI/react/components/common/ResizableSections";

// =============================================================================
// SAMPLE DATA
// =============================================================================

const SAMPLE_ACTIVITIES = [
    {
        id: 'a1',
        type: 'view',
        user: { name: 'Dr. Smith', color: '#fb7185' },
        action: 'created a new view',
        target: 'Brain MRI - Sagittal',
        timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 min ago
    },
    {
        id: 'a2',
        type: 'dataset',
        user: { name: 'Alice Chen', color: '#2dd4bf' },
        action: 'loaded dataset',
        target: 'patient_scan_001.nii',
        timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
    },
    {
        id: 'a3',
        type: 'annotation',
        user: { name: 'Dr. Jones', color: '#fbbf24' },
        action: 'added annotation',
        target: 'Tumor ROI marker',
        timestamp: new Date(Date.now() - 12 * 60 * 1000), // 12 min ago
    },
    {
        id: 'a4',
        type: 'share',
        user: { name: 'Dr. Smith', color: '#fb7185' },
        action: 'shared view with',
        target: 'Team',
        timestamp: new Date(Date.now() - 25 * 60 * 1000), // 25 min ago
    },
    {
        id: 'a5',
        type: 'edit',
        user: { name: 'Alice Chen', color: '#2dd4bf' },
        action: 'modified filter',
        target: 'High contrast preset',
        timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 min ago
    },
    {
        id: 'a6',
        type: 'system',
        user: null,
        action: 'Auto-saved workspace',
        target: null,
        timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    },
    {
        id: 'a7',
        type: 'join',
        user: { name: 'Dr. Jones', color: '#fbbf24' },
        action: 'joined the session',
        target: null,
        timestamp: new Date(Date.now() - 90 * 60 * 1000), // 1.5 hours ago
    },
];

const ACTIVITY_FILTERS = [
    { id: 'all', label: 'All Activity' },
    { id: 'views', label: 'Views' },
    { id: 'datasets', label: 'Datasets' },
    { id: 'annotations', label: 'Annotations' },
    { id: 'system', label: 'System' },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getActivityIcon(type) {
    switch (type) {
        case 'view': return Eye;
        case 'dataset': return Database;
        case 'annotation': return MessageSquare;
        case 'share': return Share2;
        case 'upload': return Upload;
        case 'download': return Download;
        case 'delete': return Trash2;
        case 'edit': return Edit3;
        case 'join': return User;
        case 'system': return RefreshCw;
        default: return Circle;
    }
}

function formatTimestamp(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * ActivityFilter - Filter dropdown for activity types
 */
function ActivityFilter({ filters, activeFilter, onFilterChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const current = filters.find(f => f.id === activeFilter) || filters[0];

    return (
        <div className="activity-filter">
            <button
                className="activity-filter__trigger"
                onClick={() => setIsOpen(!isOpen)}
            >
                <Filter size={12} />
                <span>{current.label}</span>
                <ChevronDown size={10} className={isOpen ? 'open' : ''} />
            </button>

            {isOpen && (
                <>
                    <div className="activity-filter__backdrop" onClick={() => setIsOpen(false)} />
                    <div className="activity-filter__dropdown">
                        {filters.map(filter => (
                            <button
                                key={filter.id}
                                className={`activity-filter__option ${filter.id === activeFilter ? 'active' : ''}`}
                                onClick={() => {
                                    onFilterChange(filter.id);
                                    setIsOpen(false);
                                }}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

/**
 * ActivityCard - Single activity item
 */
function ActivityCard({ activity }) {
    const Icon = getActivityIcon(activity.type);
    const isSystem = activity.type === 'system';

    return (
        <div className={`activity-card ${isSystem ? 'activity-card--system' : ''}`}>
            <div className="activity-card__icon" data-type={activity.type}>
                <Icon size={14} />
            </div>

            <div className="activity-card__content">
                <div className="activity-card__text">
                    {activity.user && (
                        <span
                            className="activity-card__user"
                            style={{ color: activity.user.color }}
                        >
                            {activity.user.name}
                        </span>
                    )}
                    <span className="activity-card__action">{activity.action}</span>
                    {activity.target && (
                        <span className="activity-card__target">{activity.target}</span>
                    )}
                </div>
                <div className="activity-card__time">
                    <Clock size={10} />
                    <span>{formatTimestamp(activity.timestamp)}</span>
                </div>
            </div>
        </div>
    );
}

/**
 * ActivityStats - Quick stats summary
 */
function ActivityStats({ activities }) {
    const stats = {
        total: activities.length,
        views: activities.filter(a => a.type === 'view').length,
        datasets: activities.filter(a => a.type === 'dataset').length,
        annotations: activities.filter(a => a.type === 'annotation').length,
    };

    return (
        <div className="activity-stats">
            <div className="activity-stats__item">
                <span className="activity-stats__value">{stats.total}</span>
                <span className="activity-stats__label">Total</span>
            </div>
            <div className="activity-stats__item">
                <span className="activity-stats__value">{stats.views}</span>
                <span className="activity-stats__label">Views</span>
            </div>
            <div className="activity-stats__item">
                <span className="activity-stats__value">{stats.datasets}</span>
                <span className="activity-stats__label">Datasets</span>
            </div>
            <div className="activity-stats__item">
                <span className="activity-stats__value">{stats.annotations}</span>
                <span className="activity-stats__label">Notes</span>
            </div>
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ActivityPanelContent({ workspaceId }) {
    const [activeFilter, setActiveFilter] = useState('all');
    const [activities] = useState(SAMPLE_ACTIVITIES);

    // Filter activities
    const filteredActivities = activities.filter(activity => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'views') return activity.type === 'view';
        if (activeFilter === 'datasets') return activity.type === 'dataset';
        if (activeFilter === 'annotations') return activity.type === 'annotation';
        if (activeFilter === 'system') return activity.type === 'system' || activity.type === 'join';
        return true;
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
                    filters={ACTIVITY_FILTERS}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                />
            ),
            content: (
                <div className="activity-feed">
                    {filteredActivities.length === 0 ? (
                        <div className="activity-feed__empty">
                            <Clock size={24} />
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
            <ResizableSectionsContainer sections={sections} />
        </div>
    );
}

export default ActivityPanelContent;