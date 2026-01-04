// src/stories/atoms/ColorDot.stories.jsx
import React from 'react';
import { ColorDot } from '@UI/react/components/atoms';

export default {
    title: 'Atoms/ColorDot',
    component: ColorDot,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
Arbitrary color indicator dot.

Use for:
- Dataset color indicators
- View color markers
- Category indicators
                `,
            },
        },
    },
    argTypes: {
        color: {
            control: 'color',
            description: 'CSS color value',
        },
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
            description: 'Size variant',
        },
        glow: {
            control: 'boolean',
            description: 'Add glow effect',
        },
        border: {
            control: 'boolean',
            description: 'Add border',
        },
    },
};

export const Default = {
    args: {
        color: '#3b82f6',
    },
};

export const WithGlow = {
    args: {
        color: '#22c55e',
        glow: true,
    },
};

export const WithBorder = {
    args: {
        color: '#f59e0b',
        border: true,
    },
};

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
                <ColorDot color="#3b82f6" size="sm" />
                <p style={{ fontSize: '10px', margin: '8px 0 0', color: '#888' }}>Small</p>
            </div>
            <div style={{ textAlign: 'center' }}>
                <ColorDot color="#3b82f6" size="md" />
                <p style={{ fontSize: '10px', margin: '8px 0 0', color: '#888' }}>Medium</p>
            </div>
            <div style={{ textAlign: 'center' }}>
                <ColorDot color="#3b82f6" size="lg" />
                <p style={{ fontSize: '10px', margin: '8px 0 0', color: '#888' }}>Large</p>
            </div>
        </div>
    ),
};

export const ColorPalette = {
    render: () => (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <ColorDot color="#ef4444" size="md" />
            <ColorDot color="#f97316" size="md" />
            <ColorDot color="#eab308" size="md" />
            <ColorDot color="#22c55e" size="md" />
            <ColorDot color="#06b6d4" size="md" />
            <ColorDot color="#3b82f6" size="md" />
            <ColorDot color="#8b5cf6" size="md" />
            <ColorDot color="#ec4899" size="md" />
        </div>
    ),
};

export const GlowingPalette = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <ColorDot color="#ef4444" size="lg" glow />
            <ColorDot color="#22c55e" size="lg" glow />
            <ColorDot color="#3b82f6" size="lg" glow />
            <ColorDot color="#8b5cf6" size="lg" glow />
        </div>
    ),
};

export const DatasetIndicators = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
                { color: '#3b82f6', name: 'Sales Data 2024' },
                { color: '#22c55e', name: 'Customer Demographics' },
                { color: '#f59e0b', name: 'Product Inventory' },
                { color: '#8b5cf6', name: 'Marketing Metrics' },
            ].map(dataset => (
                <div key={dataset.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ColorDot color={dataset.color} size="sm" />
                    <span style={{ color: '#e0e0e0', fontSize: '13px' }}>{dataset.name}</span>
                </div>
            ))}
        </div>
    ),
};
