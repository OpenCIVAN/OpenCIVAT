// src/stories/atoms/Chip.stories.jsx
import React, { useState } from 'react';
import { Chip } from '@UI/react/components/atoms';

export default {
    title: 'Atoms/Chip',
    component: Chip,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
Interactive tag/pill component.

Use for:
- Tags and labels
- Filter chips
- Selection indicators
- Removable items
                `,
            },
        },
    },
    argTypes: {
        label: {
            control: 'text',
            description: 'Chip text label',
        },
        icon: {
            control: 'text',
            description: 'Icon name from registry',
        },
        color: {
            control: 'color',
            description: 'Accent color',
        },
        size: {
            control: 'select',
            options: ['sm', 'md'],
            description: 'Size variant',
        },
        selected: {
            control: 'boolean',
            description: 'Selected state',
        },
        removable: {
            control: 'boolean',
            description: 'Show remove button',
        },
        disabled: {
            control: 'boolean',
            description: 'Disable interactions',
        },
    },
};

// =============================================================================
// BASIC STORIES
// =============================================================================

export const Default = {
    args: {
        label: 'Tag',
    },
};

export const WithIcon = {
    args: {
        label: 'Settings',
        icon: 'gear',
    },
};

export const Selected = {
    args: {
        label: 'Active',
        selected: true,
    },
};

export const Removable = {
    args: {
        label: 'Removable',
        removable: true,
        onRemove: () => console.log('Remove clicked'),
    },
};

export const Disabled = {
    args: {
        label: 'Disabled',
        disabled: true,
    },
};

// =============================================================================
// SIZE VARIATIONS
// =============================================================================

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
                <Chip label="Small" size="sm" />
                <p style={{ fontSize: '10px', margin: '8px 0 0', color: '#888' }}>Small</p>
            </div>
            <div style={{ textAlign: 'center' }}>
                <Chip label="Medium" size="md" />
                <p style={{ fontSize: '10px', margin: '8px 0 0', color: '#888' }}>Medium</p>
            </div>
        </div>
    ),
};

// =============================================================================
// INTERACTIVE EXAMPLES
// =============================================================================

export const Clickable = {
    render: () => {
        const [clicked, setClicked] = useState(false);
        return (
            <Chip
                label={clicked ? 'Clicked!' : 'Click me'}
                onClick={() => setClicked(!clicked)}
                selected={clicked}
            />
        );
    },
    parameters: {
        docs: {
            description: {
                story: 'Chips with onClick become interactive buttons.',
            },
        },
    },
};

export const RemovableList = {
    render: () => {
        const [tags, setTags] = useState(['React', 'TypeScript', 'Storybook', 'SCSS']);
        const removeTag = (tag) => setTags(tags.filter(t => t !== tag));

        return (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {tags.map(tag => (
                    <Chip
                        key={tag}
                        label={tag}
                        removable
                        onRemove={() => removeTag(tag)}
                    />
                ))}
                {tags.length === 0 && (
                    <span style={{ color: '#888', fontSize: '12px' }}>All tags removed</span>
                )}
            </div>
        );
    },
    parameters: {
        docs: {
            description: {
                story: 'Removable chips for tag management.',
            },
        },
    },
};

// =============================================================================
// CUSTOM COLORS
// =============================================================================

export const CustomColors = {
    render: () => (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Chip label="Default" />
            <Chip label="Teal" color="#4ecdc4" selected />
            <Chip label="Coral" color="#ff6b6b" selected />
            <Chip label="Purple" color="#bb8fce" selected />
            <Chip label="Yellow" color="#f7dc6f" selected />
        </div>
    ),
};

// =============================================================================
// USE CASES
// =============================================================================

export const FilterChips = {
    render: () => {
        const [filters, setFilters] = useState(['Active', 'Recent']);
        const allFilters = ['All', 'Active', 'Recent', 'Archived', 'Shared'];

        const toggleFilter = (filter) => {
            if (filter === 'All') {
                setFilters([]);
            } else {
                setFilters(prev =>
                    prev.includes(filter)
                        ? prev.filter(f => f !== filter)
                        : [...prev, filter]
                );
            }
        };

        return (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {allFilters.map(filter => (
                    <Chip
                        key={filter}
                        label={filter}
                        selected={filter === 'All' ? filters.length === 0 : filters.includes(filter)}
                        onClick={() => toggleFilter(filter)}
                    />
                ))}
            </div>
        );
    },
    parameters: {
        docs: {
            description: {
                story: 'Filter chips for multi-select filtering.',
            },
        },
    },
};

export const TagInput = {
    render: () => {
        const [tags, setTags] = useState(['design', 'ui', 'component']);
        const [input, setInput] = useState('');

        const addTag = (e) => {
            if (e.key === 'Enter' && input.trim()) {
                setTags([...tags, input.trim()]);
                setInput('');
            }
        };

        return (
            <div style={{
                width: '300px',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '8px',
                background: 'rgba(255,255,255,0.02)',
            }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: tags.length ? '8px' : 0 }}>
                    {tags.map(tag => (
                        <Chip
                            key={tag}
                            label={tag}
                            size="sm"
                            removable
                            onRemove={() => setTags(tags.filter(t => t !== tag))}
                        />
                    ))}
                </div>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={addTag}
                    placeholder="Add a tag..."
                    style={{
                        width: '100%',
                        padding: '6px 0',
                        background: 'transparent',
                        border: 'none',
                        color: '#e0e0e0',
                        fontSize: '13px',
                        outline: 'none',
                    }}
                />
            </div>
        );
    },
    parameters: {
        docs: {
            description: {
                story: 'Tag input field with removable chips.',
            },
        },
    },
};

export const CategoryChips = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Chip label="Analytics" icon="chart" />
                <Chip label="Visualization" icon="eye" />
                <Chip label="Data" icon="database" />
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Chip label="High Priority" color="#ff6b6b" selected size="sm" />
                <Chip label="Medium" color="#f7dc6f" selected size="sm" />
                <Chip label="Low" color="#4ecdc4" selected size="sm" />
            </div>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Category chips with icons and priority colors.',
            },
        },
    },
};

export const SelectionGroup = {
    render: () => {
        const [selected, setSelected] = useState('monthly');
        const options = [
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
            { value: 'yearly', label: 'Yearly' },
        ];

        return (
            <div style={{ display: 'flex', gap: '8px' }}>
                {options.map(opt => (
                    <Chip
                        key={opt.value}
                        label={opt.label}
                        selected={selected === opt.value}
                        onClick={() => setSelected(opt.value)}
                    />
                ))}
            </div>
        );
    },
    parameters: {
        docs: {
            description: {
                story: 'Single-select chip group for option selection.',
            },
        },
    },
};
