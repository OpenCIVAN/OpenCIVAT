/**
 * @file BookmarkItem.jsx
 * @description Bookmark list item component
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { formatCellRef } from '../../CanvasMapTab.logic';
import './BookmarkItem.scss';

/**
 * BookmarkItem - Bookmark list item
 *
 * @param {Object} props
 * @param {Object} props.bookmark - Bookmark data { id, name, position }
 * @param {Function} props.onClick - Click handler to navigate to bookmark
 * @param {Function} [props.onDelete] - Delete handler
 */
export const BookmarkItem = memo(function BookmarkItem({
  bookmark,
  onClick,
  onDelete,
}) {
  return (
    <div
      className="bookmark-item"
      onClick={() => onClick?.(bookmark)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(bookmark);
        }
      }}
    >
      <Icon name="bookmark" size={14} className="bookmark-item__icon" />

      <span className="bookmark-item__name">{bookmark.name}</span>

      <span className="bookmark-item__position">
        {formatCellRef(bookmark.position.row, bookmark.position.col)}
      </span>

      {onDelete && (
        <button
          className="bookmark-item__delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(bookmark.id);
          }}
          title="Delete bookmark"
        >
          <Icon name="x" size={12} />
        </button>
      )}
    </div>
  );
});

export default BookmarkItem;
