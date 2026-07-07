/**
 * @file CollabViewControls.jsx
 * @description Collaborative-view controls for the room header:
 *  - "Following {name}" chip while mirroring a collaborator's viewpoint
 *    (click to stop following)
 *  - Shared/personal camera toggle (personal = my camera is neither
 *    broadcast to nor driven by collaborators)
 *
 * Self-contained: subscribes to followService and cameraSharePolicy directly
 * so it can be dropped into any header without prop plumbing.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { IconButton } from '@UI/react/components/atoms';
import { followService } from '@Services/followService.js';
import cameraSharePolicy from '@Core/session/cameraSharePolicy.js';
import './CollabViewControls.scss';

export function CollabViewControls() {
    const [following, setFollowing] = useState({
        followedUserId: followService.getFollowedUserId(),
        userName: null,
    });
    const [cameraShared, setCameraShared] = useState(
        cameraSharePolicy.isCameraShared()
    );

    useEffect(() => followService.onChange(setFollowing), []);
    useEffect(() => cameraSharePolicy.onCameraSharedChange(setCameraShared), []);

    const handleStopFollowing = useCallback(() => {
        followService.unfollow();
    }, []);

    const handleToggleShared = useCallback(() => {
        cameraSharePolicy.toggleCameraShared();
    }, []);

    return (
        <div className="collab-view-controls">
            {following.followedUserId && (
                <button
                    type="button"
                    className="collab-view-controls__following-chip"
                    onClick={handleStopFollowing}
                    title="Stop following"
                >
                    <span className="collab-view-controls__following-label">
                        Following {following.userName || 'user'}
                    </span>
                    <span className="collab-view-controls__following-close">✕</span>
                </button>
            )}
            <IconButton
                icon={cameraShared ? 'video' : 'videoOff'}
                onClick={handleToggleShared}
                tooltip={
                    cameraShared
                        ? 'Camera shared — collaborators see your view moves (click for personal view)'
                        : 'Personal view — your camera is private (click to share)'
                }
                size="sm"
                variant={cameraShared ? 'ghost' : 'primary'}
                className="collab-view-controls__share-toggle"
            />
        </div>
    );
}

export default CollabViewControls;
