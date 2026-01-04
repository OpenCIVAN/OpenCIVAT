// src/stories/molecules/SearchInput.stories.jsx
import React, { useState } from 'react';
import { SearchInput } from '@UI/react/components/molecules';

export default {
    title: 'Molecules/SearchInput',
    component: SearchInput,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
Input with search icon and clear button.

Use for:
- Search fields
- Filter inputs
- Command palettes
- Quick find inputs
                `,
            },
        },
    },
    argTypes: {
        value: { control: 'text' },
        placeholder: { control: 'text' },
        size: { control: 'select', options: ['sm', 'md', 'lg'] },
        loading: { control: 'boolean' },
        disabled: { control: 'boolean' },
        icon: { control: 'text' },
        showClear: { control: 'boolean' },
    },
};

export const Default = {
    render: () => {
        const [value, setValue] = useState('');
        return (
            <div style={{ width: '300px' }}>
                <SearchInput
                    value={value}
                    onChange={setValue}
                    placeholder="Search..."
                />
            </div>
        );
    },
};

export const WithValue = {
    render: () => {
        const [value, setValue] = useState('react components');
        return (
            <div style={{ width: '300px' }}>
                <SearchInput
                    value={value}
                    onChange={setValue}
                />
            </div>
        );
    },
};

export const Loading = {
    render: () => {
        const [value, setValue] = useState('searching...');
        return (
            <div style={{ width: '300px' }}>
                <SearchInput
                    value={value}
                    onChange={setValue}
                    loading
                />
            </div>
        );
    },
};

export const Disabled = {
    render: () => (
        <div style={{ width: '300px' }}>
            <SearchInput
                value="Disabled input"
                onChange={() => {}}
                disabled
            />
        </div>
    ),
};

export const Sizes = {
    render: () => {
        const [values, setValues] = useState({ sm: '', md: '', lg: '' });
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '300px' }}>
                <div>
                    <p style={{ color: '#888', fontSize: '12px', margin: '0 0 8px' }}>size="sm"</p>
                    <SearchInput
                        value={values.sm}
                        onChange={(v) => setValues(s => ({ ...s, sm: v }))}
                        size="sm"
                        placeholder="Small search..."
                    />
                </div>
                <div>
                    <p style={{ color: '#888', fontSize: '12px', margin: '0 0 8px' }}>size="md"</p>
                    <SearchInput
                        value={values.md}
                        onChange={(v) => setValues(s => ({ ...s, md: v }))}
                        size="md"
                        placeholder="Medium search..."
                    />
                </div>
                <div>
                    <p style={{ color: '#888', fontSize: '12px', margin: '0 0 8px' }}>size="lg"</p>
                    <SearchInput
                        value={values.lg}
                        onChange={(v) => setValues(s => ({ ...s, lg: v }))}
                        size="lg"
                        placeholder="Large search..."
                    />
                </div>
            </div>
        );
    },
};

export const CustomIcon = {
    render: () => {
        const [value, setValue] = useState('');
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '300px' }}>
                <SearchInput
                    value={value}
                    onChange={setValue}
                    icon="filter"
                    placeholder="Filter items..."
                />
                <SearchInput
                    value={value}
                    onChange={setValue}
                    icon="file"
                    placeholder="Find files..."
                />
                <SearchInput
                    value={value}
                    onChange={setValue}
                    icon="command"
                    placeholder="Run command..."
                />
            </div>
        );
    },
};

export const WithSubmit = {
    render: () => {
        const [value, setValue] = useState('');
        const [submitted, setSubmitted] = useState('');

        return (
            <div style={{ width: '300px' }}>
                <SearchInput
                    value={value}
                    onChange={setValue}
                    onSubmit={(v) => setSubmitted(v)}
                    placeholder="Press Enter to submit..."
                />
                {submitted && (
                    <p style={{ color: '#4ecdc4', fontSize: '12px', marginTop: '8px' }}>
                        Submitted: "{submitted}"
                    </p>
                )}
            </div>
        );
    },
};

export const FilterList = {
    render: () => {
        const [search, setSearch] = useState('');
        const items = [
            'Apple', 'Banana', 'Cherry', 'Date', 'Elderberry',
            'Fig', 'Grape', 'Honeydew', 'Kiwi', 'Lemon'
        ];
        const filtered = items.filter(item =>
            item.toLowerCase().includes(search.toLowerCase())
        );

        return (
            <div style={{
                width: '250px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                padding: '12px',
            }}>
                <SearchInput
                    value={search}
                    onChange={setSearch}
                    size="sm"
                    placeholder="Filter fruits..."
                />
                <div style={{ marginTop: '12px' }}>
                    {filtered.length === 0 ? (
                        <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>No results</p>
                    ) : (
                        filtered.map(item => (
                            <div
                                key={item}
                                style={{
                                    padding: '6px 8px',
                                    color: '#e0e0e0',
                                    fontSize: '13px',
                                    borderRadius: '4px',
                                }}
                            >
                                {item}
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    },
};

export const CommandPalette = {
    render: () => {
        const [search, setSearch] = useState('');
        const commands = [
            { icon: '📁', label: 'Open File', shortcut: '⌘O' },
            { icon: '💾', label: 'Save', shortcut: '⌘S' },
            { icon: '🔍', label: 'Find', shortcut: '⌘F' },
            { icon: '↩️', label: 'Undo', shortcut: '⌘Z' },
            { icon: '↪️', label: 'Redo', shortcut: '⌘⇧Z' },
        ];
        const filtered = commands.filter(cmd =>
            cmd.label.toLowerCase().includes(search.toLowerCase())
        );

        return (
            <div style={{
                width: '400px',
                background: 'rgba(30, 30, 45, 0.98)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
                overflow: 'hidden',
            }}>
                <div style={{ padding: '12px' }}>
                    <SearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder="Type a command..."
                        size="lg"
                        autoFocus
                    />
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    {filtered.map((cmd, i) => (
                        <div
                            key={i}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 16px',
                                color: '#e0e0e0',
                                cursor: 'pointer',
                            }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span>{cmd.icon}</span>
                                <span>{cmd.label}</span>
                            </span>
                            <span style={{ color: '#888', fontSize: '12px', fontFamily: 'monospace' }}>
                                {cmd.shortcut}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    },
};
