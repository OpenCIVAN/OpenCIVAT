// src/ui/react/components/layout/SecondaryBarZone/SecondaryBarZone.stories.jsx
// Storybook stories demonstrating the SecondaryBarZone system

import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

import {
    SecondaryBar,
    SecondaryBarZone,
    SecondaryBarDivider,
    SecondaryBarSpacer,
} from './SecondaryBarZone.jsx';
import { LayoutContext, PANEL_CONSTRAINTS, SECONDARY_BAR_MIN_WIDTHS } from '../ThreeEdgeLayout';
import './SecondaryBarZone.scss';

export default {
    title: 'Layout/SecondaryBarZone',
    component: SecondaryBarZone,
    parameters: {
        layout: 'fullscreen',
        backgrounds: {
            default: 'dark',
            values: [{ name: 'dark', value: '#0a0a0a' }],
        },
    },
};

// =============================================================================
// DECORATOR - Provides mock layout context
// =============================================================================

const LayoutContextDecorator = ({
    leftPanelWidth = 320,
    rightPanelWidth = 340,
    leftPanelOpen = true,
    rightPanelOpen = true,
    children
}) => {
    const contextValue = {
        leftOpen: leftPanelOpen,
        rightOpen: rightPanelOpen,
        leftWidth: leftPanelWidth,
        rightWidth: rightPanelWidth,
        leftPanelWidth: leftPanelOpen ? leftPanelWidth : PANEL_CONSTRAINTS.left.collapsed,
        rightPanelWidth: rightPanelOpen ? rightPanelWidth : PANEL_CONSTRAINTS.right.collapsed,
        leftPanelOpen,
        rightPanelOpen,
    };

    return (
        <LayoutContext.Provider value={contextValue}>
            <div style={{
                background: '#0a0a0a',
                padding: '20px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}>
                {children}
            </div>
        </LayoutContext.Provider>
    );
};

// =============================================================================
// EXAMPLE COMPONENTS
// =============================================================================

const WorkspaceDropdown = () => (
    <button className="secondary-bar-action" style={{ gap: '8px', minWidth: '140px' }}>
        <Icon name="globe" size={14} style={{ color: '#60a5fa' }} />
        <span style={{ flex: 1, textAlign: 'left' }}>Team Analysis</span>
        <Icon name="chevronDown" size={12} />
    </button>
);

const ViewModeToggle = () => {
    const [mode, setMode] = useState('normal');
    return (
        <div className="secondary-bar-toggle-group">
            <button
                className={`secondary-bar-toggle ${mode === 'normal' ? 'secondary-bar-toggle--active' : ''}`}
                onClick={() => setMode('normal')}
            >
                <Icon name="grid" size={12} />
                <span>Normal</span>
            </button>
            <button
                className={`secondary-bar-toggle ${mode === 'isolation' ? 'secondary-bar-toggle--active' : ''}`}
                onClick={() => setMode('isolation')}
            >
                <Icon name="maximize" size={12} />
                <span>Isolation</span>
            </button>
        </div>
    );
};

const VRDesktopToggle = () => {
    const [mode, setMode] = useState('desktop');
    return (
        <div className="secondary-bar-toggle-group">
            <button
                className={`secondary-bar-toggle ${mode === 'desktop' ? 'secondary-bar-toggle--active' : ''}`}
                onClick={() => setMode('desktop')}
            >
                <Icon name="monitor" size={12} />
                <span>Desktop</span>
            </button>
            <button
                className={`secondary-bar-toggle ${mode === 'vr' ? 'secondary-bar-toggle--active' : ''}`}
                onClick={() => setMode('vr')}
            >
                <Icon name="glasses" size={12} />
                <span>VR</span>
            </button>
        </div>
    );
};

const PresenceAvatars = () => (
    <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#4CAF50', border: '2px solid #222' }} />
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#2196F3', border: '2px solid #222', marginLeft: -8 }} />
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#FF9800', border: '2px solid #222', marginLeft: -8 }} />
        <span style={{ marginLeft: 8, fontSize: 11, color: '#808080' }}>+2</span>
    </div>
);

const CanvasIndicator = () => (
    <div className="secondary-bar-indicator">
        <Icon name="navigation" size={10} className="secondary-bar-indicator__icon" />
        <span className="secondary-bar-indicator__value">(0,0) → (2,1)</span>
        <span className="secondary-bar-indicator__label">of 5×4</span>
    </div>
);

const InstanceCounter = () => (
    <div className="secondary-bar-indicator">
        <Icon name="layers" size={10} className="secondary-bar-indicator__icon" />
        <span className="secondary-bar-indicator__value">3</span>
        <span className="secondary-bar-indicator__label">instances</span>
    </div>
);

const VoiceIndicator = () => (
    <button className="secondary-bar-action secondary-bar-action--active" style={{ background: 'rgba(76, 175, 80, 0.15)', borderColor: 'rgba(76, 175, 80, 0.3)', color: '#81c784' }}>
        <Icon name="radio" size={12} />
        <span>Main Room</span>
        <Icon name="mic" size={12} />
    </button>
);

// =============================================================================
// STORIES
// =============================================================================

export const SecondaryTopBarExample = {
    render: () => (
        <LayoutContextDecorator>
            <div style={{ marginBottom: 16 }}>
                <p style={{ color: '#808080', fontSize: 12, marginBottom: 8 }}>
                    Secondary Top Bar - Workspace selector in left zone, controls in center, presence in right
                </p>
            </div>
            <SecondaryBar position="top" height={36}>
                <SecondaryBarZone position="left">
                    <WorkspaceDropdown />
                </SecondaryBarZone>

                <SecondaryBarZone position="center">
                    <ViewModeToggle />
                    <SecondaryBarDivider />
                    <button className="secondary-bar-action">
                        <Icon name="add" size={12} />
                        <span>Add Cell</span>
                    </button>
                    <button className="secondary-bar-action secondary-bar-action--icon">
                        <Icon name="rotateCcw" size={12} />
                    </button>
                    <SecondaryBarSpacer />
                    <button className="secondary-bar-action">
                        <Icon name="link" size={12} />
                        <span>Link Views</span>
                    </button>
                    <button className="secondary-bar-action secondary-bar-action--primary">
                        <Icon name="share" size={12} />
                        <span>Share</span>
                    </button>
                </SecondaryBarZone>

                <SecondaryBarZone position="right">
                    <PresenceAvatars />
                </SecondaryBarZone>
            </SecondaryBar>
        </LayoutContextDecorator>
    ),
};

export const SecondaryBottomBarExample = {
    render: () => (
        <LayoutContextDecorator>
            <div style={{ marginBottom: 16 }}>
                <p style={{ color: '#808080', fontSize: 12, marginBottom: 8 }}>
                    Secondary Bottom Bar - VR/Desktop toggle in left zone, canvas info in center, voice in right
                </p>
            </div>
            <SecondaryBar position="bottom" height={28}>
                <SecondaryBarZone position="left">
                    <VRDesktopToggle />
                </SecondaryBarZone>

                <SecondaryBarZone position="center">
                    <CanvasIndicator />
                    <SecondaryBarDivider height={12} />
                    <InstanceCounter />
                </SecondaryBarZone>

                <SecondaryBarZone position="right">
                    <VoiceIndicator />
                </SecondaryBarZone>
            </SecondaryBar>
        </LayoutContextDecorator>
    ),
};

export const CollapsedPanelsDemo = {
    render: () => {
        const [leftOpen, setLeftOpen] = useState(true);
        const [rightOpen, setRightOpen] = useState(true);

        return (
            <LayoutContextDecorator
                leftPanelOpen={leftOpen}
                rightPanelOpen={rightOpen}
                leftPanelWidth={320}
                rightPanelWidth={340}
            >
                <div style={{ marginBottom: 16 }}>
                    <p style={{ color: '#808080', fontSize: 12, marginBottom: 12 }}>
                        Toggle panels to see how zones respond (minimum width maintained when collapsed)
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            onClick={() => setLeftOpen(!leftOpen)}
                            style={{ padding: '6px 12px', background: leftOpen ? '#333' : '#1a1a1a', border: '1px solid #444', borderRadius: 4, color: '#ccc', fontSize: 11, cursor: 'pointer' }}
                        >
                            Left Panel: {leftOpen ? 'Open' : 'Collapsed'}
                        </button>
                        <button
                            onClick={() => setRightOpen(!rightOpen)}
                            style={{ padding: '6px 12px', background: rightOpen ? '#333' : '#1a1a1a', border: '1px solid #444', borderRadius: 4, color: '#ccc', fontSize: 11, cursor: 'pointer' }}
                        >
                            Right Panel: {rightOpen ? 'Open' : 'Collapsed'}
                        </button>
                    </div>
                </div>

                <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 10, color: '#666' }}>Secondary Top Bar:</span>
                </div>
                <SecondaryBar position="top" height={36}>
                    <SecondaryBarZone position="left">
                        <WorkspaceDropdown />
                    </SecondaryBarZone>
                    <SecondaryBarZone position="center">
                        <ViewModeToggle />
                        <SecondaryBarSpacer />
                        <button className="secondary-bar-action secondary-bar-action--primary">
                            <Share2 size={12} />
                            <span>Share</span>
                        </button>
                    </SecondaryBarZone>
                    <SecondaryBarZone position="right">
                        <PresenceAvatars />
                    </SecondaryBarZone>
                </SecondaryBar>

                <div style={{ height: 200, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}>
                    Main Content Area
                </div>

                <SecondaryBar position="bottom" height={28}>
                    <SecondaryBarZone position="left">
                        <VRDesktopToggle />
                    </SecondaryBarZone>
                    <SecondaryBarZone position="center">
                        <CanvasIndicator />
                        <SecondaryBarDivider height={12} />
                        <InstanceCounter />
                    </SecondaryBarZone>
                    <SecondaryBarZone position="right">
                        <VoiceIndicator />
                    </SecondaryBarZone>
                </SecondaryBar>
            </LayoutContextDecorator>
        );
    },
};

export const ZoneVariants = {
    render: () => (
        <LayoutContextDecorator>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div>
                    <p style={{ color: '#808080', fontSize: 11, marginBottom: 8 }}>Standard zones with borders:</p>
                    <SecondaryBar position="top" height={36}>
                        <SecondaryBarZone position="left">Left Zone</SecondaryBarZone>
                        <SecondaryBarZone position="center">Center Zone (flex: 1)</SecondaryBarZone>
                        <SecondaryBarZone position="right">Right Zone</SecondaryBarZone>
                    </SecondaryBar>
                </div>

                <div>
                    <p style={{ color: '#808080', fontSize: 11, marginBottom: 8 }}>Without borders (noBorder prop):</p>
                    <SecondaryBar position="top" height={36}>
                        <SecondaryBarZone position="left" noBorder>Left Zone</SecondaryBarZone>
                        <SecondaryBarZone position="center">Center Zone</SecondaryBarZone>
                        <SecondaryBarZone position="right" noBorder>Right Zone</SecondaryBarZone>
                    </SecondaryBar>
                </div>

                <div>
                    <p style={{ color: '#808080', fontSize: 11, marginBottom: 8 }}>Custom minimum width (minWidth=100):</p>
                    <SecondaryBar position="bottom" height={28}>
                        <SecondaryBarZone position="left" minWidth={100} panelOpen={false}>
                            Narrow Left
                        </SecondaryBarZone>
                        <SecondaryBarZone position="center">Center</SecondaryBarZone>
                        <SecondaryBarZone position="right" minWidth={100} panelOpen={false}>
                            Narrow Right
                        </SecondaryBarZone>
                    </SecondaryBar>
                </div>
            </div>
        </LayoutContextDecorator>
    ),
};