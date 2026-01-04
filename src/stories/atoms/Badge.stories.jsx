// src/stories/atoms/Badge.stories.jsx
import React from 'react';
import { Badge, Icon } from '@UI/react/components/atoms';

export default {
    title: 'Atoms/Badge',
    component: Badge,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
Small status or count indicator.

Use for:
- Notification counts
- Tab badges
- Status labels
                `,
            },
        },
    },
    argTypes: {
        children: {
            control: 'text',
            description: 'Badge content',
        },
        count: {
            control: 'number',
            description: 'Numeric count (alternative to children)',
        },
        dot: {
            control: 'boolean',
            description: 'Show as dot only, no content',
        },
        color: {
            control: 'select',
            options: ['default', 'primary', 'danger', 'success', 'warning'],
            description: 'Badge color preset',
        },
        size: {
            control: 'select',
            options: ['sm', 'md'],
            description: 'Size variant',
        },
        variant: {
            control: 'select',
            options: ['filled', 'outline'],
            description: 'Style variant',
        },
        max: {
            control: 'number',
            description: 'Max count before showing "99+"',
        },
        pulse: {
            control: 'boolean',
            description: 'Show pulse animation',
        },
    },
};

// =============================================================================
// BASIC STORIES
// =============================================================================

export const Default = {
    args: {
        children: '5',
    },
};

export const WithCount = {
    args: {
        count: 42,
    },
};

export const MaxCount = {
    args: {
        count: 150,
        max: 99,
    },
    parameters: {
        docs: {
            description: {
                story: 'Counts above the max value show as "99+"',
            },
        },
    },
};

export const DotOnly = {
    args: {
        dot: true,
        color: 'danger',
    },
};

export const Pulsing = {
    args: {
        count: 3,
        color: 'danger',
        pulse: true,
    },
};

// =============================================================================
// COLOR VARIATIONS
// =============================================================================

export const Colors = {
    render: () => (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Badge color="default">12</Badge>
            <Badge color="primary">5</Badge>
            <Badge color="danger">3</Badge>
            <Badge color="success">OK</Badge>
            <Badge color="warning">!</Badge>
        </div>
    ),
};

export const OutlineVariant = {
    render: () => (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Badge color="default" variant="outline">12</Badge>
            <Badge color="primary" variant="outline">5</Badge>
            <Badge color="danger" variant="outline">3</Badge>
            <Badge color="success" variant="outline">OK</Badge>
            <Badge color="warning" variant="outline">!</Badge>
        </div>
    ),
};

// =============================================================================
// SIZE VARIATIONS
// =============================================================================

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
                <Badge size="sm" color="primary">5</Badge>
                <p style={{ fontSize: '10px', margin: '8px 0 0', color: '#888' }}>Small</p>
            </div>
            <div style={{ textAlign: 'center' }}>
                <Badge size="md" color="primary">5</Badge>
                <p style={{ fontSize: '10px', margin: '8px 0 0', color: '#888' }}>Medium</p>
            </div>
        </div>
    ),
};

// =============================================================================
// USE CASES
// =============================================================================

export const NotificationBadge = {
    render: () => (
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#888',
                }}>
                    <Icon name="bell" size={20} />
                </div>
                <div style={{ position: 'absolute', top: '-4px', right: '-4px' }}>
                    <Badge count={3} color="danger" size="sm" />
                </div>
            </div>
            <div style={{ position: 'relative', display: 'inline-block' }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#888',
                }}>
                    <Icon name="messageSquare" size={20} />
                </div>
                <div style={{ position: 'absolute', top: '-4px', right: '-4px' }}>
                    <Badge dot color="primary" />
                </div>
            </div>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Badges can be positioned absolutely to overlay icons or buttons.',
            },
        },
    },
};

export const TabBadges = {
    render: () => (
        <div style={{ display: 'flex', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#e0e0e0' }}>Inbox</span>
                <Badge count={12} color="primary" size="sm" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#e0e0e0' }}>Drafts</span>
                <Badge count={3} color="default" size="sm" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#e0e0e0' }}>Spam</span>
                <Badge count={99} max={50} color="danger" size="sm" />
            </div>
        </div>
    ),
};

export const StatusBadges = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Badge color="success">Active</Badge>
                <span style={{ color: '#888' }}>User is online</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Badge color="warning">Pending</Badge>
                <span style={{ color: '#888' }}>Awaiting approval</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Badge color="danger">Error</Badge>
                <span style={{ color: '#888' }}>Connection failed</span>
            </div>
        </div>
    ),
};
