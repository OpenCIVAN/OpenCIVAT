// tabs/AnnotationsTab/AnnotationsTab.jsx
// Global Annotations tab content for the unified left panel
//
// Features:
// - Search and filter all annotations across the project
// - Scope filtering (Project | Workspace | Instance)
// - Filtering by type (Point, Ruler, Region, Note)
// - Visibility toggle and navigation to annotations

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
    Globe,
    Monitor,
} from 'lucide-react';
import {
    ResizableSectionsContainer,
    ResizableSection,
    useSectionStates
} from '@UI/react/components/common/ResizableSections';
import { ChipGroup } from '@UI/react/components/common/ChipGroup';
import './AnnotationsTab.scss';

// =============================================================================
// SCOPE CHIPS
// =============================================================================

// Define chips config (can be outside component or memoized)
const SCOPE_CHIPS = [
    { id: 'project', label: 'Project', icon: Globe, color: 'amber' },
    { id: 'workspace', label: 'Workspace', icon: LayoutGrid, color: 'teal' },
    { id: 'instance', label: 'Instance', icon: Monitor, color: 'blue' },
];

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
            className={`type-filter-btn ${active ? 'type-filter-btn--active' : ''}`}
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
            className={`annotation-item ${isExpanded ? 'annotation-item--expanded' : ''}`}
            data-color={typeConfig.color}
            style={{ opacity: annotation.visible === false ? 0.5 : 1 }}
        >
            <div className="annotation-item__main" onClick={() => setIsExpanded(!isExpanded)}>
                {/* Visibility toggle */}
                <button
                    className="annotation-item__visibility"
                    onClick={(e) => { e.stopPropagation(); onToggleVisibility?.(annotation.id); }}
                >
                    {annotation.visible !== false ? (
                        <Eye size={12} className="icon-green" />
                    ) : (
                        <EyeOff size={12} />
                    )}
                </button>

                {/* Type badge */}
                <span className={`annotation-item__type-badge type-badge--${typeConfig.color}`}>
                    <TypeIcon size={12} />
                </span>

                {/* Content */}
                <div className="annotation-item__content">
                    <span className="annotation-item__text">
                        {annotation.text}
                        {annotation.shared && <Share2 size={9} className="icon-pink" />}
                    </span>
                    {annotation.value && (
                        <span className="annotation-item__value">{annotation.value}</span>
                    )}
                    <span className="annotation-item__meta">
                        <User size={8} /> {annotation.createdBy} <Clock size={8} /> {annotation.timestamp}
                    </span>
                </div>

                {/* Navigate button */}
                <button
                    className="annotation-item__go-btn"
                    onClick={(e) => { e.stopPropagation(); onNavigate?.(annotation.id); }}
                >
                    <Target size={10} /> Go
                </button>
            </div>

            {/* Expanded actions */}
            {isExpanded && (
                <div className="annotation-item__actions">
                    <button className="annotation-item__action-btn" data-color="blue">
                        <Edit3 size={10} /> Edit
                    </button>
                    <button className="annotation-item__action-btn" data-color="pink">
                        <Share2 size={10} /> Share
                    </button>
                    <button className="annotation-item__action-btn" data-color="red">
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
        <div className="dataset-group">
            <div
                className={`dataset-group__header ${isExpanded ? 'dataset-group__header--expanded' : ''}`}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <span className="dataset-group__chevron">
                    {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                </span>
                <span className={`dataset-group__dot dot--${dataset.color}`} />
                <span className="dataset-group__name">{dataset.name}</span>
                <span className="dataset-group__count">{dataset.annotations.length}</span>
            </div>

            {isExpanded && (
                <div className="dataset-group__items">
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
        <div className="workspace-annotation">
            <span className={`workspace-annotation__badge type-badge--${typeConfig.color}`}>
                <TypeIcon size={12} />
            </span>
            <div className="workspace-annotation__content">
                <span className="workspace-annotation__text">{annotation.text}</span>
                <div className="workspace-annotation__links">
                    {annotation.linkedInstances?.map(inst => (
                        <span key={inst} className="workspace-annotation__link-badge">{inst}</span>
                    ))}
                </div>
                <span className="workspace-annotation__meta">
                    {annotation.createdBy} &middot; {annotation.timestamp}
                    {annotation.shared && <Share2 size={8} className="icon-pink" />}
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
    const [activeScopes, setActiveScopes] = useState(['project', 'workspace', 'instance']);

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

    // Toggle scope filter
    const toggleScope = useCallback((scope) => {
        setActiveScopes(prev =>
            prev.includes(scope)
                ? prev.filter(s => s !== scope)
                : [...prev, scope]
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
            <div className="annotations-tab__header">
                <MapPin size={14} className="icon-pink" />
                <span className="annotations-tab__title">Annotations</span>
                <span className="annotations-tab__count">{totalCount} total</span>
            </div>

            {/* Scope filters */}
            <div className="annotations-tab__scope-bar">
                <ChipGroup
                    chips={SCOPE_CHIPS}
                    activeChips={activeScopes}
                    onToggle={toggleScope}
                    size="sm"
                />
            </div>

            {/* Search */}
            <div className="annotations-tab__search">
                <div className="search-input">
                    <Search size={12} className="search-input__icon" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search all annotations..."
                    />
                    {searchQuery && (
                        <button
                            className="search-input__clear"
                            onClick={() => setSearchQuery('')}
                        >
                            <X size={10} />
                        </button>
                    )}
                </div>
            </div>

            {/* Type filters */}
            <div className="annotations-tab__type-filters">
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
                <button className="annotations-tab__filter-btn" title="Filter options">
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
                    <div className="annotations-tab__section-content">
                        {SAMPLE_ANNOTATIONS.datasets.map(ds => (
                            <DatasetGroup key={ds.id} dataset={ds} />
                        ))}
                    </div>
                </ResizableSection>

                {/* Workspace Annotations */}
                <ResizableSection
                    id="workspace"
                    icon={LayoutGrid}
                    iconColorClass="icon-amber"
                    label="Workspace Annotations"
                    count={SAMPLE_ANNOTATIONS.workspace.length}
                >
                    <div className="annotations-tab__section-content">
                        {SAMPLE_ANNOTATIONS.workspace.map(ann => (
                            <WorkspaceAnnotationItem key={ann.id} annotation={ann} />
                        ))}
                    </div>
                </ResizableSection>
            </ResizableSectionsContainer>

            {/* Footer */}
            <div className="annotations-tab__footer">
                <span className="annotations-tab__footer-count">
                    {totalCount} annotation{totalCount !== 1 ? 's' : ''} found
                </span>
            </div>
        </div>
    );
}

export default AnnotationsPanelContent;