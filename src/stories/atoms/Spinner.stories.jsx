// src/stories/atoms/Spinner.stories.jsx
import React from 'react';
import { Spinner } from '@UI/react/components/atoms';

export default {
    title: 'Atoms/Spinner',
    component: Spinner,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
Loading indicator spinner.

Use for:
- Loading states
- Async operations
- Button loading states
                `,
            },
        },
    },
    argTypes: {
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
            description: 'Spinner size',
        },
        color: {
            control: 'color',
            description: 'Spinner color (CSS color value)',
        },
    },
};

// =============================================================================
// BASIC STORIES
// =============================================================================

export const Default = {
    args: {},
};

export const Small = {
    args: {
        size: 'sm',
    },
};

export const Large = {
    args: {
        size: 'lg',
    },
};

export const CustomColor = {
    args: {
        color: '#4ecdc4',
    },
};

// =============================================================================
// SIZE VARIATIONS
// =============================================================================

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
                <Spinner size="sm" />
                <p style={{ fontSize: '10px', margin: '8px 0 0', color: '#888' }}>Small</p>
            </div>
            <div style={{ textAlign: 'center' }}>
                <Spinner size="md" />
                <p style={{ fontSize: '10px', margin: '8px 0 0', color: '#888' }}>Medium</p>
            </div>
            <div style={{ textAlign: 'center' }}>
                <Spinner size="lg" />
                <p style={{ fontSize: '10px', margin: '8px 0 0', color: '#888' }}>Large</p>
            </div>
        </div>
    ),
};

// =============================================================================
// COLOR VARIATIONS
// =============================================================================

export const Colors = {
    render: () => (
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <Spinner />
            <Spinner color="#4ecdc4" />
            <Spinner color="#ff6b6b" />
            <Spinner color="#f7dc6f" />
            <Spinner color="#bb8fce" />
        </div>
    ),
};

// =============================================================================
// USE CASES
// =============================================================================

export const ButtonLoading = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px' }}>
            <button style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(78, 205, 196, 0.2)',
                border: '1px solid rgba(78, 205, 196, 0.4)',
                borderRadius: '6px',
                padding: '8px 16px',
                color: '#4ecdc4',
                cursor: 'not-allowed',
                opacity: 0.7,
            }}>
                <Spinner size="sm" color="#4ecdc4" />
                <span>Loading...</span>
            </button>
            <button style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#4ecdc4',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                color: '#1a1a2e',
                cursor: 'pointer',
            }}>
                <span>Submit</span>
            </button>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Use small spinners inside buttons to indicate loading state.',
            },
        },
    },
};

export const ContentLoading = {
    render: () => (
        <div style={{
            width: '300px',
            height: '200px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
        }}>
            <Spinner size="lg" />
            <span style={{ color: '#888', fontSize: '14px' }}>Loading content...</span>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Use larger spinners for full-content loading states.',
            },
        },
    },
};

export const InlineLoading = {
    render: () => (
        <div style={{ color: '#e0e0e0' }}>
            <p style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px' }}>
                <Spinner size="sm" />
                <span>Fetching data...</span>
            </p>
            <p style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px' }}>
                <Spinner size="sm" color="#4ecdc4" />
                <span>Processing files...</span>
            </p>
            <p style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0' }}>
                <Spinner size="sm" color="#f7dc6f" />
                <span>Syncing changes...</span>
            </p>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Inline spinners work well with status messages.',
            },
        },
    },
};

export const CardLoading = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{
                width: '150px',
                height: '100px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
            }}>
                <Spinner size="md" />
            </div>
            <div style={{
                width: '150px',
                height: '100px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
            }}>
                <Spinner size="md" color="#4ecdc4" />
            </div>
            <div style={{
                width: '150px',
                height: '100px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                padding: '12px',
            }}>
                <div style={{ color: '#e0e0e0', fontWeight: '500' }}>Card Title</div>
                <div style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>Content loaded</div>
            </div>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Placeholder spinners in card layouts while content loads.',
            },
        },
    },
};
