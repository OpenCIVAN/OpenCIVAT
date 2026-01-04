// src/stories/atoms/StatusDot.stories.jsx
import React from 'react';
import { StatusDot } from '@UI/react/components/atoms';

export default {
    title: 'Atoms/StatusDot',
    component: StatusDot,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
Status indicator dot with predefined states.

Use for:
- User presence indicators
- Connection status
- Activity states
                `,
            },
        },
    },
    argTypes: {
        status: {
            control: 'select',
            options: ['online', 'offline', 'busy', 'away', 'loading'],
            description: 'Status state',
        },
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
            description: 'Size variant',
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

export const Online = {
    args: {
        status: 'online',
    },
};

export const Offline = {
    args: {
        status: 'offline',
    },
};

export const Busy = {
    args: {
        status: 'busy',
    },
};

export const Away = {
    args: {
        status: 'away',
    },
};

export const Loading = {
    args: {
        status: 'loading',
    },
    parameters: {
        docs: {
            description: {
                story: 'Loading status auto-enables pulse animation.',
            },
        },
    },
};

// =============================================================================
// ALL STATUSES
// =============================================================================

export const AllStatuses = {
    render: () => (
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            {['online', 'offline', 'busy', 'away', 'loading'].map(status => (
                <div key={status} style={{ textAlign: 'center' }}>
                    <StatusDot status={status} size="md" />
                    <p style={{ fontSize: '10px', margin: '8px 0 0', color: '#888', textTransform: 'capitalize' }}>
                        {status}
                    </p>
                </div>
            ))}
        </div>
    ),
};

// =============================================================================
// SIZE VARIATIONS
// =============================================================================

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            {['sm', 'md', 'lg'].map(size => (
                <div key={size} style={{ textAlign: 'center' }}>
                    <StatusDot status="online" size={size} />
                    <p style={{ fontSize: '10px', margin: '8px 0 0', color: '#888' }}>{size}</p>
                </div>
            ))}
        </div>
    ),
};

// =============================================================================
// USE CASES
// =============================================================================

export const UserPresence = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
                { status: 'online', name: 'Alice Johnson', role: 'Designer' },
                { status: 'busy', name: 'Bob Smith', role: 'Developer' },
                { status: 'away', name: 'Carol Williams', role: 'Manager' },
                { status: 'offline', name: 'David Brown', role: 'Analyst' },
            ].map(user => (
                <div key={user.name} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ position: 'relative' }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '14px',
                        }}>
                            {user.name.charAt(0)}
                        </div>
                        <div style={{ position: 'absolute', bottom: '-2px', right: '-2px' }}>
                            <StatusDot status={user.status} size="sm" />
                        </div>
                    </div>
                    <div>
                        <div style={{ color: '#e0e0e0', fontSize: '14px' }}>{user.name}</div>
                        <div style={{ color: '#888', fontSize: '11px' }}>{user.role}</div>
                    </div>
                </div>
            ))}
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'StatusDot is commonly used as a presence indicator on user avatars.',
            },
        },
    },
};

export const ConnectionStatus = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <StatusDot status="online" size="sm" />
                <span style={{ color: '#e0e0e0', fontSize: '13px' }}>Connected to server</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <StatusDot status="loading" size="sm" />
                <span style={{ color: '#e0e0e0', fontSize: '13px' }}>Reconnecting...</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <StatusDot status="offline" size="sm" />
                <span style={{ color: '#e0e0e0', fontSize: '13px' }}>Disconnected</span>
            </div>
        </div>
    ),
};

export const WithPulse = {
    render: () => (
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
                <StatusDot status="online" size="lg" pulse />
                <p style={{ fontSize: '10px', margin: '8px 0 0', color: '#888' }}>Live</p>
            </div>
            <div style={{ textAlign: 'center' }}>
                <StatusDot status="busy" size="lg" pulse />
                <p style={{ fontSize: '10px', margin: '8px 0 0', color: '#888' }}>Recording</p>
            </div>
        </div>
    ),
};
