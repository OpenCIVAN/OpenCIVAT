/**
 * @file PresenceIndicator.stories.jsx
 * @description Storybook stories for PresenceIndicator component
 */

import React from 'react';
import { PresenceIndicator } from './PresenceIndicator';

export default {
    title: 'Atoms/PresenceIndicator',
    component: PresenceIndicator,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        status: {
            control: 'select',
            options: ['online', 'idle', 'away', 'dnd', 'offline', 'active', 'busy'],
        },
        size: {
            control: 'select',
            options: ['xs', 'sm', 'md', 'lg'],
        },
        variant: {
            control: 'select',
            options: ['dot', 'icon'],
        },
        showLabel: {
            control: 'boolean',
        },
        pulse: {
            control: 'boolean',
        },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '20px', background: '#1a1a2e' }}>
                <Story />
            </div>
        ),
    ],
};

// =============================================================================
// STORIES
// =============================================================================

export const Default = {
    args: {
        status: 'online',
        size: 'md',
        variant: 'dot',
    },
};

export const AllStatuses = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <PresenceIndicator status="online" showLabel />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <PresenceIndicator status="idle" showLabel />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <PresenceIndicator status="away" showLabel />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <PresenceIndicator status="dnd" showLabel />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <PresenceIndicator status="offline" showLabel />
            </div>
        </div>
    ),
};

export const AllSizes = {
    render: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <PresenceIndicator status="online" size="xs" />
                <span style={{ color: '#666', fontSize: '10px' }}>xs</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <PresenceIndicator status="online" size="sm" />
                <span style={{ color: '#666', fontSize: '10px' }}>sm</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <PresenceIndicator status="online" size="md" />
                <span style={{ color: '#666', fontSize: '10px' }}>md</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <PresenceIndicator status="online" size="lg" />
                <span style={{ color: '#666', fontSize: '10px' }}>lg</span>
            </div>
        </div>
    ),
};

export const DotVariant = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px' }}>
            <PresenceIndicator status="online" variant="dot" />
            <PresenceIndicator status="idle" variant="dot" />
            <PresenceIndicator status="away" variant="dot" />
            <PresenceIndicator status="dnd" variant="dot" />
            <PresenceIndicator status="offline" variant="dot" />
        </div>
    ),
};

export const IconVariant = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px' }}>
            <PresenceIndicator status="online" variant="icon" />
            <PresenceIndicator status="idle" variant="icon" />
            <PresenceIndicator status="away" variant="icon" />
            <PresenceIndicator status="dnd" variant="icon" />
            <PresenceIndicator status="offline" variant="icon" />
        </div>
    ),
};

export const WithLabels = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <PresenceIndicator status="online" showLabel />
            <PresenceIndicator status="idle" showLabel />
            <PresenceIndicator status="away" showLabel />
            <PresenceIndicator status="dnd" showLabel />
            <PresenceIndicator status="offline" showLabel />
        </div>
    ),
};

export const IconWithLabels = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <PresenceIndicator status="online" variant="icon" showLabel />
            <PresenceIndicator status="idle" variant="icon" showLabel />
            <PresenceIndicator status="away" variant="icon" showLabel />
            <PresenceIndicator status="dnd" variant="icon" showLabel />
            <PresenceIndicator status="offline" variant="icon" showLabel />
        </div>
    ),
};

export const WithPulse = {
    render: () => (
        <div style={{ display: 'flex', gap: '24px' }}>
            <PresenceIndicator status="online" pulse />
            <PresenceIndicator status="online" pulse size="lg" />
            <PresenceIndicator status="online" pulse showLabel />
        </div>
    ),
};

export const StatusAliases = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ color: '#888', fontSize: '12px', marginBottom: '8px' }}>
                Status aliases (for compatibility):
            </div>
            <PresenceIndicator status="active" showLabel />
            <PresenceIndicator status="busy" showLabel />
        </div>
    ),
};

export const InContext = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Simulated user row */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '6px',
            }}>
                <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#4CAF50',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 600,
                }}>
                    AC
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ color: '#fff', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <PresenceIndicator status="online" size="xs" />
                        Alice Chen
                    </div>
                    <div style={{ color: '#888', fontSize: '11px' }}>Working on feature branch</div>
                </div>
            </div>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '6px',
            }}>
                <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#2196F3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 600,
                }}>
                    BS
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ color: '#fff', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <PresenceIndicator status="idle" size="xs" />
                        Bob Smith
                    </div>
                    <div style={{ color: '#888', fontSize: '11px' }}>Away for 5 minutes</div>
                </div>
            </div>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '6px',
                opacity: 0.6,
            }}>
                <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#607D8B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 600,
                }}>
                    CD
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ color: '#fff', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <PresenceIndicator status="offline" size="xs" />
                        Carol Davis
                    </div>
                    <div style={{ color: '#888', fontSize: '11px' }}>Last seen 2 hours ago</div>
                </div>
            </div>
        </div>
    ),
};