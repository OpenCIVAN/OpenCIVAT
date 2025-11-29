// src/ui/react/components/layout/SecondaryBottomBar/SecondaryBottomBar.stories.jsx
// Storybook stories for SecondaryBottomBar component

import React, { useState } from 'react';
import { SecondaryBottomBar } from './SecondaryBottomBar.jsx';

export default {
    title: 'Layout/SecondaryBottomBar',
    component: SecondaryBottomBar,
    parameters: {
        layout: 'fullscreen',
        backgrounds: {
            default: 'dark',
            values: [
                { name: 'dark', value: '#0a0a0a' },
            ],
        },
    },
    argTypes: {
        leftPanelOpen: { control: 'boolean' },
        rightPanelOpen: { control: 'boolean' },
        leftPanelWidth: { control: { type: 'range', min: 48, max: 400, step: 10 } },
        rightPanelWidth: { control: { type: 'range', min: 180, max: 400, step: 10 } },
        instanceCount: { control: { type: 'range', min: 0, max: 20, step: 1 } },
        initialInVoice: { control: 'boolean' },
        initialMuted: { control: 'boolean' },
        initialDeafened: { control: 'boolean' },
    },
};

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_CANVAS_SIZE = { rows: 4, cols: 5 };

const MOCK_VIEWPORT = { row: 0, col: 0, rows: 2, cols: 3 };

const MOCK_WORKSPACE = {
    id: 'w1',
    name: 'Team Analysis',
    type: 'project',
    color: '#60a5fa',
};

// =============================================================================
// DECORATOR
// =============================================================================

const MockDecorator = (Story) => {
    return (
        <div style={{
            background: '#0a0a0a',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}>
            <Story />
        </div>
    );
};

// =============================================================================
// STORIES
// =============================================================================

export const Default = {
    decorators: [MockDecorator],
    args: {
        canvasSize: MOCK_CANVAS_SIZE,
        viewport: MOCK_VIEWPORT,
        currentWorkspace: MOCK_WORKSPACE,
        instanceCount: 4,
        leftPanelWidth: 280,
        rightPanelWidth: 280,
        leftPanelOpen: true,
        rightPanelOpen: true,
        initialInVoice: false,
        initialMuted: false,
        initialDeafened: false,
        currentVoiceRoom: 'Main Room',
        leftPanelLabel: 'Datasets',
    },
    render: (args) => {
        return (
            <SecondaryBottomBar
                {...args}
                onJoinVoice={() => console.log('Join voice clicked')}
                onLeaveVoice={() => console.log('Leave voice clicked')}
                onMuteToggle={(muted) => console.log('Mute toggled:', muted)}
                onDeafenToggle={(deafened) => console.log('Deafen toggled:', deafened)}
            />
        );
    },
};

export const InVoiceChat = {
    decorators: [MockDecorator],
    args: {
        ...Default.args,
        initialInVoice: true,
    },
    render: Default.render,
};

export const InVoiceMuted = {
    decorators: [MockDecorator],
    args: {
        ...Default.args,
        initialInVoice: true,
        initialMuted: true,
    },
    render: Default.render,
};

export const InVoiceDeafened = {
    decorators: [MockDecorator],
    args: {
        ...Default.args,
        initialInVoice: true,
        initialDeafened: true,
    },
    render: Default.render,
};

export const CollapsedLeftPanel = {
    decorators: [MockDecorator],
    args: {
        ...Default.args,
        leftPanelOpen: false,
        leftPanelWidth: 48,
    },
    render: Default.render,
};

export const CollapsedRightPanel = {
    decorators: [MockDecorator],
    args: {
        ...Default.args,
        rightPanelOpen: false,
        rightPanelWidth: 180,
    },
    render: Default.render,
};

export const BothPanelsCollapsed = {
    decorators: [MockDecorator],
    args: {
        ...Default.args,
        leftPanelOpen: false,
        rightPanelOpen: false,
        leftPanelWidth: 48,
        rightPanelWidth: 180,
    },
    render: Default.render,
};

export const LargeCanvas = {
    decorators: [MockDecorator],
    args: {
        ...Default.args,
        canvasSize: { rows: 8, cols: 10 },
        viewport: { row: 2, col: 3, rows: 3, cols: 4 },
    },
    render: Default.render,
};

export const ManyInstances = {
    decorators: [MockDecorator],
    args: {
        ...Default.args,
        instanceCount: 12,
    },
    render: Default.render,
};

export const BreakoutWorkspace = {
    decorators: [MockDecorator],
    args: {
        ...Default.args,
        currentWorkspace: {
            id: 'b1',
            name: 'Deep Dive Session',
            type: 'breakout',
            color: '#c084fc',
        },
    },
    render: Default.render,
};

export const PersonalWorkspace = {
    decorators: [MockDecorator],
    args: {
        ...Default.args,
        currentWorkspace: {
            id: 'p1',
            name: 'My Scratch',
            type: 'personal',
            color: '#34d399',
        },
    },
    render: Default.render,
};

// Interactive demo
export const InteractiveDemo = {
    decorators: [MockDecorator],
    args: Default.args,
    render: (args) => {
        const [inVoice, setInVoice] = useState(args.initialInVoice);
        const [muted, setMuted] = useState(args.initialMuted);
        const [deafened, setDeafened] = useState(args.initialDeafened);
        const [leftOpen, setLeftOpen] = useState(args.leftPanelOpen);
        const [rightOpen, setRightOpen] = useState(args.rightPanelOpen);
        const [leftWidth, setLeftWidth] = useState(args.leftPanelWidth);
        const [rightWidth, setRightWidth] = useState(args.rightPanelWidth);
        const [instanceCount, setInstanceCount] = useState(args.instanceCount);

        return (
            <div>
                <SecondaryBottomBar
                    canvasSize={args.canvasSize}
                    viewport={args.viewport}
                    currentWorkspace={args.currentWorkspace}
                    instanceCount={instanceCount}
                    leftPanelWidth={leftWidth}
                    rightPanelWidth={rightWidth}
                    leftPanelOpen={leftOpen}
                    rightPanelOpen={rightOpen}
                    leftPanelLabel={args.leftPanelLabel}
                    initialInVoice={inVoice}
                    initialMuted={muted}
                    initialDeafened={deafened}
                    currentVoiceRoom={args.currentVoiceRoom}
                    onJoinVoice={() => setInVoice(true)}
                    onLeaveVoice={() => {
                        setInVoice(false);
                        setMuted(false);
                        setDeafened(false);
                    }}
                    onMuteToggle={setMuted}
                    onDeafenToggle={setDeafened}
                />

                {/* Controls */}
                <div style={{
                    padding: '16px',
                    background: '#1a1a1a',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    gap: '16px',
                    flexWrap: 'wrap',
                }}>
                    <label style={{ color: '#888', fontSize: '12px' }}>
                        <input
                            type="checkbox"
                            checked={leftOpen}
                            onChange={(e) => setLeftOpen(e.target.checked)}
                        /> Left Panel
                    </label>
                    <label style={{ color: '#888', fontSize: '12px' }}>
                        <input
                            type="checkbox"
                            checked={rightOpen}
                            onChange={(e) => setRightOpen(e.target.checked)}
                        /> Right Panel
                    </label>
                    <label style={{ color: '#888', fontSize: '12px' }}>
                        <input
                            type="checkbox"
                            checked={inVoice}
                            onChange={(e) => setInVoice(e.target.checked)}
                        /> In Voice
                    </label>
                    <label style={{ color: '#888', fontSize: '12px' }}>
                        Instances:
                        <input
                            type="range"
                            min="0"
                            max="20"
                            value={instanceCount}
                            onChange={(e) => setInstanceCount(Number(e.target.value))}
                        /> {instanceCount}
                    </label>
                </div>
            </div>
        );
    },
};