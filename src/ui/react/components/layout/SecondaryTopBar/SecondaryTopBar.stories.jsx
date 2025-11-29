// src/ui/react/components/layout/SecondaryTopBar/SecondaryTopBar.stories.jsx
// Storybook stories for SecondaryTopBar component

import React, { useState } from 'react';
import { SecondaryTopBar } from './SecondaryTopBar.jsx';
import { VIEW_MODES, WORKSPACE_TYPES } from './SecondaryTopBar.logic.js';

export default {
    title: 'Layout/SecondaryTopBar',
    component: SecondaryTopBar,
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
        leftPanelWidth: { control: { type: 'range', min: 200, max: 400, step: 10 } },
        rightPanelWidth: { control: { type: 'range', min: 200, max: 400, step: 10 } },
    },
};

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_WORKSPACES = [
    { id: 'w1', name: 'Team Analysis', type: WORKSPACE_TYPES.PROJECT, color: '#60a5fa' },
    { id: 'w2', name: 'Comparison View', type: WORKSPACE_TYPES.PROJECT, color: '#60a5fa' },
    { id: 'w3', name: 'Breakout: Deep Dive', type: WORKSPACE_TYPES.BREAKOUT, color: '#c084fc' },
    { id: 'w4', name: 'Breakout: Quick Review', type: WORKSPACE_TYPES.BREAKOUT, color: '#c084fc' },
    { id: 'w5', name: 'My Scratch', type: WORKSPACE_TYPES.PERSONAL, color: '#34d399' },
];

const MOCK_USERS = [
    { userId: 'u1', userName: 'Dr. Smith', userColor: '#fb7185', inVoice: true },
    { userId: 'u2', userName: 'Dr. Jones', userColor: '#fbbf24', inVoice: false },
    { userId: 'u3', userName: 'Alice', userColor: '#2dd4bf', inVoice: true },
    { userId: 'u4', userName: 'Bob', userColor: '#34d399', inVoice: false },
];

// =============================================================================
// DECORATOR - Provides presence mock
// =============================================================================

// Mock the presence system for Storybook
const MockPresenceDecorator = (Story) => {
    // Mock presenceSystem.onPresenceChange
    if (typeof window !== 'undefined') {
        window.__mockPresenceUsers = MOCK_USERS;
    }

    return (
        <div style={{
            background: '#0a0a0a',
            minHeight: '100px',
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
    decorators: [MockPresenceDecorator],
    args: {
        workspaces: MOCK_WORKSPACES,
        initialWorkspaceId: 'w1',
        initialViewMode: VIEW_MODES.NORMAL,
        leftPanelWidth: 280,
        rightPanelWidth: 280,
        leftPanelOpen: true,
        rightPanelOpen: true,
    },
    render: (args) => {
        const [workspaceId, setWorkspaceId] = useState(args.initialWorkspaceId);
        const [viewMode, setViewMode] = useState(args.initialViewMode);

        return (
            <SecondaryTopBar
                {...args}
                onWorkspaceChange={(id) => {
                    setWorkspaceId(id);
                    console.log('Workspace changed:', id);
                }}
                onViewModeChange={(mode) => {
                    setViewMode(mode);
                    console.log('View mode changed:', mode);
                }}
                onAddCell={() => console.log('Add cell clicked')}
                onResetLayout={() => console.log('Reset layout clicked')}
                onLinkViews={() => console.log('Link views clicked')}
                onShare={() => console.log('Share clicked')}
            />
        );
    },
};

export const WithCollapsedLeftPanel = {
    decorators: [MockPresenceDecorator],
    args: {
        ...Default.args,
        leftPanelOpen: false,
        leftPanelWidth: 48,
    },
    render: Default.render,
};

export const WithCollapsedRightPanel = {
    decorators: [MockPresenceDecorator],
    args: {
        ...Default.args,
        rightPanelOpen: false,
        rightPanelWidth: 180,
    },
    render: Default.render,
};

export const BothPanelsCollapsed = {
    decorators: [MockPresenceDecorator],
    args: {
        ...Default.args,
        leftPanelOpen: false,
        rightPanelOpen: false,
        leftPanelWidth: 48,
        rightPanelWidth: 180,
    },
    render: Default.render,
};

export const IsolationMode = {
    decorators: [MockPresenceDecorator],
    args: {
        ...Default.args,
        initialViewMode: VIEW_MODES.ISOLATION,
    },
    render: Default.render,
};

export const SubsetMode = {
    decorators: [MockPresenceDecorator],
    args: {
        ...Default.args,
        initialViewMode: VIEW_MODES.SUBSET,
    },
    render: Default.render,
};

export const BreakoutWorkspace = {
    decorators: [MockPresenceDecorator],
    args: {
        ...Default.args,
        initialWorkspaceId: 'w3',
    },
    render: Default.render,
};

export const PersonalWorkspace = {
    decorators: [MockPresenceDecorator],
    args: {
        ...Default.args,
        initialWorkspaceId: 'w5',
    },
    render: Default.render,
};

export const WidePanels = {
    decorators: [MockPresenceDecorator],
    args: {
        ...Default.args,
        leftPanelWidth: 400,
        rightPanelWidth: 400,
    },
    render: Default.render,
};

export const NarrowPanels = {
    decorators: [MockPresenceDecorator],
    args: {
        ...Default.args,
        leftPanelWidth: 240,
        rightPanelWidth: 240,
    },
    render: Default.render,
};

// Interactive story showing full workflow
export const InteractiveDemo = {
    decorators: [MockPresenceDecorator],
    args: Default.args,
    render: (args) => {
        const [workspaceId, setWorkspaceId] = useState(args.initialWorkspaceId);
        const [viewMode, setViewMode] = useState(args.initialViewMode);
        const [leftOpen, setLeftOpen] = useState(args.leftPanelOpen);
        const [rightOpen, setRightOpen] = useState(args.rightPanelOpen);
        const [leftWidth, setLeftWidth] = useState(args.leftPanelWidth);
        const [rightWidth, setRightWidth] = useState(args.rightPanelWidth);

        return (
            <div>
                <SecondaryTopBar
                    workspaces={args.workspaces}
                    initialWorkspaceId={workspaceId}
                    initialViewMode={viewMode}
                    leftPanelWidth={leftWidth}
                    rightPanelWidth={rightWidth}
                    leftPanelOpen={leftOpen}
                    rightPanelOpen={rightOpen}
                    onWorkspaceChange={setWorkspaceId}
                    onViewModeChange={setViewMode}
                    onAddCell={() => alert('Add Cell clicked!')}
                    onResetLayout={() => alert('Reset Layout clicked!')}
                    onLinkViews={() => alert('Link Views clicked!')}
                    onShare={() => alert('Share clicked!')}
                />

                {/* Controls for testing */}
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
                        /> Left Panel Open
                    </label>
                    <label style={{ color: '#888', fontSize: '12px' }}>
                        <input
                            type="checkbox"
                            checked={rightOpen}
                            onChange={(e) => setRightOpen(e.target.checked)}
                        /> Right Panel Open
                    </label>
                    <label style={{ color: '#888', fontSize: '12px' }}>
                        Left Width:
                        <input
                            type="range"
                            min="200"
                            max="400"
                            value={leftWidth}
                            onChange={(e) => setLeftWidth(Number(e.target.value))}
                        /> {leftWidth}px
                    </label>
                    <label style={{ color: '#888', fontSize: '12px' }}>
                        Right Width:
                        <input
                            type="range"
                            min="200"
                            max="400"
                            value={rightWidth}
                            onChange={(e) => setRightWidth(Number(e.target.value))}
                        /> {rightWidth}px
                    </label>
                </div>
            </div>
        );
    },
};