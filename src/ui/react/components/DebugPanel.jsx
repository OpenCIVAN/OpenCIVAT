// src/ui/react/components/DebugPanel.jsx

import React, { useState, useEffect } from "react";
import { workspaceManager } from "@Core/instances/workspaceManager.js";
import { yDatasets } from "@Collaboration/yjs/yjsSetup.js";
import { ui as log } from "@Utils/logger.js";

export function DebugPanel() {
    const [debugInfo, setDebugInfo] = useState({
        datasetsInMemory: 0,
        datasetsInYjs: 0,
        instanceCount: 0,
        instances: [],
    });

    const updateDebugInfo = () => {
        // Datasets
        const allDatasets = window.CIA?.datasetManager?.getAllDatasets() || [];
        const datasetsInMemory = allDatasets.length;
        const datasetsInYjs = Array.from(yDatasets.keys()).length;

        // Instances
        const allInstanceIds = workspaceManager.getAllInstanceIds();
        const instances = allInstanceIds.map((id) => {
            const instance = workspaceManager.getInstance(id);

            return {
                id,
                type: instance.type,
                hasData: instance.instanceData?.hasData || false,
                datasetId: instance.datasetId,
                actorCount: instance.instanceData?.actors?.size || 0,
            };
        });

        setDebugInfo({
            datasetsInMemory,
            datasetsInYjs,
            instanceCount: allInstanceIds.length,
            instances,
        });

        // Debug logging
        log.trace("Debug Panel Update - Datasets in memory:", datasetsInMemory,
            "Y.js:", datasetsInYjs, "Instances:", instances);
    };

    useEffect(() => {
        updateDebugInfo();

        const interval = setInterval(updateDebugInfo, 1000);

        workspaceManager.addListener(updateDebugInfo);

        return () => {
            clearInterval(interval);
            workspaceManager.removeListener(updateDebugInfo);
        };
    }, []);

    return (
        <div className="debug-panel">
            <h3>Debug Info</h3>

            <section>
                <h4>Datasets</h4>
                <p>Memory: {debugInfo.datasetsInMemory}</p>
                <p>Y.js: {debugInfo.datasetsInYjs}</p>
            </section>

            <section>
                <h4>Instances ({debugInfo.instanceCount})</h4>
                {debugInfo.instances.map((inst) => (
                    <div key={inst.id} className="instance-info">
                        <p><strong>{inst.type}</strong> - {inst.id}</p>
                        <p>Dataset: {inst.datasetId || "none"}</p>
                        <p>Has Data: {inst.hasData ? "✅" : "❌"}</p>
                        <p>Actors: {inst.actorCount}</p>
                    </div>
                ))}
            </section>
        </div>
    );
}