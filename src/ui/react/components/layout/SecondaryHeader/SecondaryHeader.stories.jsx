/**
 * @file SecondaryHeader.stories.jsx
 * @description Storybook stories for the SecondaryHeader component (44px).
 * Workspace context bar with room presence and navigation tools.
 */

import React, { useState } from 'react';
import { SecondaryHeader } from './SecondaryHeader.jsx';

export default {
    title: 'Layout/SecondaryHeader',
    component: SecondaryHeader,
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
        flowDirection: {
            control: 'radio',
            options: ['row', 'column'],
        },
        activeTool: {
            control: 'select',
            options: ['select', 'pan', 'merge'],
        },
        isEditMode: { control: 'boolean' },
        canUndo: { control: 'boolean' },
        canRedo: { control: 'boolean' },
        isAtOrigin: { control: 'boolean' },
    },
};

// =============================================================================
// MOCK DATA
// =============================================================================

const mockWorkspaces = [
    { id: 'ws1', name: 'Brain Analysis', type: 'project', color: '#60a5fa' },
    { id: 'ws2', name: 'Team Breakout', type: 'breakout', color: '#fbbf24' },
    { id: 'ws3', name: 'My Sandbox', type: 'personal', color: '#34d399' },
];

const mockRoom = {
    id: 'room-1',
    name: 'Brain Study Room',
    isLocked: false,
};

const mockMembers = [
    { id: 'u1', name: 'Dr. Sarah Chen', color: '#60a5fa', status: 'online' },
    { id: 'u2', name: 'Bob Smith', color: '#fb7185', status: 'online' },
    { id: 'u3', name: 'Alice Johnson', color: '#34d399', status: 'idle' },
    { id: 'u4', name: 'Carol Williams', color: '#fbbf24', status: 'online' },
    { id: 'u5', name: 'Dave Brown', color: '#c084fc', status: 'online' },
];

// =============================================================================
// DECORATOR
// =============================================================================

const SecondaryHeaderDecorator = (Story) => (
    <div style={{
        background: '#0a0a0a',
        minHeight: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
        {/* Placeholder for Header */}
        <div style={{ height: '48px', background: '#111', borderBottom: '1px solid rgba(255,255,255,0.1)' }} />
        <Story />
    </div>
);

// =============================================================================
// STORIES
// =============================================================================

export const Default = {
    decorators: [SecondaryHeaderDecorator],
    args: {
        workspace: mockWorkspaces[0],
        workspaces: mockWorkspaces,
        room: mockRoom,
        members: mockMembers.slice(0, 3),
        flowDirection: 'row',
        isEditMode: false,
        activeTool: 'select',
        canUndo: true,
        canRedo: false,
        canvasPosition: { col: 0, row: 0 },
        isAtOrigin: true,
    },
    render: (args) => {
        const [workspace, setWorkspace] = useState(args.workspace);
        const [flowDirection, setFlowDirection] = useState(args.flowDirection);
        const [activeTool, setActiveTool] = useState(args.activeTool);
        const [canvasPosition, setCanvasPosition] = useState(args.canvasPosition);

        return (
            <SecondaryHeader
                {...args}
                workspace={workspace}
                flowDirection={flowDirection}
                activeTool={activeTool}
                canvasPosition={canvasPosition}
                isAtOrigin={canvasPosition.col === 0 && canvasPosition.row === 0}
                onWorkspaceChange={setWorkspace}
                onCreateWorkspace={() => console.log('Create workspace')}
                onOpenRoomsPanel={() => console.log('Open rooms panel')}
                onFlowDirectionChange={setFlowDirection}
                onToolChange={setActiveTool}
                onToggleEditMode={() => console.log('Toggle edit mode')}
                onUndo={() => console.log('Undo')}
                onRedo={() => console.log('Redo')}
                onNavigateHome={() => setCanvasPosition({ col: 0, row: 0 })}
                onNavigateDirection={(dir) => {
                    setCanvasPosition(prev => ({
                        col: prev.col + (dir === 'right' ? 1 : dir === 'left' ? -1 : 0),
                        row: prev.row + (dir === 'down' ? 1 : dir === 'up' ? -1 : 0),
                    }));
                }}
                onOpenBookmarks={() => console.log('Open bookmarks')}
            />
        );
    },
};

export const ProjectWorkspace = {
    decorators: [SecondaryHeaderDecorator],
    args: {
        ...Default.args,
        workspace: mockWorkspaces[0], // Project type
    },
    render: Default.render,
};

export const BreakoutWorkspace = {
    decorators: [SecondaryHeaderDecorator],
    args: {
        ...Default.args,
        workspace: mockWorkspaces[1], // Breakout type
    },
    render: Default.render,
};

export const PersonalWorkspace = {
    decorators: [SecondaryHeaderDecorator],
    args: {
        ...Default.args,
        workspace: mockWorkspaces[2], // Personal type
    },
    render: Default.render,
};

export const EditModeActive = {
    decorators: [SecondaryHeaderDecorator],
    args: {
        ...Default.args,
        isEditMode: true,
        activeTool: 'select',
        canUndo: true,
        canRedo: true,
    },
    render: Default.render,
};

export const ColumnFlowDirection = {
    decorators: [SecondaryHeaderDecorator],
    args: {
        ...Default.args,
        flowDirection: 'column',
    },
    render: Default.render,
};

export const ManyMembers = {
    decorators: [SecondaryHeaderDecorator],
    args: {
        ...Default.args,
        members: mockMembers, // All 5 members
    },
    render: Default.render,
};

export const LockedRoom = {
    decorators: [SecondaryHeaderDecorator],
    args: {
        ...Default.args,
        room: { ...mockRoom, isLocked: true },
    },
    render: Default.render,
};

export const AwayFromOrigin = {
    decorators: [SecondaryHeaderDecorator],
    args: {
        ...Default.args,
        canvasPosition: { col: 3, row: -2 },
        isAtOrigin: false,
    },
    render: Default.render,
};

export const NoUndoRedo = {
    decorators: [SecondaryHeaderDecorator],
    args: {
        ...Default.args,
        canUndo: false,
        canRedo: false,
    },
    render: Default.render,
};

export const InteractiveDemo = {
    decorators: [SecondaryHeaderDecorator],
    args: Default.args,
    render: (args) => {
        const [workspace, setWorkspace] = useState(args.workspace);
        const [flowDirection, setFlowDirection] = useState(args.flowDirection);
        const [isEditMode, setIsEditMode] = useState(args.isEditMode);
        const [activeTool, setActiveTool] = useState(args.activeTool);
        const [canvasPosition, setCanvasPosition] = useState(args.canvasPosition);
        const [canUndo, setCanUndo] = useState(args.canUndo);
        const [canRedo, setCanRedo] = useState(args.canRedo);

        const handleUndo = () => {
            setCanRedo(true);
            setCanUndo(false);
            console.log('Undo performed');
        };

        const handleRedo = () => {
            setCanUndo(true);
            setCanRedo(false);
            console.log('Redo performed');
        };

        return (
            <div>
                <SecondaryHeader
                    {...args}
                    workspace={workspace}
                    flowDirection={flowDirection}
                    isEditMode={isEditMode}
                    activeTool={activeTool}
                    canvasPosition={canvasPosition}
                    isAtOrigin={canvasPosition.col === 0 && canvasPosition.row === 0}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onWorkspaceChange={setWorkspace}
                    onCreateWorkspace={() => console.log('Create workspace')}
                    onOpenRoomsPanel={() => console.log('Open rooms panel')}
                    onFlowDirectionChange={setFlowDirection}
                    onToolChange={setActiveTool}
                    onToggleEditMode={() => setIsEditMode(!isEditMode)}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                    onNavigateHome={() => setCanvasPosition({ col: 0, row: 0 })}
                    onNavigateDirection={(dir) => {
                        setCanvasPosition(prev => ({
                            col: prev.col + (dir === 'right' ? 1 : dir === 'left' ? -1 : 0),
                            row: prev.row + (dir === 'down' ? 1 : dir === 'up' ? -1 : 0),
                        }));
                    }}
                    onOpenBookmarks={() => console.log('Open bookmarks')}
                />

                {/* Interactive Controls */}
                <div style={{
                    padding: '16px',
                    background: '#1a1a1a',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    gap: '24px',
                    flexWrap: 'wrap',
                    fontSize: '12px',
                    color: '#888',
                }}>
                    <span>
                        Workspace: <strong style={{ color: workspace?.color }}>{workspace?.name}</strong>
                        <span style={{ color: '#666' }}> ({workspace?.type})</span>
                    </span>
                    <span>
                        Flow: <strong style={{ color: '#60a5fa' }}>{flowDirection}</strong>
                    </span>
                    <span>
                        Edit Mode: <strong style={{ color: isEditMode ? '#34d399' : '#666' }}>{isEditMode ? 'ON' : 'OFF'}</strong>
                    </span>
                    <span>
                        Tool: <strong style={{ color: '#c084fc' }}>{activeTool}</strong>
                    </span>
                    <span>
                        Position: <strong style={{ color: '#fbbf24' }}>({canvasPosition.col}, {canvasPosition.row})</strong>
                    </span>
                </div>
            </div>
        );
    },
};