// src/ui/react/components/panels/FilesPanel/SampleFileList.jsx
import React from 'react';
import { FileIcon } from 'lucide-react';

export function SampleFileList({ samples, onSelectSample, disabled }) {
    return (
        <div className="files-panel__samples">
            {samples.map(sample => (
                <button
                    key={sample.name}
                    className="files-panel__sample"
                    onClick={() => onSelectSample(sample)}
                    disabled={disabled}
                >
                    <FileIcon size={16} />
                    <div className="files-panel__sample-info">
                        <div className="files-panel__sample-name">{sample.name}</div>
                        <div className="files-panel__sample-size">{sample.size}</div>
                    </div>
                </button>
            ))}
        </div>
    );
}