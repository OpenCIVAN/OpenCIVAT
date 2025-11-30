// src/ui/react/components/panels/LeftPanel/tabs/BookmarksTab.jsx
// Bookmarks tab content for the unified left panel
//
// Features:
// - Shows saved view bookmarks with thumbnails
// - Grid and list view modes
// - Collapsible groups (Recent, My Bookmarks, Shared with Me)
// - Tags, sharing, and quick navigation

import React, { useState, useCallback, useMemo } from 'react';
import {
    Bookmark,
    Search,
    X,
    ChevronDown,
    ChevronRight,
    Share2,
    Play,
    Edit3,
    Trash2,
    Plus,
    Camera,
    Clock,
    User,
    Tag,
    List,
    Grid3X3,
} from 'lucide-react';
import { ui as log } from '@Utils/logger.js';

// =============================================================================
// SAMPLE DATA
// =============================================================================

const SAMPLE_BOOKMARKS = [
    {
        id: 'b1',
        name: 'Tumor Overview',
        dataset: 'Brain_Scan_001.nii',
        workspace: 'My Workspace',
        timestamp: '2 hours ago',
        createdBy: 'You',
        shared: false,
        tags: ['tumor', 'review'],
        color: 'blue',
    },
    {
        id: 'b2',
        name: 'Left Hemisphere Detail',
        dataset: 'Brain_Scan_001.nii',
        workspace: 'My Workspace',
        timestamp: '1 day ago',
        createdBy: 'You',
        shared: true,
        tags: ['hemisphere', 'detail'],
        color: 'blue',
    },
    {
        id: 'b3',
        name: 'Comparison View',
        dataset: 'CT_Overlay.dcm',
        workspace: 'Project Room',
        timestamp: '3 days ago',
        createdBy: 'Dr. Smith',
        shared: true,
        tags: ['comparison'],
        color: 'teal',
    },
    {
        id: 'b4',
        name: 'Bone Structure A',
        dataset: 'Reference_Atlas.nii',
        workspace: 'Team A Breakout',
        timestamp: '1 week ago',
        createdBy: 'You',
        shared: false,
        tags: ['bone', 'structure'],
        color: 'amber',
    },
    {
        id: 'b5',
        name: 'Pre-op Planning',
        dataset: 'Tumor_Region.vtk',
        workspace: 'Project Room',
        timestamp: '1 week ago',
        createdBy: 'Dr. Jones',
        shared: true,
        tags: ['planning', 'surgery'],
        color: 'pink',
    },
];

// =============================================================================
// THUMBNAIL
// =============================================================================

function Thumbnail({ bookmark, size = 'small' }) {
    const dimensions = size === 'small' ? { width: 48, height: 48 } : { width: '100%', height: 70 };

    return (
        <div
            className={`bookmark-thumbnail bookmark-thumbnail--${size}`}
            style={{
                ...dimensions,
                '--thumbnail-color': `var(--color-accent-${bookmark.color})`,
            }}
        >
            <Camera size={size === 'small' ? 16 : 24} />
        </div>
    );
}

// =============================================================================
// LIST ITEM
// =============================================================================

function BookmarkListItem({ bookmark, isSelected, onSelect, onNavigate }) {
    return (
        <div
            className={`bookmark-list-item ${isSelected ? 'bookmark-list-item--selected' : ''}`}
            onClick={() => onSelect(isSelected ? null : bookmark.id)}
        >
            <Thumbnail bookmark={bookmark} size="small" />

            <div className="bookmark-list-item__content">
                <div className="bookmark-list-item__name">
                    {bookmark.name}
                    {bookmark.shared && <Share2 size={9} className="bookmark-list-item__shared-icon" />}
                </div>
                <div className="bookmark-list-item__dataset">{bookmark.dataset}</div>
                <div className="bookmark-list-item__meta">
                    <span><Clock size={8} /> {bookmark.timestamp}</span>
                    <span><User size={8} /> {bookmark.createdBy}</span>
                </div>
            </div>

            <button
                className="bookmark-list-item__go-btn"
                onClick={(e) => { e.stopPropagation(); onNavigate(bookmark.id); }}
            >
                <Play size={10} /> Go
            </button>
        </div>
    );
}

// =============================================================================
// GRID ITEM
// =============================================================================

function BookmarkGridItem({ bookmark, onNavigate }) {
    return (
        <div
            className="bookmark-grid-item"
            onClick={() => onNavigate(bookmark.id)}
        >
            <Thumbnail bookmark={bookmark} size="large" />
            <div className="bookmark-grid-item__name">{bookmark.name}</div>
            <div className="bookmark-grid-item__timestamp">{bookmark.timestamp}</div>
        </div>
    );
}

// =============================================================================
// GROUP
// =============================================================================

function BookmarkGroup({ title, bookmarks, isExpanded, onToggle, viewMode, selectedBookmark, onSelect, onNavigate }) {
    if (bookmarks.length === 0) return null;

    return (
        <div className="bookmark-group">
            <div className="bookmark-group__header" onClick={onToggle}>
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <span className="bookmark-group__title">{title}</span>
                <span className="bookmark-group__count">{bookmarks.length}</span>
            </div>

            {isExpanded && (
                viewMode === 'list' ? (
                    <div className="bookmark-group__list">
                        {bookmarks.map(bookmark => (
                            <BookmarkListItem
                                key={bookmark.id}
                                bookmark={bookmark}
                                isSelected={selectedBookmark === bookmark.id}
                                onSelect={onSelect}
                                onNavigate={onNavigate}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="bookmark-group__grid">
                        {bookmarks.map(bookmark => (
                            <BookmarkGridItem
                                key={bookmark.id}
                                bookmark={bookmark}
                                onNavigate={onNavigate}
                            />
                        ))}
                    </div>
                )
            )}
        </div>
    );
}

// =============================================================================
// SELECTED BOOKMARK DETAILS
// =============================================================================

function SelectedBookmarkDetails({ bookmark, onClose, onNavigate }) {
    if (!bookmark) return null;

    return (
        <div className="bookmark-details">
            <div className="bookmark-details__header">
                <span className="bookmark-details__name">{bookmark.name}</span>
                <button className="bookmark-details__close" onClick={onClose}>
                    <ChevronDown size={14} />
                </button>
            </div>

            {/* Tags */}
            <div className="bookmark-details__tags">
                {bookmark.tags.map(tag => (
                    <span key={tag} className="bookmark-details__tag">
                        <Tag size={8} /> {tag}
                    </span>
                ))}
            </div>

            {/* Actions */}
            <div className="bookmark-details__actions">
                <button
                    className="bookmark-details__action-btn bookmark-details__action-btn--primary"
                    onClick={() => onNavigate(bookmark.id)}
                >
                    <Play size={10} /> Go to View
                </button>
                <button className="bookmark-details__action-btn" data-color="blue">
                    <Edit3 size={12} />
                </button>
                <button className="bookmark-details__action-btn" data-color="pink">
                    <Share2 size={12} />
                </button>
                <button className="bookmark-details__action-btn">
                    <Trash2 size={12} />
                </button>
            </div>
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function BookmarksPanelContent({ workspaceId }) {
    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('list');
    const [selectedBookmark, setSelectedBookmark] = useState(null);
    const [expandedGroups, setExpandedGroups] = useState({
        recent: true,
        mine: true,
        shared: true,
    });

    // Toggle group
    const toggleGroup = useCallback((groupId) => {
        setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    }, []);

    // Navigate to bookmark
    const navigateToBookmark = useCallback((bookmarkId) => {
        log.debug('Navigate to bookmark:', bookmarkId);
        // TODO: Navigate to the bookmarked view
    }, []);

    // Filter bookmarks
    const filteredBookmarks = useMemo(() => {
        return SAMPLE_BOOKMARKS.filter(b =>
            b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.dataset.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [searchQuery]);

    const recentBookmarks = filteredBookmarks.slice(0, 3);
    const myBookmarks = filteredBookmarks.filter(b => b.createdBy === 'You');
    const sharedBookmarks = filteredBookmarks.filter(b => b.createdBy !== 'You');

    const selectedBookmarkData = SAMPLE_BOOKMARKS.find(b => b.id === selectedBookmark);

    return (
        <div className="bookmarks-tab">
            {/* Header */}
            <div className="panel-header">
                <Bookmark size={14} className="panel-header__icon file-icon--indigo" />
                <span className="panel-header__title">Bookmarks</span>
                <span className="panel-header__count">{SAMPLE_BOOKMARKS.length} saved</span>
            </div>

            {/* Search + View mode */}
            <div className="panel-search">
                <div className="panel-search__wrapper">
                    <Search size={12} className="search-icon" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search bookmarks..."
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

            {/* Toolbar with view mode toggle */}
            <div className="panel-toolbar">
                <div className="panel-toolbar__spacer" />
                <div className="panel-toolbar__group">
                    <button
                        className={`panel-toolbar__toggle ${viewMode === 'list' ? 'active' : ''}`}
                        onClick={() => setViewMode('list')}
                    >
                        <List size={14} />
                    </button>
                    <button
                        className={`panel-toolbar__toggle ${viewMode === 'grid' ? 'active' : ''}`}
                        onClick={() => setViewMode('grid')}
                    >
                        <Grid3X3 size={14} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="bookmarks-tab__content">
                <BookmarkGroup
                    title="Recent"
                    bookmarks={recentBookmarks}
                    isExpanded={expandedGroups.recent}
                    onToggle={() => toggleGroup('recent')}
                    viewMode={viewMode}
                    selectedBookmark={selectedBookmark}
                    onSelect={setSelectedBookmark}
                    onNavigate={navigateToBookmark}
                />

                <BookmarkGroup
                    title="My Bookmarks"
                    bookmarks={myBookmarks}
                    isExpanded={expandedGroups.mine}
                    onToggle={() => toggleGroup('mine')}
                    viewMode={viewMode}
                    selectedBookmark={selectedBookmark}
                    onSelect={setSelectedBookmark}
                    onNavigate={navigateToBookmark}
                />

                <BookmarkGroup
                    title="Shared with Me"
                    bookmarks={sharedBookmarks}
                    isExpanded={expandedGroups.shared}
                    onToggle={() => toggleGroup('shared')}
                    viewMode={viewMode}
                    selectedBookmark={selectedBookmark}
                    onSelect={setSelectedBookmark}
                    onNavigate={navigateToBookmark}
                />

                {/* Empty state */}
                {filteredBookmarks.length === 0 && (
                    <div className="bookmarks-tab__empty">
                        No bookmarks found
                    </div>
                )}
            </div>

            {/* Selected bookmark details */}
            {selectedBookmarkData && (
                <SelectedBookmarkDetails
                    bookmark={selectedBookmarkData}
                    onClose={() => setSelectedBookmark(null)}
                    onNavigate={navigateToBookmark}
                />
            )}

            {/* Footer */}
            {!selectedBookmark && (
                <div className="panel-footer">
                    <button className="panel-footer__btn panel-footer__btn--primary">
                        <Plus size={11} />
                        <span>Bookmark Current View</span>
                    </button>
                </div>
            )}
        </div>
    );
}

export default BookmarksPanelContent;