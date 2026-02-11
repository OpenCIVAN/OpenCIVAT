/**
 * @file UnifiedCompanionPanel.jsx
 * @description Context-aware companion panel that adapts tabs based on active editor mode
 *
 * Mode Detection:
 * - VG Editor mode: When any VG editor panel is open
 * - Canvas Map mode: When canvas map panel is active (and no VG editors)
 * - Idle mode: No active editors
 *
 * Tab Configurations:
 * - VG Editor: Datasets, Views, VGs (with expand/collapse for views)
 * - Canvas Map: VGs, Templates (flat list, placement badges)
 * - Idle: Datasets, Views
 */

import React, { memo, useState, useEffect, useMemo, useCallback } from 'react';
import { useVGEditor } from '@UI/react/context/VGEditorContext';
import { useCanvasMap } from '@UI/react/context/CanvasMapContext';
import { CompanionPanel } from './CompanionPanel';

// =============================================================================
// TAB CONFIGURATIONS
// =============================================================================

/**
 * Tab configurations for each mode
 */
const TAB_CONFIGS = {
  'vg-editor': ['datasets', 'views', 'viewGroups'],
  'canvas-map': ['viewGroups', 'templates'],
  idle: ['datasets', 'views'],
};

/**
 * Default first tab for each mode
 */
const DEFAULT_TABS = {
  'vg-editor': 'datasets',
  'canvas-map': 'viewGroups',
  idle: 'datasets',
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * UnifiedCompanionPanel - Context-aware companion panel
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether panel is open
 * @param {Array} props.views - All views data
 * @param {Array} props.datasets - All datasets data (with nested views)
 * @param {Array} [props.viewGroups] - ViewGroup templates
 * @param {Array} [props.templates] - VG templates for canvas map mode
 * @param {Function} props.onViewClick - View click handler
 * @param {Function} props.onDatasetClick - Dataset click handler
 * @param {Function} [props.onViewGroupClick] - ViewGroup click handler
 * @param {Function} [props.onTemplateClick] - Template click handler
 * @param {Function} [props.onViewDragStart] - View drag start handler
 * @param {Function} [props.onViewDragEnd] - View drag end handler
 * @param {Function} [props.onDatasetDragStart] - Dataset drag start handler
 * @param {Function} [props.onDatasetDragEnd] - Dataset drag end handler
 * @param {Function} [props.onVGDragStart] - ViewGroup drag start handler
 * @param {Function} [props.onVGDragEnd] - ViewGroup drag end handler
 * @param {Function} [props.onTemplateEdit] - Template edit handler
 * @param {Function} [props.onTemplateDelete] - Template delete handler
 * @param {Function} [props.onTemplateDragStart] - Template drag start handler
 * @param {Function} [props.onTemplateDragEnd] - Template drag end handler
 * @param {string} [props.sizeMode='standard'] - Size mode for compact rendering
 * @param {'left' | 'right'} [props.side='right'] - Which side the panel appears on
 * @param {Function} [props.onClose] - Close button handler
 * @param {Object} [props.viewTypes] - Custom view type definitions
 */
export const UnifiedCompanionPanel = memo(function UnifiedCompanionPanel({
  isOpen,
  views = [],
  datasets = [],
  viewGroups = [],
  templates = [],
  onViewClick,
  onDatasetClick,
  onViewGroupClick,
  onTemplateClick,
  onTemplateEdit,
  onTemplateDelete,
  onViewDragStart,
  onViewDragEnd,
  onDatasetDragStart,
  onDatasetDragEnd,
  onVGDragStart,
  onVGDragEnd,
  onTemplateDragStart,
  onTemplateDragEnd,
  sizeMode = 'standard',
  side = 'right',
  onClose,
  viewTypes,
}) {
  // Context hooks
  const vgEditorContext = useVGEditor();
  const canvasMapContext = useCanvasMap();

  // Local state
  const [activeTab, setActiveTab] = useState('datasets');

  // Determine current mode
  const mode = useMemo(() => {
    const editorCount = vgEditorContext?.editorCount || 0;
    const canvasMapActive = canvasMapContext?.isActive || false;

    // Priority: VG Editor > Canvas Map > Idle
    if (editorCount > 0) return 'vg-editor';
    if (canvasMapActive) return 'canvas-map';
    return 'idle';
  }, [vgEditorContext?.editorCount, canvasMapContext?.isActive]);

  const setGlobalDragPayload = useCallback((payload) => {
    if (typeof window !== 'undefined') {
      window.__ciaDragPayload = payload;
    }
  }, []);

  const clearGlobalDragPayload = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.__ciaDragPayload = null;
    }
  }, []);

  // Get enabled tabs for current mode
  const enabledTabs = TAB_CONFIGS[mode];

  // Reset to valid tab when mode changes
  useEffect(() => {
    if (!enabledTabs.includes(activeTab)) {
      setActiveTab(DEFAULT_TABS[mode]);
    }
  }, [mode, enabledTabs, activeTab]);

  // Generate title based on mode and active editor
  const { title, subtitle } = useMemo(() => {
    if (mode === 'vg-editor') {
      const activeEditor = vgEditorContext?.activeEditor;
      return {
        title: 'Add Views',
        subtitle: activeEditor
          ? `to ${activeEditor.vgName}`
          : undefined,
      };
    }
    if (mode === 'canvas-map') {
      return {
        title: 'Add VGs',
        subtitle: 'Drag to canvas',
      };
    }
    return {
      title: 'Browse',
      subtitle: undefined,
    };
  }, [mode, vgEditorContext?.activeEditor]);

  // Compute usage labels based on mode
  const viewUsageLabel = mode === 'vg-editor' ? 'In VG' : 'On Canvas';
  const vgUsageLabel = mode === 'canvas-map' ? 'On Canvas' : 'In Use';

  // Enhance VGs with editing status for VG Editor mode
  const enhancedViewGroups = useMemo(() => {
    if (mode !== 'vg-editor' || !vgEditorContext) return viewGroups;

    const activeVgId = vgEditorContext.activeEditor?.vgId || null;

    return viewGroups.map((vg) => {
      // Check if this VG is being edited
      let isBeingEdited = false;
      for (const editor of vgEditorContext.openEditors.values()) {
        if (editor.vgId === vg.id) {
          isBeingEdited = true;
          break;
        }
      }
      return {
        ...vg,
        isBeingEdited,
        isActiveEditor: activeVgId === vg.id,
      };
    });
  }, [mode, viewGroups, vgEditorContext]);

  // Enhance VGs with canvas placement for Canvas Map mode
  const canvasEnhancedViewGroups = useMemo(() => {
    if (mode !== 'canvas-map' || !canvasMapContext) return enhancedViewGroups;

    const placedIds = new Set(canvasMapContext.placedVGIds);
    return enhancedViewGroups.map((vg) => ({
      ...vg,
      isOnCanvas: placedIds.has(vg.id),
      placedCount: canvasMapContext.placedVGIds.filter((id) => id === vg.id).length,
    }));
  }, [mode, enhancedViewGroups, canvasMapContext]);

  // Wrap VG drag handlers to set appropriate drag data type
  const handleVGDragStart = useCallback(
    (e, vg) => {
      if (mode === 'vg-editor') {
        // VG import mode - drag to import all views
        const payload = {
          type: 'vg-import',
          vgId: vg.id,
          vgName: vg.name,
          views: vg.views || [],
        };
        e.dataTransfer.setData('application/json', JSON.stringify(payload));
        e.dataTransfer.setData('text/plain', JSON.stringify(payload));
      } else if (mode === 'canvas-map') {
        // VG place mode - drag to place on canvas
        const payload = {
          type: 'vg-place',
          vgId: vg.id,
          vgName: vg.name,
          vgColor: vg.color,
        };
        e.dataTransfer.setData('application/json', JSON.stringify(payload));
        e.dataTransfer.setData('text/plain', JSON.stringify(payload));
        setGlobalDragPayload(payload);
      }
      onVGDragStart?.(e, vg);
    },
    [mode, onVGDragStart, setGlobalDragPayload]
  );

  // Wrap template drag handlers
  const handleTemplateDragStart = useCallback(
    (e, template) => {
      const resolvedLayoutId = template.layoutId || template.layout?.id || template.layout?.type || 'single';
      const payload = {
        type: 'template-create',
        templateId: template.id,
        templateName: template.name,
        layoutId: resolvedLayoutId,
        color: template.color,
      };
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('application/json', JSON.stringify(payload));
      e.dataTransfer.setData('text/plain', JSON.stringify(payload));
      setGlobalDragPayload(payload);
      onTemplateDragStart?.(e, template);
    },
    [onTemplateDragStart, setGlobalDragPayload]
  );

  const handleVGDragEnd = useCallback(
    (...args) => {
      clearGlobalDragPayload();
      onVGDragEnd?.(...args);
    },
    [clearGlobalDragPayload, onVGDragEnd]
  );

  const handleTemplateDragEnd = useCallback(
    (...args) => {
      clearGlobalDragPayload();
      onTemplateDragEnd?.(...args);
    },
    [clearGlobalDragPayload, onTemplateDragEnd]
  );

  const handleDatasetDragStart = useCallback(
    (e, dataset) => {
      const payload = {
        type: 'dataset',
        datasetId: dataset.id,
        name: dataset.name,
        fileType: dataset.type,
      };
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('application/json', JSON.stringify(payload));
      e.dataTransfer.setData('text/plain', JSON.stringify(payload));
      onDatasetDragStart?.(e, dataset);
    },
    [onDatasetDragStart]
  );

  // Wrap view drag handlers to include provenance
  const handleViewDragStart = useCallback(
    (e, view, sourceVg) => {
      const dragData = {
        type: 'view',
        view: {
          id: view.id,
          name: view.name,
          type: view.type,
        },
        datasetId: view.datasetId,
        datasetName: view.datasetName,
      };

      // Add provenance if dragging from VGs tab
      if (sourceVg) {
        dragData.sourceVgId = sourceVg.id;
        dragData.sourceVgName = sourceVg.name;
      }

      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('application/json', JSON.stringify(dragData));
      e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
      onViewDragStart?.(e, view);
    },
    [onViewDragStart]
  );

  // Handle tab change
  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="unified-companion-panel" data-mode={mode} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <CompanionPanel
        isOpen={isOpen}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        views={views}
        datasets={datasets}
        viewGroups={canvasEnhancedViewGroups}
        templates={templates}
        onViewClick={onViewClick}
        onDatasetClick={onDatasetClick}
        onViewGroupClick={onViewGroupClick}
        onTemplateClick={onTemplateClick}
        onTemplateEdit={onTemplateEdit}
        onTemplateDelete={onTemplateDelete}
        onViewDragStart={handleViewDragStart}
        onViewDragEnd={onViewDragEnd}
        onDatasetDragStart={handleDatasetDragStart}
        onDatasetDragEnd={onDatasetDragEnd}
        onVGDragStart={handleVGDragStart}
        onVGDragEnd={handleVGDragEnd}
        onTemplateDragStart={handleTemplateDragStart}
        onTemplateDragEnd={handleTemplateDragEnd}
        sizeMode={sizeMode}
        side={side}
        onClose={onClose}
        title={title}
        subtitle={subtitle}
        viewUsageLabel={viewUsageLabel}
        vgUsageLabel={vgUsageLabel}
        viewTypes={viewTypes}
        enabledTabs={enabledTabs}
        companionMode={mode}
      />
    </div>
  );
});

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to get current companion panel mode
 * @returns {'vg-editor' | 'canvas-map' | 'idle'} Current mode
 */
export function useCompanionMode() {
  const vgEditorContext = useVGEditor();
  const canvasMapContext = useCanvasMap();

  return useMemo(() => {
    const editorCount = vgEditorContext?.editorCount || 0;
    const canvasMapActive = canvasMapContext?.isActive || false;

    if (editorCount > 0) return 'vg-editor';
    if (canvasMapActive) return 'canvas-map';
    return 'idle';
  }, [vgEditorContext?.editorCount, canvasMapContext?.isActive]);
}

export default UnifiedCompanionPanel;
