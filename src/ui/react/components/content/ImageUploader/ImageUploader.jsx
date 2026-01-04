// src/ui/react/components/content/ImageUploader.jsx
// Image upload component with drag & drop
//
// Supports file selection and drag-drop upload

import React, { useState, useCallback, useRef } from 'react';
import { contentManager } from '@Core/data/managers/ContentManager.js';
import { Icon, IconButton } from '@UI/react/components/atoms';
import { LabeledButton } from '@UI/react/components/molecules';
import './ImageUploader.scss';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * ImageUploader - Upload images to canvas
 */
export function ImageUploader({ canvasId, onUploadComplete, onCancel }) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState(0);
    const fileInputRef = useRef(null);

    // Validate file
    const validateFile = useCallback((file) => {
        if (!ACCEPTED_TYPES.includes(file.type)) {
            return 'Invalid file type. Please use JPEG, PNG, GIF, or WebP.';
        }
        if (file.size > MAX_FILE_SIZE) {
            return 'File too large. Maximum size is 10MB.';
        }
        return null;
    }, []);

    // Handle file upload
    const handleUpload = useCallback(
        async (file) => {
            const validationError = validateFile(file);
            if (validationError) {
                setError(validationError);
                return;
            }

            setIsUploading(true);
            setError(null);
            setProgress(0);

            try {
                // Simulate progress (actual upload would use XHR/fetch with progress)
                setProgress(25);
                const image = await contentManager.uploadImage(canvasId, file);
                setProgress(100);

                if (onUploadComplete) {
                    onUploadComplete(image);
                }
            } catch (err) {
                setError(err.message || 'Failed to upload image');
            } finally {
                setIsUploading(false);
            }
        },
        [canvasId, validateFile, onUploadComplete]
    );

    // Handle file selection
    const handleFileSelect = useCallback(
        (e) => {
            const file = e.target.files?.[0];
            if (file) {
                handleUpload(file);
            }
        },
        [handleUpload]
    );

    // Handle drag events
    const handleDragEnter = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback(
        (e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);

            const file = e.dataTransfer.files?.[0];
            if (file) {
                handleUpload(file);
            }
        },
        [handleUpload]
    );

    // Handle paste
    const handlePaste = useCallback(
        (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (file) {
                        handleUpload(file);
                        break;
                    }
                }
            }
        },
        [handleUpload]
    );

    // Trigger file input click
    const handleBrowseClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    return (
        <div
            className={`image-uploader ${isDragging ? 'image-uploader--dragging' : ''} ${isUploading ? 'image-uploader--uploading' : ''
                }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onPaste={handlePaste}
            tabIndex={0}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                onChange={handleFileSelect}
                className="image-uploader__input"
            />

            {isUploading ? (
                <div className="image-uploader__progress">
                    <div className="image-uploader__progress-bar">
                        <div
                            className="image-uploader__progress-fill"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span>Uploading... {progress}%</span>
                </div>
            ) : (
                <div className="image-uploader__content">
                    <div className="image-uploader__icon"><Icon name="image" size={32} /></div>
                    <p className="image-uploader__text">
                        {isDragging ? (
                            'Drop image here'
                        ) : (
                            <>
                                Drag & drop an image or{' '}
                                <button
                                    className="image-uploader__browse"
                                    onClick={handleBrowseClick}
                                >
                                    browse
                                </button>
                            </>
                        )}
                    </p>
                    <p className="image-uploader__hint">
                        JPEG, PNG, GIF, WebP • Max 10MB
                    </p>
                </div>
            )}

            {error && (
                <div className="image-uploader__error">
                    <span>{error}</span>
                    <IconButton
                        icon="close"
                        onClick={() => setError(null)}
                        size="xs"
                        variant="ghost"
                    />
                </div>
            )}

            {onCancel && (
                <LabeledButton
                    label="Cancel"
                    onClick={onCancel}
                    variant="ghost"
                    className="image-uploader__cancel"
                />
            )}
        </div>
    );
}

export default ImageUploader;