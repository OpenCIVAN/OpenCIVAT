// src/ui/react/components/panels/RightPanel/tabs/NotesTab.jsx
// Notes tab for the unified right panel
//
// Features:
// - Session notes list with pinned section
// - Create and edit notes
// - Pin, share, and delete actions
// - Rich text toolbar for editing

import React, { useState, useCallback } from 'react';
import {
    FileText,
    Search,
    Plus,
    Trash2,
    Edit3,
    Save,
    X,
    Image,
    Link2,
    Clock,
    User,
    Pin,
    PinOff,
    Share2,
    Download,
    Check,
    Bold,
    Italic,
    List,
    ListOrdered,
    Code,
    Quote,
} from 'lucide-react';
import {
    ResizableSectionsContainer,
    ResizableSection,
    useSectionStates
} from "@UI/react/components/common/ResizableSections";

// =============================================================================
// SAMPLE DATA
// =============================================================================

const SAMPLE_NOTES = [
    {
        id: 'n1',
        title: 'Session Summary',
        content: 'Discussed tumor boundaries and potential surgical approaches. Dr. Smith highlighted the importance of the 2cm margin.',
        createdBy: 'You',
        timestamp: '10:45 AM',
        pinned: true,
        shared: true,
        hasImage: false,
    },
    {
        id: 'n2',
        title: 'Measurement Notes',
        content: 'Tumor diameter: 24.5mm\nDistance to critical structure: 8.2mm\nMargin assessment: Adequate',
        createdBy: 'Dr. Smith',
        timestamp: '10:38 AM',
        pinned: false,
        shared: true,
        hasImage: true,
    },
    {
        id: 'n3',
        title: 'Follow-up Items',
        content: '• Review with radiology\n• Schedule follow-up scan\n• Prepare surgical plan document',
        createdBy: 'You',
        timestamp: '10:30 AM',
        pinned: false,
        shared: false,
        hasImage: false,
    },
    {
        id: 'n4',
        title: 'Quick note',
        content: 'Check left hemisphere detail in next session',
        createdBy: 'Dr. Jones',
        timestamp: 'Yesterday',
        pinned: false,
        shared: true,
        hasImage: false,
    },
];

// =============================================================================
// NOTE CARD
// =============================================================================

function NoteCard({ note, isSelected, onSelect, onTogglePin, onEdit, onDelete }) {
    return (
        <div
            className={`note-card ${isSelected ? 'note-card--selected' : ''}`}
            onClick={() => onSelect(isSelected ? null : note.id)}
        >
            <div className="note-card__header">
                <span className="note-card__title">{note.title}</span>
                <div className="note-card__badges">
                    {note.pinned && <Pin size={10} className="icon-amber" />}
                    {note.shared && <Share2 size={10} className="icon-pink" />}
                    {note.hasImage && <Image size={10} className="icon-teal" />}
                </div>
            </div>

            <div className="note-card__content">{note.content}</div>

            <div className="note-card__meta">
                <span className="note-card__meta-item">
                    <User size={8} />
                    {note.createdBy}
                </span>
                <span className="note-card__meta-item">
                    <Clock size={8} />
                    {note.timestamp}
                </span>
            </div>

            {/* Expanded actions */}
            {isSelected && (
                <div className="note-card__actions">
                    <button
                        className="note-card__action-btn"
                        data-color="blue"
                        onClick={(e) => { e.stopPropagation(); onEdit(note); }}
                    >
                        <Edit3 size={10} />
                        Edit
                    </button>
                    <button
                        className={`note-card__action-btn ${note.pinned ? 'note-card__action-btn--active' : ''}`}
                        data-color="amber"
                        onClick={(e) => { e.stopPropagation(); onTogglePin(note.id); }}
                    >
                        {note.pinned ? <PinOff size={10} /> : <Pin size={10} />}
                        {note.pinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                        className="note-card__action-btn"
                        data-color="pink"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Share2 size={10} />
                    </button>
                    <button
                        className="note-card__action-btn"
                        onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
                    >
                        <Trash2 size={10} />
                    </button>
                </div>
            )}
        </div>
    );
}

// =============================================================================
// EDIT VIEW
// =============================================================================

function EditView({ note, onSave, onCancel }) {
    const [content, setContent] = useState(note?.content || '');

    return (
        <div className="note-edit-view">
            <div className="note-edit-view__header">
                <span className="note-edit-view__title">{note?.title || 'New Note'}</span>
                <button className="note-edit-view__close" onClick={onCancel}>
                    <X size={16} />
                </button>
            </div>

            {/* Formatting toolbar */}
            <div className="note-edit-view__toolbar">
                {[Bold, Italic, List, ListOrdered, Code, Quote, Image, Link2].map((Icon, i) => (
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
                    className="note-edit-view__btn note-edit-view__btn--save"
                    onClick={() => onSave({ ...note, content })}
                >
                    <Save size={12} />
                    Save
                </button>
            </div>
        </div>
    );
}

// =============================================================================
// NEW NOTE VIEW
// =============================================================================

function NewNoteView({ onSave, onCancel }) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    const handleCreate = () => {
        if (!title.trim()) return;
        onSave({
            id: `n${Date.now()}`,
            title,
            content,
            createdBy: 'You',
            timestamp: 'Just now',
            pinned: false,
            shared: false,
            hasImage: false,
        });
    };

    return (
        <div className="note-edit-view">
            <div className="note-edit-view__header">
                <span className="note-edit-view__title">New Note</span>
                <button className="note-edit-view__close" onClick={onCancel}>
                    <X size={16} />
                </button>
            </div>

            <input
                type="text"
                className="note-edit-view__title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Note title..."
            />

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
                    className={`note-edit-view__btn note-edit-view__btn--save ${!title.trim() ? 'note-edit-view__btn--disabled' : ''}`}
                    onClick={handleCreate}
                    disabled={!title.trim()}
                >
                    <Check size={12} />
                    Create
                </button>
            </div>
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function NotesPanelContent({ workspaceId }) {
    const [notes, setNotes] = useState(SAMPLE_NOTES);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedNote, setSelectedNote] = useState(null);
    const [editingNote, setEditingNote] = useState(null);
    const [showNewNote, setShowNewNote] = useState(false);

    // Section states
    const { states: sectionStates, toggleSection } = useSectionStates({
        pinned: { expanded: true, flexGrow: 1 },
        all: { expanded: true, flexGrow: 2 },
    });

    // Filter notes
    const pinnedNotes = notes.filter(n => n.pinned);
    const unpinnedNotes = notes.filter(n => !n.pinned);

    // Handlers
    const handleTogglePin = useCallback((noteId) => {
        setNotes(prev => prev.map(n =>
            n.id === noteId ? { ...n, pinned: !n.pinned } : n
        ));
    }, []);

    const handleEdit = useCallback((note) => {
        setEditingNote(note);
    }, []);

    const handleSaveEdit = useCallback((updatedNote) => {
        setNotes(prev => prev.map(n =>
            n.id === updatedNote.id ? updatedNote : n
        ));
        setEditingNote(null);
    }, []);

    const handleCreateNote = useCallback((newNote) => {
        setNotes(prev => [newNote, ...prev]);
        setShowNewNote(false);
    }, []);

    const handleDelete = useCallback((noteId) => {
        setNotes(prev => prev.filter(n => n.id !== noteId));
        setSelectedNote(null);
    }, []);

    // Render edit/new views
    if (editingNote) {
        return (
            <div className="notes-tab">
                <div className="panel-header">
                    <FileText size={14} className="panel-header__icon file-icon--teal" />
                    <span className="panel-header__title">Notes</span>
                </div>
                <EditView
                    note={editingNote}
                    onSave={handleSaveEdit}
                    onCancel={() => setEditingNote(null)}
                />
            </div>
        );
    }

    if (showNewNote) {
        return (
            <div className="notes-tab">
                <div className="panel-header">
                    <FileText size={14} className="panel-header__icon file-icon--teal" />
                    <span className="panel-header__title">Notes</span>
                </div>
                <NewNoteView
                    onSave={handleCreateNote}
                    onCancel={() => setShowNewNote(false)}
                />
            </div>
        );
    }

    return (
        <div className="notes-tab">
            {/* Header */}
            <div className="panel-header">
                <FileText size={14} className="panel-header__icon file-icon--teal" />
                <span className="panel-header__title">Notes</span>
                <span className="panel-header__count">{notes.length} notes</span>
            </div>

            {/* Search */}
            <div className="panel-search">
                <div className="panel-search__wrapper">
                    <Search size={12} className="search-icon" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search notes..."
                    />
                    {searchQuery && (
                        <button
                            className="clear-button"
                            onClick={() => setSearchQuery('')}
                        >
                            <X size={10} />
                        </button>
                    )}
                </div>
            </div>

            {/* Resizable Sections */}
            <ResizableSectionsContainer
                sectionStates={sectionStates}
                onSectionToggle={toggleSection}
            >
                {/* Pinned Notes */}
                {pinnedNotes.length > 0 && (
                    <ResizableSection
                        id="pinned"
                        icon={Pin}
                        iconColorClass="icon-amber"
                        label="Pinned"
                        count={pinnedNotes.length}
                    >
                        {pinnedNotes.map(note => (
                            <NoteCard
                                key={note.id}
                                note={note}
                                isSelected={selectedNote === note.id}
                                onSelect={setSelectedNote}
                                onTogglePin={handleTogglePin}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                            />
                        ))}
                    </ResizableSection>
                )}

                {/* All Notes */}
                <ResizableSection
                    id="all"
                    icon={FileText}
                    iconColorClass="icon-teal"
                    label="All Notes"
                    count={unpinnedNotes.length}
                >
                    {unpinnedNotes.map(note => (
                        <NoteCard
                            key={note.id}
                            note={note}
                            isSelected={selectedNote === note.id}
                            onSelect={setSelectedNote}
                            onTogglePin={handleTogglePin}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                    ))}
                </ResizableSection>
            </ResizableSectionsContainer>

            {/* Footer */}
            <div className="panel-footer">
                <button
                    className="panel-footer__btn panel-footer__btn--primary"
                    onClick={() => setShowNewNote(true)}
                >
                    <Plus size={11} />
                    <span>New Note</span>
                </button>
                <button className="panel-footer__btn panel-footer__btn--icon">
                    <Download size={11} />
                </button>
            </div>
        </div>
    );
}

export default NotesPanelContent;