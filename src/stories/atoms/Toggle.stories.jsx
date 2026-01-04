// src/stories/atoms/Toggle.stories.jsx
import React, { useState } from 'react';
import { Toggle } from '@UI/react/components/atoms';

export default {
    title: 'Atoms/Toggle',
    component: Toggle,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
Switch/checkbox control.

Use for:
- Boolean settings
- Feature toggles
- On/off switches
                `,
            },
        },
    },
    argTypes: {
        checked: {
            control: 'boolean',
            description: 'Whether toggle is on',
        },
        size: {
            control: 'select',
            options: ['sm', 'md'],
            description: 'Size variant',
        },
        color: {
            control: 'color',
            description: 'Accent color when checked',
        },
        disabled: {
            control: 'boolean',
            description: 'Disable the toggle',
        },
        label: {
            control: 'text',
            description: 'Optional label text',
        },
        labelPosition: {
            control: 'select',
            options: ['left', 'right'],
            description: 'Label position',
        },
    },
};

export const Default = {
    args: {
        checked: false,
    },
};

export const Checked = {
    args: {
        checked: true,
    },
};

export const WithLabel = {
    args: {
        checked: true,
        label: 'Enable notifications',
    },
};

export const LabelLeft = {
    args: {
        checked: true,
        label: 'Dark mode',
        labelPosition: 'left',
    },
};

export const Disabled = {
    args: {
        checked: false,
        disabled: true,
        label: 'Feature locked',
    },
};

export const CustomColor = {
    args: {
        checked: true,
        color: '#22c55e',
        label: 'Active',
    },
};

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
                <Toggle checked size="sm" onChange={() => {}} />
                <p style={{ fontSize: '10px', margin: '8px 0 0', color: '#888' }}>Small</p>
            </div>
            <div style={{ textAlign: 'center' }}>
                <Toggle checked size="md" onChange={() => {}} />
                <p style={{ fontSize: '10px', margin: '8px 0 0', color: '#888' }}>Medium</p>
            </div>
        </div>
    ),
};

export const Interactive = {
    render: () => {
        const [values, setValues] = useState({
            notifications: true,
            darkMode: false,
            autoSave: true,
            sounds: false,
        });

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '250px' }}>
                <Toggle
                    checked={values.notifications}
                    onChange={(v) => setValues(s => ({ ...s, notifications: v }))}
                    label="Push notifications"
                />
                <Toggle
                    checked={values.darkMode}
                    onChange={(v) => setValues(s => ({ ...s, darkMode: v }))}
                    label="Dark mode"
                />
                <Toggle
                    checked={values.autoSave}
                    onChange={(v) => setValues(s => ({ ...s, autoSave: v }))}
                    label="Auto-save"
                    color="#22c55e"
                />
                <Toggle
                    checked={values.sounds}
                    onChange={(v) => setValues(s => ({ ...s, sounds: v }))}
                    label="Sound effects"
                />
            </div>
        );
    },
};

export const SettingsPanel = {
    render: () => {
        const [settings, setSettings] = useState({
            grid: true,
            labels: true,
            markers: false,
            overlays: true,
        });

        return (
            <div style={{
                background: 'rgba(255,255,255,0.05)',
                padding: '16px',
                borderRadius: '8px',
                minWidth: '220px',
            }}>
                <h4 style={{ margin: '0 0 16px', fontSize: '13px', color: '#e0e0e0' }}>Display Options</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <Toggle
                        checked={settings.grid}
                        onChange={(v) => setSettings(s => ({ ...s, grid: v }))}
                        label="Show grid"
                        size="sm"
                    />
                    <Toggle
                        checked={settings.labels}
                        onChange={(v) => setSettings(s => ({ ...s, labels: v }))}
                        label="Show labels"
                        size="sm"
                    />
                    <Toggle
                        checked={settings.markers}
                        onChange={(v) => setSettings(s => ({ ...s, markers: v }))}
                        label="Show markers"
                        size="sm"
                    />
                    <Toggle
                        checked={settings.overlays}
                        onChange={(v) => setSettings(s => ({ ...s, overlays: v }))}
                        label="Show overlays"
                        size="sm"
                    />
                </div>
            </div>
        );
    },
};
