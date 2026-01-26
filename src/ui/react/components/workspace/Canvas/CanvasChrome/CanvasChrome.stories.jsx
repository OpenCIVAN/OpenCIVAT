// src/ui/react/components/workspace/Canvas/CanvasChrome/CanvasChrome.stories.jsx
import React, { useState } from 'react';
import { CanvasChrome } from './CanvasChrome';
import { CanvasInfoFooter } from '../CanvasInfoFooter/CanvasInfoFooter';

const mockWorkspace = { id: 'ws-1', name: 'MRI Analysis' };
const mockWorkspaces = [
    mockWorkspace,
    { id: 'ws-2', name: 'Tumor Review' },
    { id: 'ws-3', name: 'Remote Session' },
];

const mockViewGroup = { id: 'vg-1', name: 'Axial Slices', color: '#c084fc', linkedTo: 'vg-2' };
const mockViewGroups = [
    mockViewGroup,
    { id: 'vg-2', name: 'Coronal Stack', color: '#34d399' },
    { id: 'vg-3', name: '3D Volume', color: '#fbbf24' },
];

const mockActiveView = { id: 'view-1', name: 'Axial Slice', type: 'vtk-slice' };

const mockToolSections = [
    { id: 'navigation', label: 'Navigation' },
    { id: 'interaction', label: 'Interaction' },
];

const mockTools = [
    { id: 'zoomIn', icon: 'zoomIn', label: 'Zoom In', section: 'navigation', placement: 'notch' },
    { id: 'zoomOut', icon: 'zoomOut', label: 'Zoom Out', section: 'navigation', placement: 'notch' },
    { id: 'fit', icon: 'fitView', label: 'Fit', section: 'navigation', placement: 'notch' },
    { id: 'pan', icon: 'pan', label: 'Pan', section: 'interaction', placement: 'notch' },
    { id: 'select', icon: 'boxSelect', label: 'Select', section: 'interaction', placement: 'notch' },
];

export default {
    title: 'Canvas/CanvasChrome',
    component: CanvasChrome,
    parameters: {
        layout: 'fullscreen',
    },
    decorators: [
        (Story) => (
            <div style={{ background: '#020406', padding: '24px', minHeight: '80vh' }}>
                <Story />
            </div>
        ),
    ],
};

function CanvasChromeStory(args) {
    const [canvasSize, setCanvasSize] = useState({ cols: 10, rows: 10 });
    const [viewportSize, setViewportSize] = useState({ cols: 3, rows: 3 });

    return (
        <CanvasChrome
            {...args}
            infoBar={(
                <CanvasInfoFooter
                    canvasSize={canvasSize}
                    viewportSize={viewportSize}
                    cellSize={{ width: 300, height: 250 }}
                    collaboratorCount={3}
                    syncStatus="synced"
                    onCanvasSizeChange={setCanvasSize}
                    onViewportSizeChange={setViewportSize}
                />
            )}
            footer2={(
                <div style={{ height: 50, background: '#0c1220', borderTop: '1px solid rgba(96,165,250,0.12)' }} />
            )}
        >
            <div style={{ flex: 1, background: '#030303', borderRadius: 8 }} />
        </CanvasChrome>
    );
}

export const Default = {
    render: (args) => <CanvasChromeStory {...args} />,
    args: {
        headerProps: {
            canGoBack: true,
            workspace: mockWorkspace,
            workspaces: mockWorkspaces,
            viewGroup: mockViewGroup,
            viewGroups: mockViewGroups,
            isViewGroupLinked: true,
            flowDirection: 'right',
            windowMode: 'docked',
        },
        editBarProps: {
            activeTool: 'select',
        },
        footer1Props: {
            canUndo: true,
            canRedo: false,
            activeView: mockActiveView,
            tools: mockTools,
            toolSections: mockToolSections,
        },
        isEditMode: true,
    },
};
