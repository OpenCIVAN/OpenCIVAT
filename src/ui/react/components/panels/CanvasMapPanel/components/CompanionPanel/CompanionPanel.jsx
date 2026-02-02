/**
 * @file CompanionPanel.jsx
 * @description Companion panel for Canvas Map - shows Views and Datasets tabs
 *
 * Provides:
 * - Views tab: List of all views across VGs
 * - Datasets tab: Loaded datasets for drag-drop
 */

import React, { memo, useState, useMemo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { FilterToolbar } from '@UI/react/components/organisms/FilterToolbar';
import { EmptyState } from '@UI/react/components/molecules/EmptyState';
import { useListFilter } from '@UI/react/hooks/useListFilter';
import { ViewListItem } from './ViewListItem';
import { DatasetItem } from './DatasetItem';
import './CompanionPanel.scss';

const VIEW_SORT_OPTIONS = [
  {
    value: 'name-asc',
    label: 'Name (A→Z)',
    icon: 'sort',
    comparator: (a, b) => (a.name || '').localeCompare(b.name || ''),
  },
  {
    value: 'name-desc',
    label: 'Name (Z→A)',
    icon: 'sort',
    comparator: (a, b) => (b.name || '').localeCompare(a.name || ''),
  },
  {
    value: 'group',
    label: 'ViewGroup',
    icon: 'layers',
    comparator: (a, b) => (a.vgName || '').localeCompare(b.vgName || ''),
  },
];

const DATASET_SORT_OPTIONS = [
  {
    value: 'name-asc',
    label: 'Name (A→Z)',
    icon: 'sort',
    comparator: (a, b) => (a.name || '').localeCompare(b.name || ''),
  },
  {
    value: 'name-desc',
    label: 'Name (Z→A)',
    icon: 'sort',
    comparator: (a, b) => (b.name || '').localeCompare(a.name || ''),
  },
  {
    value: 'type',
    label: 'Type',
    icon: 'database',
    comparator: (a, b) => (a.type || '').localeCompare(b.type || ''),
  },
];

/**
 * CompanionPanel - Views and Datasets side panel
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether panel is open
 * @param {string} props.activeTab - Active tab ('views' or 'datasets')
 * @param {Function} props.onTabChange - Tab change handler
 * @param {Array} props.views - All views data
 * @param {Array} props.datasets - All datasets data
 * @param {Function} props.onViewClick - View click handler
 * @param {Function} props.onDatasetClick - Dataset click handler
 * @param {Function} [props.onViewDragStart] - View drag start handler
 * @param {Function} [props.onDatasetDragStart] - Dataset drag start handler
 * @param {string} [props.sizeMode='standard'] - Size mode for compact rendering
 * @param {'left' | 'right'} [props.side='right'] - Which side the panel appears on
 * @param {Function} [props.onClose] - Close button handler
 */
export const CompanionPanel = memo(function CompanionPanel({
  isOpen,
  activeTab,
  onTabChange,
  views = [],
  datasets = [],
  onViewClick,
  onDatasetClick,
  onViewDragStart,
  onDatasetDragStart,
  sizeMode = 'standard',
  side = 'right',
  onClose,
}) {
  const isCompact = sizeMode === 'compact';
  const [expandedDatasets, setExpandedDatasets] = useState(new Set());

  const viewFilter = useListFilter({
    searchFields: (view) => [view.name || '', view.vgName || ''],
    sortOptions: VIEW_SORT_OPTIONS,
  });

  const datasetFilter = useListFilter({
    searchFields: (dataset) => [dataset.name || '', dataset.type || ''],
    sortOptions: DATASET_SORT_OPTIONS,
  });

  const datasetsWithTags = useMemo(
    () =>
      datasets.map((dataset) => ({
        ...dataset,
        tags: dataset.type ? [dataset.type] : [],
      })),
    [datasets]
  );

  const viewTags = useMemo(
    () => Array.from(new Set(views.flatMap((view) => view.tags || []))).filter(Boolean),
    [views]
  );

  const datasetTags = useMemo(
    () => Array.from(new Set(datasets.map((dataset) => dataset.type))).filter(Boolean),
    [datasets]
  );

  const filteredViews = useMemo(
    () => viewFilter.applyFilters(views),
    [viewFilter, views]
  );

  const filteredDatasets = useMemo(
    () => datasetFilter.applyFilters(datasetsWithTags),
    [datasetFilter, datasetsWithTags]
  );

  // Toggle dataset expansion
  const toggleDataset = (datasetId) => {
    setExpandedDatasets(prev => {
      const next = new Set(prev);
      if (next.has(datasetId)) {
        next.delete(datasetId);
      } else {
        next.add(datasetId);
      }
      return next;
    });
  };

  if (!isOpen) return null;

  const isLeftSide = side === 'left';

  return (
    <div
      className="companion-panel"
      data-size-mode={sizeMode}
      data-side={side}
    >
      {/* Header */}
      <div className="companion-panel__header">
        <div className="companion-panel__tabs">
          <button
            className={`companion-panel__tab companion-panel__tab--views ${activeTab === 'views' ? 'companion-panel__tab--active' : ''}`}
            onClick={() => onTabChange('views')}
            type="button"
          >
            <Icon name="eye" size={14} />
            {!isCompact && 'Views'}
          </button>
          <button
            className={`companion-panel__tab companion-panel__tab--datasets ${activeTab === 'datasets' ? 'companion-panel__tab--active' : ''}`}
            onClick={() => onTabChange('datasets')}
            type="button"
          >
            <Icon name="database" size={14} />
            {!isCompact && 'Data'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="companion-panel__content">
        <div className="companion-panel__search">
          <FilterToolbar
            filter={activeTab === 'views' ? viewFilter : datasetFilter}
            config={{
              quickFilterDefs: [],
              typeCategories: [],
              sortOptions: activeTab === 'views' ? VIEW_SORT_OPTIONS : DATASET_SORT_OPTIONS,
            }}
            tags={activeTab === 'views' ? viewTags : datasetTags}
            variant="embedded"
            showTypeFilter={false}
            showTagFilter={(activeTab === 'views' ? viewTags : datasetTags).length > 0}
            showSortFilter
            searchPlaceholder={activeTab === 'views' ? 'Search views...' : 'Search datasets...'}
          />
          <p className="companion-panel__hint">Drag to add to canvas</p>
        </div>
        {activeTab === 'views' && (
          <>
            {filteredViews.length > 0 ? (
              <div className="companion-panel__list">
                {filteredViews.map(view => (
                  <ViewListItem
                    key={view.id}
                    view={view}
                    vgName={view.vgName}
                    vgColor={view.vgColor}
                    onClick={onViewClick}
                    onDragStart={onViewDragStart}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={viewFilter.searchQuery ? 'search' : 'layers'}
                title={viewFilter.searchQuery ? 'No views match your search' : 'No views yet'}
                size="sm"
              />
            )}
          </>
        )}

        {activeTab === 'datasets' && (
          <>
            {filteredDatasets.length > 0 ? (
              <div className="companion-panel__list">
                {filteredDatasets.map(dataset => (
                  <DatasetItem
                    key={dataset.id}
                    dataset={dataset}
                    isExpanded={expandedDatasets.has(dataset.id)}
                    onToggle={toggleDataset}
                    onClick={onDatasetClick}
                    onDragStart={onDatasetDragStart}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={datasetFilter.searchQuery ? 'search' : 'database'}
                title={datasetFilter.searchQuery ? 'No datasets match your search' : 'No datasets loaded'}
                size="sm"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
});

export default CompanionPanel;
