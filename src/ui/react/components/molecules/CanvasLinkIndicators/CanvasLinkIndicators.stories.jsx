/**
 * @file CanvasLinkIndicators.stories.jsx
 * @description Stories for Canvas Link Indicator components.
 */

import React, { useState, useEffect } from 'react';
import { ViewportLinkBorder } from './ViewportLinkBorder';
import { SyncPulseRipple } from './SyncPulseRipple';
import { LinkStatusCornerBadge } from './LinkStatusCornerBadge';
import { LinkConnectionLinesOverlay } from './LinkConnectionLinesOverlay';
import { LinkIndicatorsSettingsPanel } from './LinkIndicatorsSettingsPanel';
import {
    LinkIndicatorsProvider,
    useLinkIndicators,
    LINK_COLORS,
} from '@UI/react/context/LinkIndicatorsContext';

export default {
    title: 'Molecules/CanvasLinkIndicators',
    parameters: {
        layout: 'fullscreen',
        backgrounds: { default: 'dark' },
    },
    decorators: [
        (Story) => (
            <LinkIndicatorsProvider>
                <Story />
            </LinkIndicatorsProvider>
        ),
    ],
};

// Sample view data
const sampleViews = [
    { id: 'v1', name: 'Skull', color: '#2dd4bf' },
    { id: 'v2', name: 'Bones', color: '#4ade80' },
    { id: 'v3', name: 'Vessels', color: '#a78bfa' },
    { id: 'v4', name: 'Heart', color: '#f472b6' },
];

// =============================================================================
// VIEWPORT LINK BORDER
// =============================================================================

export const ViewportBorderSingleProperty = () => (
    <div style={{ padding: 40, display: 'flex', gap: 20 }}>
        <ViewportLinkBorder viewId="v1" linkedProperties={['camera']} isHub={false}>
            <div
                style={{
                    width: 200,
                    height: 150,
                    background: 'rgba(12, 18, 32, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                }}
            >
                Camera linked
            </div>
        </ViewportLinkBorder>

        <ViewportLinkBorder viewId="v2" linkedProperties={['filters']} isHub={false}>
            <div
                style={{
                    width: 200,
                    height: 150,
                    background: 'rgba(12, 18, 32, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                }}
            >
                Filters linked
            </div>
        </ViewportLinkBorder>

        <ViewportLinkBorder viewId="v3" linkedProperties={['colorMaps']} isHub={true}>
            <div
                style={{
                    width: 200,
                    height: 150,
                    background: 'rgba(12, 18, 32, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                }}
            >
                Hub (ColorMaps)
            </div>
        </ViewportLinkBorder>
    </div>
);

export const ViewportBorderMultipleProperties = () => (
    <div style={{ padding: 40, display: 'flex', gap: 20 }}>
        <ViewportLinkBorder
            viewId="v1"
            linkedProperties={['camera', 'filters']}
            isHub={false}
        >
            <div
                style={{
                    width: 200,
                    height: 150,
                    background: 'rgba(12, 18, 32, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 12,
                }}
            >
                Camera + Filters
            </div>
        </ViewportLinkBorder>

        <ViewportLinkBorder
            viewId="v2"
            linkedProperties={['camera', 'filters', 'colorMaps', 'widgets']}
            isHub={true}
        >
            <div
                style={{
                    width: 200,
                    height: 150,
                    background: 'rgba(12, 18, 32, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 12,
                }}
            >
                Hub (4 properties)
            </div>
        </ViewportLinkBorder>
    </div>
);

// =============================================================================
// SYNC PULSE RIPPLE
// =============================================================================

export const SyncPulse = () => {
    const [showPulse, setShowPulse] = useState(false);

    const triggerPulse = () => {
        setShowPulse(true);
        setTimeout(() => setShowPulse(false), 2000);
    };

    return (
        <div style={{ padding: 40 }}>
            <button
                onClick={triggerPulse}
                style={{
                    padding: '8px 16px',
                    background: '#2dd4bf',
                    border: 'none',
                    borderRadius: 4,
                    color: '#000',
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginBottom: 20,
                }}
            >
                Trigger Sync Pulse
            </button>

            <div
                style={{
                    position: 'relative',
                    width: 300,
                    height: 200,
                    background: 'rgba(12, 18, 32, 0.8)',
                    border: '2px solid #2dd4bf',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    overflow: 'hidden',
                }}
            >
                {showPulse && <SyncPulseRipple color="#2dd4bf" userName="Dr. Smith" />}
                View Content
            </div>
        </div>
    );
};

// =============================================================================
// LINK STATUS CORNER BADGE
// =============================================================================

export const CornerBadges = () => (
    <div style={{ padding: 40, display: 'flex', gap: 40 }}>
        <div
            style={{
                position: 'relative',
                width: 200,
                height: 150,
                background: 'rgba(12, 18, 32, 0.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
            }}
        >
            <LinkStatusCornerBadge
                viewId="v1"
                linkedProperties={['camera']}
                isHub={false}
                position="bottom-left"
                onClick={() => console.log('Open link manager')}
            />
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                    fontSize: 12,
                }}
            >
                1 linked property
            </div>
        </div>

        <div
            style={{
                position: 'relative',
                width: 200,
                height: 150,
                background: 'rgba(12, 18, 32, 0.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
            }}
        >
            <LinkStatusCornerBadge
                viewId="v2"
                linkedProperties={['camera', 'filters', 'colorMaps']}
                isHub={true}
                position="bottom-left"
                onClick={() => console.log('Open link manager')}
            />
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                    fontSize: 12,
                }}
            >
                Hub with 3 properties
            </div>
        </div>

        <div
            style={{
                position: 'relative',
                width: 200,
                height: 150,
                background: 'rgba(12, 18, 32, 0.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
            }}
        >
            <LinkStatusCornerBadge
                viewId="v3"
                linkedProperties={['camera', 'filters', 'colorMaps', 'widgets', 'cursors']}
                isHub={false}
                position="top-right"
                onClick={() => console.log('Open link manager')}
            />
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                    fontSize: 12,
                }}
            >
                5 properties (top-right)
            </div>
        </div>
    </div>
);

// =============================================================================
// SETTINGS PANEL
// =============================================================================

export const SettingsPanel = () => (
    <div style={{ padding: 40 }}>
        <LinkIndicatorsSettingsPanel onClose={() => console.log('Close')} />
    </div>
);

// =============================================================================
// FULL CANVAS DEMO
// =============================================================================

const CanvasDemoContent = () => {
    const { settings, recordSyncEvent } = useLinkIndicators();

    // Sample sync groups
    const syncGroups = [
        {
            id: 'sg1',
            property: 'camera',
            hubViewId: 'v1',
            members: new Map([
                ['v2', { mode: 'sync' }],
                ['v3', { mode: 'follow' }],
            ]),
        },
        {
            id: 'sg2',
            property: 'filters',
            hubViewId: 'v2',
            members: new Map([['v4', { mode: 'sync' }]]),
        },
    ];

    // Build linked properties map
    const getLinkedProperties = (viewId) => {
        const props = [];
        for (const group of syncGroups) {
            if (group.hubViewId === viewId || group.members.has(viewId)) {
                props.push(group.property);
            }
        }
        return props;
    };

    const isHub = (viewId) => {
        return syncGroups.some((g) => g.hubViewId === viewId);
    };

    const triggerSync = (viewId, property) => {
        recordSyncEvent(viewId, property, 'user1', 'Demo User');
    };

    return (
        <div
            style={{
                position: 'relative',
                minHeight: '100vh',
                padding: 40,
                background: '#030303',
            }}
        >
            {/* Connection lines overlay */}
            <LinkConnectionLinesOverlay syncGroups={syncGroups} />

            {/* Controls */}
            <div
                style={{
                    marginBottom: 20,
                    display: 'flex',
                    gap: 10,
                    flexWrap: 'wrap',
                }}
            >
                <button
                    onClick={() => triggerSync('v2', 'camera')}
                    style={buttonStyle}
                >
                    Trigger Sync on Bones
                </button>
                <button
                    onClick={() => triggerSync('v3', 'camera')}
                    style={buttonStyle}
                >
                    Trigger Sync on Vessels
                </button>
            </div>

            {/* Grid of viewports */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 20,
                    maxWidth: 600,
                }}
            >
                {sampleViews.map((view) => (
                    <ViewportLinkBorder
                        key={view.id}
                        viewId={view.id}
                        linkedProperties={getLinkedProperties(view.id)}
                        isHub={isHub(view.id)}
                    >
                        <div
                            style={{
                                height: 150,
                                background: 'rgba(12, 18, 32, 0.8)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                            }}
                        >
                            <span
                                style={{
                                    color: view.color,
                                    fontSize: 14,
                                    fontWeight: 600,
                                }}
                            >
                                {view.name}
                            </span>

                            <LinkStatusCornerBadge
                                viewId={view.id}
                                linkedProperties={getLinkedProperties(view.id)}
                                isHub={isHub(view.id)}
                                onClick={() =>
                                    console.log('Open link manager for', view.id)
                                }
                            />
                        </div>
                    </ViewportLinkBorder>
                ))}
            </div>

            {/* Settings panel */}
            <div style={{ position: 'fixed', bottom: 20, right: 20 }}>
                <LinkIndicatorsSettingsPanel />
            </div>
        </div>
    );
};

export const FullCanvasDemo = () => <CanvasDemoContent />;

FullCanvasDemo.parameters = {
    docs: {
        description: {
            story:
                'Full canvas demo showing all link indicators working together. Try toggling settings and triggering syncs.',
        },
    },
};

// Button style for demos
const buttonStyle = {
    padding: '8px 16px',
    background: '#2a2a2a',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    color: '#fff',
    fontSize: 13,
    cursor: 'pointer',
};
