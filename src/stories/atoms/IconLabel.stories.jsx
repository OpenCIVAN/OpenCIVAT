// src/stories/atoms/IconLabel.stories.jsx
import React from 'react';
import { IconLabel } from '@UI/react/components/atoms';

export default {
    title: 'Atoms/IconLabel',
    component: IconLabel,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
Icon + text label combination - the most common pairing in the UI.

Use for:
- Menu items
- Tab labels
- Info displays
- Navigation items
                `,
            },
        },
    },
    argTypes: {
        icon: {
            control: 'text',
            description: 'Icon name from registry',
        },
        label: {
            control: 'text',
            description: 'Text label',
        },
        size: {
            control: 'select',
            options: ['xs', 'sm', 'md', 'lg'],
            description: 'Size variant',
        },
        color: {
            control: 'color',
            description: 'Icon color',
        },
        subtle: {
            control: 'boolean',
            description: 'Use muted text styling',
        },
        reverse: {
            control: 'boolean',
            description: 'Put label before icon',
        },
        gap: {
            control: 'number',
            description: 'Custom gap in pixels',
        },
    },
};

// =============================================================================
// BASIC STORIES
// =============================================================================

export const Default = {
    args: {
        icon: 'settings',
        label: 'Settings',
    },
};

export const WithColor = {
    args: {
        icon: 'folder',
        label: 'Documents',
        color: '#3b82f6',
    },
};

export const Subtle = {
    args: {
        icon: 'clock',
        label: 'Last updated 2 hours ago',
        subtle: true,
    },
};

export const Reversed = {
    args: {
        icon: 'chevronRight',
        label: 'Continue',
        reverse: true,
    },
};

// =============================================================================
// SIZE VARIATIONS
// =============================================================================

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-start' }}>
            <IconLabel icon="file" label="Extra Small" size="xs" />
            <IconLabel icon="file" label="Small" size="sm" />
            <IconLabel icon="file" label="Medium" size="md" />
            <IconLabel icon="file" label="Large" size="lg" />
        </div>
    ),
};

// =============================================================================
// USE CASES
// =============================================================================

export const MenuItems = {
    render: () => (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            background: 'rgba(255,255,255,0.05)',
            padding: '8px',
            borderRadius: '8px',
            minWidth: '180px',
        }}>
            <div style={{ padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>
                <IconLabel icon="copy" label="Copy" size="sm" />
            </div>
            <div style={{ padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>
                <IconLabel icon="paste" label="Paste" size="sm" />
            </div>
            <div style={{ padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>
                <IconLabel icon="trash2" label="Delete" size="sm" color="#ef4444" />
            </div>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'IconLabel is ideal for menu items with icons.',
            },
        },
    },
};

export const TabLabels = {
    render: () => (
        <div style={{ display: 'flex', gap: '24px' }}>
            <IconLabel icon="folder" label="Files" size="sm" color="#3b82f6" />
            <IconLabel icon="users" label="Team" size="sm" />
            <IconLabel icon="settings" label="Settings" size="sm" />
        </div>
    ),
};

export const InfoDisplay = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <IconLabel icon="user" label="Created by John" size="sm" subtle />
            <IconLabel icon="calendar" label="March 15, 2024" size="sm" subtle />
            <IconLabel icon="clock" label="2 hours ago" size="sm" subtle />
        </div>
    ),
};

export const ColorVariations = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <IconLabel icon="checkCircle" label="Success" color="#22c55e" />
            <IconLabel icon="alertTriangle" label="Warning" color="#f59e0b" />
            <IconLabel icon="alertCircle" label="Error" color="#ef4444" />
            <IconLabel icon="info" label="Information" color="#3b82f6" />
        </div>
    ),
};
