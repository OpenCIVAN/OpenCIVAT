// src/ui/react/components/workspace/Canvas/CanvasChrome/CanvasChromeHeader.stories.jsx
import React from 'react';
import { CanvasChromeHeader } from './CanvasChromeHeader';

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

export default {
    title: 'Canvas/CanvasChromeHeader',
    component: CanvasChromeHeader,
    parameters: {
        layout: 'fullscreen',
    },
    argTypes: {
        onGoBack: { action: 'back' },
        onGoHome: { action: 'home' },
        onWorkspaceChange: { action: 'workspace change' },
        onViewGroupChange: { action: 'viewgroup change' },
        onToggleEditMode: { action: 'toggle edit' },
        onFlowDirectionChange: { action: 'flow change' },
        onToggleCoordinates: { action: 'toggle coords' },
        onToggleViewGroupBorders: { action: 'toggle vg borders' },
        onWindowModeChange: { action: 'window mode change' },
        onToggleFullscreen: { action: 'fullscreen' },
        flowDirection: {
            control: 'select',
            options: ['right', 'down'],
        },
        windowMode: {
            control: 'select',
            options: ['docked', 'floating', 'full'],
        },
    },
    decorators: [
        (Story) => (
            <div style={{ background: '#060a12', padding: '24px' }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    args: {
        canGoBack: true,
        workspace: mockWorkspace,
        workspaces: mockWorkspaces,
        viewGroup: mockViewGroup,
        viewGroups: mockViewGroups,
        isViewGroupLinked: true,
        isEditMode: false,
        flowDirection: 'right',
        showCoordinates: true,
        showViewGroupBorders: false,
        windowMode: 'docked',
        isFullscreen: false,
    },
};

export const EditModeActive = {
    args: {
        ...Default.args,
        isEditMode: true,
    },
};

export const NoViewGroupSelected = {
    args: {
        ...Default.args,
        viewGroup: null,
        isViewGroupLinked: false,
    },
};
