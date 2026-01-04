// src/stories/molecules/MenuItem.stories.jsx
import React from 'react';
import { MenuItem } from '@UI/react/components/molecules';
import { Divider } from '@UI/react/components/atoms';

export default {
    title: 'Molecules/MenuItem',
    component: MenuItem,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
Dropdown or context menu item.

Use for:
- Dropdown menus
- Context menus
- Action lists
- Command palettes
                `,
            },
        },
    },
    argTypes: {
        icon: { control: 'text' },
        label: { control: 'text' },
        shortcut: { control: 'text' },
        description: { control: 'text' },
        danger: { control: 'boolean' },
        disabled: { control: 'boolean' },
        selected: { control: 'boolean' },
    },
};

export const Default = {
    args: {
        icon: 'file',
        label: 'New File',
    },
};

export const WithShortcut = {
    args: {
        icon: 'save',
        label: 'Save',
        shortcut: '⌘S',
    },
};

export const WithDescription = {
    args: {
        icon: 'download',
        label: 'Export',
        description: 'Download as CSV or JSON',
    },
};

export const Danger = {
    args: {
        icon: 'trash',
        label: 'Delete',
        danger: true,
    },
};

export const Selected = {
    args: {
        label: 'Dark Theme',
        selected: true,
    },
};

export const Disabled = {
    args: {
        icon: 'lock',
        label: 'Restricted',
        disabled: true,
    },
};

export const ContextMenu = {
    render: () => (
        <div style={{
            width: '220px',
            padding: '4px',
            background: 'rgba(30, 30, 45, 0.98)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
            <MenuItem icon="eye" label="View" />
            <MenuItem icon="edit" label="Edit" shortcut="⌘E" />
            <MenuItem icon="copy" label="Duplicate" shortcut="⌘D" />
            <Divider spacing="sm" />
            <MenuItem icon="share" label="Share" />
            <MenuItem icon="download" label="Export" />
            <Divider spacing="sm" />
            <MenuItem icon="trash" label="Delete" danger shortcut="⌫" />
        </div>
    ),
};

export const SelectionMenu = {
    render: () => (
        <div style={{
            width: '180px',
            padding: '4px',
            background: 'rgba(30, 30, 45, 0.98)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)',
        }}>
            <MenuItem label="Light" />
            <MenuItem label="Dark" selected />
            <MenuItem label="System" />
        </div>
    ),
};

export const CommandPalette = {
    render: () => (
        <div style={{
            width: '400px',
            padding: '4px',
            background: 'rgba(30, 30, 45, 0.98)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)',
        }}>
            <MenuItem
                icon="file-plus"
                label="Create New File"
                description="Create a new empty file"
                shortcut="⌘N"
            />
            <MenuItem
                icon="folder-plus"
                label="Create New Folder"
                description="Create a new folder"
                shortcut="⌘⇧N"
            />
            <MenuItem
                icon="git-branch"
                label="Create Branch"
                description="Create a new git branch"
            />
            <MenuItem
                icon="terminal"
                label="Open Terminal"
                description="Open integrated terminal"
                shortcut="⌘`"
            />
        </div>
    ),
};
