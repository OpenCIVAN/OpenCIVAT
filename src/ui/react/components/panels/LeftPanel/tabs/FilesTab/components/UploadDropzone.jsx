/**
 * @file UploadDropzone.jsx
 * @description Drag-and-drop upload zone for files.
 *
 * @example
 * <UploadDropzone onUpload={handleUpload} accept=".vtp,.vtk,.nii" />
 */

import React, { useState, useCallback, memo } from 'react';
import { Upload, RefreshCw } from 'lucide-react';

/**
 * @typedef {Object} UploadDropzoneProps
 * @property {Function} onUpload - Upload handler
 * @property {Function} [onRefresh] - Refresh handler
 * @property {string} [accept] - Accepted file types
 * @property {boolean} [isDragOver] - External drag over state
 * @property {Function} [setIsDragOver] - External drag over setter
 */

/**
 * Upload dropzone component.
 *
 * @param {UploadDropzoneProps} props - Component props
 * @returns {React.ReactElement} The rendered dropzone
 */
export const UploadDropzone = memo(function UploadDropzone({
    onUpload,
    onRefresh,
    accept = '.vtp,.vtk,.nii,.nii.gz,.dcm',
    isDragOver: externalIsDragOver,
    setIsDragOver: externalSetIsDragOver,
}) {
    const [internalIsDragOver, setInternalIsDragOver] = useState(false);

    // Use external or internal state
    const isDragOver = externalIsDragOver ?? internalIsDragOver;
    const setIsDragOver = externalSetIsDragOver ?? setInternalIsDragOver;

    const handleDragOver = useCallback(
        (e) => {
            e.preventDefault();
            setIsDragOver(true);
        },
        [setIsDragOver]
    );

    const handleDragLeave = useCallback(() => {
        setIsDragOver(false);
    }, [setIsDragOver]);

    const handleDrop = useCallback(
        (e) => {
            e.preventDefault();
            setIsDragOver(false);

            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                files.forEach((file) => onUpload(file));
            }
        },
        [onUpload, setIsDragOver]
    );

    const handleClick = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                onUpload(file);
            }
        };
        input.click();
    }, [accept, onUpload]);

    return (
        <div
            className="panel-footer"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {isDragOver ? (
                <div className="panel-footer__dropzone">
                    <Upload size={16} />
                    <span>Drop to upload</span>
                </div>
            ) : (
                <>
                    <button
                        className="panel-footer__btn panel-footer__btn--primary"
                        onClick={handleClick}
                    >
                        <Upload size={11} />
                        <span>Upload</span>
                    </button>

                    {onRefresh && (
                        <button
                            className="panel-footer__btn panel-footer__btn--icon"
                            title="Refresh"
                            onClick={onRefresh}
                        >
                            <RefreshCw size={11} />
                        </button>
                    )}
                </>
            )}
        </div>
    );
});

export default UploadDropzone;