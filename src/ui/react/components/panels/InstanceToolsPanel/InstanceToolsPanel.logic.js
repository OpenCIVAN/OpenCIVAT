/**
 * @file InstanceToolsPanel.logic.js
 * @description Business logic hook for Instance Tools Panel V2
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { workspaceManager } from '@Core/instances/workspaceManager.js';
import { getViewConfigurationManager, getDatasetManager } from '@Init/appInitializer.js';
import { canvasManager } from '@Core/data/managers/CanvasManager.js';
import { getCellColorHex } from '@UI/react/utils/canvasColors.js';
import { TOOL_SECTIONS, TRANSFORM_LIMITS } from './constants';

/**
 * useInstanceToolsPanel - Main logic hook for Instance Tools Panel V2
 */
export function useInstanceToolsPanel({ workspaceId } = {}) {
  // -------------------------------------------------------------------------
  // Tab State
  // -------------------------------------------------------------------------
  const [activeTab, setActiveTab] = useState('tools');
  const [activeSection, setActiveSection] = useState('camera');
  const [expandedSections, setExpandedSections] = useState({
    camera: true,
    transform: true,
    slice: true,
    windowLevel: true,
    appearance: true,
  });

  // -------------------------------------------------------------------------
  // Instance State
  // -------------------------------------------------------------------------
  const [activeInstance, setActiveInstance] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // -------------------------------------------------------------------------
  // Transform State
  // -------------------------------------------------------------------------
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
  const [scale, setScale] = useState({ x: 100, y: 100, z: 100 });
  const [uniformScale, setUniformScale] = useState(true);

  // -------------------------------------------------------------------------
  // Slice State
  // -------------------------------------------------------------------------
  const [sliceOrientation, setSliceOrientation] = useState('axial');
  const [slicePosition, setSlicePosition] = useState(127);
  const [sliceMax, setSliceMax] = useState(256);

  // -------------------------------------------------------------------------
  // Window/Level State
  // -------------------------------------------------------------------------
  const [windowValue, setWindowValue] = useState(400);
  const [levelValue, setLevelValue] = useState(40);
  const [activeWindowLevelPreset, setActiveWindowLevelPreset] = useState(null);

  // -------------------------------------------------------------------------
  // Appearance State
  // -------------------------------------------------------------------------
  const [opacity, setOpacity] = useState(100);
  const [representation, setRepresentation] = useState('surface');

  // -------------------------------------------------------------------------
  // Layers & Widgets State
  // -------------------------------------------------------------------------
  const [layers, setLayers] = useState([]);
  const [widgets, setWidgets] = useState([]);
  const [layersExpanded, setLayersExpanded] = useState(true);

  // -------------------------------------------------------------------------
  // Scroll Tracking for Dot Navigation
  // -------------------------------------------------------------------------
  const sectionRefs = useRef({});
  const containerRef = useRef(null);

  // -------------------------------------------------------------------------
  // Subscribe to Active Instance Changes
  // -------------------------------------------------------------------------
  useEffect(() => {
    const updateActiveInstance = () => {
      const instance = workspaceManager?.getActiveInstance?.();
      setActiveInstance(instance || null);
    };

    updateActiveInstance();

    const handleInstanceFocus = () => updateActiveInstance();
    const handleViewClosed = () => setTimeout(updateActiveInstance, 50);
    const handleNameChange = () => setRefreshKey(k => k + 1);

    window.addEventListener('cia:instance-focused', handleInstanceFocus);
    window.addEventListener('cia:active-instance-changed', handleInstanceFocus);
    window.addEventListener('cia:close-view', handleViewClosed);

    const viewManager = getViewConfigurationManager();
    if (viewManager?.on) {
      viewManager.on('viewTrashed', handleViewClosed);
      viewManager.on('viewDeleted', handleViewClosed);
      viewManager.on('viewDeactivated', handleViewClosed);
      viewManager.on('viewUpdated', handleNameChange);
      viewManager.on('viewRenamed', handleNameChange);
    }

    return () => {
      window.removeEventListener('cia:instance-focused', handleInstanceFocus);
      window.removeEventListener('cia:active-instance-changed', handleInstanceFocus);
      window.removeEventListener('cia:close-view', handleViewClosed);

      if (viewManager?.off) {
        viewManager.off('viewTrashed', handleViewClosed);
        viewManager.off('viewDeleted', handleViewClosed);
        viewManager.off('viewDeactivated', handleViewClosed);
        viewManager.off('viewUpdated', handleNameChange);
        viewManager.off('viewRenamed', handleNameChange);
      }
    };
  }, []);

  // -------------------------------------------------------------------------
  // Derived Instance Info
  // -------------------------------------------------------------------------
  const instanceInfo = useMemo(() => {
    if (!activeInstance) return null;

    const viewManager = getViewConfigurationManager();
    const datasetManager = getDatasetManager();
    const viewId = activeInstance.viewConfigId || activeInstance.viewId;
    const viewConfig = viewManager?.getView?.(viewId);
    const datasetId = viewConfig?.datasetId || activeInstance.instanceData?.dataset?.id;
    const dataset = datasetId ? datasetManager?.getDataset?.(datasetId) : null;

    let position = null;
    let colorHex = '#60a5fa';

    try {
      const activeCanvasId = canvasManager?.getActiveCanvasId?.();
      if (activeCanvasId) {
        const canvas = canvasManager?.getCanvas?.(activeCanvasId);
        if (canvas?.placements) {
          const placement = canvas.placements.find(
            p => p.content?.viewConfigurationId === viewId
          );
          if (placement) {
            position = { row: placement.row, col: placement.col };
            colorHex = getCellColorHex(placement.row, placement.col);
          }
        }
      }
    } catch (e) {
      // Fall back to default color
    }

    return {
      viewId,
      instanceId: activeInstance.instanceId,
      name: viewConfig?.name || activeInstance.name || `Instance`,
      dataset: dataset?.name || activeInstance.instanceData?.dataset?.name || 'No data loaded',
      type: activeInstance.type || viewConfig?.handlerType || 'vtk',
      color: colorHex,
      position,
    };
  }, [activeInstance, refreshKey]);

  // -------------------------------------------------------------------------
  // Section Navigation
  // -------------------------------------------------------------------------
  const toggleSection = useCallback((sectionId) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }, []);

  const navigateToSection = useCallback((sectionId) => {
    setActiveSection(sectionId);
    setExpandedSections(prev => ({ ...prev, [sectionId]: true }));
    sectionRefs.current[sectionId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Track scroll position for dot navigation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      let currentSection = TOOL_SECTIONS[0].id;

      TOOL_SECTIONS.forEach(section => {
        const ref = sectionRefs.current[section.id];
        if (ref && ref.offsetTop <= scrollTop + 50) {
          currentSection = section.id;
        }
      });

      setActiveSection(currentSection);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // -------------------------------------------------------------------------
  // Transform Handlers
  // -------------------------------------------------------------------------
  const handlePositionChange = useCallback((axis, value) => {
    setPosition(prev => ({ ...prev, [axis]: value }));
    // TODO: Apply to instance
  }, []);

  const handleRotationChange = useCallback((axis, value) => {
    setRotation(prev => ({ ...prev, [axis]: value }));
    // TODO: Apply to instance
  }, []);

  const handleScaleChange = useCallback((axis, value) => {
    if (uniformScale) {
      setScale({ x: value, y: value, z: value });
    } else {
      setScale(prev => ({ ...prev, [axis]: value }));
    }
    // TODO: Apply to instance
  }, [uniformScale]);

  const handleResetTransform = useCallback(() => {
    setPosition({ x: 0, y: 0, z: 0 });
    setRotation({ x: 0, y: 0, z: 0 });
    setScale({ x: 100, y: 100, z: 100 });
    // TODO: Apply to instance
  }, []);

  // -------------------------------------------------------------------------
  // Layers Handlers
  // -------------------------------------------------------------------------
  const handleLayerVisibilityToggle = useCallback((layerId) => {
    setLayers(prev => prev.map(layer =>
      layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
    ));
  }, []);

  const handleLayerOpacityChange = useCallback((layerId, opacity) => {
    setLayers(prev => prev.map(layer =>
      layer.id === layerId ? { ...layer, opacity } : layer
    ));
  }, []);

  const handleLayerReorder = useCallback((draggedId, targetId) => {
    setLayers(prev => {
      const newLayers = [...prev];
      const draggedIndex = newLayers.findIndex(l => l.id === draggedId);
      const targetIndex = newLayers.findIndex(l => l.id === targetId);
      const [draggedLayer] = newLayers.splice(draggedIndex, 1);
      newLayers.splice(targetIndex, 0, draggedLayer);
      return newLayers;
    });
  }, []);

  // -------------------------------------------------------------------------
  // Widgets Handlers
  // -------------------------------------------------------------------------
  const handleWidgetVisibilityToggle = useCallback((widgetId) => {
    setWidgets(prev => prev.map(widget =>
      widget.id === widgetId ? { ...widget, visible: !widget.visible } : widget
    ));
  }, []);

  const handleWidgetDelete = useCallback((widgetId) => {
    setWidgets(prev => prev.filter(widget => widget.id !== widgetId));
  }, []);

  // -------------------------------------------------------------------------
  // Return API
  // -------------------------------------------------------------------------
  return {
    // Instance
    activeInstance,
    instanceInfo,
    hasInstance: !!activeInstance,

    // Tab State
    activeTab,
    setActiveTab,

    // Section Navigation
    activeSection,
    setActiveSection,
    expandedSections,
    toggleSection,
    navigateToSection,
    sectionRefs,
    containerRef,

    // Transform
    position,
    rotation,
    scale,
    uniformScale,
    setUniformScale,
    handlePositionChange,
    handleRotationChange,
    handleScaleChange,
    handleResetTransform,

    // Slice
    sliceOrientation,
    setSliceOrientation,
    slicePosition,
    setSlicePosition,
    sliceMax,

    // Window/Level
    windowValue,
    setWindowValue,
    levelValue,
    setLevelValue,
    activeWindowLevelPreset,
    setActiveWindowLevelPreset,

    // Appearance
    opacity,
    setOpacity,
    representation,
    setRepresentation,

    // Layers & Widgets
    layers,
    widgets,
    layersExpanded,
    setLayersExpanded,
    handleLayerVisibilityToggle,
    handleLayerOpacityChange,
    handleLayerReorder,
    handleWidgetVisibilityToggle,
    handleWidgetDelete,
  };
}

export default useInstanceToolsPanel;
