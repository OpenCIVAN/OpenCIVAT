// src/ui/react/components/content/NoteBlock.jsx
// Note block component for canvas display
//
// Renders a note with editing capabilities

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { contentManager } from '@Core/data/managers/ContentManager.js';
import './NoteBlock.scss';

const NOTE_COLORS = {
    default: { bg: '#252538', border: '#333' },
    yellow: { bg: '#3d3a2a', border: '#5a5530' },
    blue: { bg: '#2a3040', border: '#3a4a6a' },
    green: { bg: '#2a3a2a', border: '#3a5a3a' },
    red: { bg: '#3a2a2a', border: '#5a3a3a' },
    purple: { bg: '#352a3a', border: '#4a3a5a' },
};

/**
 * NoteBlock - Displays and edits a note
 */
export function NoteBlock({
    note,
    isEditing: externalEditing,
    onStartEdit,
    onEndEdit,
    readOnly = false,
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(note.title);
    const [content, setContent] = useState(note.content);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const textareaRef = useRef(null);

    const editing = externalEditing !== undefined ? externalEditing : isEditing;

    // Focus textarea when editing starts
    useEffect(() => {
        if (editing && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [editing]);

    // Handle double-click to edit
    const handleDoubleClick = useCallback(() => {
        if (readOnly) return;
        if (onStartEdit) {
            onStartEdit();
        } else {
            setIsEditing(true);
        }
    }, [readOnly, onStartEdit]);

    // Save changes
    const handleSave = useCallback(async () => {
        await contentManager.updateNote(note.id, {
            title: title.trim(),
            content: content.trim(),
        });

        if (onEndEdit) {
            onEndEdit();
        } else {
            setIsEditing(false);
        }
    }, [note.id, title, content, onEndEdit]);

    // Cancel editing
    const handleCancel = useCallback(() => {
        setTitle(note.title);
        setContent(note.content);
        if (onEndEdit) {
            onEndEdit();
        } else {
            setIsEditing(false);
        }
    }, [note.title, note.content, onEndEdit]);

    // Handle keyboard shortcuts
    const handleKeyDown = useCallback(
        (e) => {
            if (e.key === 'Escape') {
                handleCancel();
            } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSave();
            }
        },
        [handleCancel, handleSave]
    );

    // Change note color
    const handleColorChange = useCallback(
        async (color) => {
            await contentManager.updateNote(note.id, { color });
            setShowColorPicker(false);
        },
        [note.id]
    );

    // Delete note
    const handleDelete = useCallback(async () => {
        if (window.confirm('Delete this note?')) {
            await contentManager.deleteNote(note.id);
        }
    }, [note.id]);

    // Toggle pinned
    const handleTogglePin = useCallback(async () => {
        await contentManager.updateNote(note.id, { pinned: !note.pinned });
    }, [note.id, note.pinned]);

    const colorStyle = NOTE_COLORS[note.color] || NOTE_COLORS.default;

    return (
        <div
            className={`note-block ${editing ? 'note-block--editing' : ''} ${note.pinned ? 'note-block--pinned' : ''
                }`}
            style={{
                '--note-bg': colorStyle.bg,
                '--note-border': colorStyle.border,
            }}
            onDoubleClick={handleDoubleClick}
        >
            {/* Header */}
            <div className="note-block__header">
                {editing ? (
                    <input
                        type="text"
                        className="note-block__title-input"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Note title..."
                        onKeyDown={handleKeyDown}
                    />
                ) : (
                    <span className="note-block__title">
                        {note.title || 'Untitled Note'}
                    </span>
                )}

                {!readOnly && !editing && (
                    <div className="note-block__actions">
                        <button
                            className={`note-block__btn ${note.pinned ? 'active' : ''}`}
                            onClick={handleTogglePin}
                            title={note.pinned ? 'Unpin' : 'Pin'}
                        >
                            📌
                        </button>
                        <button
                            className="note-block__btn"
                            onClick={() => setShowColorPicker(!showColorPicker)}
                            title="Change color"
                        >
                            🎨
                        </button>
                        <button
                            className="note-block__btn note-block__btn--danger"
                            onClick={handleDelete}
                            title="Delete"
                        >
                            🗑️
                        </button>
                    </div>
                )}
            </div>

            {/* Color picker */}
            {showColorPicker && (
                <div className="note-block__color-picker">
                    {Object.keys(NOTE_COLORS).map((color) => (
                        <button
                            key={color}
                            className={`note-block__color-btn ${note.color === color ? 'active' : ''
                                }`}
                            style={{ backgroundColor: NOTE_COLORS[color].bg }}
                            onClick={() => handleColorChange(color)}
                            title={color}
                        />
                    ))}
                </div>
            )}

            {/* Content */}
            <div className="note-block__content">
                {editing ? (
                    <textarea
                        ref={textareaRef}
                        className="note-block__textarea"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Write your note..."
                        onKeyDown={handleKeyDown}
                    />
                ) : (
                    <div className="note-block__text">
                        {note.content || (
                            <span className="note-block__placeholder">
                                Double-click to add content...
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Edit actions */}
            {editing && (
                <div className="note-block__edit-actions">
                    <button
                        className="note-block__edit-btn note-block__edit-btn--secondary"
                        onClick={handleCancel}
                    >
                        Cancel
                    </button>
                    <button
                        className="note-block__edit-btn note-block__edit-btn--primary"
                        onClick={handleSave}
                    >
                        Save
                    </button>
                </div>
            )}

            {/* Metadata */}
            {!editing && (
                <div className="note-block__meta">
                    <span>
                        {new Date(note.updatedAt).toLocaleDateString()}
                    </span>
                </div>
            )}
        </div>
    );
}

export default NoteBlock;