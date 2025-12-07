// AnnotationsSubtab.jsx
// Instance-specific annotations subtab for InstanceToolsTab

import React from 'react';
import { MapPin, ArrowUpRight } from 'lucide-react';

// Sample annotations for this instance (will be replaced with real data)
const SAMPLE_INSTANCE_ANNOTATIONS = [
    { id: 'a1', type: 'point', text: 'Tumor marker', createdBy: 'Beth', timestamp: '2h ago' },
    { id: 'a2', type: 'region', text: 'Region of interest', createdBy: 'Alex', timestamp: '1d ago' },
];

export function AnnotationsSubtab({ instanceId, onOpenFullPanel }) {
    return (
        <div className="annotations-subtab">
            <div className="annotations-subtab__info">
                Annotations on this instance only. For all annotations, use the global Annotations panel.
            </div>

            {SAMPLE_INSTANCE_ANNOTATIONS.length === 0 ? (
                <div className="annotations-subtab__empty">
                    <MapPin size={24} />
                    <p>No annotations on this instance</p>
                    <span>Use the annotation tool to add markers</span>
                </div>
            ) : (
                <div className="annotations-subtab__list">
                    {SAMPLE_INSTANCE_ANNOTATIONS.map(ann => (
                        <div key={ann.id} className="annotation-list-item">
                            <MapPin size={14} className="annotation-list-item__icon" />
                            <div className="annotation-list-item__content">
                                <span className="annotation-list-item__text">{ann.text}</span>
                                <span className="annotation-list-item__meta">
                                    {ann.type} &middot; by {ann.createdBy}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <button
                className="annotations-subtab__open-btn"
                onClick={onOpenFullPanel}
            >
                <ArrowUpRight size={12} />
                Open Full Annotations Panel
            </button>
        </div>
    );
}

export default AnnotationsSubtab;