// src/ui/react/components/atoms/Text/Text.stories.jsx
import React from 'react';
import { Text } from './Text';

export default {
    title: 'Atoms/Text',
    component: Text,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        variant: {
            control: 'select',
            options: ['label', 'body', 'caption', 'title', 'mono'],
        },
        color: {
            control: 'select',
            options: ['primary', 'secondary', 'muted', 'accent'],
        },
        weight: {
            control: 'select',
            options: ['normal', 'medium', 'semibold', 'bold'],
        },
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
        },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f' }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    args: {
        children: 'Default text',
    },
};

export const Title = {
    args: {
        children: 'Page Title',
        variant: 'title',
    },
};

export const Label = {
    args: {
        children: 'Form Label',
        variant: 'label',
    },
};

export const Body = {
    args: {
        children: 'This is body text used for paragraphs and main content.',
        variant: 'body',
    },
};

export const Caption = {
    args: {
        children: 'Caption text for supplementary info',
        variant: 'caption',
    },
};

export const Mono = {
    args: {
        children: 'const code = "monospace";',
        variant: 'mono',
    },
};

export const Colors = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Text color="primary">Primary color</Text>
            <Text color="secondary">Secondary color</Text>
            <Text color="muted">Muted color</Text>
            <Text color="accent">Accent color</Text>
            <Text color="#22c55e">Custom green color</Text>
        </div>
    ),
};

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

export const SizeOverrides = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Text size="sm">Small size</Text>
            <Text size="md">Medium size</Text>
            <Text size="lg">Large size</Text>
        </div>
    ),
};

export const Uppercase = {
    args: {
        children: 'uppercase text',
        uppercase: true,
        variant: 'label',
    },
};

export const Truncate = {
    args: {
        children: 'This is a very long text that should be truncated with an ellipsis when it overflows',
        truncate: true,
    },
    decorators: [
        (Story) => (
            <div style={{ width: '200px' }}>
                <Story />
            </div>
        ),
    ],
};

export const AsElement = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Text as="h1" variant="title">Heading 1</Text>
            <Text as="h2" variant="title" size="md">Heading 2</Text>
            <Text as="p" variant="body">Paragraph element</Text>
            <Text as="span" variant="caption">Span element</Text>
        </div>
    ),
};

export const AllVariants = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Text variant="title">Title Variant</Text>
            <Text variant="label">Label Variant</Text>
            <Text variant="body">Body Variant - used for main content</Text>
            <Text variant="caption">Caption Variant - supplementary text</Text>
            <Text variant="mono">Mono Variant - code style</Text>
        </div>
    ),
};
