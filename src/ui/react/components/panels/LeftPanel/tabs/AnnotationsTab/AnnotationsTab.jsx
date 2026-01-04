// src/ui/react/components/panels/LeftPanel/tabs/AnnotationsTab/AnnotationsTab.jsx
// Annotations tab - spatial annotations for datasets and workspaces
//
// Features:
// - Uses real data from useAnnotations hook
// - Header uses ALL CAPS styling like Files/Datasets
// - Scope chips and type filters are centered
// - Footer uses panel-footer class fixed to bottom

import React, { useState, useCallback, useMemo } from 'react';
import { Icon, IconButton } from '@UI/react/components/atoms';
import { LabeledButton } from '@UI/react/components/molecules';
import { SearchBar } from '@UI/react/components/molecules/SearchBar';
import {
    ResizableSectionsContainer,
    ResizableSection,
    useSectionStates
} from '@UI/react/components/organisms/ResizableSections';
import { EmptyState } from '@UI/react/components/molecules/EmptyState';
import { useAnnotations } from '@UI/react/hooks/useAnnotations.js';
import { useDatasets } from '@UI/react/hooks/useDatasets.js';
import './AnnotationsTab.scss';

// =============================================================================
// CONSTANTS
// =============================================================================

const ANNOTATION_SCOPES = [
    { id: 'all', label: 'All', color: 'blue' },
    { id: 'mine', label: 'Mine', color: 'teal' },
    { id: 'shared', label: 'Shared', color: 'amber' },
];

const ANNOTATION_TYPES = {
    point: { icon: 'mapPin', label: 'Point', color: 'blue' },
    region: { icon: 'box', label: 'Region', color: 'green' },
    measurement: { icon: 'ruler', label: 'Measure', color: 'amber' },
    angle: { icon: 'cornerUpRight', label: 'Angle', color: 'purple' },
    text: { icon: 'mapPin', label: 'Text', color: 'pink' },
};

const DEFAULT_SECTION_STATES = {
    dataset: { expanded: true, flexGrow: 2 },
    workspace: { expanded: true, flexGrow: 1 },
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function ScopeChip({ scope, active, onClick }) {
    return (
        <LabeledButton
            label={scope.label}
            onClick={onClick}
            active={active}
            size="xs"
            variant="ghost"
            color={scope.color}
            className="scope-chip"
        />
    );
}

function TypeFilterToggle({ type, config, active, onClick }) {
    return (
        <IconButton
            icon={config.icon}
            onClick={onClick}
            active={active}
            tooltip={config.label}
            size="xs"
            variant="ghost"
            color={active ? config.color : undefined}
            className="type-filter-toggle"
        />
    );
}

function AnnotationItem({ annotation, onToggleVisibility }) {
    const typeConfig = ANNOTATION_TYPES[annotation.type] || ANNOTATION_TYPES.point;
    const isVisible = annotation.visible !== false;

    return (
        <div className="annotation-item">
            <Icon name={typeConfig.icon} size={12} className={`annotation-item__icon icon-${typeConfig.color}`} />
            <span className="annotation-item__text">
                {annotation.label || annotation.text || `${typeConfig.label} annotation`}
            </span>
            <IconButton
                icon={isVisible ? 'eye' : 'eyeOff'}
                onClick={() => onToggleVisibility?.(annotation)}
                tooltip={isVisible ? 'Hide' : 'Show'}
                size="xs"
                variant="ghost"
                className="annotation-item__visibility"
            />
            <IconButton
                icon="moreHorizontal"
                tooltip="More options"
                size="xs"
                variant="ghost"
                className="annotation-item__more"
            />
        </div>
    );
}

function DatasetGroup({ dataset, annotations, onToggleVisibility }) {
    const [expanded, setExpanded] = useState(true);

    if (!annotations || annotations.length === 0) return null;

    return (
        <div className="dataset-group">
            <div
                className="dataset-group__header"
                onClick={() => setExpanded(!expanded)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setExpanded(!expanded)}
            >
                <IconButton
                    icon={expanded ? 'chevronDown' : 'chevronRight'}
                    size="xs"
                    variant="ghost"
                />
                <Icon name="database" size={12} className="dataset-group__icon" />
                <span className="dataset-group__name">{dataset?.name || 'Unknown Dataset'}</span>
                <span className="dataset-group__count">{annotations.length}</span>
            </div>
            {expanded && (
                <div className="dataset-group__list">
                    {annotations.map(ann => (
                        <AnnotationItem
                            key={ann.id}
                            annotation={ann}
                            onToggleVisibility={onToggleVisibility}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}


// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AnnotationsPanelContent({ workspaceId }) {
    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilters, setTypeFilters] = useState(Object.keys(ANNOTATION_TYPES));

    // Section states for resizable sections - include resizeSection for drag resizing
    const { states: sectionStates, toggleSection, resizeSection } = useSectionStates(DEFAULT_SECTION_STATES);

    // Get real annotations from hook
    const {
        annotations,
        annotationsByDataset,
        stats,
        isLoading,
        error,
        activeScope,
        setActiveScope,
        updateAnnotation,
    } = useAnnotations({ workspaceId });

    // Get datasets for name lookup
    const datasets = useDatasets();
    const datasetMap = useMemo(() => {
        const map = {};
        datasets.forEach(ds => { map[ds.id] = ds; });
        return map;
    }, [datasets]);

    // Toggle type filter
    const toggleTypeFilter = useCallback((type) => {
        setTypeFilters(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        );
    }, []);

    // Toggle annotation visibility
    const handleToggleVisibility = useCallback((annotation) => {
        updateAnnotation({
            id: annotation.id,
            targetDatasetId: annotation.datasetId,
            updates: { visible: annotation.visible === false }
        });
    }, [updateAnnotation]);

    // Filter annotations by type and search
    const filteredAnnotations = useMemo(() => {
        return annotations.filter(ann => {
            // Type filter
            if (!typeFilters.includes(ann.type)) return false;

            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const text = (ann.label || ann.text || '').toLowerCase();
                if (!text.includes(query)) return false;
            }

            return true;
        });
    }, [annotations, typeFilters, searchQuery]);

    // Group filtered annotations by dataset
    const filteredByDataset = useMemo(() => {
        const grouped = {};
        filteredAnnotations.forEach(ann => {
            const dsId = ann.datasetId || 'unknown';
            if (!grouped[dsId]) grouped[dsId] = [];
            grouped[dsId].push(ann);
        });
        return grouped;
    }, [filteredAnnotations]);

    // Count dataset annotations
    const datasetAnnotationCount = Object.values(filteredByDataset)
        .reduce((sum, arr) => sum + arr.length, 0);

    return (
        <div className="annotations-tab">
            {/* Header - ALL CAPS like other tabs */}
            <div className="panel-header panel-header--pink">
                <Icon name="mapPin" size={16} className="panel-header__icon" />
                <span className="panel-header__title">Annotations</span>
                <span className="panel-header__count">{stats.total}</span>
            </div>

            {/* Scope chips - CENTERED */}
            <div className="scope-chips-wrapper">
                <div className="scope-chips">
                    {ANNOTATION_SCOPES.map(s => (
                        <ScopeChip
                            key={s.id}
                            scope={s}
                            active={activeScope === s.id}
                            onClick={() => setActiveScope(s.id)}
                        />
                    ))}
                </div>
            </div>

            {/* Search */}
            <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search annotations..."
            />

            {/* Type filters - CENTERED */}
            <div className="type-filter-wrapper">
                <div className="type-filter-group">
                    {Object.entries(ANNOTATION_TYPES).map(([type, config]) => (
                        <TypeFilterToggle
                            key={type}
                            type={type}
                            config={config}
                            active={typeFilters.includes(type)}
                            onClick={() => toggleTypeFilter(type)}
                        />
                    ))}
                </div>
            </div>

            {/* Loading state */}
            {isLoading && (
                <div className="annotations-tab__loading">
                    <Icon name="loader" size={16} className="spin" />
                    <span>Loading annotations...</span>
                </div>
            )}

            {/* Error state */}
            {error && (
                <div className="annotations-tab__error">
                    <span>Failed to load annotations</span>
                </div>
            )}

            {/* Content - Resizable Sections */}
            {!isLoading && !error && (
                <ResizableSectionsContainer
                    sectionStates={sectionStates}
                    onSectionToggle={toggleSection}
                    onSectionResize={resizeSection}
                >
                    {/* Dataset Annotations */}
                    <ResizableSection
                        id="dataset"
                        icon="database"
                        iconColorClass="icon-blue"
                        label="Dataset Annotations"
                        count={datasetAnnotationCount}
                    >
                        <div className="annotations-tab__section-content">
                            {Object.keys(filteredByDataset).length === 0 ? (
                                <EmptyState icon="mapPin" title="No dataset annotations" size="sm" />
                            ) : (
                                Object.entries(filteredByDataset).map(([dsId, anns]) => (
                                    <DatasetGroup
                                        key={dsId}
                                        dataset={datasetMap[dsId]}
                                        annotations={anns}
                                        onToggleVisibility={handleToggleVisibility}
                                    />
                                ))
                            )}
                        </div>
                    </ResizableSection>

                    {/* Workspace Annotations - placeholder for workspace-level annotations */}
                    <ResizableSection
                        id="workspace"
                        icon="layoutGrid"
                        iconColorClass="icon-amber"
                        label="Workspace Annotations"
                        count={0}
                    >
                        <div className="annotations-tab__section-content">
                            <EmptyState icon="mapPin" title="No workspace annotations" size="sm" />
                        </div>
                    </ResizableSection>
                </ResizableSectionsContainer>
            )}

            {/* Footer - fixed at bottom */}
            <div className="panel-footer">
                <LabeledButton
                    icon="add"
                    label="New Annotation"
                    size="sm"
                />
                <LabeledButton
                    icon="externalLink"
                    label="Open Panel"
                    size="sm"
                    variant="ghost"
                    tooltip="Open full annotations panel"
                />
            </div>
        </div>
    );
}

export default AnnotationsPanelContent;