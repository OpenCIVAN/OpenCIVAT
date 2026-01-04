// src/ui/react/components/content/NoteBlock/NoteBlock.stories.jsx
import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

const NOTE_COLORS = {
    default: { bg: '#252538', border: '#333' },
    yellow: { bg: '#3d3a2a', border: '#5a5530' },
    blue: { bg: '#2a3040', border: '#3a4a6a' },
    green: { bg: '#2a3a2a', border: '#3a5a3a' },
    red: { bg: '#3a2a2a', border: '#5a3a3a' },
    purple: { bg: '#352a3a', border: '#4a3a5a' },
};

// Mock NoteBlock for Storybook
const MockNoteBlock = ({
    note = {},
    isEditing = false,
    readOnly = false,
}) => {
    const [editing, setEditing] = useState(isEditing);
    const [title, setTitle] = useState(note.title || '');
    const [content, setContent] = useState(note.content || '');

    const colorConfig = NOTE_COLORS[note.color] || NOTE_COLORS.default;

    if (editing) {
        return (
            <div style={{
                width: '280px',
                background: colorConfig.bg,
                border: `1px solid ${colorConfig.border}`,
                borderRadius: '8px',
                overflow: 'hidden',
            }}>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Note title..."
                    style={{
                        width: '100%',
                        padding: '12px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: `1px solid ${colorConfig.border}`,
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: 600,
                        outline: 'none',
                    }}
                />
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your note..."
                    style={{
                        width: '100%',
                        minHeight: '100px',
                        padding: '12px',
                        background: 'transparent',
                        border: 'none',
                        color: '#e5e7eb',
                        fontSize: '13px',
                        lineHeight: 1.5,
                        resize: 'vertical',
                        outline: 'none',
                    }}
                />
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '8px',
                    padding: '8px 12px',
                    borderTop: `1px solid ${colorConfig.border}`,
                }}>
                    <button
                        onClick={() => setEditing(false)}
                        style={{
                            padding: '6px 12px',
                            background: 'transparent',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '4px',
                            color: '#9ca3af',
                            fontSize: '12px',
                            cursor: 'pointer',
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => setEditing(false)}
                        style={{
                            padding: '6px 12px',
                            background: '#3b82f6',
                            border: 'none',
                            borderRadius: '4px',
                            color: 'white',
                            fontSize: '12px',
                            cursor: 'pointer',
                        }}
                    >
                        Save
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            style={{
                width: '280px',
                background: colorConfig.bg,
                border: `1px solid ${colorConfig.border}`,
                borderRadius: '8px',
                cursor: readOnly ? 'default' : 'pointer',
            }}
            onDoubleClick={() => !readOnly && setEditing(true)}
        >
            {note.title && (
                <div style={{
                    padding: '12px 12px 0',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 600,
                }}>
                    {note.title}
                </div>
            )}
            <div style={{
                padding: '12px',
                color: '#e5e7eb',
                fontSize: '13px',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
            }}>
                {note.content || (
                    <span style={{ color: '#6b7280', fontStyle: 'italic' }}>
                        Double-click to edit...
                    </span>
                )}
            </div>
            {!readOnly && (
                <div style={{
                    padding: '8px 12px',
                    borderTop: `1px solid ${colorConfig.border}`,
                    fontSize: '10px',
                    color: '#6b7280',
                }}>
                    Double-click to edit
                </div>
            )}
        </div>
    );
};

export default {
    title: 'Content/NoteBlock',
    component: MockNoteBlock,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        isEditing: { control: 'boolean' },
        readOnly: { control: 'boolean' },
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
        note: {
            title: 'Analysis Notes',
            content: 'Key findings from the data exploration:\n- Pattern A shows correlation\n- Outliers need investigation\n- Consider time series analysis',
            color: 'default',
        },
    },
};

export const Yellow = {
    args: {
        note: {
            title: 'Important',
            content: 'Remember to check the data quality before proceeding with the analysis.',
            color: 'yellow',
        },
    },
};

export const Blue = {
    args: {
        note: {
            title: 'Reference',
            content: 'Source: Dataset v2.3\nLast updated: 2024-01-15',
            color: 'blue',
        },
    },
};

export const Green = {
    args: {
        note: {
            title: 'Completed',
            content: 'Initial data cleaning phase finished. Ready for next steps.',
            color: 'green',
        },
    },
};

export const Editing = {
    args: {
        note: {
            title: 'Work in Progress',
            content: 'Current draft of findings...',
            color: 'purple',
        },
        isEditing: true,
    },
};

export const Empty = {
    args: {
        note: {
            color: 'default',
        },
    },
};

export const ReadOnly = {
    args: {
        note: {
            title: 'Shared Note',
            content: 'This note was shared by another collaborator and cannot be edited.',
            color: 'blue',
        },
        readOnly: true,
    },
};

export const AllColors = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {Object.keys(NOTE_COLORS).map(color => (
                <MockNoteBlock
                    key={color}
                    note={{
                        title: color.charAt(0).toUpperCase() + color.slice(1),
                        content: `This is a ${color} note.`,
                        color,
                    }}
                    readOnly
                />
            ))}
        </div>
    ),
};
