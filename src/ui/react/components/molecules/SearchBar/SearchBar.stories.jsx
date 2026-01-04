// src/ui/react/components/molecules/SearchBar/SearchBar.stories.jsx
import React, { useState } from 'react';

// Mock SearchBar component
const MockSearchBar = ({
    value = '',
    onChange,
    placeholder = 'Search...',
    suggestions = [],
    onSelect,
}) => {
    const [inputValue, setInputValue] = useState(value);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const handleChange = (e) => {
        setInputValue(e.target.value);
        onChange?.(e.target.value);
        setShowSuggestions(e.target.value.length > 0 && suggestions.length > 0);
    };

    return (
        <div style={{ position: 'relative' }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: '#1a1a2e',
                borderRadius: '8px',
                border: '1px solid #374151',
            }}>
                <span style={{ color: '#6b7280' }}>🔍</span>
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleChange}
                    onFocus={() => setShowSuggestions(inputValue.length > 0)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder={placeholder}
                    style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: '#e5e7eb',
                        outline: 'none',
                        fontSize: '14px',
                    }}
                />
                {inputValue && (
                    <button
                        onClick={() => { setInputValue(''); onChange?.(''); }}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#6b7280',
                            cursor: 'pointer',
                            padding: 0,
                        }}
                    >
                        ✕
                    </button>
                )}
            </div>
            {showSuggestions && suggestions.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    background: '#1a1a2e',
                    borderRadius: '8px',
                    border: '1px solid #374151',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                    overflow: 'hidden',
                    zIndex: 10,
                }}>
                    {suggestions.map((item, i) => (
                        <button
                            key={i}
                            onClick={() => { onSelect?.(item); setInputValue(item); setShowSuggestions(false); }}
                            style={{
                                display: 'block',
                                width: '100%',
                                padding: '8px 12px',
                                background: 'transparent',
                                border: 'none',
                                color: '#e5e7eb',
                                textAlign: 'left',
                                cursor: 'pointer',
                            }}
                        >
                            {item}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default {
    title: 'Molecules/SearchBar',
    component: MockSearchBar,
    parameters: {
        layout: 'centered',
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f', width: '300px' }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    render: function DefaultStory() {
        const [value, setValue] = useState('');
        return <MockSearchBar value={value} onChange={setValue} />;
    },
};

export const WithPlaceholder = {
    render: function PlaceholderStory() {
        const [value, setValue] = useState('');
        return <MockSearchBar value={value} onChange={setValue} placeholder="Search files..." />;
    },
};

export const WithValue = {
    render: function WithValueStory() {
        const [value, setValue] = useState('example search');
        return <MockSearchBar value={value} onChange={setValue} />;
    },
};

export const WithSuggestions = {
    render: function SuggestionsStory() {
        const [value, setValue] = useState('');
        return (
            <MockSearchBar
                value={value}
                onChange={setValue}
                placeholder="Type to see suggestions..."
                suggestions={['data.csv', 'dataset.json', 'document.pdf']}
            />
        );
    },
};

export const FileSearch = {
    render: function FileSearchStory() {
        const [value, setValue] = useState('');
        return (
            <MockSearchBar
                value={value}
                onChange={setValue}
                placeholder="Search files and folders..."
                suggestions={value ? ['Results would appear here'] : []}
            />
        );
    },
};
