// src/stories/atoms/Divider.stories.jsx
import React from 'react';
import { Divider } from '@UI/react/components/atoms';

export default {
    title: 'Atoms/Divider',
    component: Divider,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `
Visual separator for content.

Use for:
- Section separators
- Menu dividers
- Content breaks
                `,
            },
        },
    },
    argTypes: {
        orientation: {
            control: 'select',
            options: ['horizontal', 'vertical'],
            description: 'Divider direction',
        },
        spacing: {
            control: 'select',
            options: ['none', 'sm', 'md', 'lg'],
            description: 'Spacing around the divider',
        },
        label: {
            control: 'text',
            description: 'Optional centered label',
        },
    },
};

// =============================================================================
// BASIC STORIES
// =============================================================================

export const Default = {
    args: {},
};

export const WithLabel = {
    args: {
        label: 'OR',
    },
};

export const NoSpacing = {
    args: {
        spacing: 'none',
    },
};

// =============================================================================
// ORIENTATION VARIATIONS
// =============================================================================

export const Horizontal = {
    render: () => (
        <div style={{ width: '300px' }}>
            <p style={{ color: '#e0e0e0', marginBottom: '0' }}>Content above</p>
            <Divider />
            <p style={{ color: '#e0e0e0', marginTop: '0' }}>Content below</p>
        </div>
    ),
};

export const Vertical = {
    render: () => (
        <div style={{ display: 'flex', alignItems: 'center', height: '60px', gap: '16px' }}>
            <span style={{ color: '#e0e0e0' }}>Left</span>
            <Divider orientation="vertical" spacing="none" />
            <span style={{ color: '#e0e0e0' }}>Right</span>
        </div>
    ),
};

// =============================================================================
// SPACING VARIATIONS
// =============================================================================

export const Spacings = {
    render: () => (
        <div style={{ width: '300px' }}>
            <p style={{ color: '#888', fontSize: '12px', margin: '0' }}>spacing="none"</p>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px' }}>
                <p style={{ color: '#e0e0e0', margin: '0' }}>Content</p>
                <Divider spacing="none" />
                <p style={{ color: '#e0e0e0', margin: '0' }}>Content</p>
            </div>

            <p style={{ color: '#888', fontSize: '12px', margin: '16px 0 0' }}>spacing="sm"</p>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px' }}>
                <p style={{ color: '#e0e0e0', margin: '0' }}>Content</p>
                <Divider spacing="sm" />
                <p style={{ color: '#e0e0e0', margin: '0' }}>Content</p>
            </div>

            <p style={{ color: '#888', fontSize: '12px', margin: '16px 0 0' }}>spacing="md" (default)</p>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px' }}>
                <p style={{ color: '#e0e0e0', margin: '0' }}>Content</p>
                <Divider spacing="md" />
                <p style={{ color: '#e0e0e0', margin: '0' }}>Content</p>
            </div>

            <p style={{ color: '#888', fontSize: '12px', margin: '16px 0 0' }}>spacing="lg"</p>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px' }}>
                <p style={{ color: '#e0e0e0', margin: '0' }}>Content</p>
                <Divider spacing="lg" />
                <p style={{ color: '#e0e0e0', margin: '0' }}>Content</p>
            </div>
        </div>
    ),
};

// =============================================================================
// USE CASES
// =============================================================================

export const MenuDivider = {
    render: () => (
        <div style={{
            width: '200px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
            padding: '4px 0',
        }}>
            <div style={{ padding: '8px 12px', color: '#e0e0e0' }}>Edit</div>
            <div style={{ padding: '8px 12px', color: '#e0e0e0' }}>Copy</div>
            <div style={{ padding: '8px 12px', color: '#e0e0e0' }}>Paste</div>
            <Divider spacing="sm" />
            <div style={{ padding: '8px 12px', color: '#ff6b6b' }}>Delete</div>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Dividers separate groups of related menu items.',
            },
        },
    },
};

export const SectionDivider = {
    render: () => (
        <div style={{ width: '300px' }}>
            <h3 style={{ color: '#e0e0e0', margin: '0 0 8px' }}>Section 1</h3>
            <p style={{ color: '#888', margin: '0' }}>Content for section one goes here.</p>
            <Divider label="Next Section" />
            <h3 style={{ color: '#e0e0e0', margin: '0 0 8px' }}>Section 2</h3>
            <p style={{ color: '#888', margin: '0' }}>Content for section two goes here.</p>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Labeled dividers help break up content into clear sections.',
            },
        },
    },
};

export const ToolbarDivider = {
    render: () => (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255,255,255,0.05)',
            padding: '8px 12px',
            borderRadius: '8px',
        }}>
            <button style={{ background: 'transparent', border: 'none', color: '#e0e0e0', cursor: 'pointer' }}>Bold</button>
            <button style={{ background: 'transparent', border: 'none', color: '#e0e0e0', cursor: 'pointer' }}>Italic</button>
            <Divider orientation="vertical" spacing="none" />
            <button style={{ background: 'transparent', border: 'none', color: '#e0e0e0', cursor: 'pointer' }}>Left</button>
            <button style={{ background: 'transparent', border: 'none', color: '#e0e0e0', cursor: 'pointer' }}>Center</button>
            <button style={{ background: 'transparent', border: 'none', color: '#e0e0e0', cursor: 'pointer' }}>Right</button>
            <Divider orientation="vertical" spacing="none" />
            <button style={{ background: 'transparent', border: 'none', color: '#e0e0e0', cursor: 'pointer' }}>Link</button>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Vertical dividers separate groups of actions in toolbars.',
            },
        },
    },
};
