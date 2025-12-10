// src/ui/react/components/common/ThumbnailPreview/ThumbnailPreview.jsx
// Displays a thumbnail preview of a view for progressive loading
//
// Shows a cached thumbnail while the real visualization loads,
// then crossfades to the actual content when ready.

import React, { useState, useEffect, memo } from 'react';
import { thumbnails as log } from '@Utils/logger.js';
import './ThumbnailPreview.scss';

/**
 * ThumbnailPreview - Shows a thumbnail placeholder for progressive loading
 *
 * Usage:
 * ```jsx
 * <ThumbnailPreview
 *   viewId="abc-123"
 *   snapshotId={null}  // null for current state
 *   isContentReady={false}
 *   onLoad={() => console.log('Thumbnail loaded')}
 * />
 * ```
 *
 * @param {string} viewId - The view configuration ID
 * @param {string|null} snapshotId - Optional snapshot ID (null = current state)
 * @param {boolean} isContentReady - Whether the real content has loaded
 * @param {string} className - Additional CSS classes
 * @param {Function} onLoad - Callback when thumbnail loads
 * @param {Function} onError - Callback when thumbnail fails to load
 */
export const ThumbnailPreview = memo(function ThumbnailPreview({
    viewId,
    snapshotId = null,
    isContentReady = false,
    className = '',
    onLoad,
    onError,
}) {
    const [thumbnailSrc, setThumbnailSrc] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    // Load thumbnail from API
    useEffect(() => {
        if (!viewId) return;

        const loadThumbnail = async () => {
            try {
                const url = snapshotId
                    ? `/api/views/${viewId}/thumbnail?snapshotId=${snapshotId}`
                    : `/api/views/${viewId}/thumbnail`;

                const response = await fetch(url);

                if (!response.ok) {
                    if (response.status === 404) {
                        // No thumbnail available - not an error, just skip
                        log.debug(`No thumbnail for view ${viewId}`);
                        return;
                    }
                    throw new Error(`HTTP ${response.status}`);
                }

                // Get the blob and create object URL
                const blob = await response.blob();
                const objectUrl = URL.createObjectURL(blob);
                setThumbnailSrc(objectUrl);

                log.debug(`Loaded thumbnail for view ${viewId}`);
            } catch (err) {
                log.warn(`Failed to load thumbnail for view ${viewId}:`, err.message);
                setHasError(true);
                onError?.(err);
            }
        };

        loadThumbnail();

        // Cleanup object URL on unmount
        return () => {
            if (thumbnailSrc) {
                URL.revokeObjectURL(thumbnailSrc);
            }
        };
    }, [viewId, snapshotId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Handle image load
    const handleLoad = () => {
        setIsLoaded(true);
        onLoad?.();
    };

    // Handle image error
    const handleError = () => {
        setHasError(true);
        onError?.(new Error('Image failed to load'));
    };

    // Don't render if content is ready (thumbnail no longer needed)
    // or if there was an error loading the thumbnail
    if (isContentReady || hasError || !thumbnailSrc) {
        return null;
    }

    const classNames = [
        'thumbnail-preview',
        isLoaded && 'thumbnail-preview--loaded',
        isContentReady && 'thumbnail-preview--hidden',
        className,
    ].filter(Boolean).join(' ');

    return (
        <div className={classNames}>
            <img
                src={thumbnailSrc}
                alt="View preview"
                className="thumbnail-preview__image"
                onLoad={handleLoad}
                onError={handleError}
            />
            {!isLoaded && (
                <div className="thumbnail-preview__skeleton">
                    <div className="thumbnail-preview__skeleton-shimmer" />
                </div>
            )}
        </div>
    );
});

/**
 * ThumbnailPlaceholder - Static placeholder when no thumbnail is available
 *
 * Shows a simple placeholder with optional icon and text.
 */
export function ThumbnailPlaceholder({
    icon,
    text = 'Loading...',
    className = '',
}) {
    return (
        <div className={`thumbnail-placeholder ${className}`}>
            {icon && <div className="thumbnail-placeholder__icon">{icon}</div>}
            {text && <span className="thumbnail-placeholder__text">{text}</span>}
        </div>
    );
}

/**
 * ProgressiveLoader - Wrapper component for progressive loading pattern
 *
 * Shows thumbnail while children load, then crossfades to children.
 *
 * Usage:
 * ```jsx
 * <ProgressiveLoader
 *   viewId="abc-123"
 *   isReady={dataLoaded}
 * >
 *   <MyVisualization />
 * </ProgressiveLoader>
 * ```
 */
export function ProgressiveLoader({
    viewId,
    snapshotId = null,
    isReady = false,
    children,
    className = '',
}) {
    return (
        <div className={`progressive-loader ${className}`}>
            {/* Thumbnail layer - shows while loading */}
            <ThumbnailPreview
                viewId={viewId}
                snapshotId={snapshotId}
                isContentReady={isReady}
            />

            {/* Content layer - fades in when ready */}
            <div
                className={`progressive-loader__content ${isReady ? 'progressive-loader__content--ready' : ''}`}
            >
                {children}
            </div>
        </div>
    );
}

export default ThumbnailPreview;