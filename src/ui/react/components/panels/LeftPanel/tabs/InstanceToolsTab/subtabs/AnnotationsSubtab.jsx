// AnnotationsSubtab.jsx
// Instance-specific annotations subtab for InstanceToolsTab
//
// FIXED: Uses real annotations from useAnnotations hook
// FIXED: "Open Full Annotations Panel" button is in a proper footer
// FIXED: Renders annotations in 3D view via workspaceManager
// ADDED: Click-to-annotate with floating annotation creator

import React, { useState, useCallback, useEffect } from 'react';
import {
    MapPin,
    ArrowUpRight,
    Eye,
    EyeOff,
    MoreHorizontal,
    Box,
    Ruler,
    CornerUpRight,
    Plus,
    Loader,
    TextCursor,
    Crosshair,
} from 'lucide-react';
import { useAnnotations } from '@UI/react/hooks/useAnnotations.js';
import { FloatingAnnotationCreator } from '@UI/react/components/modals/FloatingAnnotationCreator';
import { workspaceManager } from '@Core/instances/workspaceManager.js';
import { logInfo, logSuccess, logWarning } from '@Utils/logger.js';

// =============================================================================
// ANNOTATION TYPE CONFIG
// =============================================================================

const ANNOTATION_TYPES = {
    point: { icon: MapPin, label: 'Point', color: 'blue' },
    region: { icon: Box, label: 'Region', color: 'green' },
    measurement: { icon: Ruler, label: 'Measure', color: 'amber' },
    angle: { icon: CornerUpRight, label: 'Angle', color: 'purple' },
    text: { icon: TextCursor, label: 'Text', color: 'pink' },
};

// =============================================================================
// ANNOTATION LIST ITEM
// =============================================================================

function AnnotationListItem({ annotation, onToggleVisibility }) {
    const typeConfig = ANNOTATION_TYPES[annotation.type] || ANNOTATION_TYPES.point;
    const Icon = typeConfig.icon;
    const isVisible = annotation.visible !== false;

    return (
        <div className="annotation-list-item">
            <Icon size={14} className={`annotation-list-item__icon icon-${typeConfig.color}`} />
            <div className="annotation-list-item__content">
                <span className="annotation-list-item__text">
                    {annotation.label || annotation.text || `${typeConfig.label} annotation`}
                </span>
                <span className="annotation-list-item__meta">
                    {typeConfig.label} &middot; {annotation.createdBy || 'Unknown'}
                </span>
            </div>
            <button
                className="annotation-list-item__visibility"
                onClick={() => onToggleVisibility?.(annotation)}
                title={isVisible ? 'Hide' : 'Show'}
            >
                {isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
            </button>
            <button className="annotation-list-item__more" title="More options">
                <MoreHorizontal size={12} />
            </button>
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AnnotationsSubtab({ activeInstance, onOpenFullPanel }) {
    // Get the dataset ID and instance ID from the active instance
    const datasetId = activeInstance?.instanceData?.dataset?.id || null;
    const instanceId = activeInstance?.instanceId || null;

    // Floating annotation creator state
    const [showCreator, setShowCreator] = useState(false);
    const [annotationMode, setAnnotationMode] = useState(false);
    const [clickPosition, setClickPosition] = useState({ x: 0, y: 0, z: 0 });
    const [screenPosition, setScreenPosition] = useState({ x: 200, y: 200 });

    // Fetch real annotations for this dataset
    const {
        annotations,
        isLoading,
        error,
        createAnnotation,
        updateAnnotation,
    } = useAnnotations({ datasetId });

    // Render annotations in 3D view when annotations change
    useEffect(() => {
        if (!instanceId || !annotations) return;

        // Get visible annotations
        const visibleAnnotations = annotations.filter(a => a.visible !== false);

        // Update the VTK instance with annotations
        workspaceManager.updateInstanceAnnotations(instanceId, visibleAnnotations.length > 0, visibleAnnotations)
            .catch(err => {
                logWarning('Failed to render annotations in 3D view');
                console.warn('Annotation render error:', err);
            });
    }, [instanceId, annotations]);

    // Handle annotation mode toggle
    useEffect(() => {
        if (!instanceId) return;

        workspaceManager.setAnnotationMode(instanceId, annotationMode);

        return () => {
            // Disable annotation mode on cleanup
            workspaceManager.setAnnotationMode(instanceId, false);
        };
    }, [instanceId, annotationMode]);

    // Listen for annotation click events
    useEffect(() => {
        const handleAnnotationClick = (event) => {
            const { position, screenX, screenY, instanceId: clickInstanceId } = event.detail;

            if (clickInstanceId === instanceId && position) {
                setClickPosition(position);
                setScreenPosition({ x: screenX + 20, y: screenY - 150 });
                setShowCreator(true);
                setAnnotationMode(false); // Exit annotation mode after click
            }
        };

        window.addEventListener('cia:annotation-click', handleAnnotationClick);
        return () => window.removeEventListener('cia:annotation-click', handleAnnotationClick);
    }, [instanceId]);

    // Toggle annotation visibility
    const handleToggleVisibility = useCallback(async (annotation) => {
        await updateAnnotation({
            id: annotation.id,
            targetDatasetId: annotation.datasetId,
            updates: { visible: annotation.visible === false }
        });

        // Re-render annotations after visibility change
        if (instanceId) {
            const updatedAnnotations = annotations.map(a =>
                a.id === annotation.id ? { ...a, visible: a.visible === false } : a
            );
            const visibleAnnotations = updatedAnnotations.filter(a => a.visible !== false);
            workspaceManager.updateInstanceAnnotations(instanceId, visibleAnnotations.length > 0, visibleAnnotations);
        }
    }, [updateAnnotation, annotations, instanceId]);

    // Handle creating a new annotation with position
    const handleCreateAnnotation = useCallback(async (text, type, position) => {
        if (!datasetId) {
            console.warn('No dataset ID available for annotation');
            return;
        }

        logInfo(`Creating annotation: ${type} at (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);

        try {
            const newAnnotation = await createAnnotation({
                targetDatasetId: datasetId,
                type: type === 'note' ? 'point' : type,
                text,
                position: [position.x, position.y, position.z],
                label: text.substring(0, 50),
            });
            logSuccess('Annotation created');
            console.log('[DEBUG] New annotation returned:', newAnnotation);
            setShowCreator(false);

            // Immediately render the new annotation in the 3D view
            if (instanceId && newAnnotation) {
                const allAnnotations = [...annotations, newAnnotation].filter(a => a.visible !== false);
                console.log('[DEBUG] Rendering annotations:', allAnnotations.length, 'annotations');
                console.log('[DEBUG] Annotation positions:', allAnnotations.map(a =>
                    Array.isArray(a.position) ? a.position : [a.position?.x, a.position?.y, a.position?.z]
                ));
                await workspaceManager.updateInstanceAnnotations(instanceId, true, allAnnotations);
                logSuccess(`Rendered ${allAnnotations.length} annotation(s) in 3D view`);
            } else {
                console.warn('[DEBUG] Cannot render: instanceId=', instanceId, 'newAnnotation=', !!newAnnotation);
            }
        } catch (err) {
            console.error('Failed to create annotation:', err);
        }
    }, [datasetId, createAnnotation, instanceId, annotations]);

    // Handle position change from the floating creator
    const handlePositionChange = useCallback((newPosition) => {
        setClickPosition(newPosition);
    }, []);

    // Start click-to-annotate mode
    const handleStartAnnotating = useCallback(() => {
        setAnnotationMode(true);
        logInfo('Click-to-annotate mode enabled. Click on the 3D model to place an annotation.');
    }, []);

    // Handle opening the full panel
    const handleOpenFullPanel = useCallback(() => {
        // Dispatch event to open the annotations tab in main panel
        window.dispatchEvent(new CustomEvent('cia:open-panel', {
            detail: { panel: 'annotations' }
        }));
        onOpenFullPanel?.();
    }, [onOpenFullPanel]);

    return (
        <div className="annotations-subtab">
            <div className="annotations-subtab__info">
                Annotations on this instance only. For all annotations, use the global Annotations panel.
            </div>

            {/* Loading state */}
            {isLoading && (
                <div className="annotations-subtab__loading">
                    <Loader size={16} className="spin" />
                    <span>Loading...</span>
                </div>
            )}

            {/* Error state */}
            {error && (
                <div className="annotations-subtab__error">
                    <span>Failed to load annotations</span>
                </div>
            )}

            {/* Content */}
            {!isLoading && !error && (
                <>
                    {annotations.length === 0 ? (
                        <div className="annotations-subtab__empty">
                            <MapPin size={24} />
                            <p>No annotations on this instance</p>
                            <span>Use the annotation tool to add markers</span>
                        </div>
                    ) : (
                        <div className="annotations-subtab__list">
                            {annotations.map(ann => (
                                <AnnotationListItem
                                    key={ann.id}
                                    annotation={ann}
                                    onToggleVisibility={handleToggleVisibility}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Footer - fixed to bottom of subtab */}
            <div className="annotations-subtab__footer">
                <button
                    className={`annotations-subtab__footer-btn annotations-subtab__footer-btn--click ${annotationMode ? 'active' : ''}`}
                    title="Click on the 3D model to add annotation"
                    onClick={handleStartAnnotating}
                    disabled={!datasetId || annotationMode}
                >
                    <Crosshair size={11} />
                    <span>{annotationMode ? 'Click model...' : 'Click to Add'}</span>
                </button>
                <button
                    className="annotations-subtab__footer-btn annotations-subtab__footer-btn--open"
                    onClick={handleOpenFullPanel}
                >
                    <ArrowUpRight size={11} />
                    <span>Open Panel</span>
                </button>
            </div>

            {/* Annotation mode indicator */}
            {annotationMode && (
                <div className="annotations-subtab__mode-indicator">
                    <Crosshair size={12} className="pulse" />
                    <span>Click on the 3D model to place annotation</span>
                    <button onClick={() => setAnnotationMode(false)}>Cancel</button>
                </div>
            )}

            {/* Floating Annotation Creator */}
            <FloatingAnnotationCreator
                isOpen={showCreator}
                onClose={() => setShowCreator(false)}
                onSubmit={handleCreateAnnotation}
                position={clickPosition}
                screenPosition={screenPosition}
                onPositionChange={handlePositionChange}
            />
        </div>
    );
}

export default AnnotationsSubtab;