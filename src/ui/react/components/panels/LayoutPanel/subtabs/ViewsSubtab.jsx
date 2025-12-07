/**
 * ViewsSubtab - Shows all active views from the canvas
 */
import React, { memo, useCallback, useState, useMemo } from 'react';
import { Search, X, Database, Filter, Plus, ChevronDown, ChevronRight, GripVertical, Eye, Trash2 } from 'lucide-react';
import { FilterChips } from '../components/FilterChips';
import './ViewsSubtab.scss';

// View colors for display
const VIEW_COLORS = ['#60a5fa', '#4ade80', '#f472b6', '#fbbf24', '#2dd4bf', '#a78bfa'];

export const ViewsSubtab = memo(function ViewsSubtab({ logic }) {
    const {
        cells = [],
        canvasSize,
        groupByDataset,
        setGroupByDataset,
        closeView,
        navigateToCell,
    } = logic;

    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilters, setActiveFilters] = useState([]);
    const [collapsedGroups, setCollapsedGroups] = useState(new Set());

    // Filter cells based on search
    const filteredCells = useMemo(() => {
        if (!searchQuery) return cells;
        const q = searchQuery.toLowerCase();
        return cells.filter(cell =>
            cell.name?.toLowerCase().includes(q) ||
            cell.datasetName?.toLowerCase().includes(q)
        );
    }, [cells, searchQuery]);

    // Group cells by dataset
    const groupedCells = useMemo(() => {
        if (!groupByDataset) {
            return [{ key: 'all', name: 'All Views', cells: filteredCells }];
        }

        const groups = new Map();
        filteredCells.forEach(cell => {
            const key = cell.datasetId || 'unknown';
            if (!groups.has(key)) {
                groups.set(key, { key, name: cell.datasetName || 'Unknown Dataset', cells: [] });
            }
            groups.get(key).cells.push(cell);
        });
        return Array.from(groups.values());
    }, [filteredCells, groupByDataset]);

    const toggleGroup = useCallback((key) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    }, []);

    const handleNavigate = useCallback((cell) => {
        navigateToCell?.(cell.row, cell.col);
    }, [navigateToCell]);

    const handleClose = useCallback((cellId) => {
        closeView?.(cellId);
    }, [closeView]);

    return (
        <div className="views-subtab">
            {/* Search */}
            <div className="views-subtab__search">
                <Search size={12} className="views-subtab__search-icon" />
                <input
                    className="views-subtab__search-input"
                    type="text"
                    placeholder="Search views..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                    <button className="views-subtab__search-clear" onClick={() => setSearchQuery('')}>
                        <X size={10} />
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="views-subtab__filters">
                <Filter size={10} className="views-subtab__filter-icon" />
                <FilterChips
                    activeFilters={activeFilters}
                    onToggle={(id) => setActiveFilters(prev =>
                        prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
                    )}
                />
                <button
                    className={`views-subtab__group-btn ${groupByDataset ? 'views-subtab__group-btn--active' : ''}`}
                    onClick={() => setGroupByDataset?.(!groupByDataset)}
                >
                    <Database size={10} /> Group
                </button>
                {activeFilters.length > 0 && (
                    <button className="views-subtab__clear-btn" onClick={() => setActiveFilters([])}>
                        Clear
                    </button>
                )}
            </div>

            {/* View count */}
            <div className="views-subtab__count">
                {filteredCells.length} of {cells.length} view{cells.length !== 1 ? 's' : ''}
            </div>

            {/* View list */}
            <div className="views-subtab__list">
                {groupedCells.map(group => (
                    <div key={group.key} className="views-subtab__group">
                        {groupByDataset && (
                            <div
                                className="views-subtab__group-header"
                                onClick={() => toggleGroup(group.key)}
                            >
                                <button className="views-subtab__group-toggle">
                                    {collapsedGroups.has(group.key) ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                                </button>
                                <Database size={10} className="views-subtab__group-icon" />
                                <span className="views-subtab__group-name">{group.name}</span>
                                <span className="views-subtab__group-count">({group.cells.length})</span>
                            </div>
                        )}

                        {!collapsedGroups.has(group.key) && (
                            <div className="views-subtab__group-items">
                                {group.cells.map((cell, idx) => (
                                    <div
                                        key={cell.id}
                                        className="views-subtab__item"
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData('application/json', JSON.stringify({
                                                type: 'view-item',
                                                viewId: cell.id,
                                                placementId: cell.id,
                                            }));
                                        }}
                                    >
                                        <GripVertical size={10} className="views-subtab__item-drag" />
                                        <div
                                            className="views-subtab__item-dot"
                                            style={{ background: VIEW_COLORS[idx % VIEW_COLORS.length] }}
                                        />
                                        <span className="views-subtab__item-name">
                                            {cell.name || `View ${cell.row},${cell.col}`}
                                        </span>
                                        <span className="views-subtab__item-pos">{cell.row},{cell.col}</span>
                                        <button
                                            className="views-subtab__item-action"
                                            onClick={() => handleNavigate(cell)}
                                            title="Go to view"
                                        >
                                            <Eye size={10} />
                                        </button>
                                        <button
                                            className="views-subtab__item-action views-subtab__item-action--danger"
                                            onClick={() => handleClose(cell.id)}
                                            title="Close view"
                                        >
                                            <Trash2 size={10} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                {cells.length === 0 && (
                    <div className="views-subtab__empty">
                        <p>No views on canvas</p>
                        <p className="views-subtab__empty-hint">
                            Drag a dataset to the canvas to create a view
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
});

export default ViewsSubtab;