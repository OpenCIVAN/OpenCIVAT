// src/ui/react/components/panels/FilesPanel/FileUploadButton.jsx
import React, { useRef } from 'react';
import { Upload } from 'lucide-react';

export function FileUploadButton({ onFileSelect, disabled }) {
    const fileInputRef = useRef(null);

    const handleChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            onFileSelect(file);
            // Clear the input so the same file can be selected again
            event.target.value = '';
        }
    };

    return (
        <div className="files-panel__upload">
            <input
                ref={fileInputRef}
                type="file"
                accept=".vtp"
                onChange={handleChange}
                style={{ display: 'none' }}
                disabled={disabled}
            />
            <button
                className="files-panel__upload-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
            >
                <Upload size={16} />
                Choose VTP File
            </button>
        </div>
    );
}