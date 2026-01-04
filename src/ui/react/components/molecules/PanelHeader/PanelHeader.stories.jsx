// src/ui/react/components/molecules/PanelHeader/PanelHeader.stories.jsx
import React from 'react';
import { PanelHeader } from './PanelHeader';

export default {
    title: 'Molecules/PanelHeader',
    component: PanelHeader,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
        },
        color: {
            control: 'select',
            options: ['blue', 'purple', 'teal', 'amber', 'red', 'green'],
        },
        onMinimize: { action: 'minimize' },
        onMaximize: { action: 'maximize' },
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
    },
};

export const WithIcon = {
    args: {
        title: 'Settings',
        icon: 'settings',
    },
};

export const WithClose = {
    args: {
        title: 'Panel',
        icon: 'layers',
        onClose: () => {},
    },
};

export const WithAllControls = {
    args: {
        title: 'Floating Panel',
        icon: 'box',
        onMinimize: () => {},
        onMaximize: () => {},
        onDock: () => {},
        onClose: () => {},
    },
};

export const Minimized = {
    args: {
        title: 'Minimized Panel',
        icon: 'folder',
        minimized: true,
        onMinimize: () => {},
        onClose: () => {},
    },
};

export const WithDragHandle = {
    args: {
        title: 'Draggable Panel',
        icon: 'move',
        showDragHandle: true,
        onClose: () => {},
    },
};

export const WithCustomActions = {
    args: {
        title: 'Panel',
        icon: 'file',
        actions: [
            { icon: 'plus', onClick: () => {}, tooltip: 'Add item' },
            { icon: 'refresh', onClick: () => {}, tooltip: 'Refresh' },
            { icon: 'trash2', onClick: () => {}, tooltip: 'Delete', danger: true },
        ],
        onClose: () => {},
    },
};

export const Colors = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <PanelHeader title="Blue Panel" icon="file" color="blue" onClose={() => {}} />
            <PanelHeader title="Purple Panel" icon="database" color="purple" onClose={() => {}} />
            <PanelHeader title="Teal Panel" icon="users" color="teal" onClose={() => {}} />
            <PanelHeader title="Amber Panel" icon="bell" color="amber" onClose={() => {}} />
            <PanelHeader title="Green Panel" icon="check" color="green" onClose={() => {}} />
            <PanelHeader title="Red Panel" icon="alertTriangle" color="red" onClose={() => {}} />
        </div>
    ),
};

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <PanelHeader title="Small" icon="file" size="sm" onClose={() => {}} />
            <PanelHeader title="Medium" icon="file" size="md" onClose={() => {}} />
            <PanelHeader title="Large" icon="file" size="lg" onClose={() => {}} />
        </div>
    ),
};

export const InPanel = {
    render: () => (
        <div style={{
            background: '#1a1a2e',
            borderRadius: '8px',
            border: '1px solid #374151',
            overflow: 'hidden',
        }}>
            <PanelHeader
                title="Files"
                icon="folder"
                color="blue"
                onMinimize={() => {}}
                onClose={() => {}}
            />
            <div style={{ padding: '16px', color: '#9ca3af' }}>
                Panel content goes here...
            </div>
        </div>
    ),
};

export const FloatingPanel = {
    render: () => (
        <div style={{
            background: '#1a1a2e',
            borderRadius: '8px',
            border: '1px solid #374151',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            overflow: 'hidden',
        }}>
            <PanelHeader
                title="Properties"
                icon="sliders"
                showDragHandle
                onMinimize={() => {}}
                onMaximize={() => {}}
                onDock={() => {}}
                onClose={() => {}}
            />
            <div style={{ padding: '16px', color: '#9ca3af', minHeight: '100px' }}>
                Floating panel content
            </div>
        </div>
    ),
};
