// src/ui/react/components/layout/FullLayout.stories.jsx
// Complete layout demo showing all components together

import React, { useState } from 'react';
import {
    FolderOpen,
    Database,
    Wrench,
    LayoutGrid,
    MapPin,
    Users,
    MessageSquare,
    Mic,
    Video,
    Activity,
} from 'lucide-react';

// Import all layout components
import { TopBar } from './TopBar/TopBar.jsx';
import { SecondaryTopBar } from './SecondaryTopBar/SecondaryTopBar.jsx';
import { SecondaryBottomBar } from './SecondaryBottomBar/SecondaryBottomBar.jsx';
import { StatusBar } from './StatusBar/StatusBar.jsx';
import { ActivityBar } from './ActivityBar/ActivityBar.jsx';
import { VIEW_MODES, WORKSPACE_TYPES } from './SecondaryTopBar/SecondaryTopBar.logic.js';

export default {
    title: 'Layout/FullLayout',
    parameters: {
        layout: 'fullscreen',
        backgrounds: {
            default: 'dark',
            values: [
                { name: 'dark', value: '#000000' },
            ],
        },
    },
};

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_WORKSPACES = [
    { id: 'w1', name: 'Team Analysis', type: WORKSPACE_TYPES.PROJECT, color: '#60a5fa' },
    { id: 'w2', name: 'Comparison View', type: WORKSPACE_TYPES.PROJECT, color: '#60a5fa' },
    { id: 'w3', name: 'Breakout: Deep Dive', type: WORKSPACE_TYPES.BREAKOUT, color: '#c084fc' },
    { id: 'w4', name: 'My Scratch', type: WORKSPACE_TYPES.PERSONAL, color: '#34d399' },
];

const LEFT_TABS = [
    { id: 'files', icon: FolderOpen, label: 'Files' },
    { id: 'datasets', icon: Database, label: 'Datasets' },
    { id: 'tools', icon: Wrench, label: 'Instance Tools' },
    { id: 'layout', icon: LayoutGrid, label: 'Layout' },
    { id: 'annotations', icon: MapPin, label: 'Annotations', badge: 3 },
];

const RIGHT_TABS = [
    { id: 'people', icon: Users, label: 'People', badge: 4 },
    { id: 'chat', icon: MessageSquare, label: 'Chat', badge: 2, badgeColor: '#fb7185' },
    { id: 'voice', icon: Mic, label: 'Voice' },
    { id: 'recording', icon: Video, label: 'Recording' },
    { id: 'activity', icon: Activity, label: 'Activity' },
];

// =============================================================================
// STYLES
// =============================================================================

const styles = {
    app: {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#000',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: 'rgba(255,255,255,0.95)',
        overflow: 'hidden',
    },
    main: {
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        minHeight: 0,
    },
    leftPanel: {
        display: 'flex',
        background: '#121212',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        transition: 'width 0.2s ease',
    },
    panelContent: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    },
    panelHeader: {
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        fontSize: '13px',
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: 'rgba(255,255,255,0.7)',
    },
    panelBody: {
        flex: 1,
        padding: '12px',
        fontSize: '12px',
        color: 'rgba(255,255,255,0.5)',
        overflow: 'auto',
    },
    rightPanel: {
        display: 'flex',
        flexDirection: 'row-reverse',
        background: '#121212',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        transition: 'width 0.2s ease',
    },
    center: {
        flex: 1,
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(2, 1fr)',
        gap: '8px',
        width: '90%',
        height: '85%',
    },
    cell: (color) => ({
        background: color ? `rgba(${hexToRgb(color)}, 0.1)` : 'rgba(255,255,255,0.02)',
        border: `1px solid ${color ? `rgba(${hexToRgb(color)}, 0.3)` : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color || 'rgba(255,255,255,0.3)',
        fontSize: '12px',
    }),
};

// Helper to convert hex to rgb
function hexToRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? `${parseInt(r[1], 16)},${parseInt(r[2], 16)},${parseInt(r[3], 16)}` : '255,255,255';
}

// =============================================================================
// MAIN STORY
// =============================================================================

export const CompleteLayout = {
    render: () => {
        // Application state
        const [mode, setMode] = useState('desktop');
        const [inVoice, setInVoice] = useState(false);
        const [workspaceId, setWorkspaceId] = useState('w1');
        const [viewMode, setViewMode] = useState(VIEW_MODES.NORMAL);

        // Panel state
        const [leftOpen, setLeftOpen] = useState(true);
        const [rightOpen, setRightOpen] = useState(true);
        const [leftTab, setLeftTab] = useState('datasets');
        const [rightTab, setRightTab] = useState('people');

        // Dimensions
        const leftWidth = leftOpen ? 280 : 48;
        const rightWidth = rightOpen ? 280 : 48;

        // Get current workspace
        const currentWorkspace = MOCK_WORKSPACES.find(w => w.id === workspaceId);

        // Mock grid cells
        const gridCells = [
            { name: 'Brain MRI - Axial', color: '#60a5fa', style: { gridColumn: '1 / span 2' } },
            { name: 'Spine CT', color: '#c084fc', style: { gridRow: '1 / span 2' } },
            { name: 'PCA Plot', color: '#34d399' },
            { name: 'Empty', color: null },
        ];

        return (
            <div style={styles.app}>
                {/* Top Bar */}
                <TopBar
                    username="Dr. Smith"
                    userColor="#2dd4bf"
                    inVoice={inVoice}
                    roomName="Brain Study Room"
                    isRoomLocked={true}
                    mode={mode}
                    onModeChange={setMode}
                />

                {/* Secondary Top Bar */}
                <SecondaryTopBar
                    workspaces={MOCK_WORKSPACES}
                    initialWorkspaceId={workspaceId}
                    initialViewMode={viewMode}
                    leftPanelWidth={leftWidth}
                    rightPanelWidth={rightWidth}
                    leftPanelOpen={leftOpen}
                    rightPanelOpen={rightOpen}
                    onWorkspaceChange={setWorkspaceId}
                    onViewModeChange={setViewMode}
                    onAddCell={() => console.log('Add cell')}
                    onResetLayout={() => console.log('Reset')}
                    onLinkViews={() => console.log('Link')}
                    onShare={() => console.log('Share')}
                />

                {/* Main Area */}
                <div style={styles.main}>
                    {/* Left Panel */}
                    <div style={{ ...styles.leftPanel, width: leftWidth }}>
                        <ActivityBar
                            side="left"
                            tabs={LEFT_TABS}
                            activeTab={leftTab}
                            onTabChange={setLeftTab}
                            isPanelOpen={leftOpen}
                            onTogglePanel={() => setLeftOpen(!leftOpen)}
                            dividerAfter={['datasets']}
                        />
                        {leftOpen && (
                            <div style={styles.panelContent}>
                                <div style={styles.panelHeader}>
                                    {React.createElement(LEFT_TABS.find(t => t.id === leftTab)?.icon || FolderOpen, { size: 16 })}
                                    {LEFT_TABS.find(t => t.id === leftTab)?.label}
                                </div>
                                <div style={styles.panelBody}>
                                    {leftTab} panel content...
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Center - Workspace Grid */}
                    <div style={styles.center}>
                        <div style={styles.grid}>
                            {gridCells.map((cell, idx) => (
                                <div key={idx} style={{ ...styles.cell(cell.color), ...cell.style }}>
                                    {cell.name}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Panel */}
                    <div style={{ ...styles.rightPanel, width: rightWidth }}>
                        <ActivityBar
                            side="right"
                            tabs={RIGHT_TABS}
                            activeTab={rightTab}
                            onTabChange={setRightTab}
                            isPanelOpen={rightOpen}
                            onTogglePanel={() => setRightOpen(!rightOpen)}
                            dividerAfter={['voice']}
                        />
                        {rightOpen && (
                            <div style={styles.panelContent}>
                                <div style={styles.panelHeader}>
                                    {React.createElement(RIGHT_TABS.find(t => t.id === rightTab)?.icon || Users, { size: 16 })}
                                    {RIGHT_TABS.find(t => t.id === rightTab)?.label}
                                </div>
                                <div style={styles.panelBody}>
                                    {rightTab} panel content...
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Secondary Bottom Bar */}
                <SecondaryBottomBar
                    canvasSize={{ rows: 4, cols: 5 }}
                    viewport={{ row: 0, col: 0, rows: 2, cols: 3 }}
                    currentWorkspace={currentWorkspace}
                    instanceCount={4}
                    leftPanelWidth={leftWidth}
                    rightPanelWidth={rightWidth}
                    leftPanelOpen={leftOpen}
                    rightPanelOpen={rightOpen}
                    leftPanelLabel={LEFT_TABS.find(t => t.id === leftTab)?.label}
                    initialInVoice={inVoice}
                    currentVoiceRoom="Main Room"
                    onJoinVoice={() => setInVoice(true)}
                    onLeaveVoice={() => setInVoice(false)}
                />

                {/* Status Bar */}
                <StatusBar phase={3} ready={true} />
            </div>
        );
    },
};

// Variation: Both panels collapsed
export const CollapsedPanels = {
    render: () => {
        const [leftOpen, setLeftOpen] = useState(false);
        const [rightOpen, setRightOpen] = useState(false);
        const [leftTab, setLeftTab] = useState('datasets');
        const [rightTab, setRightTab] = useState('people');

        const leftWidth = leftOpen ? 280 : 48;
        const rightWidth = rightOpen ? 180 : 48;

        return (
            <div style={styles.app}>
                <TopBar
                    username="Dr. Smith"
                    userColor="#2dd4bf"
                    roomName="Brain Study Room"
                    mode="desktop"
                    onModeChange={() => { }}
                />

                <SecondaryTopBar
                    workspaces={MOCK_WORKSPACES}
                    initialWorkspaceId="w1"
                    leftPanelWidth={leftWidth}
                    rightPanelWidth={rightWidth}
                    leftPanelOpen={leftOpen}
                    rightPanelOpen={rightOpen}
                />

                <div style={styles.main}>
                    <div style={{ ...styles.leftPanel, width: leftWidth }}>
                        <ActivityBar
                            side="left"
                            tabs={LEFT_TABS}
                            activeTab={leftTab}
                            onTabChange={(tab) => { setLeftTab(tab); setLeftOpen(true); }}
                            isPanelOpen={leftOpen}
                            onTogglePanel={() => setLeftOpen(!leftOpen)}
                        />
                    </div>

                    <div style={styles.center}>
                        <div style={{ color: '#666', fontSize: '14px' }}>
                            Click activity bar icons to expand panels
                        </div>
                    </div>

                    <div style={{ ...styles.rightPanel, width: rightWidth }}>
                        <ActivityBar
                            side="right"
                            tabs={RIGHT_TABS}
                            activeTab={rightTab}
                            onTabChange={(tab) => { setRightTab(tab); setRightOpen(true); }}
                            isPanelOpen={rightOpen}
                            onTogglePanel={() => setRightOpen(!rightOpen)}
                        />
                    </div>
                </div>

                <SecondaryBottomBar
                    canvasSize={{ rows: 4, cols: 5 }}
                    viewport={{ row: 0, col: 0, rows: 2, cols: 3 }}
                    currentWorkspace={MOCK_WORKSPACES[0]}
                    instanceCount={4}
                    leftPanelWidth={leftWidth}
                    rightPanelWidth={rightWidth}
                    leftPanelOpen={leftOpen}
                    rightPanelOpen={rightOpen}
                />

                <StatusBar phase={3} ready={true} />
            </div>
        );
    },
};