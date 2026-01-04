/**
 * @file Tooltip.stories.jsx
 * @description Storybook stories for the Tooltip component.
 * Demonstrates various tooltip configurations, placements, and rich content.
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { Tooltip, TooltipProvider } from './index';
import { Button, IconButton } from '../Button';

export default {
    title: 'Atoms/Tooltip',
    component: Tooltip,
    parameters: {
        layout: 'centered',
    },
    decorators: [
        (Story) => (
            <TooltipProvider delayDuration={300}>
                <div style={{ padding: '100px', background: '#0a0a0f' }}>
                    <Story />
                </div>
            </TooltipProvider>
        ),
    ],
};

// =============================================================================
// BASIC TOOLTIPS
// =============================================================================

export const Default = {
    render: () => (
        <Tooltip content="This is a tooltip">
            <button style={{ padding: '8px 16px', background: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: '6px', color: 'white', cursor: 'pointer' }}>
                Hover me
            </button>
        </Tooltip>
    ),
};

export const OnIconButton = {
    render: () => (
        <Tooltip content="Open settings">
            <IconButton icon="settings" label="Settings" />
        </Tooltip>
    ),
};

export const OnButton = {
    render: () => (
        <Tooltip content="Save your changes to the server">
            <Button variant="primary" icon="save">
                Save
            </Button>
        </Tooltip>
    ),
};

// =============================================================================
// PLACEMENTS
// =============================================================================

export const Placements = {
    render: () => (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px', padding: '40px' }}>
            <div />
            <Tooltip content="Top placement" placement="top">
                <Button variant="secondary">Top</Button>
            </Tooltip>
            <div />

            <Tooltip content="Left placement" placement="left">
                <Button variant="secondary">Left</Button>
            </Tooltip>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Icon name="info" size={24} style={{ color: '#666' }} />
            </div>
            <Tooltip content="Right placement" placement="right">
                <Button variant="secondary">Right</Button>
            </Tooltip>

            <div />
            <Tooltip content="Bottom placement" placement="bottom">
                <Button variant="secondary">Bottom</Button>
            </Tooltip>
            <div />
        </div>
    ),
};

// =============================================================================
// RICH TOOLTIPS
// =============================================================================

export const RichWithTitle = {
    render: () => (
        <Tooltip
            content={
                <Tooltip.Rich
                    title="Global Search"
                    description="Search across all your projects, datasets, and views"
                />
            }
        >
            <IconButton icon="search" label="Search" variant="secondary" />
        </Tooltip>
    ),
};

export const RichWithShortcut = {
    render: () => (
        <Tooltip
            content={
                <Tooltip.Rich
                    title="Save Changes"
                    description="Save all pending changes to the server"
                    shortcut="⌘S"
                />
            }
        >
            <Button variant="primary" icon="save">
                Save
            </Button>
        </Tooltip>
    ),
};

export const RichWithIcon = {
    render: () => (
        <Tooltip
            content={
                <Tooltip.Rich
                    icon="delete"
                    title="Delete Item"
                    description="This action cannot be undone"
                />
            }
        >
            <IconButton icon="delete" label="Delete" variant="danger" />
        </Tooltip>
    ),
};

export const AllRichTooltips = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px' }}>
            <Tooltip
                content={
                    <Tooltip.Rich
                        title="Edit"
                        shortcut="E"
                    />
                }
            >
                <IconButton icon="edit" label="Edit" />
            </Tooltip>

            <Tooltip
                content={
                    <Tooltip.Rich
                        title="Share"
                        description="Share this item with others"
                        shortcut="⌘⇧S"
                    />
                }
            >
                <IconButton icon="share" label="Share" />
            </Tooltip>

            <Tooltip
                content={
                    <Tooltip.Rich
                        title="Copy Link"
                        shortcut="⌘C"
                    />
                }
            >
                <IconButton icon="copy" label="Copy" />
            </Tooltip>
        </div>
    ),
};

// =============================================================================
// INTERACTIVE TOOLTIP
// =============================================================================

export const Interactive = {
    render: () => (
        <Tooltip
            content={
                <div style={{ padding: '4px' }}>
                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>John Doe</div>
                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>
                        Online • Viewing Dataset A
                    </div>
                    <button style={{
                        padding: '4px 8px',
                        background: '#2563eb',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        fontSize: '11px',
                        cursor: 'pointer'
                    }}>
                        View Profile
                    </button>
                </div>
            }
            interactive
            maxWidth={200}
        >
            <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 500,
                cursor: 'pointer'
            }}>
                JD
            </div>
        </Tooltip>
    ),
};

// =============================================================================
// DELAY VARIATIONS
// =============================================================================

export const InstantTooltip = {
    render: () => (
        <Tooltip content="Instant tooltip (no delay)" delay={0}>
            <Button variant="secondary">No Delay</Button>
        </Tooltip>
    ),
};

export const SlowTooltip = {
    render: () => (
        <Tooltip content="Slow tooltip (800ms delay)" delay={800}>
            <Button variant="secondary">Long Delay (800ms)</Button>
        </Tooltip>
    ),
};

// =============================================================================
// WITHOUT ARROW
// =============================================================================

export const WithoutArrow = {
    render: () => (
        <Tooltip content="Tooltip without arrow" arrow={false}>
            <Button variant="secondary">No Arrow</Button>
        </Tooltip>
    ),
};

// =============================================================================
// DISABLED TOOLTIP
// =============================================================================

export const DisabledTooltip = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px' }}>
            <Tooltip content="This tooltip is visible">
                <Button variant="secondary">Enabled</Button>
            </Tooltip>
            <Tooltip content="This tooltip is hidden" disabled>
                <Button variant="secondary">Disabled</Button>
            </Tooltip>
        </div>
    ),
};

// =============================================================================
// TOOLBAR EXAMPLE
// =============================================================================

export const ToolbarExample = {
    render: () => (
        <div style={{
            display: 'flex',
            gap: '4px',
            padding: '8px',
            background: '#1a1a24',
            borderRadius: '8px',
            border: '1px solid #2a2a3a'
        }}>
            <Tooltip content={<Tooltip.Rich title="Edit" shortcut="E" />}>
                <IconButton icon="edit" label="Edit" size="sm" />
            </Tooltip>
            <Tooltip content={<Tooltip.Rich title="Copy" shortcut="⌘C" />}>
                <IconButton icon="copy" label="Copy" size="sm" />
            </Tooltip>
            <Tooltip content={<Tooltip.Rich title="Share" shortcut="⌘⇧S" />}>
                <IconButton icon="share" label="Share" size="sm" />
            </Tooltip>
            <div style={{ width: '1px', background: '#2a2a3a', margin: '0 4px' }} />
            <Tooltip content={<Tooltip.Rich title="Delete" description="Cannot be undone" />}>
                <IconButton icon="delete" label="Delete" size="sm" variant="danger" />
            </Tooltip>
        </div>
    ),
};

// =============================================================================
// MAX WIDTH
// =============================================================================

export const MaxWidth = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px' }}>
            <Tooltip
                content="This is a tooltip with the default max width of 250px. It will wrap to multiple lines when the content exceeds this width."
            >
                <Button variant="secondary">Default (250px)</Button>
            </Tooltip>
            <Tooltip
                content="This tooltip has a custom max width of 150px set explicitly."
                maxWidth={150}
            >
                <Button variant="secondary">Narrow (150px)</Button>
            </Tooltip>
            <Tooltip
                content="This tooltip has a wider max width of 400px for displaying more content."
                maxWidth={400}
            >
                <Button variant="secondary">Wide (400px)</Button>
            </Tooltip>
        </div>
    ),
};