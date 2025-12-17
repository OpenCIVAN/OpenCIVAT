// src/ui/react/components/panels/LeftPanel/tabs/InstanceToolsTab/InstanceToolsTab.jsx
// Instance Tools tab content for the unified left panel
//
// FIXED: Added standard panel-header to match Files and Datasets tabs
//
// Features:
// - Shows tools for the currently focused instance
// - 3 subtabs: Tools, Layers, Annotations
// - Dynamic tool list from instance handler
// - Layer visibility toggles
// - Instance-scoped annotation list

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
    Wrench,
    Monitor,
    Zap,
    Layers,
    MapPin,
    Settings,
} from 'lucide-react';

// Import subtab components
import { ToolsList } from './subtabs/ToolsSubtab';
import { LayersSubtab } from './subtabs/LayersSubtab';
import { AnnotationsSubtab } from './subtabs/AnnotationsSubtab';

// Import managers
// For instance tools, use the instances workspaceManager:
import { workspaceManager } from '@Core/instances/workspaceManager.js';
import { getViewConfigurationManager } from '@Init/appInitializer.js';

import './InstanceToolsTab.scss';

// =============================================================================
// SUBTAB CONFIGURATION - Matches DatasetsTab pattern
// =============================================================================

const SUBTABS = [
    { id: 'tools', label: 'Tools', icon: Zap, color: 'amber' },
    { id: 'layers', label: 'Layers', icon: Layers, color: 'purple' },
    { id: 'annotations', label: 'Annotations', icon: MapPin, color: 'pink' },
];

// =============================================================================
// TOOLS SUBTAB WRAPPER - Gets tools from workspaceManager (same as InstanceViewport)
// =============================================================================

function ToolsSubtab({ activeInstance }) {
    const [expandedMenus, setExpandedMenus] = useState({});
    const [tools, setTools] = useState([]);

    // Get tools from workspaceManager - same method as InstanceViewport uses
    useEffect(() => {
        if (!activeInstance?.instanceId) {
            setTools([]);
            return;
        }

        const loadTools = () => {
            try {
                // Use the same method as InstanceViewport for consistency
                const toolsList = workspaceManager.getInstanceTools(activeInstance.instanceId);

                // Transform to the format expected by ToolsList component
                const formattedTools = toolsList.map(tool => ({
                    id: tool.id,
                    icon: tool.icon,
                    label: tool.label,
                    description: tool.tooltip || tool.description,
                    type: tool.items || tool.options ? 'menu' : 'button',
                    active: tool.active,
                    disabled: tool.disabled,
                    options: tool.items || tool.options,
                    onClick: tool.onClick,
                }));

                setTools(formattedTools);
            } catch (err) {
                console.warn('Failed to load tools:', err);
                setTools([]);
            }
        };

        loadTools();

        // Listen for tool updates (same event as InstanceViewport)
        const handleToolsUpdate = (event) => {
            if (event.detail?.instanceId === activeInstance.instanceId) {
                loadTools();
            }
        };

        window.addEventListener('cia:tools-updated', handleToolsUpdate);
        return () => window.removeEventListener('cia:tools-updated', handleToolsUpdate);
    }, [activeInstance?.instanceId]);

    const handleToggleMenu = useCallback((menuId) => {
        setExpandedMenus(prev => ({
            ...prev,
            [menuId]: !prev[menuId]
        }));
    }, []);

    return (
        <ToolsList
            tools={tools}
            expandedMenus={expandedMenus}
            onToggleMenu={handleToggleMenu}
        />
    );
}

// =============================================================================
// NO INSTANCE PLACEHOLDER
// =============================================================================

function NoInstancePlaceholder() {
    return (
        <div className="instance-tools-tab__no-instance">
            <Monitor size={32} />
            <h3>No Instance Selected</h3>
            <p>Click on an instance viewport to select it and view its tools.</p>
            <span className="instance-tools-tab__no-instance-hint">
                Tip: The mini toolbar appears on hover in each viewport
            </span>
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * InstanceToolsPanelContent - Tools panel for the active instance
 * 
 * Shows tools, layers, and annotations for the currently focused instance.
 * Updates automatically when user clicks on different instances.
 */
export function InstanceToolsPanelContent({ workspaceId }) {
    const [activeTab, setActiveTab] = useState('tools');
    const [activeInstance, setActiveInstance] = useState(null);

    // Subscribe to active instance changes
    useEffect(() => {
        const updateActiveInstance = () => {
            const instance = workspaceManager?.getActiveInstance?.();
            setActiveInstance(instance || null);
        };

        // Initial check
        updateActiveInstance();

        // Listen for instance focus changes
        const handleInstanceFocus = (event) => {
            updateActiveInstance();
        };

        // Listen for view closure/deletion - clear active instance if it was deleted
        const handleViewClosed = () => {
            // Small delay to allow workspaceManager to update
            setTimeout(updateActiveInstance, 50);
        };

        window.addEventListener('cia:instance-focused', handleInstanceFocus);
        window.addEventListener('cia:active-instance-changed', handleInstanceFocus);
        window.addEventListener('cia:close-view', handleViewClosed);

        // Also listen to viewConfigurationManager events
        getViewConfigurationManager()?.on?.('viewTrashed', handleViewClosed);
        getViewConfigurationManager()?.on?.('viewDeleted', handleViewClosed);
        getViewConfigurationManager()?.on?.('viewDeactivated', handleViewClosed);

        return () => {
            window.removeEventListener('cia:instance-focused', handleInstanceFocus);
            window.removeEventListener('cia:active-instance-changed', handleInstanceFocus);
            window.removeEventListener('cia:close-view', handleViewClosed);
            getViewConfigurationManager()?.off?.('viewTrashed', handleViewClosed);
            getViewConfigurationManager()?.off?.('viewDeleted', handleViewClosed);
            getViewConfigurationManager()?.off?.('viewDeactivated', handleViewClosed);
        };
    }, []);

    // Extract instance info for display
    const instanceInfo = activeInstance ? {
        name: activeInstance.instanceData?.dataset?.filename ||
            activeInstance.instanceData?.dataset?.fileName ||
            `Instance ${activeInstance.instanceId?.slice(0, 8)}`,
        type: activeInstance.type || 'unknown',
        color: activeInstance.color?.name || 'blue',
        dataset: activeInstance.instanceData?.dataset?.filename ||
            activeInstance.instanceData?.dataset?.fileName ||
            'No data loaded',
    } : null;

    // Render content based on active subtab
    const renderContent = () => {
        if (!activeInstance) return null;

        switch (activeTab) {
            case 'tools':
                return <ToolsSubtab activeInstance={activeInstance} />;
            case 'layers':
                return <LayersSubtab activeInstance={activeInstance} />;
            case 'annotations':
                return <AnnotationsSubtab activeInstance={activeInstance} />;
            default:
                return null;
        }
    };

    return (
        <div className="instance-tools-tab">
            {/* ============================================================
                PANEL HEADER - Matches Files and Datasets tabs
                ============================================================ */}
            <div className="panel-header panel-header--amber">
                <Wrench size={14} className="panel-header__icon" />
                <span className="panel-header__title">Instance Tools</span>
                {activeInstance && (
                    <span className="panel-header__count">1 active</span>
                )}
            </div>

            {/* If no active instance, show placeholder */}
            {!activeInstance ? (
                <NoInstancePlaceholder />
            ) : (
                <>
                    {/* ========================================================
                        FOCUSED INSTANCE HEADER - Shows which instance is selected
                        ======================================================== */}
                    <div
                        className="instance-tools-tab__instance-header"
                        style={{ '--instance-color': activeInstance.color?.hex || 'var(--color-accent-blue)' }}
                    >
                        <Monitor size={14} />
                        <div className="instance-tools-tab__instance-info">
                            <span className="instance-tools-tab__instance-name">{instanceInfo.name}</span>
                            <span className="instance-tools-tab__instance-dataset">{instanceInfo.dataset}</span>
                        </div>
                        <span className="instance-tools-tab__instance-type">{instanceInfo.type.toUpperCase()}</span>
                    </div>

                    {/* ========================================================
                        SUBTAB BAR - Tools / Layers / Annotations
                        Matches DatasetsTab styling pattern
                        ======================================================== */}
                    <div className="instance-tools-tab__tabs">
                        {SUBTABS.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;

                            return (
                                <button
                                    key={tab.id}
                                    className={`instance-tools-tab__tab ${isActive ? 'instance-tools-tab__tab--active' : ''}`}
                                    data-color={tab.color}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    <Icon size={12} />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* ========================================================
                        CONTENT AREA
                        ======================================================== */}
                    <div className="instance-tools-tab__content">
                        {renderContent()}
                    </div>
                </>
            )}
        </div>
    );
}

export default InstanceToolsPanelContent;