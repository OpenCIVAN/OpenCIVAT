/**
 * @file BookmarkCard.jsx
 * @description Enhanced bookmark display card component.
 *
 * Features:
 * - Thumbnail preview with fallback icon
 * - Type indicator (Position, State, Comparison)
 * - Scope badge (Personal, Shared, Template)
 * - Pin toggle and action buttons
 * - Context menu for additional actions
 *
 * @see Left_Panel_Design_Specification.docx - Section 9 Bookmarks
 */

import React, { useState, memo } from 'react';
import {
    Camera,
    Share2,
    Pin,
    PinOff,
    Trash2,
    Play,
    Edit3,
    Copy,
    MoreHorizontal,
    Navigation,
    Layers,
    GitCompare,
} from 'lucide-react';
import { formatTimestamp } from '@Utils/formatters.js';
import { BOOKMARK_TYPES } from '../hooks/useBookmarksTab';
import { getScopeConfig } from '../constants';

/**
 * Get bookmark type configuration.
 *
 * @param {string} type - Bookmark type
 * @returns {Object} Type config with icon and color
 */
function getBookmarkTypeConfig(type) {
    switch (type) {
        case 'position':
            return { icon: Navigation, color: 'blue', label: 'Position' };
        case 'state':
            return { icon: Layers, color: 'purple', label: 'State' };
        case 'comparison':
            return { icon: GitCompare, color: 'amber', label: 'Comparison' };
        default:
            return { icon: Camera, color: 'gray', label: 'Bookmark' };
    }
}

/**
 * BookmarkCard component.
 *
 * @param {Object} props
 * @param {Object} props.bookmark - Bookmark data
 * @param {Function} props.onNavigate - Navigate handler
 * @param {Function} props.onTogglePin - Toggle pin handler
 * @param {Function} props.onDelete - Delete handler
 * @param {Function} props.onEdit - Edit handler
 * @param {Function} props.onDuplicate - Duplicate handler
 * @param {Function} props.getThumbnailUrl - Thumbnail URL getter
 * @param {boolean} props.compact - Use compact layout
 */
export const BookmarkCard = memo(function BookmarkCard({
    bookmark,
    onNavigate,
    onTogglePin,
    onDelete,
    onEdit,
    onDuplicate,
    getThumbnailUrl,
    compact = false,
}) {
    const [isHovered, setIsHovered] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [thumbnailError, setThumbnailError] = useState(false);

    const thumbnailUrl = bookmark.thumbnailKey && getThumbnailUrl
        ? getThumbnailUrl(bookmark.id)
        : null;

    const typeConfig = getBookmarkTypeConfig(bookmark.type);
    const scopeConfig = getScopeConfig(bookmark.scope);
    const TypeIcon = typeConfig.icon;

    const handleNavigate = (e) => {
        e.stopPropagation();
        onNavigate?.(bookmark);
    };

    const handleTogglePin = (e) => {
        e.stopPropagation();
        onTogglePin?.(bookmark.id);
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        onDelete?.(bookmark.id);
    };

    const handleEdit = (e) => {
        e.stopPropagation();
        setShowMenu(false);
        onEdit?.(bookmark);
    };

    const handleDuplicate = (e) => {
        e.stopPropagation();
        setShowMenu(false);
        onDuplicate?.(bookmark);
    };

    if (compact) {
        return (
            <div
                className="bookmark-card bookmark-card--compact"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={handleNavigate}
            >
                <TypeIcon size={14} className={`icon-${typeConfig.color}`} />
                <span className="bookmark-card__name">{bookmark.name}</span>
                {bookmark.isPinned && (
                    <Pin size={10} className="bookmark-card__pin-indicator" fill="currentColor" />
                )}
                <button
                    className="bookmark-card__go-btn"
                    onClick={handleNavigate}
                    style={{ opacity: isHovered ? 1 : 0 }}
                >
                    <Play size={10} />
                </button>
            </div>
        );
    }

    return (
        <div
            className={`bookmark-card ${bookmark.isPinned ? 'bookmark-card--pinned' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); setShowMenu(false); }}
        >
            {/* Thumbnail */}
            <div className="bookmark-card__thumbnail">
                {thumbnailUrl && !thumbnailError ? (
                    <img
                        src={thumbnailUrl}
                        alt={bookmark.name}
                        onError={() => setThumbnailError(true)}
                    />
                ) : (
                    <TypeIcon size={20} className={`icon-${typeConfig.color}`} />
                )}
                {/* Type badge overlay */}
                <span
                    className="bookmark-card__type-badge"
                    data-color={typeConfig.color}
                    title={typeConfig.label}
                >
                    <TypeIcon size={8} />
                </span>
            </div>

            {/* Content */}
            <div className="bookmark-card__content">
                <div className="bookmark-card__header">
                    <span className="bookmark-card__name">
                        {bookmark.name}
                    </span>
                    {bookmark.scope !== 'personal' && (
                        <Share2 size={9} className="icon-pink" title="Shared" />
                    )}
                </div>
                <div className="bookmark-card__meta">
                    <span className="bookmark-card__dataset">
                        {bookmark.datasetName || 'No dataset'}
                    </span>
                    <span className="bookmark-card__separator">&middot;</span>
                    <span className="bookmark-card__time">
                        {formatTimestamp(bookmark.createdAt)}
                    </span>
                </div>
                {bookmark.description && (
                    <div className="bookmark-card__description">
                        {bookmark.description}
                    </div>
                )}
                {bookmark.tags && bookmark.tags.length > 0 && (
                    <div className="bookmark-card__tags">
                        {bookmark.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="bookmark-card__tag">
                                {tag}
                            </span>
                        ))}
                        {bookmark.tags.length > 3 && (
                            <span className="bookmark-card__tag bookmark-card__tag--more">
                                +{bookmark.tags.length - 3}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div
                className="bookmark-card__actions"
                style={{ opacity: isHovered ? 1 : 0 }}
            >
                <button
                    className={`bookmark-card__action-btn ${bookmark.isPinned ? 'active' : ''}`}
                    onClick={handleTogglePin}
                    title={bookmark.isPinned ? 'Unpin' : 'Pin'}
                >
                    {bookmark.isPinned ? (
                        <Pin size={10} fill="currentColor" />
                    ) : (
                        <PinOff size={10} />
                    )}
                </button>

                {bookmark.isOwn && (
                    <>
                        <button
                            className="bookmark-card__action-btn"
                            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                            title="More actions"
                        >
                            <MoreHorizontal size={10} />
                        </button>

                        {/* Context menu */}
                        {showMenu && (
                            <div className="bookmark-card__menu">
                                <button onClick={handleEdit}>
                                    <Edit3 size={10} />
                                    Edit
                                </button>
                                <button onClick={handleDuplicate}>
                                    <Copy size={10} />
                                    Duplicate
                                </button>
                                <button onClick={handleDelete} className="danger">
                                    <Trash2 size={10} />
                                    Delete
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Go button */}
            <button
                className="bookmark-card__go-btn"
                onClick={handleNavigate}
                title="Navigate to bookmark"
            >
                <Play size={10} /> Go
            </button>
        </div>
    );
});

export default BookmarkCard;