import { useState } from 'react';
import { DockedBottomSection, DockedHeightProvider } from './index';
import { Icon } from '@UI/react/components/common/Icon';

export default {
    title: 'Common/DockedBottomSection',
    component: DockedBottomSection,
    decorators: [
        (Story) => (
            <DockedHeightProvider>
                <div style={{
                    height: '500px',
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#0f0f0f',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(255,255,255,0.3)'
                    }}>
                        Main Content Area
                    </div>
                    <Story />
                </div>
            </DockedHeightProvider>
        ),
    ],
    parameters: {
        layout: 'padded',
        backgrounds: { default: 'dark' },
    },
};

// Basic usage
export const Default = {
    args: {
        title: 'Grid Preview',
        children: (
            <div style={{ padding: '16px', color: 'rgba(255,255,255,0.7)' }}>
                <p>Preview content goes here. This section is resizable - drag the top edge.</p>
                <div style={{
                    marginTop: '12px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '8px'
                }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} style={{
                            aspectRatio: '1',
                            background: 'rgba(96, 165, 250, 0.2)',
                            border: '1px solid rgba(96, 165, 250, 0.4)',
                            borderRadius: '4px'
                        }} />
                    ))}
                </div>
            </div>
        ),
    },
};

// With header controls
export const WithHeaderControls = {
    args: {
        title: 'Layout Preview',
        headerControls: (
            <>
                <button style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    padding: 0,
                    border: 'none',
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.5)',
                    borderRadius: '4px',
                    cursor: 'pointer'
                }}>
                    <Icon name="grid3x3" size={14} />
                </button>
                <button style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    padding: 0,
                    border: 'none',
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.5)',
                    borderRadius: '4px',
                    cursor: 'pointer'
                }}>
                    <Icon name="settings" size={14} />
                </button>
            </>
        ),
        children: (
            <div style={{ padding: '16px', color: 'rgba(255,255,255,0.7)' }}>
                Section with header controls
            </div>
        ),
    },
};

// With expand callback
export const WithExpandCallback = () => {
    const [expanded, setExpanded] = useState(false);

    return (
        <>
            <DockedBottomSection
                title="Expandable Preview"
                onExpand={() => setExpanded(true)}
            >
                <div style={{ padding: '16px', color: 'rgba(255,255,255,0.7)' }}>
                    Press ⌘E (Mac) or Ctrl+E (Windows) to expand, or click the expand button.
                    <p style={{ marginTop: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                        Expanded: {expanded ? 'Yes' : 'No'}
                    </p>
                </div>
            </DockedBottomSection>
            {expanded && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    zIndex: 1000
                }} onClick={() => setExpanded(false)}>
                    Expanded Overlay (click to close)
                </div>
            )}
        </>
    );
};

// Context variations
export const LayoutContext = {
    args: {
        title: 'Layout',
        context: 'layout',
        children: (
            <div style={{ padding: '16px', color: 'rgba(255,255,255,0.7)' }}>
                Layout context - drag to reorder, merge/split cells
            </div>
        ),
    },
};

export const PresenceContext = {
    args: {
        title: 'Presence',
        context: 'presence',
        headerControls: (
            <button style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                border: 'none',
                background: 'rgba(251, 113, 133, 0.15)',
                color: '#fb7185',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
            }}>
                <Icon name="users" size={12} />
                Save Place
            </button>
        ),
        children: (
            <div style={{ padding: '16px', color: 'rgba(255,255,255,0.7)' }}>
                Presence context - see collaborator locations, follow others
            </div>
        ),
    },
};

// Shared height state demonstration
export const SharedHeightState = () => {
    return (
        <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{
                flex: 1,
                height: '400px',
                display: 'flex',
                flexDirection: 'column',
                background: '#0f0f0f',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                overflow: 'hidden'
            }}>
                <div style={{ flex: 1, padding: '16px', color: 'rgba(255,255,255,0.3)' }}>
                    Tab 1
                </div>
                <DockedBottomSection
                    title="Shared Preview"
                    sharedHeightKey="demo-shared"
                >
                    <div style={{ padding: '16px', color: 'rgba(255,255,255,0.7)' }}>
                        Resize this - the other tab will match
                    </div>
                </DockedBottomSection>
            </div>
            <div style={{
                flex: 1,
                height: '400px',
                display: 'flex',
                flexDirection: 'column',
                background: '#0f0f0f',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                overflow: 'hidden'
            }}>
                <div style={{ flex: 1, padding: '16px', color: 'rgba(255,255,255,0.3)' }}>
                    Tab 2
                </div>
                <DockedBottomSection
                    title="Shared Preview"
                    sharedHeightKey="demo-shared"
                >
                    <div style={{ padding: '16px', color: 'rgba(255,255,255,0.7)' }}>
                        This shares height with Tab 1
                    </div>
                </DockedBottomSection>
            </div>
        </div>
    );
};

SharedHeightState.decorators = [
    (Story) => (
        <DockedHeightProvider>
            <Story />
        </DockedHeightProvider>
    ),
];