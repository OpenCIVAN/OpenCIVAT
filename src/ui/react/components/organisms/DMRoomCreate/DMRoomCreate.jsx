/**
 * @file DMRoomCreate.jsx
 * @description Modal for creating a Direct Message room with a project member.
 *
 * The user picks a participant from the project member list.
 * On confirm, calls createDM([selectedUserId]) which POSTs to:
 *   POST /api/projects/:projectId/rooms { room_type: 'dm', participants: [...] }
 * Then navigates to the new DM room via sessionManager.switchRoom().
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sessionManager } from '@Core/session/sessionManager';
import { Icon } from '@UI/react/components/atoms/Icon';
import './DMRoomCreate.scss';

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * @param {Object} props
 * @param {string}   props.projectId       CIA project UUID
 * @param {string}   props.currentUserId   Authenticated user's ID (excluded from list)
 * @param {Array}    props.members         Project member list: [{ id, name, email, role }]
 * @param {Function} props.createDM        Async (participantIds: string[]) => room
 * @param {Function} props.onCreated       Called with the new room after navigation
 * @param {Function} props.onClose         Called to close the modal
 */
export function DMRoomCreate({
  projectId,
  currentUserId,
  members = [],
  createDM,
  onCreated,
  onClose,
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const searchRef = useRef(null);

  // Auto-focus search on open
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const filteredMembers = members.filter(
    (m) =>
      m.id !== currentUserId &&
      (m.name?.toLowerCase().includes(search.toLowerCase()) ||
        m.email?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleConfirm = useCallback(async () => {
    if (!selected || loading) return;
    setLoading(true);
    setError(null);
    try {
      const room = await createDM([selected.id]);
      onCreated?.(room);
      sessionManager.switchRoom(room.id);
    } catch (err) {
      setError(err?.message || 'Failed to create DM room');
    } finally {
      setLoading(false);
    }
  }, [selected, loading, createDM, onCreated]);

  return (
    <div className="dm-room-create__overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="dm-room-create__modal"
        onClick={(e) => e.stopPropagation()}
        aria-label="Start a direct message"
      >
        {/* Header */}
        <div className="dm-room-create__header">
          <Icon name="messageCircle" size={16} />
          <span className="dm-room-create__title">New Project Direct Message</span>
          <button
            className="dm-room-create__close"
            onClick={onClose}
            aria-label="Close"
            type="button"
          >
            <Icon name="x" size={14} />
          </button>
        </div>

        {/* Scope note */}
        <p className="dm-room-create__scope-note">
          Select a project member to start a private direct message. DM rooms are scoped to this project.
        </p>

        {/* Search */}
        <div className="dm-room-create__search-wrap">
          <Icon name="search" size={14} className="dm-room-create__search-icon" />
          <input
            ref={searchRef}
            className="dm-room-create__search"
            type="text"
            placeholder="Search members…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search project members"
          />
        </div>

        {/* Member list */}
        <ul className="dm-room-create__list" role="listbox" aria-label="Project members">
          {filteredMembers.length === 0 && (
            <li className="dm-room-create__empty">
              {search ? 'No matching members' : 'No members to message'}
            </li>
          )}
          {filteredMembers.map((member) => {
            const isSelected = selected?.id === member.id;
            return (
              <li key={member.id} role="option" aria-selected={isSelected}>
                <button
                  className={`dm-room-create__member ${isSelected ? 'dm-room-create__member--selected' : ''}`}
                  type="button"
                  onClick={() => setSelected(isSelected ? null : member)}
                >
                  <span className="dm-room-create__avatar">
                    {(member.name || member.email || '?')[0].toUpperCase()}
                  </span>
                  <span className="dm-room-create__member-info">
                    <span className="dm-room-create__member-name">{member.name || member.email}</span>
                    {member.email && member.name && (
                      <span className="dm-room-create__member-email">{member.email}</span>
                    )}
                  </span>
                  {isSelected && <Icon name="check" size={14} className="dm-room-create__check" />}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Error */}
        {error && <p className="dm-room-create__error">{error}</p>}

        {/* Footer */}
        <div className="dm-room-create__footer">
          <button
            className="dm-room-create__btn dm-room-create__btn--cancel"
            type="button"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="dm-room-create__btn dm-room-create__btn--confirm"
            type="button"
            onClick={handleConfirm}
            disabled={!selected || loading}
            aria-busy={loading}
          >
            {loading ? 'Opening…' : 'Open DM'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DMRoomCreate;
