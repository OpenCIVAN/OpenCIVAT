// src/stories/molecules/TabButton.stories.jsx
import React, { useState } from 'react';
import { TabButton } from '@UI/react/components/molecules';

export default {
    title: 'Molecules/TabButton',
    component: TabButton,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
Tab or navigation button with optional badge.

Use for:
- Activity bar tabs
- Panel tabs
- Navigation items
                `,
            },
        },
    },
    argTypes: {
        icon: { control: 'text' },
        label: { control: 'text' },
        active: { control: 'boolean' },
        badge: { control: 'number' },
        badgeColor: { control: 'select', options: ['default', 'primary', 'danger', 'success', 'warning'] },
        size: { control: 'select', options: ['sm', 'md', 'lg'] },
        orientation: { control: 'select', options: ['horizontal', 'vertical'] },
        disabled: { control: 'boolean' },
    },
};

export const Default = {
    args: {
        icon: 'folder',
        label: 'Files',
    },
};

export const Active = {
    args: {
        icon: 'folder',
        label: 'Files',
        active: true,
    },
};

export const WithBadge = {
    args: {
        icon: 'bell',
        label: 'Notifications',
        badge: 5,
        badgeColor: 'danger',
    },
};

export const Vertical = {
    args: {
        icon: 'home',
        label: 'Home',
        orientation: 'vertical',
    },
};

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <TabButton icon="gear" label="Small" size="sm" />
            <TabButton icon="gear" label="Medium" size="md" />
            <TabButton icon="gear" label="Large" size="lg" />
        </div>
    ),
};

export const ActivityBar = {
    render: () => {
        const [active, setActive] = useState('explorer');
        const tabs = [
            { id: 'explorer', icon: 'folder', label: 'Explorer' },
            { id: 'search', icon: 'search', label: 'Search' },
            { id: 'git', icon: 'git-branch', label: 'Git', badge: 3 },
            { id: 'debug', icon: 'bug', label: 'Debug' },
            { id: 'extensions', icon: 'puzzle', label: 'Extensions', badge: 12 },
        ];

        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                padding: '8px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                width: '60px',
            }}>
                {tabs.map(tab => (
                    <TabButton
                        key={tab.id}
                        icon={tab.icon}
                        label={tab.label}
                        badge={tab.badge}
                        active={active === tab.id}
                        orientation="vertical"
                        onClick={() => setActive(tab.id)}
                    />
                ))}
            </div>
        );
    },
};

export const HorizontalTabs = {
    render: () => {
        const [active, setActive] = useState('overview');
        const tabs = [
            { id: 'overview', icon: 'layout', label: 'Overview' },
            { id: 'analytics', icon: 'chart', label: 'Analytics' },
            { id: 'reports', icon: 'file-text', label: 'Reports' },
            { id: 'settings', icon: 'gear', label: 'Settings' },
        ];

        return (
            <div style={{
                display: 'flex',
                gap: '4px',
                padding: '4px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
            }}>
                {tabs.map(tab => (
                    <TabButton
                        key={tab.id}
                        icon={tab.icon}
                        label={tab.label}
                        active={active === tab.id}
                        orientation="horizontal"
                        onClick={() => setActive(tab.id)}
                    />
                ))}
            </div>
        );
    },
};

export const Colors = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <TabButton icon="folder" label="Blue" color="blue" active />
                <TabButton icon="folder" label="Teal" color="teal" active />
                <TabButton icon="folder" label="Purple" color="purple" active />
                <TabButton icon="folder" label="Amber" color="amber" active />
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <TabButton icon="folder" label="Green" color="green" active />
                <TabButton icon="folder" label="Red" color="red" active />
                <TabButton icon="folder" label="Pink" color="pink" active />
                <TabButton icon="folder" label="Indigo" color="indigo" active />
            </div>
        </div>
    ),
};

export const ColoredActivityBar = {
    render: () => {
        const [active, setActive] = useState('files');
        const tabs = [
            { id: 'files', icon: 'folder', label: 'Files', color: 'blue' },
            { id: 'data', icon: 'database', label: 'Data', color: 'teal' },
            { id: 'insights', icon: 'chart', label: 'Insights', color: 'green' },
            { id: 'collab', icon: 'users', label: 'Collab', color: 'pink' },
            { id: 'settings', icon: 'gear', label: 'Settings', color: 'amber' },
        ];

        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                padding: '8px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                width: '60px',
            }}>
                {tabs.map(tab => (
                    <TabButton
                        key={tab.id}
                        icon={tab.icon}
                        label={tab.label}
                        color={tab.color}
                        active={active === tab.id}
                        orientation="vertical"
                        onClick={() => setActive(tab.id)}
                    />
                ))}
            </div>
        );
    },
};

export const EtchedVariant = {
    render: () => {
        const [active, setActive] = useState('files');
        const tabs = [
            { id: 'files', icon: 'folderOpen', label: 'Files', color: 'blue' },
            { id: 'datasets', icon: 'database', label: 'Datasets', color: 'teal' },
            { id: 'views', icon: 'layout', label: 'Views', color: 'purple' },
            { id: 'tools', icon: 'wrench', label: 'Tools', color: 'amber' },
            { id: 'collab', icon: 'users', label: 'Collab', color: 'pink' },
        ];

        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                padding: '8px',
                background: '#1a1a2e',
                borderRadius: '8px',
                width: '52px',
            }}>
                {tabs.map(tab => (
                    <TabButton
                        key={tab.id}
                        icon={tab.icon}
                        label={tab.label}
                        color={tab.color}
                        variant="etched"
                        iconOnly
                        active={active === tab.id}
                        onClick={() => setActive(tab.id)}
                    />
                ))}
            </div>
        );
    },
};

export const EtchedActivityBar = {
    render: () => {
        const [active, setActive] = useState('files');
        const tabs = [
            { id: 'files', icon: 'folderOpen', color: 'blue', label: 'Files' },
            { id: 'datasets', icon: 'database', color: 'teal', label: 'Datasets' },
            { id: 'views', icon: 'layout', color: 'purple', label: 'Views' },
            { id: 'tools', icon: 'wrench', color: 'amber', label: 'Instance Tools' },
            { id: 'layout', icon: 'grid', color: 'green', label: 'Layout' },
            { id: 'annotations', icon: 'messageSquare', color: 'pink', label: 'Annotations' },
        ];

        const activeTab = tabs.find(t => t.id === active);

        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 0',
                background: '#1e1e2e',
                borderRight: `2px solid ${activeTab?.color === 'blue' ? 'rgba(74, 158, 255, 0.4)' :
                    activeTab?.color === 'teal' ? 'rgba(78, 205, 196, 0.4)' :
                    activeTab?.color === 'purple' ? 'rgba(168, 85, 247, 0.4)' :
                    activeTab?.color === 'amber' ? 'rgba(245, 158, 11, 0.4)' :
                    activeTab?.color === 'green' ? 'rgba(34, 197, 94, 0.4)' :
                    activeTab?.color === 'pink' ? 'rgba(236, 72, 153, 0.4)' : 'transparent'}`,
                width: '48px',
                height: '320px',
            }}>
                {tabs.map(tab => (
                    <TabButton
                        key={tab.id}
                        icon={tab.icon}
                        label={tab.label}
                        color={tab.color}
                        variant="etched"
                        iconOnly
                        active={active === tab.id}
                        onClick={() => setActive(tab.id)}
                    />
                ))}
            </div>
        );
    },
};
