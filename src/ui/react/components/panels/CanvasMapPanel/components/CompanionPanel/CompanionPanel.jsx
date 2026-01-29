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
import { SearchInput } from '@UI/react/components/molecules/SearchInput';
import { EmptyState } from '@UI/react/components/molecules/EmptyState';
import { ViewListItem } from './ViewListItem';
import { DatasetItem } from './DatasetItem';
import './CompanionPanel.scss';

/**
 * CompanionPanel - Views and Datasets side panel
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether panel is open
 * @param {string} props.activeTab - Active tab ('views' or 'datasets')
 * @param {Function} props.onTabChange - Tab change handler
 * @param {Function} props.onClose - Close handler
 * @param {Array} props.views - All views data
 * @param {Array} props.datasets - All datasets data
 * @param {Function} props.onViewClick - View click handler
 * @param {Function} props.onDatasetClick - Dataset click handler
 * @param {Function} [props.onViewDragStart] - View drag start handler
 * @param {Function} [props.onDatasetDragStart] - Dataset drag start handler
 */
export const CompanionPanel = memo(function CompanionPanel({
  isOpen,
  activeTab,
  onTabChange,
  onClose,
  views = [],
  datasets = [],
  onViewClick,
  onDatasetClick,
  onViewDragStart,
  onDatasetDragStart,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDatasets, setExpandedDatasets] = useState(new Set());

  // Filter views by search
  const filteredViews = useMemo(() => {
    if (!searchQuery) return views;
    const query = searchQuery.toLowerCase();
    return views.filter(v =>
      v.name.toLowerCase().includes(query) ||
      v.vgName?.toLowerCase().includes(query)
    );
  }, [views, searchQuery]);

  // Filter datasets by search
  const filteredDatasets = useMemo(() => {
    if (!searchQuery) return datasets;
    const query = searchQuery.toLowerCase();
    return datasets.filter(d => d.name.toLowerCase().includes(query));
  }, [datasets, searchQuery]);

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

  return (
    <div className="companion-panel">
      {/* Header */}
      <div className="companion-panel__header">
        <div className="companion-panel__tabs">
          <button
            className={`companion-panel__tab ${activeTab === 'views' ? 'companion-panel__tab--active' : ''}`}
            onClick={() => onTabChange('views')}
            type="button"
          >
            <Icon name="layers" size={14} />
            Views
            <span className="companion-panel__count">{views.length}</span>
          </button>
          <button
            className={`companion-panel__tab ${activeTab === 'datasets' ? 'companion-panel__tab--active' : ''}`}
            onClick={() => onTabChange('datasets')}
            type="button"
          >
            <Icon name="database" size={14} />
            Datasets
            <span className="companion-panel__count">{datasets.length}</span>
          </button>
        </div>

        <button
          className="companion-panel__close"
          onClick={onClose}
          title="Close panel"
          type="button"
        >
          <Icon name="x" size={14} />
        </button>
      </div>

      {/* Search */}
      <div className="companion-panel__search">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={activeTab === 'views' ? 'Search views...' : 'Search datasets...'}
          size="sm"
        />
      </div>

      {/* Content */}
      <div className="companion-panel__content">
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
                icon={searchQuery ? 'search' : 'layers'}
                title={searchQuery ? 'No views match your search' : 'No views yet'}
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
                icon={searchQuery ? 'search' : 'database'}
                title={searchQuery ? 'No datasets match your search' : 'No datasets loaded'}
                size="sm"
              />
            )}
          </>
        )}
      </div>

      {/* Footer hint */}
      <div className="companion-panel__footer">
        <Icon name="grip" size={12} />
        <span>Drag to add to canvas</span>
      </div>
    </div>
  );
});

export default CompanionPanel;
