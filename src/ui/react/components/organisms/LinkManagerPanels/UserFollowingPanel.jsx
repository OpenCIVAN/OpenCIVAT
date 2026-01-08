/**
 * UserFollowingPanel Component
 *
 * Panel for following other collaborators in the workspace.
 * Shows list of active users and allows quick follow actions.
 *
 * @module UserFollowingPanel
 */

import React, { memo, useState, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { UserAvatar } from '@UI/react/components/atoms/UserAvatar';
import { ColorDot } from '@UI/react/components/atoms/ColorDot';
import './UserFollowingPanel.scss';

/**
 * Status indicator for online/busy/away
 */
const StatusIndicator = memo(function StatusIndicator({ status = 'online' }) {
    const statusConfig = {
        online: { color: '#22c55e', label: 'Online' },
        busy: { color: '#ef4444', label: 'Busy' },
        away: { color: '#f59e0b', label: 'Away' },
        offline: { color: '#6b7280', label: 'Offline' },
    };

    const config = statusConfig[status] || statusConfig.online;

    return (
        <span
            className="status-indicator"
            style={{ '--status-color': config.color }}
            title={config.label}
        />
    );
});

/**
 * Single user row in the following list
 */
const UserRow = memo(function UserRow({
    user,
    isFollowing,
    onFollow,
    onUnfollow,
    onViewProfile,
}) {
    return (
        <div className={`user-row ${isFollowing ? 'user-row--following' : ''}`}>
            <div className="user-row__avatar-wrapper">
                <UserAvatar
                    userName={user.userName}
                    color={user.userColor}
                    size="md"
                />
                <StatusIndicator status={user.status} />
            </div>

            <div className="user-row__info">
                <div className="user-row__name">{user.userName}</div>
                <div className="user-row__view">
                    {user.currentViewColor && (
                        <ColorDot color={user.currentViewColor} size="xs" />
                    )}
                    <span>{user.currentViewName || 'No active view'}</span>
                </div>
            </div>

            <div className="user-row__actions">
                {isFollowing ? (
                    <button
                        className="user-row__btn user-row__btn--following"
                        onClick={() => onUnfollow(user)}
                        title="Stop following"
                    >
                        <Icon name="eye" size={14} />
                        <span>Following</span>
                    </button>
                ) : (
                    <button
                        className="user-row__btn"
                        onClick={() => onFollow(user)}
                        title="Follow this user"
                    >
                        <Icon name="userPlus" size={14} />
                        <span>Follow</span>
                    </button>
                )}
            </div>
        </div>
    );
});

/**
 * Currently following section
 */
const CurrentlyFollowing = memo(function CurrentlyFollowing({
    followingUser,
    onStopFollowing,
}) {
    if (!followingUser) return null;

    return (
        <div className="currently-following">
            <div className="currently-following__header">
                <Icon name="eye" size={14} />
                <span>Currently Following</span>
            </div>
            <div className="currently-following__user">
                <UserAvatar
                    userName={followingUser.userName}
                    color={followingUser.userColor}
                    size="sm"
                />
                <span className="currently-following__name">{followingUser.userName}</span>
                <button
                    className="currently-following__stop"
                    onClick={() => onStopFollowing(followingUser)}
                >
                    <Icon name="x" size={14} />
                    <span>Stop</span>
                </button>
            </div>
        </div>
    );
});

/**
 * UserFollowingPanel - Follow collaborators in the workspace
 *
 * @param {Array} users - List of users in the workspace
 * @param {string} currentUserId - ID of current user
 * @param {Object} followingUser - User currently being followed (if any)
 * @param {function} onFollow - Handler to start following a user
 * @param {function} onUnfollow - Handler to stop following a user
 * @param {function} onClose - Close panel handler
 * @param {string} className - Additional CSS classes
 */
export const UserFollowingPanel = memo(function UserFollowingPanel({
    users = [],
    currentUserId,
    followingUser,
    onFollow,
    onUnfollow,
    onClose,
    className = '',
}) {
    const [searchQuery, setSearchQuery] = useState('');

    // Filter out current user and apply search
    const filteredUsers = users.filter(user => {
        if (user.clientId === currentUserId || user.userId === currentUserId) return false;
        if (!searchQuery) return true;
        return user.userName.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const handleFollow = useCallback((user) => {
        onFollow?.(user);
    }, [onFollow]);

    const handleUnfollow = useCallback((user) => {
        onUnfollow?.(user);
    }, [onUnfollow]);

    return (
        <div className={`user-following-panel ${className}`}>
            <div className="user-following-panel__header">
                <div className="user-following-panel__title">
                    <Icon name="users" size={16} />
                    <span>Follow Collaborators</span>
                </div>
                {onClose && (
                    <button className="user-following-panel__close" onClick={onClose}>
                        <Icon name="x" size={16} />
                    </button>
                )}
            </div>

            <CurrentlyFollowing
                followingUser={followingUser}
                onStopFollowing={handleUnfollow}
            />

            <div className="user-following-panel__search">
                <Icon name="search" size={14} />
                <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="user-following-panel__list">
                {filteredUsers.length > 0 ? (
                    filteredUsers.map((user, index) => (
                        <UserRow
                            key={user.clientId || user.userId || index}
                            user={user}
                            isFollowing={followingUser?.clientId === user.clientId || followingUser?.userId === user.userId}
                            onFollow={handleFollow}
                            onUnfollow={handleUnfollow}
                        />
                    ))
                ) : (
                    <div className="user-following-panel__empty">
                        <Icon name="users" size={24} />
                        <span>
                            {searchQuery ? 'No users match your search' : 'No other users in workspace'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
});

export default UserFollowingPanel;
