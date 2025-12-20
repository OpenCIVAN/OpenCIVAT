/**
 * @file SecondaryFooter.stories.jsx
 * @description Storybook stories for the SecondaryFooter component (36px).
 * Instance context bar with view selection and voice controls.
 */

import React, { useState } from 'react';
import { SecondaryFooter } from './SecondaryFooter.jsx';

export default {
    title: 'Layout/SecondaryFooter',
    component: SecondaryFooter,
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
        viewMode: {
            control: 'select',
            options: ['normal', 'isolation', 'subset'],
        },
    },
};

// =============================================================================
// MOCK DATA
// =============================================================================

const mockOnCanvasViews = [
    { id: 'v1', name: 'Volume Render', type: 'volume', position: { col: 0, row: 0 } },
    { id: 'v2', name: 'Sagittal Slice', type: 'slice', position: { col: 1, row: 0 } },
    { id: 'v3', name: 'Axial Slice', type: 'slice', position: { col: 0, row: 1 } },
];

const mockAvailableViews = [
    { id: 'av1', name: 'Coronal Slice', type: 'slice' },
    { id: 'av2', name: 'Surface Mesh', type: 'mesh' },
    { id: 'av3', name: 'Point Cloud', type: 'points' },
    { id: 'av4', name: 'Histogram', type: 'chart' },
];

const mockVoiceChannels = [
    { id: 'ch1', name: 'General', participantCount: 3 },
    { id: 'ch2', name: 'Team Alpha', participantCount: 5 },
    { id: 'ch3', name: 'Quiet Focus', participantCount: 1 },
];

const mockVoiceState = {
    isMuted: false,
    isDeafened: false,
    isInChannel: true,
    currentChannel: mockVoiceChannels[0],
};

// =============================================================================
// DECORATOR
// =============================================================================

const SecondaryFooterDecorator = (Story) => (
    <div style={{
        background: '#0a0a0a',
        minHeight: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: 'flex',
        flexDirection: 'column',
    }}>
        {/* Placeholder for main content */}
        <div style={{ flex: 1 }} />
        <Story />
    </div>
);

// =============================================================================
// STORIES
// =============================================================================

export const Default = {
    decorators: [SecondaryFooterDecorator],
    args: {
        openPopouts: [],
        activeInstance: mockOnCanvasViews[0],
        onCanvasViews: mockOnCanvasViews,
        availableViews: mockAvailableViews,
        viewMode: 'normal',
        canvasSize: { cols: 2, rows: 2 },
        voiceState: mockVoiceState,
        voiceChannels: mockVoiceChannels,
    },
    render: (args) => {
        const [openPopouts, setOpenPopouts] = useState(args.openPopouts);
        const [activeInstance, setActiveInstance] = useState(args.activeInstance);
        const [viewMode, setViewMode] = useState(args.viewMode);
        const [canvasSize, setCanvasSize] = useState(args.canvasSize);
        const [voiceState, setVoiceState] = useState(args.voiceState);

        return (
            <SecondaryFooter
                {...args}
                openPopouts={openPopouts}
                activeInstance={activeInstance}
                viewMode={viewMode}
                canvasSize={canvasSize}
                voiceState={voiceState}
                onTogglePopout={(id) => {
                    setOpenPopouts(prev =>
                        prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
                    );
                }}
                onSelectInstance={setActiveInstance}
                onPlaceView={(view) => console.log('Place view:', view)}
                onViewModeChange={setViewMode}
                onCanvasSizeChange={setCanvasSize}
                onToggleMute={() => setVoiceState(prev => ({ ...prev, isMuted: !prev.isMuted }))}
                onToggleDeafen={() => setVoiceState(prev => ({ ...prev, isDeafened: !prev.isDeafened }))}
                onJoinLeaveVoice={() => setVoiceState(prev => ({ ...prev, isInChannel: !prev.isInChannel }))}
                onChangeVoiceChannel={(chId) => {
                    const channel = args.voiceChannels.find(c => c.id === chId);
                    setVoiceState(prev => ({ ...prev, currentChannel: channel }));
                }}
                onOpenVoiceSettings={() => console.log('Open voice settings')}
            />
        );
    },
};

export const NavigatorOpen = {
    decorators: [SecondaryFooterDecorator],
    args: {
        ...Default.args,
        openPopouts: ['navigator'],
    },
    render: Default.render,
};

export const ScratchpadOpen = {
    decorators: [SecondaryFooterDecorator],
    args: {
        ...Default.args,
        openPopouts: ['scratchpad'],
    },
    render: Default.render,
};

export const BothPopoutsOpen = {
    decorators: [SecondaryFooterDecorator],
    args: {
        ...Default.args,
        openPopouts: ['navigator', 'scratchpad'],
    },
    render: Default.render,
};

export const IsolationMode = {
    decorators: [SecondaryFooterDecorator],
    args: {
        ...Default.args,
        viewMode: 'isolation',
    },
    render: Default.render,
};

export const SubsetMode = {
    decorators: [SecondaryFooterDecorator],
    args: {
        ...Default.args,
        viewMode: 'subset',
    },
    render: Default.render,
};

export const LargeCanvas = {
    decorators: [SecondaryFooterDecorator],
    args: {
        ...Default.args,
        canvasSize: { cols: 5, rows: 4 },
    },
    render: Default.render,
};

export const SmallCanvas = {
    decorators: [SecondaryFooterDecorator],
    args: {
        ...Default.args,
        canvasSize: { cols: 1, rows: 1 },
    },
    render: Default.render,
};

export const NotInVoice = {
    decorators: [SecondaryFooterDecorator],
    args: {
        ...Default.args,
        voiceState: {
            isMuted: false,
            isDeafened: false,
            isInChannel: false,
            currentChannel: null,
        },
    },
    render: Default.render,
};

export const MutedInVoice = {
    decorators: [SecondaryFooterDecorator],
    args: {
        ...Default.args,
        voiceState: {
            ...mockVoiceState,
            isMuted: true,
        },
    },
    render: Default.render,
};

export const DeafenedInVoice = {
    decorators: [SecondaryFooterDecorator],
    args: {
        ...Default.args,
        voiceState: {
            ...mockVoiceState,
            isDeafened: true,
        },
    },
    render: Default.render,
};

export const NoAvailableViews = {
    decorators: [SecondaryFooterDecorator],
    args: {
        ...Default.args,
        availableViews: [],
    },
    render: Default.render,
};

export const ManyViews = {
    decorators: [SecondaryFooterDecorator],
    args: {
        ...Default.args,
        onCanvasViews: [
            ...mockOnCanvasViews,
            { id: 'v4', name: 'View 4', type: 'slice', position: { col: 1, row: 1 } },
            { id: 'v5', name: 'View 5', type: 'volume', position: { col: 2, row: 0 } },
        ],
        availableViews: [
            ...mockAvailableViews,
            { id: 'av5', name: 'Additional View', type: 'mesh' },
            { id: 'av6', name: 'Another View', type: 'chart' },
        ],
    },
    render: Default.render,
};

export const InteractiveDemo = {
    decorators: [SecondaryFooterDecorator],
    args: Default.args,
    render: (args) => {
        const [openPopouts, setOpenPopouts] = useState(args.openPopouts);
        const [activeInstance, setActiveInstance] = useState(args.activeInstance);
        const [viewMode, setViewMode] = useState(args.viewMode);
        const [canvasSize, setCanvasSize] = useState(args.canvasSize);
        const [voiceState, setVoiceState] = useState(args.voiceState);

        return (
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                {/* Status display */}
                <div style={{
                    padding: '16px',
                    background: '#1a1a1a',
                    display: 'flex',
                    gap: '24px',
                    flexWrap: 'wrap',
                    fontSize: '12px',
                    color: '#888',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                }}>
                    <span>
                        Popouts: <strong style={{ color: '#60a5fa' }}>{openPopouts.length > 0 ? openPopouts.join(', ') : 'None'}</strong>
                    </span>
                    <span>
                        Active: <strong style={{ color: '#34d399' }}>{activeInstance?.name || 'None'}</strong>
                    </span>
                    <span>
                        View Mode: <strong style={{ color: '#c084fc' }}>{viewMode}</strong>
                    </span>
                    <span>
                        Canvas: <strong style={{ color: '#fbbf24' }}>{canvasSize.cols}x{canvasSize.rows}</strong>
                    </span>
                    <span>
                        Voice: <strong style={{ color: voiceState.isInChannel ? '#34d399' : '#666' }}>
                            {voiceState.isInChannel ? voiceState.currentChannel?.name : 'Not connected'}
                        </strong>
                        {voiceState.isMuted && <span style={{ color: '#fb7185' }}> (Muted)</span>}
                        {voiceState.isDeafened && <span style={{ color: '#fbbf24' }}> (Deafened)</span>}
                    </span>
                </div>

                {/* Main content area placeholder */}
                <div style={{ flex: 1 }} />

                <SecondaryFooter
                    {...args}
                    openPopouts={openPopouts}
                    activeInstance={activeInstance}
                    viewMode={viewMode}
                    canvasSize={canvasSize}
                    voiceState={voiceState}
                    onTogglePopout={(id) => {
                        setOpenPopouts(prev =>
                            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
                        );
                    }}
                    onSelectInstance={setActiveInstance}
                    onPlaceView={(view) => console.log('Place view:', view)}
                    onViewModeChange={setViewMode}
                    onCanvasSizeChange={setCanvasSize}
                    onToggleMute={() => setVoiceState(prev => ({ ...prev, isMuted: !prev.isMuted }))}
                    onToggleDeafen={() => setVoiceState(prev => ({ ...prev, isDeafened: !prev.isDeafened }))}
                    onJoinLeaveVoice={() => setVoiceState(prev => ({ ...prev, isInChannel: !prev.isInChannel }))}
                    onChangeVoiceChannel={(chId) => {
                        const channel = args.voiceChannels.find(c => c.id === chId);
                        setVoiceState(prev => ({ ...prev, currentChannel: channel }));
                    }}
                    onOpenVoiceSettings={() => console.log('Open voice settings')}
                />
            </div>
        );
    },
};