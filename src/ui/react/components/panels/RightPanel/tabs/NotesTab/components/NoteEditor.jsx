/**
 * @file NoteEditor.jsx
 * @description Note editor component for creating and editing notes.
 * Features rich text toolbar and title/content inputs.
 */

import React, { useState } from 'react';
import {
    X,
    Save,
    Check,
    Bold,
    Italic,
    List,
    ListOrdered,
    Code,
    Quote,
    Image,
    Link2,
} from 'lucide-react';

/**
 * @typedef {Object} NoteEditorProps
 * @property {Object} [note] - Existing note to edit (null for new)
 * @property {boolean} [isNew] - Whether this is a new note
 * @property {function} onSave - Callback when note is saved
 * @property {function} onCancel - Callback when editing is cancelled
 */

/**
 * Note editor component.
 * Provides rich text editing for notes.
 *
 * @param {NoteEditorProps} props - Component props
 * @returns {React.ReactElement} The rendered editor
 */
export function NoteEditor({ note, isNew, onSave, onCancel }) {
    const [title, setTitle] = useState(note?.title || '');
    const [content, setContent] = useState(note?.content || '');

    const handleSave = () => {
        if (isNew) {
            if (!title.trim()) return;
            onSave({ title, content });
        } else {
            onSave({ ...note, content });
        }
    };

    const toolbarIcons = [Bold, Italic, List, ListOrdered, Code, Quote, Image, Link2];

    return (
        <div className="note-edit-view">
            <div className="note-edit-view__header">
                <span className="note-edit-view__title">
                    {isNew ? 'New Note' : note?.title || 'Edit Note'}
                </span>
                <button className="note-edit-view__close" onClick={onCancel}>
                    <X size={16} />
                </button>
            </div>

            {/* Title input for new notes */}
            {isNew && (
                <input
                    type="text"
                    className="note-edit-view__title-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Note title..."
                />
            )}

            {/* Formatting toolbar */}
            <div className="note-edit-view__toolbar">
                {toolbarIcons.map((Icon, i) => (
                    <button key={i} className="note-edit-view__toolbar-btn">
                        <Icon size={14} />
                    </button>
                ))}
            </div>

            <textarea
                className="note-edit-view__textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your note..."
            />

            <div className="note-edit-view__actions">
                <button className="note-edit-view__btn" onClick={onCancel}>
                    Cancel
                </button>
                <button
                    className={`note-edit-view__btn note-edit-view__btn--save ${isNew && !title.trim() ? 'note-edit-view__btn--disabled' : ''
                        }`}
                    onClick={handleSave}
                    disabled={isNew && !title.trim()}
                >
                    {isNew ? <Check size={12} /> : <Save size={12} />}
                    {isNew ? 'Create' : 'Save'}
                </button>
            </div>
        </div>
    );
}

export default NoteEditor;