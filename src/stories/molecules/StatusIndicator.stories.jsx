// src/stories/molecules/StatusIndicator.stories.jsx
import React from 'react';
import { StatusIndicator } from '@UI/react/components/molecules';

export default {
    title: 'Molecules/StatusIndicator',
    component: StatusIndicator,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
Status dot with label.

Use for:
- User presence indicators
- Connection status
- Service health indicators
                `,
            },
        },
    },
    argTypes: {
        status: { control: 'select', options: ['online', 'offline', 'busy', 'away', 'loading'] },
        label: { control: 'text' },
        size: { control: 'select', options: ['sm', 'md', 'lg'] },
        pulse: { control: 'boolean' },
        reverse: { control: 'boolean' },
    },
};

export const Default = {
    args: {
        status: 'online',
        label: 'Online',
    },
};

export const AllStatuses = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <StatusIndicator status="online" label="Online" />
            <StatusIndicator status="offline" label="Offline" />
            <StatusIndicator status="busy" label="Busy" />
            <StatusIndicator status="away" label="Away" />
            <StatusIndicator status="loading" label="Connecting..." pulse />
        </div>
    ),
};

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <StatusIndicator status="online" label="Small" size="sm" />
            <StatusIndicator status="online" label="Medium" size="md" />
            <StatusIndicator status="online" label="Large" size="lg" />
        </div>
    ),
};

export const Reversed = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <StatusIndicator status="online" label="Label first" reverse />
            <StatusIndicator status="busy" label="Do not disturb" reverse />
        </div>
    ),
};

export const Pulsing = {
    args: {
        status: 'loading',
        label: 'Syncing...',
        pulse: true,
    },
};

export const UserList = {
    render: () => (
        <div style={{
            width: '200px',
            padding: '12px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
        }}>
            <p style={{ color: '#888', fontSize: '11px', margin: '0 0 12px', textTransform: 'uppercase' }}>
                Team Members
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#e0e0e0' }}>Alice</span>
                    <StatusIndicator status="online" label="Online" size="sm" reverse />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#e0e0e0' }}>Bob</span>
                    <StatusIndicator status="busy" label="Busy" size="sm" reverse />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#e0e0e0' }}>Charlie</span>
                    <StatusIndicator status="away" label="Away" size="sm" reverse />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888' }}>Diana</span>
                    <StatusIndicator status="offline" label="Offline" size="sm" reverse />
                </div>
            </div>
        </div>
    ),
};

export const ServerStatus = {
    render: () => (
        <div style={{
            width: '280px',
            padding: '16px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
        }}>
            <h3 style={{ color: '#e0e0e0', margin: '0 0 16px', fontSize: '14px' }}>Service Health</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#e0e0e0' }}>API Server</span>
                    <StatusIndicator status="online" label="Healthy" size="sm" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#e0e0e0' }}>Database</span>
                    <StatusIndicator status="online" label="Healthy" size="sm" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#e0e0e0' }}>Cache</span>
                    <StatusIndicator status="busy" label="High Load" size="sm" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#e0e0e0' }}>WebSocket</span>
                    <StatusIndicator status="loading" label="Reconnecting" size="sm" pulse />
                </div>
            </div>
        </div>
    ),
};
