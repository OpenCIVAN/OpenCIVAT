/**
 * @file InstanceToolsPanel.jsx
 * @description Instance Tools Panel V2 - Main container component
 *
 * Features:
 * - Adaptive ViewGroup strip (connectors ≤5 views, grid 6+)
 * - Dot-based section navigation with scroll tracking
 * - Full transform controls (position, rotation, scale)
 * - Draggable layer reordering
 * - Widget value hover/click interaction
 * - Layers & Widgets stationary at bottom
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useInstanceToolsPanel } from './InstanceToolsPanel.logic';
import { TOOL_SECTIONS, PANEL_TABS } from './constants';

// Components
import { ViewGroupStrip } from './components/ViewGroupStrip/ViewGroupStrip';
import { InstanceHeader } from './components/InstanceHeader/InstanceHeader';
import { DotNavigation } from './components/DotNavigation/DotNavigation';
import { CameraSection } from './components/ToolSections/CameraSection';
import { TransformSection } from './components/ToolSections/TransformSection';
import { SliceSection } from './components/ToolSections/SliceSection';
import { WindowLevelSection } from './components/ToolSections/WindowLevelSection';
import { AppearanceSection } from './components/ToolSections/AppearanceSection';
import { LayersAndWidgets } from './components/LayersAndWidgets/LayersAndWidgets';

import './InstanceToolsPanel.scss';

/**
 * SectionHeader - Collapsible section header
 */
const SectionHeader = memo(function SectionHeader({
  section,
  isExpanded,
  onToggle,
  sectionRef,
}) {
  return (
    <div
      ref={sectionRef}
      className={`section-header ${isExpanded ? 'section-header--expanded' : ''}`}
      data-color={section.color}
      onClick={onToggle}
    >
      <Icon
        name="chevronRight"
        size={10}
        className={`section-header__chevron ${isExpanded ? 'section-header__chevron--expanded' : ''}`}
      />
      <Icon name={section.icon} size={14} className="section-header__icon" />
      <span className="section-header__label">{section.label}</span>
    </div>
  );
});

/**
 * NoInstancePlaceholder - Shown when no instance is selected
 */
const NoInstancePlaceholder = memo(function NoInstancePlaceholder() {
  return (
    <div className="instance-tools-panel__no-instance">
      <Icon name="monitor" size={32} />
      <h3>No Instance Selected</h3>
      <p>Click on an instance viewport to select it and view its tools.</p>
      <span className="instance-tools-panel__hint">
        Tip: The mini toolbar appears on hover in each viewport
      </span>
    </div>
  );
});

/**
 * ToolsTabContent - Scrollable tools content with sections
 */
const ToolsTabContent = memo(function ToolsTabContent({
  logic,
}) {
  const {
    activeSection,
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
    handleWindowLevelPreset,
    // Appearance
    opacity,
    setOpacity,
    representation,
    setRepresentation,
    pointSize,
    setPointSize,
    lineWidth,
    setLineWidth,
    // Camera
    handleCameraPreset,
    cameraState,
    cameraTransformExpanded,
    handleToggleCameraTransform,
    handleCameraPositionChange,
    handleCameraFocalPointChange,
    handleCameraViewAngleChange,
    savedCameraStates,
    handleSaveCameraState,
    handleRestoreCameraState,
    handleDeleteCameraState,
  } = logic;

  return (
    <div className="tools-tab-content">
      {/* Dot Navigation */}
      <DotNavigation
        sections={TOOL_SECTIONS}
        activeSection={activeSection}
        onNavigate={navigateToSection}
      />

      {/* Scrollable Sections */}
      <div ref={containerRef} className="tools-tab-content__scroll">
        {/* Camera Section */}
        <div className="tools-tab-content__section">
          <SectionHeader
            section={TOOL_SECTIONS[0]}
            isExpanded={expandedSections.camera}
            onToggle={() => toggleSection('camera')}
            sectionRef={(el) => { sectionRefs.current.camera = el; }}
          />
          {expandedSections.camera && (
            <div className="tools-tab-content__section-content">
              <CameraSection
                onPresetClick={handleCameraPreset}
                cameraState={cameraState}
                cameraTransformExpanded={cameraTransformExpanded}
                onToggleCameraTransform={handleToggleCameraTransform}
                onCameraPositionChange={handleCameraPositionChange}
                onCameraFocalPointChange={handleCameraFocalPointChange}
                onCameraViewAngleChange={handleCameraViewAngleChange}
                savedCameraStates={savedCameraStates}
                onSaveCameraState={handleSaveCameraState}
                onRestoreCameraState={handleRestoreCameraState}
                onDeleteCameraState={handleDeleteCameraState}
              />
            </div>
          )}
        </div>

        {/* Transform Section */}
        <div className="tools-tab-content__section">
          <SectionHeader
            section={TOOL_SECTIONS[1]}
            isExpanded={expandedSections.transform}
            onToggle={() => toggleSection('transform')}
            sectionRef={(el) => { sectionRefs.current.transform = el; }}
          />
          {expandedSections.transform && (
            <div className="tools-tab-content__section-content">
              <TransformSection
                position={position}
                rotation={rotation}
                scale={scale}
                uniformScale={uniformScale}
                onPositionChange={handlePositionChange}
                onRotationChange={handleRotationChange}
                onScaleChange={handleScaleChange}
                onUniformScaleToggle={() => setUniformScale(!uniformScale)}
                onReset={handleResetTransform}
              />
            </div>
          )}
        </div>

        {/* Slice Section */}
        <div className="tools-tab-content__section">
          <SectionHeader
            section={TOOL_SECTIONS[2]}
            isExpanded={expandedSections.slice}
            onToggle={() => toggleSection('slice')}
            sectionRef={(el) => { sectionRefs.current.slice = el; }}
          />
          {expandedSections.slice && (
            <div className="tools-tab-content__section-content">
              <SliceSection
                orientation={sliceOrientation}
                position={slicePosition}
                maxPosition={sliceMax}
                onOrientationChange={setSliceOrientation}
                onPositionChange={setSlicePosition}
              />
            </div>
          )}
        </div>

        {/* Window/Level Section */}
        <div className="tools-tab-content__section">
          <SectionHeader
            section={TOOL_SECTIONS[3]}
            isExpanded={expandedSections.windowLevel}
            onToggle={() => toggleSection('windowLevel')}
            sectionRef={(el) => { sectionRefs.current.windowLevel = el; }}
          />
          {expandedSections.windowLevel && (
            <div className="tools-tab-content__section-content">
              <WindowLevelSection
                windowValue={windowValue}
                levelValue={levelValue}
                activePreset={activeWindowLevelPreset}
                onWindowChange={setWindowValue}
                onLevelChange={setLevelValue}
                onPresetSelect={handleWindowLevelPreset}
              />
            </div>
          )}
        </div>

        {/* Appearance Section */}
        <div className="tools-tab-content__section">
          <SectionHeader
            section={TOOL_SECTIONS[4]}
            isExpanded={expandedSections.appearance}
            onToggle={() => toggleSection('appearance')}
            sectionRef={(el) => { sectionRefs.current.appearance = el; }}
          />
          {expandedSections.appearance && (
            <div className="tools-tab-content__section-content">
              <AppearanceSection
                opacity={opacity}
                representation={representation}
                pointSize={pointSize}
                lineWidth={lineWidth}
                onOpacityChange={setOpacity}
                onRepresentationChange={setRepresentation}
                onPointSizeChange={setPointSize}
                onLineWidthChange={setLineWidth}
              />
            </div>
          )}
        </div>

        {/* Bottom Spacer */}
        <div className="tools-tab-content__spacer" />
      </div>
    </div>
  );
});

/**
 * AnnotationsTabContent - Placeholder for annotations
 */
const AnnotationsTabContent = memo(function AnnotationsTabContent() {
  return (
    <div className="annotations-tab-content">
      <Icon name="mapPin" size={24} />
      <div className="annotations-tab-content__title">Instance Annotations</div>
      <div className="annotations-tab-content__hint">Coming soon</div>
    </div>
  );
});

/**
 * InstanceToolsPanel - Main V2 panel component
 */
export const InstanceToolsPanel = memo(function InstanceToolsPanel({
  workspaceId,
  viewGroup, // Optional: pass viewGroup for strip display
}) {
  const logic = useInstanceToolsPanel({ workspaceId });

  const {
    hasInstance,
    instanceInfo,
    activeTab,
    setActiveTab,
    layers,
    widgets,
    layersExpanded,
    setLayersExpanded,
    handleLayerVisibilityToggle,
    handleLayerOpacityChange,
    handleLayerReorder,
    handleWidgetVisibilityToggle,
    handleWidgetOpacityChange,
    handleWidgetDelete,
  } = logic;

  return (
    <div className="instance-tools-panel">
      {/* Panel Header */}
      <div className="panel-header panel-header--amber">
        <Icon name="wrench" size={14} className="panel-header__icon" />
        <span className="panel-header__title">Instance Tools</span>
        {hasInstance && (
          <span className="panel-header__count">1 active</span>
        )}
      </div>

      {!hasInstance ? (
        <NoInstancePlaceholder />
      ) : (
        <>
          {/* ViewGroup Strip (if provided) */}
          {viewGroup && (
            <ViewGroupStrip
              viewGroup={viewGroup}
              onViewSelect={(id) => console.log('View selected:', id)}
            />
          )}

          {/* Instance Header */}
          <InstanceHeader instanceInfo={instanceInfo} />

          {/* Tab Bar */}
          <div className="instance-tools-panel__tabs">
            {PANEL_TABS.map(tab => (
              <button
                key={tab.id}
                className={`instance-tools-panel__tab ${activeTab === tab.id ? 'instance-tools-panel__tab--active' : ''}`}
                data-color={tab.color}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon name={tab.icon} size={12} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content (scrollable middle) */}
          <div className="instance-tools-panel__content">
            {activeTab === 'tools' && <ToolsTabContent logic={logic} />}
            {activeTab === 'annotations' && <AnnotationsTabContent />}
          </div>

          {/* Layers & Widgets (stationary bottom) */}
          <LayersAndWidgets
            layers={layers}
            widgets={widgets}
            expanded={layersExpanded}
            onToggleExpanded={() => setLayersExpanded(!layersExpanded)}
            onLayerVisibilityToggle={handleLayerVisibilityToggle}
            onLayerOpacityChange={handleLayerOpacityChange}
            onLayerReorder={handleLayerReorder}
            onWidgetVisibilityToggle={handleWidgetVisibilityToggle}
            onWidgetOpacityChange={handleWidgetOpacityChange}
            onWidgetDelete={handleWidgetDelete}
          />
        </>
      )}
    </div>
  );
});

export default InstanceToolsPanel;
