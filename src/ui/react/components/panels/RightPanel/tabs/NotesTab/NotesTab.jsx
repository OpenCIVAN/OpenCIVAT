/**
 * @file NotesTab.jsx
 * @description Notes tab for documentation, task tracking, and knowledge sharing.
 * Part of the Right Panel collaboration hub.
 *
 * Features:
 * - Session notes list with pinned section
 * - Create and edit notes with rich text
 * - Pin, share, and delete actions
 * - Rich text toolbar for editing
 * - Resizable sections for pinned/all notes
 *
 * @see Right_Panel_Design_Specification.md - Notes Tab section
 *
 * @example
 * <NotesTab workspaceId="ws-1" />
 */

import React from 'react';
import { Icon } from '@UI/react/components/common/Icon';
import {
    ResizableSectionsContainer,
    ResizableSection,
} from '@UI/react/components/common/ResizableSections';

import { useNotesTab } from './hooks/useNotesTab';
import { NoteCard } from './components/NoteCard';
import { NoteEditor } from './components/NoteEditor';

import './NotesTab.scss';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * @typedef {Object} NotesTabProps
 * @property {string} [workspaceId] - Current workspace ID
 */

/**
 * Notes tab component.
 * Provides note creation, editing, and organization.
 *
 * @param {NotesTabProps} props - Component props
 * @returns {React.ReactElement} The rendered tab
 */
export function NotesTab({ workspaceId }) {
    const {
        notes,
        pinnedNotes,
        unpinnedNotes,
        searchQuery,
        setSearchQuery,
        selectedNote,
        setSelectedNote,
        editingNote,
        setEditingNote,
        showNewNote,
        setShowNewNote,
        sectionStates,
        toggleSection,
        handleTogglePin,
        handleEdit,
        handleSaveEdit,
        handleCreateNote,
        handleDelete,
    } = useNotesTab();

    // Render edit view
    if (editingNote) {
        return (
            <div className="notes-tab">
                <div className="panel-header">
                    <Icon name="file" size={14} className="panel-header__icon file-icon--teal" />
                    <span className="panel-header__title">Notes</span>
                </div>
                <NoteEditor
                    note={editingNote}
                    onSave={handleSaveEdit}
                    onCancel={() => setEditingNote(null)}
                />
            </div>
        );
    }

    // Render new note view
    if (showNewNote) {
        return (
            <div className="notes-tab">
                <div className="panel-header">
                    <Icon name="file" size={14} className="panel-header__icon file-icon--teal" />
                    <span className="panel-header__title">Notes</span>
                </div>
                <NoteEditor
                    isNew
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
                <Icon name="file" size={14} className="panel-header__icon file-icon--teal" />
                <span className="panel-header__title">Notes</span>
                <span className="panel-header__count">{notes.length} notes</span>
            </div>

            {/* Search */}
            <div className="panel-search">
                <div className="panel-search__wrapper">
                    <Icon name="search" size={12} className="search-icon" />
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
                            <Icon name="close" size={10} />
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
                        icon="pin"
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
                    icon="file"
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
                    <Icon name="add" size={11} />
                    <span>New Note</span>
                </button>
                <button className="panel-footer__btn panel-footer__btn--icon">
                    <Icon name="download" size={11} />
                </button>
            </div>
        </div>
    );
}

// Export with both names for backwards compatibility
export { NotesTab as NotesPanelContent };
export default NotesTab;