// src/stories/atoms/Text.stories.jsx
import React from 'react';
import { Text } from '@UI/react/components/atoms';

export default {
    title: 'Atoms/Text',
    component: Text,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `
Typography component for consistent text styling.

Use for:
- Labels, titles, captions
- Body text
- Monospace/code text
                `,
            },
        },
    },
    argTypes: {
        children: {
            control: 'text',
            description: 'Text content',
        },
        variant: {
            control: 'select',
            options: ['label', 'body', 'caption', 'title', 'mono'],
            description: 'Text style variant',
        },
        color: {
            control: 'select',
            options: ['primary', 'secondary', 'muted', 'accent'],
            description: 'Text color preset',
        },
        weight: {
            control: 'select',
            options: ['normal', 'medium', 'semibold', 'bold'],
            description: 'Font weight',
        },
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
            description: 'Size override',
        },
        uppercase: {
            control: 'boolean',
            description: 'Transform to uppercase',
        },
        truncate: {
            control: 'boolean',
            description: 'Truncate with ellipsis',
        },
        as: {
            control: 'select',
            options: ['span', 'p', 'div', 'h1', 'h2', 'h3', 'h4', 'label'],
            description: 'HTML element to render',
        },
    },
};

// =============================================================================
// BASIC STORIES
// =============================================================================

export const Default = {
    args: {
        children: 'Default text content',
    },
};

export const Title = {
    args: {
        children: 'Page Title',
        variant: 'title',
        as: 'h1',
    },
};

export const Label = {
    args: {
        children: 'Form Label',
        variant: 'label',
    },
};

export const Caption = {
    args: {
        children: 'This is a caption or hint text',
        variant: 'caption',
        color: 'muted',
    },
};

export const Mono = {
    args: {
        children: 'const value = 42;',
        variant: 'mono',
    },
};

// =============================================================================
// VARIANT SHOWCASE
// =============================================================================

export const Variants = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
                <Text variant="caption" color="muted">variant="title"</Text>
                <Text variant="title" as="div">Title Variant</Text>
            </div>
            <div>
                <Text variant="caption" color="muted">variant="label"</Text>
                <Text variant="label" as="div">Label Variant</Text>
            </div>
            <div>
                <Text variant="caption" color="muted">variant="body"</Text>
                <Text variant="body" as="div">Body Variant - Regular text content</Text>
            </div>
            <div>
                <Text variant="caption" color="muted">variant="caption"</Text>
                <Text variant="caption" as="div">Caption Variant - Secondary information</Text>
            </div>
            <div>
                <Text variant="caption" color="muted">variant="mono"</Text>
                <Text variant="mono" as="div">Mono Variant - Code or data</Text>
            </div>
        </div>
    ),
};

// =============================================================================
// COLOR VARIATIONS
// =============================================================================

export const Colors = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Text color="primary">Primary color (default)</Text>
            <Text color="secondary">Secondary color</Text>
            <Text color="muted">Muted color</Text>
            <Text color="accent">Accent color</Text>
            <Text color="#ff6b6b">Custom color (#ff6b6b)</Text>
            <Text color="#4ecdc4">Custom color (#4ecdc4)</Text>
        </div>
    ),
};

// =============================================================================
// WEIGHT VARIATIONS
// =============================================================================

export const Weights = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Text weight="normal">Normal weight</Text>
            <Text weight="medium">Medium weight</Text>
            <Text weight="semibold">Semibold weight</Text>
            <Text weight="bold">Bold weight</Text>
        </div>
    ),
};

// =============================================================================
// SIZE VARIATIONS
// =============================================================================

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Text size="sm">Small size text</Text>
            <Text size="md">Medium size text (default)</Text>
            <Text size="lg">Large size text</Text>
        </div>
    ),
};

// =============================================================================
// TEXT TRANSFORMS
// =============================================================================

export const Uppercase = {
    args: {
        children: 'Uppercase text',
        uppercase: true,
        variant: 'label',
        weight: 'semibold',
    },
};

export const Truncated = {
    render: () => (
        <div style={{ width: '200px' }}>
            <Text truncate>
                This is a very long text that will be truncated with an ellipsis when it overflows the container
            </Text>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Truncated text shows ellipsis when content overflows.',
            },
        },
    },
};

// =============================================================================
// USE CASES
// =============================================================================

export const FormLabel = {
    render: () => (
        <div style={{ width: '300px' }}>
            <Text variant="label" as="label" weight="medium">
                Email Address
            </Text>
            <input
                type="email"
                placeholder="Enter your email"
                style={{
                    width: '100%',
                    marginTop: '4px',
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    color: '#e0e0e0',
                    fontSize: '14px',
                }}
            />
            <Text variant="caption" color="muted" as="p" style={{ marginTop: '4px' }}>
                We'll never share your email with anyone.
            </Text>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Combine label and caption variants for form fields.',
            },
        },
    },
};

export const CardContent = {
    render: () => (
        <div style={{
            width: '300px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
            padding: '16px',
        }}>
            <Text variant="title" as="h3" size="md">
                Card Title
            </Text>
            <Text variant="body" color="secondary" as="p" style={{ marginTop: '8px' }}>
                This is the card body content with some description text that explains something.
            </Text>
            <Text variant="caption" color="muted" as="p" style={{ marginTop: '12px' }}>
                Updated 2 hours ago
            </Text>
        </div>
    ),
};

export const CodeBlock = {
    render: () => (
        <div style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '6px',
            padding: '12px',
        }}>
            <Text variant="mono" color="accent" as="pre" style={{ margin: 0 }}>
{`function greet(name) {
  return \`Hello, \${name}!\`;
}`}
            </Text>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Use mono variant for code snippets.',
            },
        },
    },
};

export const StatusList = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="label">Server Status</Text>
                <Text color="#4ecdc4" weight="medium">Online</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="label">Response Time</Text>
                <Text variant="mono" color="secondary">42ms</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="label">Uptime</Text>
                <Text variant="mono" color="secondary">99.9%</Text>
            </div>
        </div>
    ),
};
