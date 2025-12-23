/**
 * CollaboratorAvatar Component
 *
 * Shows a collaborator's avatar with follow/invite actions.
 *
 * @param {Object} collaborator - { id, name, color, avatar?, isActive? }
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {function} onFollow - Follow collaborator handler
 * @param {function} onInvite - Invite collaborator handler
 * @param {Object} style - Additional styles
 */

import { memo, useState, useCallback } from 'react';
import { Eye, Send } from 'lucide-react';
import './CollaboratorAvatar.scss';

export const CollaboratorAvatar = memo(function CollaboratorAvatar({
    collaborator,
    size = 'md',
    onFollow,
    onInvite,
    showActions = false,
    style = {},
}) {
    const [isHovered, setIsHovered] = useState(false);

    const handleFollow = useCallback((e) => {
        e.stopPropagation();
        onFollow?.(collaborator);
    }, [collaborator, onFollow]);

    const handleInvite = useCallback((e) => {
        e.stopPropagation();
        onInvite?.(collaborator);
    }, [collaborator, onInvite]);

    const initials = collaborator.name
        ? collaborator.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : '?';

    return (
        <div
            className={`collaborator-avatar collaborator-avatar--${size} ${collaborator.isActive ? 'collaborator-avatar--active' : ''}`}
            style={{
                '--collab-color': collaborator.color || '#60a5fa',
                ...style,
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Avatar circle */}
            <div className="collaborator-avatar__circle">
                {collaborator.avatar ? (
                    <img
                        src={collaborator.avatar}
                        alt={collaborator.name}
                        className="collaborator-avatar__image"
                    />
                ) : (
                    <span className="collaborator-avatar__initials">{initials}</span>
                )}
            </div>

            {/* Activity indicator */}
            {collaborator.isActive && (
                <span className="collaborator-avatar__activity" />
            )}

            {/* Hover actions */}
            {(showActions || isHovered) && (onFollow || onInvite) && (
                <div className="collaborator-avatar__actions">
                    {onFollow && (
                        <button
                            className="collaborator-avatar__action"
                            onClick={handleFollow}
                            title={`Follow ${collaborator.name}`}
                        >
                            <Eye size={10} />
                        </button>
                    )}
                    {onInvite && (
                        <button
                            className="collaborator-avatar__action"
                            onClick={handleInvite}
                            title={`Invite ${collaborator.name}`}
                        >
                            <Send size={10} />
                        </button>
                    )}
                </div>
            )}

            {/* Name tooltip */}
            {isHovered && (
                <div className="collaborator-avatar__tooltip">
                    {collaborator.name}
                </div>
            )}
        </div>
    );
});

export default CollaboratorAvatar;