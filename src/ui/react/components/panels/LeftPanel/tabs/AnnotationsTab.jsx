// src/ui/react/components/panels/LeftPanel/tabs/AnnotationsTab.jsx
// Annotations tab content for the unified left panel
//
// Features:
// - Shows annotations organized by dataset and workspace
// - Filtering by type (Point, Ruler, Region, Note)
// - Visibility toggle and navigation to annotations
// - VS Code-style resizable sections

import React, { useState, useCallback, useMemo } from 'react';
import {
    MessageSquare,
    Search,
    X,
    Filter,
    Eye,
    EyeOff,
    MapPin,
    Ruler,
    Square,
    ChevronDown,
    ChevronRight,
    User,
    Clock,
    Share2,
    Target,
    Edit3,
    Trash2,
    Database,
    LayoutGrid,
    PenTool,
    ArrowUpRight,
} from 'lucide-react';
import {
    ResizableSectionsContainer,
    ResizableSection,
    useSectionStates
} from '@UI/react/components/common/ResizableSections';

// =============================================================================
// ANNOTATION TYPES
// =============================================================================

const ANNOTATION_TYPES = {
    point: { icon: MapPin, label: 'Point', color: 'blue' },
    ruler: { icon: Ruler, label: 'Ruler', color: 'green' },
    region: { icon: Square, label: 'Region', color: 'purple' },
    note: { icon: MessageSquare, label: 'Note', color: 'amber' },
};

// =============================================================================
// SAMPLE DATA (will be replaced with real data)
// =============================================================================

const SAMPLE_ANNOTATIONS = {
    datasets: [
        {
            id: 'ds1',
            name: 'Brain_Scan_001.nii',
            color: 'blue',
            annotations: [
                { id: 'a1', type: 'ruler', text: 'Tumor diameter', value: '24.5mm', createdBy: 'You', timestamp: '2h ago', visible: true },
                { id: 'a2', type: 'point', text: 'Region of interest', createdBy: 'Dr. Smith', timestamp: '1d ago', visible: true, shared: true },
                { id: 'a3', type: 'region', text: 'Affected area outline', createdBy: 'You', timestamp: '1d ago', visible: false },
            ]
        },
        {
            id: 'ds2',
            name: 'CT_Overlay.dcm',
            color: 'teal',
            annotations: [
                { id: 'a4', type: 'point', text: 'Reference point A', createdBy: 'You', timestamp: '1w ago', visible: true },
                { id: 'a5', type: 'ruler', text: 'Distance to landmark', value: '12.3mm', createdBy: 'You', timestamp: '1w ago', visible: true },
            ]
        },
    ],
    workspace: [
        { id: 'wa1', type: 'note', text: 'Compare these two views', linkedInstances: ['Main Analysis', 'CT Overlay'], createdBy: 'You', timestamp: '1h ago' },
        { id: 'wa2', type: 'region', text: 'Focus area for presentation', linkedInstances: ['Main Analysis'], createdBy: 'Dr. Smith', timestamp: '2d ago', shared: true },
    ]
};

// =============================================================================
// TYPE FILTER TOGGLE
// =============================================================================

function TypeFilterToggle({ type, config, active, onClick }) {
    const Icon = config.icon;
    return (
        <button
            className={`filter-toggle ${active ? 'active' : ''}`}
            data-color={config.color}
            onClick={onClick}
        >
            <Icon size={10} />
            <span>{config.label}</span>
        </button>
    );
}

// =============================================================================
// ANNOTATION ITEM
// =============================================================================

function AnnotationItem({ annotation, datasetColor, onToggleVisibility, onNavigate }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const typeConfig = ANNOTATION_TYPES[annotation.type] || ANNOTATION_TYPES.point;
    const TypeIcon = typeConfig.icon;

    return (
        <div
            className={`tree-item tree-item--annotation ${isExpanded ? 'expanded' : ''}`}
            style={{
                '--item-color': `var(--color-accent-${typeConfig.color})`,
                opacity: annotation.visible === false ? 0.5 : 1,
            }}
        >
            <div className="tree-item__main" onClick={() => setIsExpanded(!isExpanded)}>
                {/* Visibility toggle */}
                <button
                    className="tree-item__visibility-btn"
                    onClick={(e) => { e.stopPropagation(); onToggleVisibility?.(annotation.id); }}
                >
                    {annotation.visible !== false ? (
                        <Eye size={12} style={{ color: 'var(--color-accent-green)' }} />
                    ) : (
                        <EyeOff size={12} />
                    )}
                </button>

                {/* Type icon */}
                <span className={`tree-item__type-badge tree-item__type-badge--${typeConfig.color}`}>
                    <TypeIcon size={12} />
                </span>

                {/* Content */}
                <div className="tree-item__info">
                    <span className="item-name">
                        {annotation.text}
                        {annotation.shared && <Share2 size={9} style={{ color: 'var(--color-accent-pink)', marginLeft: '4px' }} />}
                    </span>
                    {annotation.value && (
                        <span className="item-value">{annotation.value}</span>
                    )}
                    <span className="item-meta">
                        <User size={8} /> {annotation.createdBy} <Clock size={8} /> {annotation.timestamp}
                    </span>
                </div>

                {/* Go button */}
                <button
                    className="tree-item__action-btn"
                    onClick={(e) => { e.stopPropagation(); onNavigate?.(annotation.id); }}
                >
                    <Target size={10} /> Go
                </button>
            </div>

            {/* Expanded actions */}
            {isExpanded && (
                <div className="tree-item__expanded-actions">
                    <button className="tree-item__expanded-btn" data-color="blue">
                        <Edit3 size={10} /> Edit
                    </button>
                    <button className="tree-item__expanded-btn" data-color="pink">
                        <Share2 size={10} /> Share
                    </button>
                    <button className="tree-item__expanded-btn">
                        <Trash2 size={10} />
                    </button>
                </div>
            )}
        </div>
    );
}

// =============================================================================
// DATASET GROUP
// =============================================================================

function DatasetGroup({ dataset, onToggleVisibility, onNavigate }) {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="tree-group">
            <div
                className="tree-item tree-item--folder"
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                    background: isExpanded ? `rgba(var(--color-accent-${dataset.color}-rgb), 0.08)` : 'transparent',
                }}
            >
                <span className="chevron">
                    {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                </span>
                <span className={`tree-item__color-dot tree-item__color-dot--${dataset.color}`} />
                <span className="item-name">{dataset.name}</span>
                <span className="item-meta">{dataset.annotations.length}</span>
            </div>

            {isExpanded && (
                <div className="tree-group__children">
                    {dataset.annotations.map(ann => (
                        <AnnotationItem
                            key={ann.id}
                            annotation={ann}
                            datasetColor={dataset.color}
                            onToggleVisibility={onToggleVisibility}
                            onNavigate={onNavigate}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// =============================================================================
// WORKSPACE ANNOTATION ITEM
// =============================================================================

function WorkspaceAnnotationItem({ annotation }) {
    const typeConfig = ANNOTATION_TYPES[annotation.type] || ANNOTATION_TYPES.note;
    const TypeIcon = typeConfig.icon;

    return (
        <div className="tree-item tree-item--workspace-annotation">
            <span className={`tree-item__type-badge tree-item__type-badge--${typeConfig.color}`}>
                <TypeIcon size={12} />
            </span>
            <div className="tree-item__info">
                <span className="item-name">{annotation.text}</span>
                <div className="item-linked-instances">
                    {annotation.linkedInstances?.map(inst => (
                        <span key={inst} className="linked-instance-badge">{inst}</span>
                    ))}
                </div>
                <span className="item-meta">
                    {annotation.createdBy} &middot; {annotation.timestamp}
                    {annotation.shared && <Share2 size={8} style={{ color: 'var(--color-accent-pink)', marginLeft: '4px' }} />}
                </span>
            </div>
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AnnotationsPanelContent({ workspaceId }) {
    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilters, setTypeFilters] = useState([]);

    // Section states
    const { states: sectionStates, toggleSection } = useSectionStates({
        dataset: { expanded: true, flexGrow: 2 },
        workspace: { expanded: true, flexGrow: 1 },
    });

    // Toggle type filter
    const toggleTypeFilter = useCallback((type) => {
        setTypeFilters(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        );
    }, []);

    // Calculate total count
    const totalCount = useMemo(() => {
        const datasetCount = SAMPLE_ANNOTATIONS.datasets.reduce((sum, ds) => sum + ds.annotations.length, 0);
        return datasetCount + SAMPLE_ANNOTATIONS.workspace.length;
    }, []);

    return (
        <div className="annotations-tab">
            {/* Header */}
            <div className="panel-header">
                <MessageSquare size={14} className="panel-header__icon file-icon--pink" />
                <span className="panel-header__title">Annotations</span>
                <span className="panel-header__count">{totalCount} total</span>
            </div>

            {/* Search */}
            <div className="panel-search">
                <div className="panel-search__wrapper">
                    <Search size={12} className="search-icon" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search annotations..."
                    />
                    {searchQuery && (
                        <button
                            className="clear-button"
                            onClick={() => setSearchQuery('')}
                        >
                            <X size={10} />
                        </button>
                    )}
                </div>
            </div>

            {/* Type filters */}
            <div className="panel-toolbar">
                {Object.entries(ANNOTATION_TYPES).map(([type, config]) => (
                    <TypeFilterToggle
                        key={type}
                        type={type}
                        config={config}
                        active={typeFilters.includes(type)}
                        onClick={() => toggleTypeFilter(type)}
                    />
                ))}
                <div className="panel-toolbar__spacer" />
                <button className="panel-header__action-btn" title="Filter options">
                    <Filter size={12} />
                </button>
            </div>

            {/* Resizable Sections */}
            <ResizableSectionsContainer
                sectionStates={sectionStates}
                onSectionToggle={toggleSection}
            >
                {/* Dataset Annotations */}
                <ResizableSection
                    id="dataset"
                    icon={Database}
                    iconColorClass="icon-blue"
                    label="Dataset Annotations"
                    count={SAMPLE_ANNOTATIONS.datasets.reduce((sum, ds) => sum + ds.annotations.length, 0)}
                >
                    {SAMPLE_ANNOTATIONS.datasets.map(ds => (
                        <DatasetGroup key={ds.id} dataset={ds} />
                    ))}
                </ResizableSection>

                {/* Workspace Annotations */}
                <ResizableSection
                    id="workspace"
                    icon={LayoutGrid}
                    iconColorClass="icon-amber"
                    label="Workspace Annotations"
                    count={SAMPLE_ANNOTATIONS.workspace.length}
                >
                    {SAMPLE_ANNOTATIONS.workspace.map(ann => (
                        <WorkspaceAnnotationItem key={ann.id} annotation={ann} />
                    ))}
                </ResizableSection>
            </ResizableSectionsContainer>

            {/* Footer */}
            <div className="panel-footer">
                <button className="panel-footer__btn panel-footer__btn--primary">
                    <PenTool size={11} />
                    <span>Instance Tools</span>
                    <ArrowUpRight size={10} />
                </button>
                <button className="panel-footer__btn panel-footer__btn--primary">
                    <LayoutGrid size={11} />
                    <span>Layout</span>
                    <ArrowUpRight size={10} />
                </button>
            </div>
        </div>
    );
}

export default AnnotationsPanelContent;