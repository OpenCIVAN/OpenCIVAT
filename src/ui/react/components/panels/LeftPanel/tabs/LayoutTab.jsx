// src/ui/react/components/panels/LeftPanel/tabs/LayoutTab.jsx
// Layout tab content for the unified left panel
//
// Features:
// - Grid layout minimap with cell selection
// - View mode toggle (Normal, Isolation, Subset)
// - Quick layout presets
// - Workspace members visibility
// - VS Code-style collapsible sections

import React, { useState, useCallback } from 'react';
import {
    LayoutGrid,
    Grid3X3,
    Maximize,
    Maximize2,
    Layers,
    Plus,
    Minus,
    Move,
    ChevronDown,
    ChevronRight,
    Eye,
    EyeOff,
    Users,
    User,
    Globe,
    Briefcase,
    Zap,
    Moon,
    Radio,
    MousePointer2,
    PenTool,
    Link2,
    MoreHorizontal,
    Square,
    Columns,
    Rows,
    PanelLeft,
    Save,
    UserCircle,
} from 'lucide-react';
import {
    ResizableSectionsContainer,
    ResizableSection,
    useSectionStates
} from '../components/ResizableSections';

// =============================================================================
// SAMPLE DATA
// =============================================================================

const CURRENT_WORKSPACE = {
    id: 'personal',
    name: 'My Workspace',
    type: 'personal',
    color: 'green',
};

const GRID_CELLS = [
    { id: 'c1', row: 0, col: 0, rowSpan: 2, colSpan: 2, instance: { name: 'Main Analysis', dataset: 'Brain_Scan_001.nii', color: 'blue' } },
    { id: 'c2', row: 0, col: 2, rowSpan: 1, colSpan: 1, instance: { name: 'CT Overlay', dataset: 'CT_Overlay.dcm', color: 'teal' } },
    { id: 'c3', row: 1, col: 2, rowSpan: 1, colSpan: 1, instance: { name: 'Segmentation', dataset: 'Tumor_Region.vtk', color: 'pink' } },
    { id: 'c4', row: 2, col: 0, rowSpan: 1, colSpan: 2, instance: null },
    { id: 'c5', row: 2, col: 2, rowSpan: 1, colSpan: 1, instance: { name: 'Reference', dataset: 'Reference_Atlas.nii', color: 'amber' } },
];

const WORKSPACE_MEMBERS = [
    { id: 'me', name: 'You', color: 'green', isMe: true, status: 'active', cursorVisible: true },
    { id: 'u1', name: 'Dr. Smith', color: 'pink', isMe: false, status: 'active', cursorVisible: true },
    { id: 'u2', name: 'Dr. Jones', color: 'amber', isMe: false, status: 'idle', cursorVisible: true },
];

const LAYOUT_PRESETS = [
    { id: 'single', name: 'Single', icon: Square, grid: '1�1' },
    { id: 'split-h', name: 'Split H', icon: Columns, grid: '1�2' },
    { id: 'split-v', name: 'Split V', icon: Rows, grid: '2�1' },
    { id: 'quad', name: 'Quad', icon: Grid3X3, grid: '2�2' },
    { id: 'focus', name: 'Focus', icon: PanelLeft, grid: '1+2' },
];

const VIEW_MODES = [
    { id: 'normal', label: 'Normal', icon: Grid3X3, color: 'green', description: 'Standard grid view with all instances visible.' },
    { id: 'isolation', label: 'Isolation', icon: Maximize, color: 'purple', description: 'Focus on a single instance. Click an instance or select from list.' },
    { id: 'subset', label: 'Subset', icon: Layers, color: 'teal', description: 'Select multiple instances to view together. Others are hidden.' },
];

// =============================================================================
// WORKSPACE ICON HELPER
// =============================================================================

function getWorkspaceIcon(type) {
    switch (type) {
        case 'personal': return UserCircle;
        case 'project': return Globe;
        case 'breakout': return Briefcase;
        default: return Globe;
    }
}

// =============================================================================
// MINI MAP
// =============================================================================

function MiniMap({ cells, selectedCell, onSelectCell }) {
    const gridSize = 3;
    const cellSize = 28;
    const gap = 3;

    return (
        <div className="layout-minimap">
            <div
                className="layout-minimap__grid"
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
                    gridTemplateRows: `repeat(${gridSize}, ${cellSize}px)`,
                    gap: `${gap}px`,
                }}
            >
                {cells.map(cell => (
                    <div
                        key={cell.id}
                        className={`layout-minimap__cell ${selectedCell === cell.id ? 'layout-minimap__cell--selected' : ''} ${cell.instance ? '' : 'layout-minimap__cell--empty'}`}
                        style={{
                            gridRow: `${cell.row + 1} / span ${cell.rowSpan}`,
                            gridColumn: `${cell.col + 1} / span ${cell.colSpan}`,
                            '--cell-color': cell.instance ? `var(--color-accent-${cell.instance.color})` : undefined,
                        }}
                        onClick={() => onSelectCell(cell.id)}
                    >
                        {!cell.instance && <Plus size={10} />}
                    </div>
                ))}
            </div>
        </div>
    );
}

// =============================================================================
// CELL LIST
// =============================================================================

function CellList({ cells, selectedCell, onSelectCell }) {
    return (
        <div className="cell-list">
            {cells.map(cell => (
                <div
                    key={cell.id}
                    className={`cell-list__item ${selectedCell === cell.id ? 'cell-list__item--selected' : ''}`}
                    onClick={() => onSelectCell(cell.id)}
                    style={{ '--cell-color': cell.instance ? `var(--color-accent-${cell.instance.color})` : undefined }}
                >
                    <span className={`cell-list__color ${cell.instance ? '' : 'cell-list__color--empty'}`} />
                    <div className="cell-list__info">
                        <span className="cell-list__name">{cell.instance?.name || 'Empty Cell'}</span>
                        {cell.instance && <span className="cell-list__dataset">{cell.instance.dataset}</span>}
                    </div>
                    <span className="cell-list__size">{cell.rowSpan}�{cell.colSpan}</span>
                    <button className="cell-list__more">
                        <MoreHorizontal size={12} />
                    </button>
                </div>
            ))}
        </div>
    );
}

// =============================================================================
// VIEW MODE BUTTONS
// =============================================================================

function ViewModeButtons({ viewMode, onModeChange }) {
    return (
        <div className="view-mode-section">
            <div className="view-mode-section__buttons">
                {VIEW_MODES.map(mode => {
                    const Icon = mode.icon;
                    return (
                        <button
                            key={mode.id}
                            className={`view-mode-btn ${viewMode === mode.id ? 'view-mode-btn--active' : ''}`}
                            data-color={mode.color}
                            onClick={() => onModeChange(mode.id)}
                        >
                            <Icon size={16} />
                            <span>{mode.label}</span>
                        </button>
                    );
                })}
            </div>
            <div className="view-mode-section__description">
                {VIEW_MODES.find(m => m.id === viewMode)?.description}
            </div>
        </div>
    );
}

// =============================================================================
// MEMBER ITEM
// =============================================================================

function MemberItem({ member, cursorVisible, onToggleCursor }) {
    return (
        <div
            className={`member-item ${member.isMe ? 'member-item--me' : ''}`}
            style={{ '--member-color': `var(--color-accent-${member.color})` }}
        >
            <span className={`member-item__status ${member.status === 'active' ? 'member-item__status--active' : ''}`} />
            <div className="member-item__info">
                <span className="member-item__name">
                    {member.name}
                    {member.isMe && <span className="member-item__you-badge">YOU</span>}
                </span>
                <span className="member-item__activity">
                    {member.status === 'active' ? (
                        <><Zap size={8} /> Active</>
                    ) : (
                        <><Moon size={8} /> Idle</>
                    )}
                </span>
            </div>
            {!member.isMe && (
                <>
                    <button
                        className={`member-item__btn ${cursorVisible ? 'member-item__btn--active' : ''}`}
                        onClick={() => onToggleCursor(member.id)}
                        title="Toggle cursor visibility"
                    >
                        {cursorVisible ? <Eye size={10} /> : <EyeOff size={10} />}
                    </button>
                    <button className="member-item__btn" title="Follow">
                        <Radio size={10} />
                    </button>
                </>
            )}
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function LayoutPanelContent({ workspaceId }) {
    // State
    const [viewMode, setViewMode] = useState('normal');
    const [selectedCell, setSelectedCell] = useState('c1');
    const [memberCursors, setMemberCursors] = useState(
        Object.fromEntries(WORKSPACE_MEMBERS.map(m => [m.id, m.cursorVisible]))
    );

    // Section states
    const { states: sectionStates, toggleSection } = useSectionStates({
        modes: { expanded: true, flexGrow: 0 },
        grid: { expanded: true, flexGrow: 2 },
        presets: { expanded: false, flexGrow: 0 },
        members: { expanded: true, flexGrow: 1 },
    });

    // Toggle member cursor
    const toggleMemberCursor = useCallback((memberId) => {
        setMemberCursors(prev => ({ ...prev, [memberId]: !prev[memberId] }));
    }, []);

    const WorkspaceIcon = getWorkspaceIcon(CURRENT_WORKSPACE.type);
    const activeMembers = WORKSPACE_MEMBERS.filter(m => m.status === 'active').length;
    const filledCells = GRID_CELLS.filter(c => c.instance).length;

    return (
        <div className="layout-tab">
            {/* Header */}
            <div className="panel-header">
                <LayoutGrid size={14} className="panel-header__icon file-icon--amber" />
                <span className="panel-header__title">Layout</span>
            </div>

            {/* Workspace indicator */}
            <div className="layout-tab__workspace-indicator" style={{ '--workspace-color': `var(--color-accent-${CURRENT_WORKSPACE.color})` }}>
                <WorkspaceIcon size={14} />
                <span className="layout-tab__workspace-name">{CURRENT_WORKSPACE.name}</span>
                <span className="layout-tab__workspace-count">{filledCells} instances</span>
            </div>

            {/* Content */}
            <div className="layout-tab__content">
                {/* View Modes */}
                <div className="layout-tab__section">
                    <div
                        className="layout-tab__section-header"
                        onClick={() => toggleSection('modes')}
                    >
                        {sectionStates.modes?.expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                        <span>View Mode</span>
                    </div>
                    {sectionStates.modes?.expanded && (
                        <ViewModeButtons viewMode={viewMode} onModeChange={setViewMode} />
                    )}
                </div>

                {/* Grid Layout */}
                <div className="layout-tab__section">
                    <div
                        className="layout-tab__section-header"
                        onClick={() => toggleSection('grid')}
                    >
                        {sectionStates.grid?.expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                        <span>Grid Layout</span>
                        <span className="layout-tab__section-badge">3�3</span>
                    </div>
                    {sectionStates.grid?.expanded && (
                        <>
                            <MiniMap
                                cells={GRID_CELLS}
                                selectedCell={selectedCell}
                                onSelectCell={setSelectedCell}
                            />
                            <div className="layout-tab__grid-actions">
                                <button className="layout-tab__action-btn" data-color="green">
                                    <Plus size={10} /> Add Cell
                                </button>
                                <button className="layout-tab__action-btn" data-color="blue">
                                    <Move size={10} /> Resize
                                </button>
                            </div>
                            <CellList
                                cells={GRID_CELLS}
                                selectedCell={selectedCell}
                                onSelectCell={setSelectedCell}
                            />
                        </>
                    )}
                </div>

                {/* Quick Layouts */}
                <div className="layout-tab__section">
                    <div
                        className="layout-tab__section-header"
                        onClick={() => toggleSection('presets')}
                    >
                        {sectionStates.presets?.expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                        <span>Quick Layouts</span>
                    </div>
                    {sectionStates.presets?.expanded && (
                        <div className="layout-presets">
                            {LAYOUT_PRESETS.map(preset => {
                                const Icon = preset.icon;
                                return (
                                    <button key={preset.id} className="layout-preset-btn">
                                        <Icon size={12} />
                                        {preset.name}
                                    </button>
                                );
                            })}
                            <button className="layout-preset-btn layout-preset-btn--save">
                                <Save size={12} />
                                Save Current
                            </button>
                        </div>
                    )}
                </div>

                {/* Workspace Members */}
                <div className="layout-tab__section">
                    <div
                        className="layout-tab__section-header"
                        onClick={() => toggleSection('members')}
                    >
                        {sectionStates.members?.expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                        <span>Workspace Members</span>
                        <span className="layout-tab__section-badge">{activeMembers} active</span>
                    </div>
                    {sectionStates.members?.expanded && (
                        <>
                            {WORKSPACE_MEMBERS.map(member => (
                                <MemberItem
                                    key={member.id}
                                    member={member}
                                    cursorVisible={memberCursors[member.id]}
                                    onToggleCursor={toggleMemberCursor}
                                />
                            ))}
                            <div className="members-actions">
                                <button className="members-action-btn" data-color="green">
                                    <Eye size={10} /> Show All
                                </button>
                                <button className="members-action-btn">
                                    <EyeOff size={10} /> Hide All
                                </button>
                            </div>
                            <button className="advanced-cursors-link">
                                <MousePointer2 size={10} />
                                Advanced cursor settings �
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="panel-footer">
                <button className="panel-footer__btn panel-footer__btn--primary">
                    <PenTool size={11} />
                    <span>Workspace Annotation</span>
                </button>
                <button className="panel-footer__btn panel-footer__btn--primary">
                    <Link2 size={11} />
                    <span>Link Views</span>
                </button>
            </div>
        </div>
    );
}

export default LayoutPanelContent;