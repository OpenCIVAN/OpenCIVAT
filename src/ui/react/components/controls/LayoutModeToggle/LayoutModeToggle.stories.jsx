// src/ui/react/components/controls/LayoutModeToggle/LayoutModeToggle.stories.jsx
import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

const MODES = ['normal', 'isolation', 'subset'];

const MODE_CONFIG = {
    normal: { icon: 'grid3x3', label: 'Normal', color: '#60a5fa' },
    isolation: { icon: 'maximize2', label: 'Isolation', color: '#f59e0b' },
    subset: { icon: 'layers', label: 'Subset', color: '#a78bfa' },
};

// Mock LayoutModeToggle for Storybook
const MockLayoutModeToggle = ({
    mode = 'normal',
    onModeChange,
    compact = false,
    disabled = false,
    disabledModes = [],
}) => {
    return (
        <div
            style={{
                display: 'flex',
                gap: '2px',
                padding: '3px',
                background: '#1a1a2e',
                borderRadius: '8px',
            }}
            role="group"
            aria-label="Layout mode"
        >
            {MODES.map(m => {
                const config = MODE_CONFIG[m];
                const isActive = mode === m;
                const isDisabled = disabled || disabledModes.includes(m);

                return (
                    <button
                        key={m}
                        onClick={() => !isDisabled && onModeChange?.(m)}
                        disabled={isDisabled}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: compact ? '8px' : '8px 12px',
                            background: isActive ? `rgba(${m === 'normal' ? '96, 165, 250' : m === 'isolation' ? '245, 158, 11' : '167, 139, 250'}, 0.15)` : 'transparent',
                            border: 'none',
                            borderRadius: '6px',
                            color: isActive ? config.color : '#6b7280',
                            fontSize: '12px',
                            fontWeight: isActive ? 600 : 400,
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            opacity: isDisabled ? 0.4 : 1,
                            transition: 'all 0.2s',
                        }}
                        title={config.label}
                    >
                        <Icon name={config.icon} size={14} />
                        {!compact && <span>{config.label}</span>}
                    </button>
                );
            })}
        </div>
    );
};

// Interactive wrapper
const InteractiveToggle = (props) => {
    const [mode, setMode] = useState(props.mode || 'normal');
    return <MockLayoutModeToggle {...props} mode={mode} onModeChange={setMode} />;
};

export default {
    title: 'Controls/LayoutModeToggle',
    component: MockLayoutModeToggle,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        mode: {
            control: 'select',
            options: MODES,
        },
        compact: { control: 'boolean' },
        disabled: { control: 'boolean' },
        onModeChange: { action: 'mode changed' },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f' }}>
                <Story />
            </div>
        ),
    ],
};

export const Normal = {
    args: {
        mode: 'normal',
    },
};

export const Isolation = {
    args: {
        mode: 'isolation',
    },
};

export const Subset = {
    args: {
        mode: 'subset',
    },
};

export const Compact = {
    args: {
        mode: 'normal',
        compact: true,
    },
};

export const Disabled = {
    args: {
        mode: 'normal',
        disabled: true,
    },
};

export const Interactive = {
    render: () => <InteractiveToggle />,
};

export const CompactInteractive = {
    render: () => <InteractiveToggle compact />,
};

export const WithDisabledModes = {
    args: {
        mode: 'normal',
        disabledModes: ['subset'],
    },
};

export const InToolbar = {
    render: () => (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '8px 16px',
            background: '#1a1a2e',
            borderRadius: '8px',
        }}>
            <span style={{ color: '#6b7280', fontSize: '12px' }}>View:</span>
            <InteractiveToggle />
            <div style={{ flex: 1 }} />
            <span style={{ color: '#9ca3af', fontSize: '11px' }}>3 views selected</span>
        </div>
    ),
};
