// src/ui/react/components/controls/ViewModeToggle/ViewModeToggle.stories.jsx
// Storybook stories for ViewModeToggle component

import React, { useState } from 'react';
import { ViewModeToggle, ViewModeIndicator, VIEW_MODES } from './ViewModeToggle.jsx';
import './ViewModeToggle.scss';

export default {
    title: 'Controls/ViewModeToggle',
    component: ViewModeToggle,
    parameters: {
        layout: 'centered',
        backgrounds: {
            default: 'dark',
            values: [{ name: 'dark', value: '#1a1a1a' }],
        },
    },
    argTypes: {
        mode: {
            control: 'radio',
            options: [VIEW_MODES.DESKTOP, VIEW_MODES.VR],
        },
        vrAvailable: { control: 'boolean' },
        disabled: { control: 'boolean' },
        compact: { control: 'boolean' },
    },
};

// =============================================================================
// DECORATOR
// =============================================================================

const Decorator = (Story) => (
    <div style={{
        padding: '40px',
        background: '#1a1a1a',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
        <Story />
    </div>
);

// =============================================================================
// STORIES
// =============================================================================

export const Default = {
    decorators: [Decorator],
    args: {
        mode: VIEW_MODES.DESKTOP,
        vrAvailable: true,
        disabled: false,
        compact: false,
    },
    render: (args) => {
        const [mode, setMode] = useState(args.mode);
        return (
            <ViewModeToggle
                {...args}
                mode={mode}
                onModeChange={setMode}
            />
        );
    },
};

export const VRMode = {
    decorators: [Decorator],
    args: {
        mode: VIEW_MODES.VR,
        vrAvailable: true,
    },
    render: (args) => {
        const [mode, setMode] = useState(args.mode);
        return (
            <ViewModeToggle
                {...args}
                mode={mode}
                onModeChange={setMode}
            />
        );
    },
};

export const VRUnavailable = {
    decorators: [Decorator],
    args: {
        mode: VIEW_MODES.DESKTOP,
        vrAvailable: false,
    },
    render: (args) => (
        <div>
            <ViewModeToggle {...args} />
            <p style={{ marginTop: '16px', fontSize: '12px', color: '#808080' }}>
                VR button is disabled when WebXR is not available
            </p>
        </div>
    ),
};

export const Compact = {
    decorators: [Decorator],
    args: {
        mode: VIEW_MODES.DESKTOP,
        vrAvailable: true,
        compact: true,
    },
    render: (args) => {
        const [mode, setMode] = useState(args.mode);
        return (
            <div>
                <ViewModeToggle
                    {...args}
                    mode={mode}
                    onModeChange={setMode}
                />
                <p style={{ marginTop: '16px', fontSize: '12px', color: '#808080' }}>
                    Compact mode shows only icons
                </p>
            </div>
        );
    },
};

export const Disabled = {
    decorators: [Decorator],
    args: {
        mode: VIEW_MODES.DESKTOP,
        vrAvailable: true,
        disabled: true,
    },
};

export const Indicator = {
    decorators: [Decorator],
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
                <p style={{ marginBottom: '8px', fontSize: '11px', color: '#666' }}>Desktop Mode:</p>
                <ViewModeIndicator mode={VIEW_MODES.DESKTOP} />
            </div>
            <div>
                <p style={{ marginBottom: '8px', fontSize: '11px', color: '#666' }}>VR Mode:</p>
                <ViewModeIndicator mode={VIEW_MODES.VR} />
            </div>
            <div>
                <p style={{ marginBottom: '8px', fontSize: '11px', color: '#666' }}>Compact:</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <ViewModeIndicator mode={VIEW_MODES.DESKTOP} compact />
                    <ViewModeIndicator mode={VIEW_MODES.VR} compact />
                </div>
            </div>
        </div>
    ),
};

export const InSecondaryBar = {
    decorators: [Decorator],
    render: () => {
        const [mode, setMode] = useState(VIEW_MODES.DESKTOP);

        return (
            <div style={{ width: '100%', maxWidth: '800px' }}>
                <p style={{ marginBottom: '16px', fontSize: '12px', color: '#808080' }}>
                    As it would appear in the SecondaryBottomBar left zone:
                </p>

                {/* Mock secondary bar */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    height: '28px',
                    background: '#222',
                    borderRadius: '4px',
                    border: '1px solid #333',
                }}>
                    {/* Left zone */}
                    <div style={{
                        width: '180px',
                        padding: '0 12px',
                        borderRight: '1px solid #333',
                        display: 'flex',
                        alignItems: 'center',
                    }}>
                        <ViewModeToggle
                            mode={mode}
                            onModeChange={setMode}
                            vrAvailable={true}
                        />
                    </div>

                    {/* Center zone */}
                    <div style={{
                        flex: 1,
                        padding: '0 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '16px',
                        color: '#808080',
                        fontSize: '10px',
                    }}>
                        <span>Canvas: (0,0) → (2,1)</span>
                        <span style={{ color: '#444' }}>|</span>
                        <span>3 instances</span>
                    </div>

                    {/* Right zone */}
                    <div style={{
                        width: '180px',
                        padding: '0 12px',
                        borderLeft: '1px solid #333',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                    }}>
                        <span style={{ fontSize: '10px', color: '#81c784' }}>🎤 In Voice</span>
                    </div>
                </div>

                <p style={{ marginTop: '16px', fontSize: '11px', color: '#666' }}>
                    Current mode: <strong style={{ color: '#fff' }}>{mode}</strong>
                </p>
            </div>
        );
    },
};

export const AllStates = {
    decorators: [Decorator],
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
                <p style={{ marginBottom: '8px', fontSize: '11px', color: '#666' }}>Default (Desktop active):</p>
                <ViewModeToggle mode={VIEW_MODES.DESKTOP} vrAvailable={true} />
            </div>
            <div>
                <p style={{ marginBottom: '8px', fontSize: '11px', color: '#666' }}>VR active:</p>
                <ViewModeToggle mode={VIEW_MODES.VR} vrAvailable={true} />
            </div>
            <div>
                <p style={{ marginBottom: '8px', fontSize: '11px', color: '#666' }}>VR unavailable:</p>
                <ViewModeToggle mode={VIEW_MODES.DESKTOP} vrAvailable={false} />
            </div>
            <div>
                <p style={{ marginBottom: '8px', fontSize: '11px', color: '#666' }}>Disabled:</p>
                <ViewModeToggle mode={VIEW_MODES.DESKTOP} vrAvailable={true} disabled />
            </div>
            <div>
                <p style={{ marginBottom: '8px', fontSize: '11px', color: '#666' }}>Compact:</p>
                <ViewModeToggle mode={VIEW_MODES.DESKTOP} vrAvailable={true} compact />
            </div>
        </div>
    ),
};