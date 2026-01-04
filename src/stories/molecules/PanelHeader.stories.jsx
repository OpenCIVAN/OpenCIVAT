// src/stories/molecules/PanelHeader.stories.jsx
import React, { useState } from 'react';
import { PanelHeader } from '@UI/react/components/molecules';
import { Badge } from '@UI/react/components/atoms';

export default {
    title: 'Molecules/PanelHeader',
    component: PanelHeader,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
Panel header with title, icon, and action buttons.

Use for:
- Floating panel headers
- Docked panel headers
- Card headers
- Section headers with actions
                `,
            },
        },
    },
    argTypes: {
        title: { control: 'text' },
        icon: { control: 'text' },
        color: { control: 'select', options: ['blue', 'purple', 'teal', 'amber', 'red', 'green'] },
        size: { control: 'select', options: ['sm', 'md', 'lg'] },
        showDragHandle: { control: 'boolean' },
        minimized: { control: 'boolean' },
    },
};

export const Default = {
    render: () => (
        <div style={{ width: '300px' }}>
            <PanelHeader
                title="Panel Title"
                onClose={() => console.log('close')}
            />
        </div>
    ),
};

export const WithIcon = {
    render: () => (
        <div style={{ width: '300px' }}>
            <PanelHeader
                icon="folder"
                title="File Explorer"
                onMinimize={() => {}}
                onClose={() => {}}
            />
        </div>
    ),
};

export const WithDragHandle = {
    render: () => (
        <div style={{ width: '300px' }}>
            <PanelHeader
                icon="layout"
                title="Draggable Panel"
                showDragHandle
                onMinimize={() => {}}
                onDock={() => {}}
                onClose={() => {}}
            />
        </div>
    ),
};

export const Colors = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '300px' }}>
            <PanelHeader icon="folder" title="Blue (default)" color="blue" onClose={() => {}} />
            <PanelHeader icon="folder" title="Purple" color="purple" onClose={() => {}} />
            <PanelHeader icon="folder" title="Teal" color="teal" onClose={() => {}} />
            <PanelHeader icon="folder" title="Amber" color="amber" onClose={() => {}} />
            <PanelHeader icon="folder" title="Red" color="red" onClose={() => {}} />
            <PanelHeader icon="folder" title="Green" color="green" onClose={() => {}} />
        </div>
    ),
};

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '300px' }}>
            <div>
                <p style={{ color: '#888', fontSize: '12px', margin: '0 0 8px' }}>size="sm"</p>
                <PanelHeader icon="file" title="Small Header" size="sm" onClose={() => {}} />
            </div>
            <div>
                <p style={{ color: '#888', fontSize: '12px', margin: '0 0 8px' }}>size="md"</p>
                <PanelHeader icon="file" title="Medium Header" size="md" onClose={() => {}} />
            </div>
            <div>
                <p style={{ color: '#888', fontSize: '12px', margin: '0 0 8px' }}>size="lg"</p>
                <PanelHeader icon="file" title="Large Header" size="lg" onClose={() => {}} />
            </div>
        </div>
    ),
};

export const Minimizable = {
    render: () => {
        const [minimized, setMinimized] = useState(false);
        return (
            <div style={{ width: '300px' }}>
                <PanelHeader
                    icon="terminal"
                    title="Terminal"
                    minimized={minimized}
                    onMinimize={() => setMinimized(!minimized)}
                    onClose={() => {}}
                />
                {!minimized && (
                    <div style={{
                        padding: '12px',
                        background: 'rgba(255,255,255,0.03)',
                        color: '#888',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                    }}>
                        $ npm run build<br />
                        Building project...
                    </div>
                )}
            </div>
        );
    },
};

export const WithCustomActions = {
    render: () => (
        <div style={{ width: '350px' }}>
            <PanelHeader
                icon="settings"
                title="Settings"
                actions={[
                    { icon: 'refresh', onClick: () => {}, tooltip: 'Refresh' },
                    { icon: 'download', onClick: () => {}, tooltip: 'Export' },
                ]}
                onClose={() => {}}
            />
        </div>
    ),
};

export const WithChildContent = {
    render: () => (
        <div style={{ width: '350px' }}>
            <PanelHeader
                icon="bell"
                title="Notifications"
                onClose={() => {}}
            >
                <Badge count={5} color="danger" size="sm" />
            </PanelHeader>
        </div>
    ),
};

export const FloatingPanel = {
    render: () => {
        const [minimized, setMinimized] = useState(false);
        return (
            <div style={{
                width: '350px',
                background: 'rgba(30, 30, 45, 0.95)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                overflow: 'hidden',
            }}>
                <PanelHeader
                    icon="layers"
                    title="Layers"
                    color="purple"
                    showDragHandle
                    minimized={minimized}
                    onMinimize={() => setMinimized(!minimized)}
                    onDock={() => console.log('dock')}
                    onClose={() => console.log('close')}
                />
                {!minimized && (
                    <div style={{ padding: '12px' }}>
                        <div style={{ padding: '8px', color: '#e0e0e0', fontSize: '13px' }}>
                            Layer 1
                        </div>
                        <div style={{ padding: '8px', color: '#e0e0e0', fontSize: '13px' }}>
                            Layer 2
                        </div>
                        <div style={{ padding: '8px', color: '#e0e0e0', fontSize: '13px' }}>
                            Layer 3
                        </div>
                    </div>
                )}
            </div>
        );
    },
};

export const CardHeader = {
    render: () => (
        <div style={{
            width: '300px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
            overflow: 'hidden',
        }}>
            <PanelHeader
                icon="chart"
                title="Analytics"
                color="teal"
                size="sm"
                actions={[
                    { icon: 'more-vertical', onClick: () => {}, tooltip: 'More options' },
                ]}
            />
            <div style={{ padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4ecdc4' }}>
                    1,234
                </div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                    Total Views
                </div>
            </div>
        </div>
    ),
};

export const AllControls = {
    render: () => (
        <div style={{ width: '400px' }}>
            <PanelHeader
                icon="window"
                title="Full Featured Panel"
                color="amber"
                showDragHandle
                actions={[
                    { icon: 'refresh', onClick: () => {}, tooltip: 'Refresh' },
                    { icon: 'settings', onClick: () => {}, tooltip: 'Settings' },
                ]}
                onMinimize={() => console.log('minimize')}
                onMaximize={() => console.log('maximize')}
                onDock={() => console.log('dock')}
                onClose={() => console.log('close')}
            />
        </div>
    ),
};
