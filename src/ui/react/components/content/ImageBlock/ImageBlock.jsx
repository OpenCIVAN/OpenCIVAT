// src/ui/react/components/content/ImageBlock.jsx
// Image block component for canvas display
//
// Renders an image with caption and controls

import React, { useState, useCallback } from 'react';
import { contentManager } from '@Core/data/managers/ContentManager.js';
import { Icon } from '@UI/react/components/atoms/Icon';
import './ImageBlock.scss';

/**
 * ImageBlock - Displays an image with controls
 */
export function ImageBlock({
    image,
    onClick,
    onDoubleClick,
    readOnly = false,
}) {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [showControls, setShowControls] = useState(false);
    const [isEditingCaption, setIsEditingCaption] = useState(false);
    const [caption, setCaption] = useState(image.caption);

    // Handle image load
    const handleLoad = useCallback(() => {
        setIsLoading(false);
        setHasError(false);
    }, []);

    // Handle image error
    const handleError = useCallback(() => {
        setIsLoading(false);
        setHasError(true);
    }, []);

    // Save caption
    const handleSaveCaption = useCallback(async () => {
        await contentManager.updateImage(image.id, { caption: caption.trim() });
        setIsEditingCaption(false);
    }, [image.id, caption]);

    // Change fit mode
    const handleFitChange = useCallback(
        async (fit) => {
            await contentManager.updateImage(image.id, { fit });
        },
        [image.id]
    );

    // Delete image
    const handleDelete = useCallback(async () => {
        if (window.confirm('Delete this image?')) {
            await contentManager.deleteImage(image.id);
        }
    }, [image.id]);

    return (
        <div
            className={`image-block ${showControls ? 'image-block--controls-visible' : ''}`}
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
        >
            {/* Image container */}
            <div className={`image-block__container image-block__container--${image.fit}`}>
                {isLoading && (
                    <div className="image-block__loader">
                        <span>Loading...</span>
                    </div>
                )}

                {hasError ? (
                    <div className="image-block__error">
                        <span>Failed to load image</span>
                        <small>{image.originalName}</small>
                    </div>
                ) : (
                    <img
                        src={image.src}
                        alt={image.alt || image.originalName}
                        className="image-block__image"
                        onLoad={handleLoad}
                        onError={handleError}
                        style={{ display: isLoading ? 'none' : 'block' }}
                    />
                )}
            </div>

            {/* Controls overlay */}
            {!readOnly && showControls && !hasError && (
                <div className="image-block__controls">
                    <div className="image-block__fit-controls">
                        <button
                            className={image.fit === 'contain' ? 'active' : ''}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleFitChange('contain');
                            }}
                            title="Contain"
                        >
                            <Icon name="fitView" size={12} />
                        </button>
                        <button
                            className={image.fit === 'cover' ? 'active' : ''}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleFitChange('cover');
                            }}
                            title="Cover"
                        >
                            <Icon name="maximize" size={12} />
                        </button>
                        <button
                            className={image.fit === 'fill' ? 'active' : ''}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleFitChange('fill');
                            }}
                            title="Fill"
                        >
                            <Icon name="aspectRatio" size={12} />
                        </button>
                    </div>

                    <button
                        className="image-block__delete-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDelete();
                        }}
                        title="Delete"
                    >
                        <Icon name="trash" size={12} />
                    </button>
                </div>
            )}

            {/* Caption */}
            <div className="image-block__caption">
                {isEditingCaption ? (
                    <input
                        type="text"
                        className="image-block__caption-input"
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        onBlur={handleSaveCaption}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveCaption()}
                        placeholder="Add a caption..."
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <span
                        className="image-block__caption-text"
                        onClick={(e) => {
                            if (!readOnly) {
                                e.stopPropagation();
                                setIsEditingCaption(true);
                            }
                        }}
                    >
                        {image.caption || (
                            <span className="image-block__caption-placeholder">
                                {readOnly ? '' : 'Click to add caption...'}
                            </span>
                        )}
                    </span>
                )}
            </div>

            {/* Info overlay */}
            {showControls && (
                <div className="image-block__info">
                    <span>{image.originalName}</span>
                    <span>{image.getFileSizeString()}</span>
                </div>
            )}
        </div>
    );
}

export default ImageBlock;