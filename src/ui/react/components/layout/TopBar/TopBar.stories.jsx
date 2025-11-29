// src/ui/react/components/layout/TopBar/TopBar.stories.jsx
// Storybook stories for enhanced TopBar component

import React, { useState } from 'react';
import { TopBar } from './TopBar.jsx';

export default {
    title: 'Layout/TopBar',
    component: TopBar,
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
        mode: {
            control: 'radio',
            options: ['desktop', 'vr'],
        },
        inVoice: { control: 'boolean' },
        isRoomLocked: { control: 'boolean' },
    },
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
        username: 'Dr. Smith',
        userColor: '#2dd4bf',
        inVoice: false,
        roomName: 'Brain Study Room',
        isRoomLocked: true,
        mode: 'desktop',
    },
    render: (args) => {
        const [mode, setMode] = useState(args.mode);

        return (
            <TopBar
                {...args}
                mode={mode}
                onModeChange={setMode}
            />
        );
    },
};

export const InVoiceChat = {
    decorators: [MockDecorator],
    args: {
        ...Default.args,
        inVoice: true,
    },
    render: Default.render,
};

export const VRMode = {
    decorators: [MockDecorator],
    args: {
        ...Default.args,
        mode: 'vr',
    },
    render: Default.render,
};

export const UnlockedRoom = {
    decorators: [MockDecorator],
    args: {
        ...Default.args,
        isRoomLocked: false,
    },
    render: Default.render,
};

export const LongRoomName = {
    decorators: [MockDecorator],
    args: {
        ...Default.args,
        roomName: 'Collaborative Brain Imaging Analysis Session - Team Alpha',
    },
    render: Default.render,
};

export const WithCanvasToggle = {
    decorators: [MockDecorator],
    args: {
        ...Default.args,
    },
    render: (args) => {
        const [mode, setMode] = useState(args.mode);
        const [canvasMode, setCanvasMode] = useState(false);

        return (
            <TopBar
                {...args}
                mode={mode}
                onModeChange={setMode}
                canvasMode={canvasMode}
                onToggleCanvasMode={() => setCanvasMode(!canvasMode)}
            />
        );
    },
};

export const DifferentUserColors = {
    decorators: [MockDecorator],
    render: () => {
        const colors = ['#fb7185', '#fbbf24', '#34d399', '#60a5fa', '#c084fc'];
        const names = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve'];

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {colors.map((color, i) => (
                    <TopBar
                        key={i}
                        username={names[i]}
                        userColor={color}
                        inVoice={i % 2 === 0}
                        roomName="Team Room"
                        isRoomLocked={true}
                        mode="desktop"
                        onModeChange={() => {}}
                    />
                ))}
            </div>
        );
    },
};

// Full interactive demo
export const InteractiveDemo = {
    decorators: [MockDecorator],
    args: Default.args,
    render: (args) => {
        const [mode, setMode] = useState(args.mode);
        const [inVoice, setInVoice] = useState(args.inVoice);
        const [isLocked, setIsLocked] = useState(args.isRoomLocked);
        const [canvasMode, setCanvasMode] = useState(false);

        return (
            <div>
                <TopBar
                    username={args.username}
                    userColor={args.userColor}
                    inVoice={inVoice}
                    roomName={args.roomName}
                    isRoomLocked={isLocked}
                    mode={mode}
                    onModeChange={setMode}
                    canvasMode={canvasMode}
                    onToggleCanvasMode={() => setCanvasMode(!canvasMode)}
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
                            checked={inVoice} 
                            onChange={(e) => setInVoice(e.target.checked)}
                        /> In Voice Chat
                    </label>
                    <label style={{ color: '#888', fontSize: '12px' }}>
                        <input 
                            type="checkbox" 
                            checked={isLocked} 
                            onChange={(e) => setIsLocked(e.target.checked)}
                        /> Room Locked
                    </label>
                    <label style={{ color: '#888', fontSize: '12px' }}>
                        <input 
                            type="checkbox" 
                            checked={canvasMode} 
                            onChange={(e) => setCanvasMode(e.target.checked)}
                        /> Canvas Mode
                    </label>
                    <span style={{ color: '#888', fontSize: '12px' }}>
                        Mode: <strong style={{ color: mode === 'vr' ? '#c084fc' : '#60a5fa' }}>{mode.toUpperCase()}</strong>
                    </span>
                </div>
            </div>
        );
    },
};