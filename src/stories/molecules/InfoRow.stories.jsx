// src/stories/molecules/InfoRow.stories.jsx
import React from 'react';
import { InfoRow } from '@UI/react/components/molecules';
import { Badge, StatusDot } from '@UI/react/components/atoms';

export default {
    title: 'Molecules/InfoRow',
    component: InfoRow,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
Label + value display row.

Use for:
- Property displays
- Metadata rows
- Settings displays
- Info panels
                `,
            },
        },
    },
    argTypes: {
        icon: { control: 'text' },
        label: { control: 'text' },
        value: { control: 'text' },
        size: { control: 'select', options: ['sm', 'md', 'lg'] },
        mono: { control: 'boolean' },
        truncate: { control: 'boolean' },
        inline: { control: 'boolean' },
    },
};

export const Default = {
    args: {
        label: 'Status',
        value: 'Active',
    },
};

export const WithIcon = {
    args: {
        icon: 'user',
        label: 'Owner',
        value: 'John Doe',
    },
};

export const Monospace = {
    args: {
        label: 'ID',
        value: 'usr_2x4k9m3n',
        mono: true,
    },
};

export const Truncated = {
    render: () => (
        <div style={{ width: '250px' }}>
            <InfoRow
                label="Path"
                value="/Users/documents/projects/very-long-project-name/src/components"
                truncate
                mono
            />
        </div>
    ),
};

export const Stacked = {
    render: () => (
        <div style={{ width: '250px' }}>
            <InfoRow
                label="Description"
                value="This is a longer description that spans multiple lines when not inline. It should wrap naturally within the container."
                inline={false}
            />
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Stacked layout with label above value for longer content.',
            },
        },
    },
};

export const Sizes = {
    render: () => (
        <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <InfoRow label="Small" value="Value" size="sm" />
            <InfoRow label="Medium" value="Value" size="md" />
            <InfoRow label="Large" value="Value" size="lg" />
        </div>
    ),
};

export const WithCustomValue = {
    render: () => (
        <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <InfoRow
                label="Status"
                value={<Badge color="success">Active</Badge>}
            />
            <InfoRow
                label="Connection"
                value={
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <StatusDot status="online" size="sm" />
                        <span style={{ color: '#4ecdc4', fontSize: '13px' }}>Connected</span>
                    </span>
                }
            />
        </div>
    ),
};

export const MetadataPanel = {
    render: () => (
        <div style={{
            width: '320px',
            padding: '16px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
        }}>
            <h3 style={{ color: '#e0e0e0', margin: '0 0 16px', fontSize: '14px' }}>File Properties</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <InfoRow icon="file" label="Name" value="report.csv" />
                <InfoRow icon="database" label="Size" value="2.4 MB" />
                <InfoRow icon="calendar" label="Created" value="Jan 15, 2024" />
                <InfoRow icon="clock" label="Modified" value="2 hours ago" />
                <InfoRow icon="user" label="Owner" value="admin@example.com" truncate />
                <InfoRow icon="tag" label="Type" value="CSV Spreadsheet" />
            </div>
        </div>
    ),
};

export const SystemInfo = {
    render: () => (
        <div style={{
            width: '350px',
            padding: '16px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
        }}>
            <h3 style={{ color: '#e0e0e0', margin: '0 0 16px', fontSize: '14px' }}>System Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <InfoRow label="Version" value="2.4.1" mono />
                <InfoRow label="Build" value="2024.01.15.1234" mono />
                <InfoRow label="Environment" value="Production" />
                <InfoRow label="Region" value="US-West-2" />
                <InfoRow label="Memory Usage" value="1.2 GB / 4 GB" />
                <InfoRow label="CPU" value="23%" />
                <InfoRow label="Uptime" value="14d 6h 32m" mono />
            </div>
        </div>
    ),
};

export const SettingsDisplay = {
    render: () => (
        <div style={{
            width: '300px',
            padding: '16px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
        }}>
            <h3 style={{ color: '#e0e0e0', margin: '0 0 16px', fontSize: '14px' }}>Current Settings</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <InfoRow
                    label="Theme"
                    value={<Badge color="default" variant="outline">Dark</Badge>}
                />
                <InfoRow
                    label="Notifications"
                    value={<Badge color="success">Enabled</Badge>}
                />
                <InfoRow
                    label="Auto-save"
                    value={<Badge color="primary">Every 5 min</Badge>}
                />
                <InfoRow
                    label="Language"
                    value="English (US)"
                />
            </div>
        </div>
    ),
};
