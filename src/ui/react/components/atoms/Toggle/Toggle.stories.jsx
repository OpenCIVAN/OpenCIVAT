// src/ui/react/components/atoms/Toggle/Toggle.stories.jsx
import React, { useState } from 'react';
import { Toggle } from './Toggle';

export default {
    title: 'Atoms/Toggle',
    component: Toggle,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        size: {
            control: 'select',
            options: ['sm', 'md'],
        },
        labelPosition: {
            control: 'select',
            options: ['left', 'right'],
        },
        color: { control: 'color' },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f' }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    render: function DefaultStory() {
        const [checked, setChecked] = useState(false);
        return <Toggle checked={checked} onChange={setChecked} />;
    },
};

export const Checked = {
    render: function CheckedStory() {
        const [checked, setChecked] = useState(true);
        return <Toggle checked={checked} onChange={setChecked} />;
    },
};

export const WithLabel = {
    render: function WithLabelStory() {
        const [checked, setChecked] = useState(false);
        return <Toggle checked={checked} onChange={setChecked} label="Enable notifications" />;
    },
};

export const LabelLeft = {
    render: function LabelLeftStory() {
        const [checked, setChecked] = useState(true);
        return <Toggle checked={checked} onChange={setChecked} label="Dark mode" labelPosition="left" />;
    },
};

export const Disabled = {
    args: {
        checked: false,
        disabled: true,
    },
};

export const DisabledChecked = {
    args: {
        checked: true,
        disabled: true,
    },
};

export const CustomColor = {
    render: function CustomColorStory() {
        const [checked, setChecked] = useState(true);
        return <Toggle checked={checked} onChange={setChecked} color="#22c55e" />;
    },
};

export const Sizes = {
    render: function SizesStory() {
        const [small, setSmall] = useState(true);
        const [medium, setMedium] = useState(true);
        return (
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                <Toggle checked={small} onChange={setSmall} size="sm" label="Small" />
                <Toggle checked={medium} onChange={setMedium} size="md" label="Medium" />
            </div>
        );
    },
};

export const SettingsPanel = {
    render: function SettingsPanelStory() {
        const [settings, setSettings] = useState({
            notifications: true,
            sounds: false,
            darkMode: true,
            analytics: false,
        });

        const toggle = (key) => {
            setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
        };

        return (
            <div style={{
                background: '#1a1a2e',
                borderRadius: '8px',
                padding: '16px',
                width: '280px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
            }}>
                <Toggle
                    checked={settings.notifications}
                    onChange={() => toggle('notifications')}
                    label="Push notifications"
                />
                <Toggle
                    checked={settings.sounds}
                    onChange={() => toggle('sounds')}
                    label="Sound effects"
                />
                <Toggle
                    checked={settings.darkMode}
                    onChange={() => toggle('darkMode')}
                    label="Dark mode"
                />
                <Toggle
                    checked={settings.analytics}
                    onChange={() => toggle('analytics')}
                    label="Usage analytics"
                />
            </div>
        );
    },
};

export const AllStates = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', color: '#9ca3af' }}>
                <Toggle checked={false} onChange={() => {}} />
                <span>Unchecked</span>
            </div>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', color: '#9ca3af' }}>
                <Toggle checked={true} onChange={() => {}} />
                <span>Checked</span>
            </div>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', color: '#9ca3af' }}>
                <Toggle checked={false} disabled onChange={() => {}} />
                <span>Disabled unchecked</span>
            </div>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', color: '#9ca3af' }}>
                <Toggle checked={true} disabled onChange={() => {}} />
                <span>Disabled checked</span>
            </div>
        </div>
    ),
};
