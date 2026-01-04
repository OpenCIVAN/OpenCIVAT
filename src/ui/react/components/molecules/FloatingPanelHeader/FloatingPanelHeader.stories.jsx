// src/ui/react/components/molecules/FloatingPanelHeader/FloatingPanelHeader.stories.jsx
import React from 'react';
import { FloatingPanelHeader } from './FloatingPanelHeader';

export default {
    title: 'Molecules/FloatingPanelHeader',
    component: FloatingPanelHeader,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        color: {
            control: 'select',
            options: ['blue', 'purple', 'teal', 'amber', 'red', 'green'],
        },
        onToggleMinimize: { action: 'toggle minimize' },
        onDock: { action: 'dock' },
        onClose: { action: 'close' },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f', width: '350px' }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    args: {
        title: 'Panel Title',
        onClose: () => {},
    },
};

export const WithIcon = {
    args: {
        title: 'Properties',
        icon: 'sliders',
        onClose: () => {},
    },
};

export const WithAllControls = {
    args: {
        title: 'Floating Panel',
        icon: 'layers',
        onToggleMinimize: () => {},
        onDock: () => {},
        onClose: () => {},
    },
};

export const Minimized = {
    args: {
        title: 'Minimized',
        icon: 'box',
        isMinimized: true,
        onToggleMinimize: () => {},
        onClose: () => {},
    },
};

export const NoDragHandle = {
    args: {
        title: 'No Drag Handle',
        icon: 'settings',
        showDragHandle: false,
        onClose: () => {},
    },
};

export const Colors = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <FloatingPanelHeader title="Blue" icon="file" color="blue" onClose={() => {}} />
            <FloatingPanelHeader title="Purple" icon="database" color="purple" onClose={() => {}} />
            <FloatingPanelHeader title="Teal" icon="users" color="teal" onClose={() => {}} />
            <FloatingPanelHeader title="Amber" icon="bell" color="amber" onClose={() => {}} />
        </div>
    ),
};

export const InFloatingPanel = {
    render: () => (
        <div style={{
            background: '#1a1a2e',
            borderRadius: '8px',
            border: '1px solid #374151',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            overflow: 'hidden',
        }}>
            <FloatingPanelHeader
                title="Canvas Navigator"
                icon="move"
                color="teal"
                onToggleMinimize={() => {}}
                onDock={() => {}}
                onClose={() => {}}
            />
            <div style={{ padding: '16px', color: '#9ca3af', minHeight: '100px' }}>
                Navigator content here
            </div>
        </div>
    ),
};

export const WithCustomContent = {
    render: () => (
        <FloatingPanelHeader
            title="Custom"
            icon="settings"
            onClose={() => {}}
        >
            <span style={{ color: '#9ca3af', fontSize: '12px', marginRight: '8px' }}>
                3 items
            </span>
        </FloatingPanelHeader>
    ),
};
