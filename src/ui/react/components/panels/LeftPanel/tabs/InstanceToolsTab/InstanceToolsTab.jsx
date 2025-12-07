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
import { ToolsList as ToolsSubtab } from './subtabs/ToolsSubtab';
import { LayersSubtab } from './subtabs/LayersSubtab';
import { AnnotationsSubtab } from './subtabs/AnnotationsSubtab';

// Import managers
// For instance tools, use the instances workspaceManager:
import { workspaceManager } from '@Core/instances/workspaceManager.js';

import './InstanceToolsTab.scss';

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

        window.addEventListener('cia:instance-focused', handleInstanceFocus);
        window.addEventListener('cia:active-instance-changed', handleInstanceFocus);

        return () => {
            window.removeEventListener('cia:instance-focused', handleInstanceFocus);
            window.removeEventListener('cia:active-instance-changed', handleInstanceFocus);
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
            <div className="panel-header">
                <Wrench size={14} className="panel-header__icon file-icon--amber" />
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
                        ======================================================== */}
                    <div className="instance-tools-tab__tabs">
                        <button
                            className={`instance-tools-tab__tab ${activeTab === 'tools' ? 'instance-tools-tab__tab--active' : ''}`}
                            onClick={() => setActiveTab('tools')}
                            data-color="amber"
                        >
                            <Zap size={14} /> Tools
                        </button>
                        <button
                            className={`instance-tools-tab__tab ${activeTab === 'layers' ? 'instance-tools-tab__tab--active' : ''}`}
                            onClick={() => setActiveTab('layers')}
                            data-color="purple"
                        >
                            <Layers size={14} /> Layers
                        </button>
                        <button
                            className={`instance-tools-tab__tab ${activeTab === 'annotations' ? 'instance-tools-tab__tab--active' : ''}`}
                            onClick={() => setActiveTab('annotations')}
                            data-color="pink"
                        >
                            <MapPin size={14} /> Annotations
                        </button>
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