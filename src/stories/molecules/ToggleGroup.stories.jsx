// src/stories/molecules/ToggleGroup.stories.jsx
import React, { useState } from 'react';
import { ToggleGroup } from '@UI/react/components/molecules';

export default {
    title: 'Molecules/ToggleGroup',
    component: ToggleGroup,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
Mutually exclusive toggle buttons.

Use for:
- Segmented controls
- Mode toggles
- View switchers
- Option selectors
                `,
            },
        },
    },
    argTypes: {
        variant: { control: 'select', options: ['default', 'etched', 'segmented'] },
        size: { control: 'select', options: ['sm', 'md', 'lg'] },
        fullWidth: { control: 'boolean' },
        disabled: { control: 'boolean' },
    },
};

export const Default = {
    render: () => {
        const [value, setValue] = useState('list');
        return (
            <ToggleGroup
                options={[
                    { value: 'list', icon: 'list', label: 'List' },
                    { value: 'grid', icon: 'grid', label: 'Grid' },
                    { value: 'table', icon: 'table', label: 'Table' },
                ]}
                value={value}
                onChange={setValue}
            />
        );
    },
};

export const IconOnly = {
    render: () => {
        const [value, setValue] = useState('left');
        return (
            <ToggleGroup
                options={[
                    { value: 'left', icon: 'align-left' },
                    { value: 'center', icon: 'align-center' },
                    { value: 'right', icon: 'align-right' },
                    { value: 'justify', icon: 'align-justify' },
                ]}
                value={value}
                onChange={setValue}
            />
        );
    },
};

export const LabelOnly = {
    render: () => {
        const [value, setValue] = useState('monthly');
        return (
            <ToggleGroup
                options={[
                    { value: 'daily', label: 'Daily' },
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'yearly', label: 'Yearly' },
                ]}
                value={value}
                onChange={setValue}
            />
        );
    },
};

export const Variants = {
    render: () => {
        const [values, setValues] = useState({ default: 'a', etched: 'a', segmented: 'a' });
        const options = [
            { value: 'a', label: 'Option A' },
            { value: 'b', label: 'Option B' },
            { value: 'c', label: 'Option C' },
        ];

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                    <p style={{ color: '#888', fontSize: '12px', margin: '0 0 8px' }}>variant="default"</p>
                    <ToggleGroup
                        options={options}
                        value={values.default}
                        onChange={(v) => setValues(s => ({ ...s, default: v }))}
                        variant="default"
                    />
                </div>
                <div>
                    <p style={{ color: '#888', fontSize: '12px', margin: '0 0 8px' }}>variant="etched"</p>
                    <ToggleGroup
                        options={options}
                        value={values.etched}
                        onChange={(v) => setValues(s => ({ ...s, etched: v }))}
                        variant="etched"
                    />
                </div>
                <div>
                    <p style={{ color: '#888', fontSize: '12px', margin: '0 0 8px' }}>variant="segmented"</p>
                    <ToggleGroup
                        options={options}
                        value={values.segmented}
                        onChange={(v) => setValues(s => ({ ...s, segmented: v }))}
                        variant="segmented"
                    />
                </div>
            </div>
        );
    },
};

export const Sizes = {
    render: () => {
        const [values, setValues] = useState({ sm: 'a', md: 'a', lg: 'a' });
        const options = [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
            { value: 'c', label: 'C' },
        ];

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'flex-start' }}>
                <div>
                    <p style={{ color: '#888', fontSize: '12px', margin: '0 0 8px' }}>size="sm"</p>
                    <ToggleGroup
                        options={options}
                        value={values.sm}
                        onChange={(v) => setValues(s => ({ ...s, sm: v }))}
                        size="sm"
                    />
                </div>
                <div>
                    <p style={{ color: '#888', fontSize: '12px', margin: '0 0 8px' }}>size="md"</p>
                    <ToggleGroup
                        options={options}
                        value={values.md}
                        onChange={(v) => setValues(s => ({ ...s, md: v }))}
                        size="md"
                    />
                </div>
                <div>
                    <p style={{ color: '#888', fontSize: '12px', margin: '0 0 8px' }}>size="lg"</p>
                    <ToggleGroup
                        options={options}
                        value={values.lg}
                        onChange={(v) => setValues(s => ({ ...s, lg: v }))}
                        size="lg"
                    />
                </div>
            </div>
        );
    },
};

export const FullWidth = {
    render: () => {
        const [value, setValue] = useState('all');
        return (
            <div style={{ width: '400px' }}>
                <ToggleGroup
                    options={[
                        { value: 'all', label: 'All' },
                        { value: 'active', label: 'Active' },
                        { value: 'completed', label: 'Completed' },
                    ]}
                    value={value}
                    onChange={setValue}
                    fullWidth
                    variant="segmented"
                />
            </div>
        );
    },
};

export const ViewSwitcher = {
    render: () => {
        const [view, setView] = useState('2d');
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
            }}>
                <span style={{ color: '#888', fontSize: '12px' }}>View:</span>
                <ToggleGroup
                    options={[
                        { value: '2d', icon: 'layout', label: '2D' },
                        { value: '3d', icon: 'box', label: '3D' },
                        { value: 'vr', icon: 'glasses', label: 'VR' },
                    ]}
                    value={view}
                    onChange={setView}
                    variant="etched"
                    size="sm"
                />
            </div>
        );
    },
};
