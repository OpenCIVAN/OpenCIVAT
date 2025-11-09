// src/ui/react/components/TestPanel.jsx
// Test panel with minimize feature

import React, { useState } from "react";

import { dataCache } from "@Services/storage/dataCache.js";
import { useDatasetStore } from "@UI/react/store/datasetStore.js";
import { useInstanceStore } from "@UI/react/store/instanceStore.js";

export function TestPanel() {
    const [results, setResults] = useState([]);
    const [minimized, setMinimized] = useState(false);
    const store = useDatasetStore();

    const addResult = (message, success = true) => {
        setResults(prev => [...prev, { message, success, time: new Date().toLocaleTimeString() }]);
    };

    const runDatasetStoreTests = () => {
        setResults([]);
        addResult("Starting Dataset Store tests...");

        try {
            // Clear before testing
            addResult("Cleanup: Clearing store...");
            useDatasetStore.getState().clearAll();
            addResult("✓ Store cleared");

            // Test 1: Add dataset
            addResult("Test 1: Adding dataset...");
            useDatasetStore.getState().addDataset("test1", {
                name: "test-brain.vtp",
                hash: "abc123test",
                bounds: [0, 10, 0, 10, 0, 10],
                pointCount: 1000,
                cellCount: 500,
                sizeBytes: 50000,
                uploadedBy: "testUser",
                uploadedAt: Date.now()
            });
            addResult("✓ Dataset added");

            // Test 2
            const dataset = useDatasetStore.getState().getDataset("test1");
            if (dataset && dataset.name === "test-brain.vtp") {
                addResult("✓ Dataset retrieved correctly");
            } else {
                addResult("✗ Dataset retrieval failed", false);
            }

            // Test 3
            const count = useDatasetStore.getState().getDatasetCount();
            addResult(`✓ Dataset count: ${count}`);

            // Test 4
            useDatasetStore.getState().addAnnotation("test1", {
                id: "ann1",
                text: "Test annotation",
                position: [5, 5, 5]
            });
            const withAnn = useDatasetStore.getState().getDataset("test1");
            if (withAnn.annotations.length > 0) {
                addResult("✓ Annotation added");
            } else {
                addResult("✗ Annotation not added", false);
            }

            addResult("✅ All tests passed!");

        } catch (error) {
            addResult(`✗ Error: ${error.message}`, false);
        }
    };

    const runDataCacheTests = async () => {
        setResults([]);
        addResult("Starting DataCache tests...");

        try {
            // Clear cache before testing
            addResult("Cleanup: Clearing cache...");
            await dataCache.clearAll();
            addResult("✓ Cache cleared");

            // Test 1: Create test file
            const testData = new Uint8Array([1, 2, 3, 4, 5]);
            const testFile = new File([testData], "test.vtp", { type: "application/octet-stream" });
            addResult("✓ Test file created");

            // Test 2: Store file
            addResult("Storing file in cache...");
            const hash = await dataCache.storeDataset(testFile);
            addResult(`✓ File stored with hash: ${hash.substring(0, 16)}...`);

            // Test 3: Check exists
            const exists = await dataCache.hasDataset(hash);
            if (exists) {
                addResult("✓ File found in cache");
            } else {
                addResult("✗ File not found in cache", false);
            }

            // Test 4: Retrieve file
            const retrieved = await dataCache.getDataset(hash);
            if (retrieved) {
                addResult(`✓ File retrieved: ${retrieved.name}`);
            } else {
                addResult("✗ Failed to retrieve file", false);
            }

            // Test 5: List datasets
            const datasets = await dataCache.listDatasets();
            addResult(`✓ Found ${datasets.length} datasets in cache`);

            addResult("✅ All tests passed!");

        } catch (error) {
            addResult(`✗ Error: ${error.message}`, false);
        }
    };

    const runInstanceStoreTests = async () => {
        setResults([]);
        addResult("Starting Instance Store tests...");

        try {
            // IMPORTANT: Import here to get fresh reference
            const { useInstanceStore } = await import("../store/instanceStore.js");
            const store = useInstanceStore.getState();

            // ✨ Clear stores before testing
            addResult("Cleanup: Clearing stores...");
            useInstanceStore.getState().clearAll();
            useDatasetStore.getState().clearAll();
            addResult("✓ Stores cleared");

            addResult("Setup: Creating test dataset...");
            useDatasetStore.getState().addDataset("dataset1", {
                name: "test.vtp",
                hash: "testhash",
                bounds: [0, 10, 0, 10, 0, 10],
                pointCount: 1000,
                cellCount: 500,
                sizeBytes: 50000,
                uploadedBy: "user1",
                uploadedAt: Date.now()
            });
            addResult("✓ Test dataset created");

            // Test 1: Create instance
            addResult("Test 1: Creating instance...");
            const inst1 = store.createInstance({
                datasetId: "dataset1",
                userId: "user1",
                userName: "Test User",
                type: "desktop"
            });

            if (store.hasInstance(inst1)) {
                addResult(`✓ Instance created: ${inst1.substring(0, 20)}...`);
            } else {
                addResult("✗ Instance not found after creation", false);
            }

            // Test 2: Get instance
            addResult("Test 2: Retrieving instance...");
            const instance = store.getInstance(inst1);
            if (instance && instance.type === "desktop") {
                addResult("✓ Instance retrieved correctly");
                addResult(`  Type: ${instance.type}`);
                addResult(`  Dataset: ${instance.datasetId}`);
            } else {
                addResult("✗ Instance retrieval failed", false);
            }

            // Test 3: Update camera
            addResult("Test 3: Updating camera...");
            const newCamera = {
                position: [5, 5, 5],
                focalPoint: [0, 0, 0],
                viewUp: [0, 1, 0],
                viewAngle: 45
            };
            store.updateInstanceCamera(inst1, newCamera);

            const updated = store.getInstance(inst1);
            if (updated.camera.position[0] === 5) {
                addResult("✓ Camera updated");
            } else {
                addResult("✗ Camera not updated", false);
            }

            // Test 4: Add filter
            addResult("Test 4: Adding filter...");
            store.addInstanceFilter(inst1, {
                type: "clip",
                params: { normal: [0, 1, 0], origin: [0, 0, 0] }
            });

            const withFilter = store.getInstance(inst1);
            if (withFilter.filters.length === 1) {
                addResult("✓ Filter added");
            } else {
                addResult("✗ Filter not added", false);
            }

            // Test 5: Create second instance (VR)
            addResult("Test 5: Creating VR instance...");
            const inst2 = store.createInstance({
                datasetId: "dataset1",
                userId: "user1",
                userName: "Test User",
                type: "vr"
            });

            if (store.getInstanceCount() === 2) {
                addResult("✓ VR instance created (total: 2)");
            } else {
                addResult(`✗ Wrong instance count: ${store.getInstanceCount()}`, false);
            }

            // Test 6: Link instances
            addResult("Test 6: Linking instances...");
            store.linkInstances(inst1, [inst2], "both");

            const linkedInstances = store.getLinkedInstances(inst1);
            if (linkedInstances.length === 1 && linkedInstances[0].type === "vr") {
                addResult("✓ Instances linked");
            } else {
                addResult("✗ Linking failed", false);
            }

            // Test 7: Get instances by dataset
            addResult("Test 7: Getting instances by dataset...");
            const byDataset = store.getInstancesByDataset("dataset1");
            if (byDataset.length === 2) {
                addResult("✓ Found 2 instances for dataset1");
            } else {
                addResult(`✗ Wrong count: ${byDataset.length}`, false);
            }

            // Test 8: Update cursor
            addResult("Test 8: Updating cursor position...");
            store.updateInstanceCursor(inst1, [3, 3, 3], true);

            const withCursor = store.getInstance(inst1);
            if (withCursor.cursor.position[0] === 3 && withCursor.cursor.visible) {
                addResult("✓ Cursor updated");
            } else {
                addResult("✗ Cursor not updated", false);
            }

            // Test 9: Remove instance
            addResult("Test 9: Removing instance...");
            store.removeInstance(inst2);

            if (!store.hasInstance(inst2) && store.getInstanceCount() === 1) {
                addResult("✓ Instance removed");
            } else {
                addResult("✗ Instance not removed", false);
            }

            addResult("✅ All tests passed!");

        } catch (error) {
            addResult(`✗ Error: ${error.message}`, false);
            console.error(error);
        }
    };

    const debugYjsData = async () => {
        setResults([]);
        addResult("Debugging Y.js data...");

        try {
            const { yDatasets, yInstances } = await import("@Collaboration/yjs/yjsSetup.js");

            addResult(`Datasets in Y.js: ${yDatasets.size}`);
            yDatasets.forEach((value, key) => {
                addResult(`Dataset ${key}:`);
                addResult(`  Name: ${value.name || "MISSING"}`);
                addResult(`  Hash: ${value.hash || "MISSING"}`);
                addResult(`  Full data: ${JSON.stringify(value).substring(0, 100)}...`);
            });

            addResult(`Instances in Y.js: ${yInstances.size}`);
            yInstances.forEach((value, key) => {
                addResult(`Instance ${key}:`);
                addResult(`  Type: ${value.type || "MISSING"}`);
                addResult(`  DatasetId: ${value.datasetId || "MISSING"}`);
            });

        } catch (error) {
            addResult(`✗ Error: ${error.message}`, false);
        }
    };

    const runSyncTests = async () => {
        setResults([]);
        addResult("Starting Sync tests...");

        try {
            const { useDatasetStore } = await import("../store/datasetStore.js");
            const { useInstanceStore } = await import("../store/instanceStore.js");
            const { syncDatasetToYjs, syncInstanceToYjs, yDatasets, yInstances } =
                await import("@Collaboration/yjs/yjsSetup.js");

            // Clear stores
            addResult("Cleanup: Clearing stores...");
            useDatasetStore.getState().clearAll();
            useInstanceStore.getState().clearAll();
            addResult("✓ Stores cleared");

            // Test 1: Create dataset locally
            addResult("Test 1: Creating local dataset...");
            useDatasetStore.getState().addDataset("test-ds-1", {
                name: "test-brain.vtp",
                hash: "testhash123",
                bounds: [0, 10, 0, 10, 0, 10],
                pointCount: 1000,
                cellCount: 500,
                sizeBytes: 50000,
                uploadedBy: "testUser",
                uploadedAt: Date.now()
            });
            addResult("✓ Dataset created in Zustand");

            // Test 2: Sync to Y.js
            addResult("Test 2: Syncing dataset to Y.js...");
            const dataset = useDatasetStore.getState().getDataset("test-ds-1");
            syncDatasetToYjs("test-ds-1", dataset);

            // ✨ ADD THIS: Wait for Y.js to process
            await new Promise(resolve => setTimeout(resolve, 100));

            // Check if it"s in Y.js
            const inYjs = yDatasets.get("test-ds-1");
            if (inYjs && inYjs.name === "test-brain.vtp") {
                addResult("✓ Dataset synced to Y.js");
                addResult(`  Name: ${inYjs.name}`);
                addResult(`  Hash: ${inYjs.hash ? inYjs.hash.substring(0, 16) + "..." : "MISSING"}`);

                // ✨ ADD THIS: Verify hash exists
                if (!inYjs.hash) {
                    addResult("⚠️  Warning: Hash not synced properly", false);
                }
            } else {
                addResult("✗ Dataset not in Y.js", false);
            }

            // Test 3: Create instance
            addResult("Test 3: Creating instance...");
            const instId = useInstanceStore.getState().createInstance({
                datasetId: "test-ds-1",
                userId: "testUser",
                userName: "Test User",
                type: "desktop"
            });
            addResult(`✓ Instance created: ${instId.substring(0, 20)}...`);

            // Test 4: Sync instance to Y.js
            addResult("Test 4: Syncing instance to Y.js...");
            const instance = useInstanceStore.getState().getInstance(instId);
            syncInstanceToYjs(instId, instance);

            const instInYjs = yInstances.get(instId);
            if (instInYjs && instInYjs.datasetId === "test-ds-1") {
                addResult("✓ Instance synced to Y.js");
                addResult(`  Type: ${instInYjs.type}`);
                addResult(`  Dataset: ${instInYjs.datasetId}`);
            } else {
                addResult("✗ Instance not in Y.js", false);
            }

            addResult("✅ All sync tests passed!");
            addResult("");
            addResult("💡 Open a second tab to test remote sync!");

        } catch (error) {
            addResult(`✗ Error: ${error.message}`, false);
            console.error(error);
        }
    };

    const runCleanup = async () => {
        setResults([]);
        addResult("Starting cleanup...");

        try {
            const { validateDatasetsInCache, removeOrphanedDatasets, cleanupStaleInstances, getDataStats } =
                await import("@Utils/sessionCleanup.js");

            // Check for orphaned datasets
            addResult("Checking for orphaned datasets...");
            const orphaned = await validateDatasetsInCache();

            if (orphaned.length > 0) {
                addResult(`⚠️  Found ${orphaned.length} orphaned datasets:`, false);
                orphaned.forEach(o => {
                    addResult(`  - ${o.name} (${o.reason})`);
                });

                addResult("Removing orphaned datasets...");
                removeOrphanedDatasets(orphaned);
                addResult("✓ Orphaned datasets removed");
            } else {
                addResult("✓ No orphaned datasets found");
            }

            // Clean up stale instances
            addResult("Cleaning up stale instances...");
            cleanupStaleInstances();
            addResult("✓ Stale instances cleaned");

            // Show stats
            const stats = await getDataStats();
            addResult("");
            addResult("📊 Current data stats:");
            addResult(`  Datasets: ${stats.datasets.inYjs} in Y.js, ${stats.datasets.inCache} in cache`);
            addResult(`  Instances: ${stats.instances.inYjs} in Y.js`);
            addResult(`  Annotations: ${stats.annotations} groups`);

            addResult("✅ Cleanup complete!");

        } catch (error) {
            addResult(`✗ Error: ${error.message}`, false);
        }
    };

    const nukeEverything = async () => {
        if (!confirm("⚠️  This will delete ALL data (Y.js, Zustand, IndexedDB). Are you sure?")) {
            return;
        }

        setResults([]);
        addResult("💣 Nuclear cleanup initiated...");

        try {
            const { clearAllData } = await import("@Utils/sessionCleanup.js");
            await clearAllData();
            addResult("✅ Everything cleared!");
            addResult("Reload the page to start fresh.");
        } catch (error) {
            addResult(`✗ Error: ${error.message}`, false);
        }
    };

    const clearResults = () => setResults([]);

    const clearAllStores = async () => {
        useDatasetStore.getState().clearAll();
        useInstanceStore.getState().clearAll();
        await dataCache.clearAll();
        setResults([]);
        addResult("✓ All stores and cache cleared", true);
    };

    // Minimized view - just a small tab
    if (minimized) {
        return (
            <div
                onClick={() => setMinimized(false)}
                style={{
                    position: "fixed",
                    top: 10,
                    right: 10,
                    background: "#1a1a1a",
                    border: "1px solid #00ff00",
                    padding: "5px 10px",
                    fontFamily: "monospace",
                    fontSize: 12,
                    color: "#00ff00",
                    cursor: "pointer",
                    zIndex: 10000,
                    userSelect: "none"
                }}
            >
                🧪 Tests
            </div>
        );
    }

    // Full view
    return (
        <div style={{
            position: "fixed",
            top: 10,
            right: 10,
            width: 400,
            maxHeight: "80vh",
            background: "#1a1a1a",
            border: "1px solid #00ff00",
            padding: 10,
            fontFamily: "monospace",
            fontSize: 12,
            overflow: "auto",
            zIndex: 10000
        }}>
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10
            }}>
                <h3 style={{ color: "#00ff00", margin: 0 }}>🧪 Test Panel</h3>
                <button
                    onClick={() => setMinimized(true)}
                    style={{
                        padding: "2px 8px",
                        background: "#333",
                        color: "#00ff00",
                        border: "1px solid #00ff00",
                        cursor: "pointer",
                        fontSize: 10
                    }}
                >
                    ─
                </button>
            </div>

            <div style={{ marginBottom: 10 }}>
                <button onClick={runDatasetStoreTests} style={{
                    padding: "5px 10px",
                    margin: "2px",
                    background: "#333",
                    color: "#00ff00",
                    border: "1px solid #00ff00",
                    cursor: "pointer"
                }}>
                    Test Dataset Store
                </button>

                <button onClick={runDataCacheTests} style={{
                    padding: "5px 10px",
                    margin: "2px",
                    background: "#333",
                    color: "#00ff00",
                    border: "1px solid #00ff00",
                    cursor: "pointer"
                }}>
                    Test DataCache
                </button>

                <button onClick={runInstanceStoreTests} style={{
                    padding: "5px 10px",
                    margin: "2px",
                    background: "#333",
                    color: "#00ff00",
                    border: "1px solid #00ff00",
                    cursor: "pointer"
                }}>
                    Test Instance Store
                </button>

                <button onClick={runSyncTests} style={{
                    padding: "5px 10px",
                    margin: "2px",
                    background: "#333",
                    color: "#00ff00",
                    border: "1px solid #00ff00",
                    cursor: "pointer"
                }}>
                    Test Y.js Sync
                </button>

                <button onClick={debugYjsData} style={{
                    padding: "5px 10px",
                    margin: "2px",
                    background: "#333",
                    color: "#00aaff",
                    border: "1px solid #00aaff",
                    cursor: "pointer"
                }}>
                    Debug Y.js Data
                </button>

                <button onClick={clearResults} style={{
                    padding: "5px 10px",
                    margin: "2px",
                    background: "#333",
                    color: "#ff0000",
                    border: "1px solid #ff0000",
                    cursor: "pointer"
                }}>
                    Clear
                </button>

                <button onClick={clearAllStores} style={{
                    padding: "5px 10px",
                    margin: "2px",
                    background: "#333",
                    color: "#ffaa00",
                    border: "1px solid #ffaa00",
                    cursor: "pointer"
                }}>
                    Clear All Stores
                </button>
                <button onClick={runCleanup} style={{
                    padding: "5px 10px",
                    margin: "2px",
                    background: "#333",
                    color: "#ffaa00",
                    border: "1px solid #ffaa00",
                    cursor: "pointer"
                }}>
                    🧹 Cleanup Session
                </button>

                <button onClick={nukeEverything} style={{
                    padding: "5px 10px",
                    margin: "2px",
                    background: "#3a1a1a",
                    color: "#ff4444",
                    border: "1px solid #ff4444",
                    cursor: "pointer"
                }}>
                    💣 Clear Everything
                </button>
            </div>

            <div style={{
                maxHeight: 400,
                overflow: "auto",
                background: "#000",
                padding: 5,
                border: "1px solid #333"
            }}>
                {results.length === 0 ? (
                    <div style={{ color: "#666", padding: 5 }}>
                        No tests run yet. Click a button above to start.
                    </div>
                ) : (
                    results.map((result, i) => (
                        <div key={i} style={{
                            color: result.success ? "#00ff00" : "#ff0000",
                            padding: "2px 0"
                        }}>
                            [{result.time}] {result.message}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}