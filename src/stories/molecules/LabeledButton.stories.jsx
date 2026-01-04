// src/stories/molecules/LabeledButton.stories.jsx
import React from 'react';
import { LabeledButton } from '@UI/react/components/molecules';

export default {
    title: 'Molecules/LabeledButton',
    component: LabeledButton,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
Icon button with visible text label.

Use for:
- Footer action buttons
- Toolbar buttons with labels
- ScratchPad controls
                `,
            },
        },
    },
    argTypes: {
        icon: { control: 'text' },
        label: { control: 'text' },
        active: { control: 'boolean' },
        accent: { control: 'color' },
        size: { control: 'select', options: ['sm', 'md', 'lg'] },
        variant: { control: 'select', options: ['ghost', 'secondary', 'primary'] },
        disabled: { control: 'boolean' },
        loading: { control: 'boolean' },
    },
};

export const Default = {
    args: {
        icon: 'save',
        label: 'Save',
    },
};

export const Active = {
    args: {
        icon: 'play',
        label: 'Playing',
        active: true,
    },
};

export const WithAccent = {
    args: {
        icon: 'star',
        label: 'Favorite',
        active: true,
        accent: '#f7dc6f',
    },
};

export const Loading = {
    args: {
        icon: 'upload',
        label: 'Uploading...',
        loading: true,
    },
};

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <LabeledButton icon="download" label="Small" size="sm" />
            <LabeledButton icon="download" label="Medium" size="md" />
            <LabeledButton icon="download" label="Large" size="lg" />
        </div>
    ),
};

export const Variants = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <LabeledButton icon="edit" label="Ghost" variant="ghost" />
            <LabeledButton icon="edit" label="Secondary" variant="secondary" />
            <LabeledButton icon="edit" label="Primary" variant="primary" />
        </div>
    ),
};

export const ToolbarExample = {
    render: () => (
        <div style={{
            display: 'flex',
            gap: '8px',
            padding: '8px 12px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
        }}>
            <LabeledButton icon="play" label="Play" />
            <LabeledButton icon="pause" label="Pause" />
            <LabeledButton icon="stop" label="Stop" />
            <LabeledButton icon="refresh" label="Reset" />
        </div>
    ),
};
