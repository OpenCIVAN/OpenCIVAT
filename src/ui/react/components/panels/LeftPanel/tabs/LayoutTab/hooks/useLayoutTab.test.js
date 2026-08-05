// src/ui/react/components/panels/LeftPanel/tabs/LayoutTab/hooks/useLayoutTab.test.js
// Templates/custom-layouts must persist to localStorage (key 'cia:layout-templates-v2')
// so a saved layout survives reload, and the save/load/delete handlers must no longer
// be console.log stubs.

import { describe, test, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLayoutTab } from './useLayoutTab.js';

const STORAGE_KEY = 'cia:layout-templates-v2';

describe('useLayoutTab template & custom layout persistence', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    test('handleSaveCurrentAsTemplate appends a full snapshot and persists it', () => {
        const { result } = renderHook(() => useLayoutTab({ workspaceId: 'ws-1' }));

        const initialCount = result.current.savedTemplates.length;
        const viewGroupsSnapshot = result.current.viewGroups;
        const canvasSnapshot = result.current.canvas;

        act(() => {
            result.current.handleSaveCurrentAsTemplate();
        });

        expect(result.current.savedTemplates.length).toBe(initialCount + 1);
        const newTemplate = result.current.savedTemplates[result.current.savedTemplates.length - 1];
        expect(newTemplate.type).toBe('full');
        expect(newTemplate.scope).toBe('personal');
        expect(newTemplate.viewGroups).toEqual(viewGroupsSnapshot);
        expect(newTemplate.canvas).toEqual(canvasSnapshot);
        expect(newTemplate.preview).toEqual(viewGroupsSnapshot.map(vg => vg.layoutId));

        // Persisted to localStorage under the v2 key
        const raw = window.localStorage.getItem(STORAGE_KEY);
        expect(raw).toBeTruthy();
        const parsed = JSON.parse(raw);
        expect(parsed.savedTemplates.some(t => t.id === newTemplate.id)).toBe(true);
    });

    test('a saved template survives to a freshly mounted hook instance (reload simulation)', () => {
        const { result, unmount } = renderHook(() => useLayoutTab({ workspaceId: 'ws-1' }));

        act(() => {
            result.current.handleSaveCurrentAsTemplate();
        });
        const savedName = result.current.savedTemplates[result.current.savedTemplates.length - 1].name;
        unmount();

        // Simulate a reload: mount a brand new hook instance, it should read from localStorage
        const { result: reloaded } = renderHook(() => useLayoutTab({ workspaceId: 'ws-1' }));
        expect(reloaded.current.savedTemplates.some(t => t.name === savedName)).toBe(true);
    });

    test('handleLoadTemplate restores viewGroups/canvas from a full snapshot', () => {
        const { result } = renderHook(() => useLayoutTab({ workspaceId: 'ws-1' }));

        // Mutate current state so we can tell a restore actually happened
        act(() => {
            result.current.handleUpdateCanvas({ ...result.current.canvas, rows: 9, cols: 9 });
        });
        expect(result.current.canvas.rows).toBe(9);

        act(() => {
            result.current.handleSaveCurrentAsTemplate();
        });
        const template = result.current.savedTemplates[result.current.savedTemplates.length - 1];

        // Change canvas again so load has something to restore over
        act(() => {
            result.current.handleUpdateCanvas({ ...result.current.canvas, rows: 2, cols: 2 });
        });
        expect(result.current.canvas.rows).toBe(2);

        act(() => {
            result.current.handleLoadTemplate(template);
        });
        expect(result.current.canvas.rows).toBe(9);
        expect(result.current.canvas.cols).toBe(9);
        expect(result.current.viewGroups).toEqual(template.viewGroups);
    });

    test('handleLoadTemplate is a safe no-op for legacy templates without a full snapshot', () => {
        const { result } = renderHook(() => useLayoutTab({ workspaceId: 'ws-1' }));
        const canvasBefore = result.current.canvas;
        const viewGroupsBefore = result.current.viewGroups;

        act(() => {
            // Legacy mock template shape: no viewGroups/canvas snapshot
            result.current.handleLoadTemplate({ id: 'tpl-legacy', name: 'Legacy', preview: ['1+2'] });
        });

        expect(result.current.canvas).toBe(canvasBefore);
        expect(result.current.viewGroups).toBe(viewGroupsBefore);
    });

    test('handleDeleteTemplate removes the template and persists the removal', () => {
        const { result } = renderHook(() => useLayoutTab({ workspaceId: 'ws-1' }));

        act(() => {
            result.current.handleSaveCurrentAsTemplate();
        });
        const template = result.current.savedTemplates[result.current.savedTemplates.length - 1];

        act(() => {
            result.current.handleDeleteTemplate(template);
        });

        expect(result.current.savedTemplates.some(t => t.id === template.id)).toBe(false);

        const raw = window.localStorage.getItem(STORAGE_KEY);
        const parsed = JSON.parse(raw);
        expect(parsed.savedTemplates.some(t => t.id === template.id)).toBe(false);
    });

    test('handleSaveAsCustomLayout appends the current canvas size as a named custom layout and persists it', () => {
        const { result } = renderHook(() => useLayoutTab({ workspaceId: 'ws-1' }));
        const initialCount = result.current.customLayouts.length;
        const { rows, cols } = result.current.canvas;

        act(() => {
            result.current.handleSaveAsCustomLayout();
        });

        expect(result.current.customLayouts.length).toBe(initialCount + 1);
        const newLayout = result.current.customLayouts[result.current.customLayouts.length - 1];
        expect(newLayout.rows).toBe(rows);
        expect(newLayout.cols).toBe(cols);
        expect(newLayout.isCustom).toBe(true);

        const raw = window.localStorage.getItem(STORAGE_KEY);
        const parsed = JSON.parse(raw);
        expect(parsed.customLayouts.some(l => l.id === newLayout.id)).toBe(true);
    });

    test('handleSelectView toggles selectedViewId and drill-in resets it', () => {
        const { result } = renderHook(() => useLayoutTab({ workspaceId: 'ws-1' }));
        const firstViewGroupId = result.current.viewGroups[0].id;

        act(() => {
            result.current.handleDrillIn(firstViewGroupId);
        });
        expect(result.current.selectedViewId).toBeNull();

        const firstViewId = result.current.drillInViewGroup.views[0]?.id;
        if (firstViewId) {
            act(() => {
                result.current.handleSelectView(firstViewId);
            });
            expect(result.current.selectedViewId).toBe(firstViewId);

            // Selecting the same view again toggles it off
            act(() => {
                result.current.handleSelectView(firstViewId);
            });
            expect(result.current.selectedViewId).toBeNull();
        }

        act(() => {
            result.current.handleDrillOut();
        });
        expect(result.current.selectedViewId).toBeNull();
    });
});
