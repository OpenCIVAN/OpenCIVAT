import { useState } from 'react';
import { PillBar } from './index';

export default {
    title: 'Molecules/PillBar',
    component: PillBar,
    parameters: {
        layout: 'centered',
        backgrounds: { default: 'dark' },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '24px', background: '#0f0f0f', borderRadius: '8px' }}>
                <Story />
            </div>
        ),
    ],
};

// Basic usage
export const Default = () => {
    const [activeTab, setActiveTab] = useState('presence');

    const tabs = [
        { id: 'presence', label: 'Presence' },
        { id: 'layout', label: 'Layout' },
        { id: 'homepoints', label: 'Homepoints' },
    ];

    return (
        <PillBar
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
        />
    );
};

// With icons
export const WithIcons = () => {
    const [activeTab, setActiveTab] = useState('presence');

    const tabs = [
        { id: 'presence', label: 'Presence', icon: 'users' },
        { id: 'layout', label: 'Layout', icon: 'layers' },
        { id: 'homepoints', label: 'Homepoints', icon: 'home' },
    ];

    return (
        <PillBar
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
        />
    );
};

// Datasets tab example
export const DatasetsTab = () => {
    const [activeTab, setActiveTab] = useState('datasets');

    const tabs = [
        { id: 'datasets', label: 'Datasets', icon: 'folder', color: 'teal' },
        { id: 'views', label: 'Views', icon: 'eye', badge: 4, color: 'blue' },
    ];

    return (
        <PillBar
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
        />
    );
};

// Workspace tab example
export const WorkspaceTab = () => {
    const [activeTab, setActiveTab] = useState('layout');

    const tabs = [
        { id: 'presence', label: 'Presence', icon: 'users', color: 'pink', badge: 3 },
        { id: 'layout', label: 'Layout', icon: 'layers', color: 'green' },
        { id: 'homepoints', label: 'Homepoints', icon: 'home', color: 'amber' },
    ];

    return (
        <PillBar
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
        />
    );
};

// With badges
export const WithBadges = () => {
    const [activeTab, setActiveTab] = useState('filters');

    const tabs = [
        { id: 'filters', label: 'Filters', icon: 'filter', badge: 12 },
        { id: 'bookmarks', label: 'Bookmarks', icon: 'bookmark', badge: 5 },
        { id: 'views', label: 'Views', icon: 'eye', badge: 8 },
    ];

    return (
        <PillBar
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
        />
    );
};

// Small size
export const SmallSize = () => {
    const [activeTab, setActiveTab] = useState('layout');

    const tabs = [
        { id: 'presence', label: 'Presence', icon: 'users' },
        { id: 'layout', label: 'Layout', icon: 'layers' },
        { id: 'homepoints', label: 'Homepoints', icon: 'home' },
    ];

    return (
        <PillBar
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            size="sm"
        />
    );
};

// With disabled tab
export const WithDisabledTab = () => {
    const [activeTab, setActiveTab] = useState('layout');

    const tabs = [
        { id: 'presence', label: 'Presence', icon: 'users', disabled: true },
        { id: 'layout', label: 'Layout', icon: 'layers' },
        { id: 'homepoints', label: 'Homepoints', icon: 'home' },
    ];

    return (
        <PillBar
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
        />
    );
};

// Color variants showcase
export const ColorVariants = () => {
    const [activeTab, setActiveTab] = useState('blue');

    const tabs = [
        { id: 'blue', label: 'Blue', color: 'blue' },
        { id: 'green', label: 'Green', color: 'green' },
        { id: 'pink', label: 'Pink', color: 'pink' },
        { id: 'amber', label: 'Amber', color: 'amber' },
        { id: 'teal', label: 'Teal', color: 'teal' },
        { id: 'purple', label: 'Purple', color: 'purple' },
    ];

    return (
        <PillBar
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
        />
    );
};

// In context - panel header
export const InPanelHeader = () => {
    const [activeTab, setActiveTab] = useState('datasets');

    const tabs = [
        { id: 'datasets', label: 'Datasets', icon: 'folder', color: 'teal' },
        { id: 'views', label: 'Views', icon: 'eye', badge: 4, color: 'blue' },
    ];

    return (
        <div style={{
            width: '280px',
            background: '#1a1a1a',
            borderRadius: '8px',
            overflow: 'hidden'
        }}>
            <div style={{
                padding: '12px',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
                <PillBar
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />
            </div>
            <div style={{
                padding: '16px',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '13px'
            }}>
                {activeTab === 'datasets' ? 'Datasets content...' : 'Views content...'}
            </div>
        </div>
    );
};