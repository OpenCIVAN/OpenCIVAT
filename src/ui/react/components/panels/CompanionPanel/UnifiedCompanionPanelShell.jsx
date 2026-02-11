/**
 * @file UnifiedCompanionPanelShell.jsx
 * @description PanelShell wrapper for the UnifiedCompanionPanel
 */

import React, { memo, useMemo, useState, useEffect, useCallback } from 'react';
import { PanelShell, CHROME_LEVELS } from '@UI/react/components/panels/PanelShell';
import { useAdaptive } from '@UI/react/context/AdaptiveContext';
import { useDatasets } from '@UI/react/hooks/useDatasets';
import { useViewGroups } from '@UI/react/hooks/useViewGroups';
import { useViewsTab } from '@UI/react/components/panels/LeftPanel/tabs/ViewsTab/hooks/useViewsTab';
import { getVGDisplayName } from '@UI/react/components/panels/CanvasMapPanel/utils/gridUtils';
import { viewGroupManager } from '@Core/data/managers/ViewGroupManager';
import { FormModal, FormField } from '@UI/react/components/modals/FormModal';
import { toast } from '@UI/react/store/toastStore';
import {
  BUILTIN_TEMPLATES,
  loadCustomTemplates,
  loadServerTemplates,
  TEMPLATES_UPDATED_EVENT,
  updateServerTemplate,
  deleteServerTemplate,
} from '@Core/viewgroups/templates';
import { UnifiedCompanionPanel, useCompanionMode } from './UnifiedCompanionPanel';

export const COMPANION_PANEL_ID = 'companion';

export const UnifiedCompanionPanelShell = memo(function UnifiedCompanionPanelShell({
  workspaceId,
  projectId,
}) {
  const { tokens } = useAdaptive();
  const mode = useCompanionMode();
  const datasets = useDatasets();
  const { allViews = [] } = useViewsTab({ workspaceId });
  const { visibleViewGroups } = useViewGroups(workspaceId);
  const [customTemplates, setCustomTemplates] = useState(() => loadCustomTemplates());
  const [serverTemplates, setServerTemplates] = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);

  const refreshTemplates = useCallback(async () => {
    setCustomTemplates(loadCustomTemplates());
    if (projectId || workspaceId) {
      const fetched = await loadServerTemplates({ projectId, workspaceId, scope: 'all' });
      setServerTemplates(fetched || []);
    } else {
      setServerTemplates([]);
    }
  }, [projectId, workspaceId]);

  useEffect(() => {
    refreshTemplates();
  }, [refreshTemplates]);

  useEffect(() => {
    const handleTemplatesUpdate = () => {
      refreshTemplates();
    };

    window.addEventListener(TEMPLATES_UPDATED_EVENT, handleTemplatesUpdate);
    window.addEventListener('storage', handleTemplatesUpdate);
    return () => {
      window.removeEventListener(TEMPLATES_UPDATED_EVENT, handleTemplatesUpdate);
      window.removeEventListener('storage', handleTemplatesUpdate);
    };
  }, [refreshTemplates]);

  const viewIndex = useMemo(() => {
    return new Map((allViews || []).map((view) => [view.id, view]));
  }, [allViews]);

  const viewGroups = useMemo(() => {
    return (visibleViewGroups || []).map((vg) => {
      const slots = vg.getViews?.() || vg.slots || vg.views || [];
      const normalizedViews = slots
        .filter((slot) => slot && (slot.viewId || slot.id))
        .map((slot) => {
          const viewId = slot.viewId || slot.id;
          const source = viewIndex.get(viewId);
          return {
            id: viewId,
            name: slot.viewName || slot.name || source?.name,
            type: slot.viewType || slot.type || source?.type,
            datasetId: slot.datasetId || source?.datasetId,
            datasetName: slot.datasetName || source?.datasetName,
          };
        });

      return {
        id: vg.id,
        name: vg.name || getVGDisplayName(vg),
        color: vg.color || '#a855f7',
        layoutId: vg.layout?.type || vg.layoutId || 'single',
        views: normalizedViews,
        scope: vg.scope || 'project',
        createdBy: vg.createdBy,
        lastUsed: vg.lastUsed,
      };
    });
  }, [visibleViewGroups, viewIndex]);

  const views = useMemo(() => {
    if (!allViews?.length) return [];
    return allViews.map((view) => ({
      id: view.id,
      name: view.name,
      type: view.type,
      datasetId: view.datasetId,
      datasetName: view.datasetName,
      vgId: view.vgId,
      vgName: view.vgName,
      vgColor: view.vgColor,
      useCount: view.useCount,
    }));
  }, [allViews]);

  const datasetsWithViews = useMemo(() => {
    const byDatasetId = new Map();
    views.forEach((view) => {
      if (!view.datasetId) return;
      const bucket = byDatasetId.get(view.datasetId) || [];
      bucket.push(view);
      byDatasetId.set(view.datasetId, bucket);
    });

    return (datasets || []).map((dataset) => ({
      id: dataset.id,
      name: dataset.name,
      type: (dataset.fileType || 'default').toLowerCase(),
      size: dataset.size,
      views: byDatasetId.get(dataset.id) || [],
      viewCount: byDatasetId.get(dataset.id)?.length || 0,
    }));
  }, [datasets, views]);

  const templates = useMemo(() => {
    const combined = [
      ...BUILTIN_TEMPLATES.map((template) => ({ ...template, isBuiltin: true })),
      ...serverTemplates,
      ...customTemplates,
    ];
    const seen = new Set();
    return combined.filter((template) => {
      if (seen.has(template.id)) return false;
      seen.add(template.id);
      return true;
    });
  }, [customTemplates, serverTemplates]);

  const handleTemplateEdit = useCallback((template) => {
    if (!template?.id || template.isBuiltin) return;
    setEditingTemplate(template);
    setEditName(template.name || '');
    setEditDescription(template.description || '');
    setIsEditingTemplate(false);
  }, []);

  const handleTemplateDelete = useCallback(async (template) => {
    if (!template?.id || template.isBuiltin) return;
    const confirmDelete = window.confirm(`Delete template "${template.name}"?`);
    if (!confirmDelete) return;
    const ok = await deleteServerTemplate({
      projectId,
      workspaceId,
      templateId: template.id,
    });
    if (!ok) return;
    refreshTemplates();
    toast.success(`Deleted template "${template.name}"`);
  }, [projectId, refreshTemplates, workspaceId]);

  const handleCloseEdit = useCallback(() => {
    setEditingTemplate(null);
    setEditName('');
    setEditDescription('');
    setIsEditingTemplate(false);
  }, []);

  const handleSubmitEdit = useCallback(async () => {
    if (!editingTemplate?.id) return;
    const trimmedName = editName.trim();
    if (!trimmedName) return;
    setIsEditingTemplate(true);
    try {
      const saved = await updateServerTemplate({
        projectId,
        workspaceId,
        templateId: editingTemplate.id,
        updates: {
          name: trimmedName,
          description: editDescription.trim(),
        },
      });
      if (saved) {
        toast.success(`Updated template "${saved.name}"`);
        refreshTemplates();
        setEditingTemplate(null);
        setEditName('');
        setEditDescription('');
        setIsEditingTemplate(false);
      } else {
        toast.error('Failed to update template');
        setIsEditingTemplate(false);
      }
    } catch (err) {
      toast.error('Failed to update template');
      setIsEditingTemplate(false);
    }
  }, [editDescription, editName, editingTemplate, projectId, refreshTemplates, workspaceId]);

  const panelTitle =
    mode === 'canvas-map' ? 'Add VGs' : mode === 'vg-editor' ? 'Add Views' : 'Browse';
  const panelColor =
    mode === 'canvas-map'
      ? tokens?.colors?.accent?.teal || '#14b8a6'
      : tokens?.colors?.accent?.cyan || '#22d3ee';

  const handleViewGroupClick = useCallback((viewGroup) => {
    if (!viewGroup?.id) return;
    if (mode === 'canvas-map') {
      window.dispatchEvent(new CustomEvent('cia:goto-viewgroup', {
        detail: { viewGroupId: viewGroup.id },
      }));
      return;
    }
    if (mode === 'vg-editor') {
      const vg = viewGroupManager.getViewGroup(viewGroup.id) || viewGroup;
      window.dispatchEvent(new CustomEvent('cia:open-vg-editor', {
        detail: { viewGroup: vg, isNewVG: false },
      }));
    }
  }, [mode]);

  const handleViewClick = useCallback((view) => {
    if (view?.vgId) {
      window.dispatchEvent(new CustomEvent('cia:goto-viewgroup', {
        detail: { viewGroupId: view.vgId },
      }));
    }
  }, []);

  const handleTemplateClick = useCallback((template) => {
    if (!template?.id) return;
    window.dispatchEvent(new CustomEvent('cia:create-vg-from-template', {
      detail: {
        templateId: template.id,
        templateName: template.name,
        layoutId: template.layoutId,
        color: template.color,
        openEditor: mode === 'vg-editor' || mode === 'canvas-map',
      },
    }));
  }, [mode]);

  return (
    <PanelShell
      panelId={COMPANION_PANEL_ID}
      title={panelTitle}
      icon="package"
      chrome={CHROME_LEVELS.COMPACT}
      color={panelColor}
      defaultWidth={280}
      defaultHeight={520}
      minWidth={240}
      minHeight={400}
    >
      {({ sizeMode }) => (
        <>
          <UnifiedCompanionPanel
            isOpen
            views={views}
            datasets={datasetsWithViews}
            viewGroups={viewGroups}
            templates={templates}
            onViewClick={handleViewClick}
            onViewGroupClick={handleViewGroupClick}
            onTemplateClick={handleTemplateClick}
            onTemplateEdit={handleTemplateEdit}
            onTemplateDelete={handleTemplateDelete}
            sizeMode={sizeMode}
            side="right"
          />
          <FormModal
            isOpen={!!editingTemplate}
            onClose={handleCloseEdit}
            title="Edit Template"
            icon="pencil"
            submitLabel="Save Changes"
            onSubmit={handleSubmitEdit}
            isSubmitting={isEditingTemplate}
            submitDisabled={!editName.trim()}
          >
            <FormField
              name="template-name"
              label="Template Name"
              required
              autoFocus
              maxLength={255}
              value={editName}
              onChange={setEditName}
            />
            <FormField
              name="template-description"
              label="Description"
              type="textarea"
              maxLength={500}
              value={editDescription}
              onChange={setEditDescription}
            />
          </FormModal>
        </>
      )}
    </PanelShell>
  );
});

export default UnifiedCompanionPanelShell;
