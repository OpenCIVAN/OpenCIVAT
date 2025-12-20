// src/ui/react/components/collaboration/PeoplePanel/UserAvatar.jsx
// Reusable avatar component with initials fallback (Google/Slack style)

import React, { useMemo } from "react";
import "./UserAvatar.scss";

// =============================================================================
// DEFAULT COLORS (used if no color provided)
// =============================================================================

const AVATAR_COLORS = [
    "#F44336", // Red
    "#E91E63", // Pink
    "#9C27B0", // Purple
    "#673AB7", // Deep Purple
    "#3F51B5", // Indigo
    "#2196F3", // Blue
    "#03A9F4", // Light Blue
    "#00BCD4", // Cyan
    "#009688", // Teal
    "#4CAF50", // Green
    "#8BC34A", // Light Green
    "#CDDC39", // Lime
    "#FFC107", // Amber
    "#FF9800", // Orange
    "#FF5722", // Deep Orange
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate initials from a name
 * "Beth Smith" -> "BS"
 * "Claude" -> "CL"
 * "A" -> "A"
 */
function getInitials(name) {
    if (!name) return "?";

    const words = name.trim().split(/\s+/);

    if (words.length >= 2) {
        // First letter of first and last word
        return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    } else if (words[0].length >= 2) {
        // First two letters of single word
        return words[0].substring(0, 2).toUpperCase();
    } else {
        // Single character
        return words[0].toUpperCase();
    }
}

/**
 * Generate a consistent color from a string (name or ID)
 */
function getColorFromString(str) {
    if (!str) return AVATAR_COLORS[0];

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/**
 * Determine if a color is "light" and needs dark text
 */
function isLightColor(hexColor) {
    // Remove # if present
    const hex = hexColor.replace("#", "");

    // Parse RGB values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance > 0.6;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * UserAvatar Component
 * 
 * Displays a user avatar with:
 * - Custom image (future: when avatar upload is implemented)
 * - Initials fallback with consistent background color
 * 
 * @param {string} userName - User's display name
 * @param {string} color - Optional override color (uses user's assigned color)
 * @param {string} imageUrl - Optional avatar image URL (future feature)
 * @param {string} size - Size variant: 'xs' | 'sm' | 'md' | 'lg'
 * @param {boolean} showBorder - Show colored border instead of background
 */
export function UserAvatar({
    userName,
    color,
    imageUrl,
    size = "sm",
    showBorder = false,
    className = ""
}) {
    // Memoize computed values
    const initials = useMemo(() => getInitials(userName), [userName]);
    const backgroundColor = useMemo(() => color || getColorFromString(userName), [color, userName]);
    const textColor = useMemo(() => isLightColor(backgroundColor) ? "#1a1a1a" : "#ffffff", [backgroundColor]);

    // Size classes
    const sizeClass = `user-avatar--${size}`;

    // If we have an image URL (future feature)
    if (imageUrl) {
        return (
            <div
                className={`user-avatar ${sizeClass} user-avatar--image ${className}`}
                style={showBorder ? { borderColor: backgroundColor } : undefined}
            >
                <img
                    src={imageUrl}
                    alt={`${userName}'s avatar`}
                    onError={(e) => {
                        // Fallback to initials if image fails to load
                        e.target.style.display = "none";
                    }}
                />
                {/* Fallback initials (shown if image fails) */}
                <span
                    className="user-avatar__fallback"
                    style={{ backgroundColor, color: textColor }}
                >
                    {initials}
                </span>
            </div>
        );
    }

    // Initials avatar (current implementation)
    return (
        <div
            className={`user-avatar ${sizeClass} ${showBorder ? "user-avatar--border" : ""} ${className}`}
            style={showBorder
                ? { borderColor: backgroundColor, backgroundColor: "transparent" }
                : { backgroundColor }
            }
            title={userName}
        >
            <span
                className="user-avatar__initials"
                style={{ color: showBorder ? backgroundColor : textColor }}
            >
                {initials}
            </span>
        </div>
    );
}

// =============================================================================
// AVATAR GROUP (for displaying multiple avatars overlapping)
// =============================================================================

/**
 * UserAvatarGroup Component
 * 
 * Displays a stack of overlapping avatars
 * 
 * @param {Array} users - Array of user objects with userName and color
 * @param {number} max - Maximum avatars to show before "+N" indicator
 * @param {string} size - Size variant for all avatars
 */
export function UserAvatarGroup({
    users = [],
    max = 3,
    size = "sm"
}) {
    const visibleUsers = users.slice(0, max);
    const remainingCount = users.length - max;

    return (
        <div className="user-avatar-group">
            {visibleUsers.map((user, index) => (
                <UserAvatar
                    key={user.clientId || user.odbc || index}
                    userName={user.userName}
                    color={user.userColor}
                    size={size}
                    className="user-avatar-group__item"
                    style={{ zIndex: visibleUsers.length - index }}
                />
            ))}
            {remainingCount > 0 && (
                <div className={`user-avatar-group__overflow user-avatar--${size}`}>
                    +{remainingCount}
                </div>
            )}
        </div>
    );
}

export default UserAvatar;