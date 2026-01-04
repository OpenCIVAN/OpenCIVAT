import { useState, useRef } from 'react';
import { GridLayoutPreview } from './index';

export default {
    title: 'Molecules/GridLayoutPreview',
    component: GridLayoutPreview,
    parameters: {
        layout: 'padded',
        backgrounds: { default: 'dark' },
    },
    decorators: [
        (Story) => (
            <div style={{
                width: '320px',
                height: '300px',
                background: '#0f0f0f',
                borderRadius: '8px',
                overflow: 'hidden'
            }}>
                <Story />
            </div>
        ),
    ],
};

// Sample placements data
const samplePlacements = [
    { id: '1', name: 'Sales 2024', row: 0, col: 0, rowSpan: 1, colSpan: 1, color: 'blue' },
    { id: '2', name: 'Revenue', row: 0, col: 1, rowSpan: 1, colSpan: 2, color: 'green' },
    { id: '3', name: 'Customers', row: 1, col: 0, rowSpan: 2, colSpan: 1, color: 'pink' },
    { id: '4', name: 'Products', row: 1, col: 2, rowSpan: 1, colSpan: 1, color: 'amber' },
    { id: '5', name: 'Analytics', row: 2, col: 1, rowSpan: 1, colSpan: 2, color: 'teal' },
    { id: '6', name: 'Reports', row: 3, col: 0, rowSpan: 1, colSpan: 1, color: 'purple' },
];

// Sample collaborators
const sampleCollaborators = [
    { id: 'u1', name: 'Alice Smith', color: '#60a5fa', position: { row: 0, col: 1 }, isActive: true },
    { id: 'u2', name: 'Bob Johnson', color: '#34d399', position: { row: 1, col: 2 }, isActive: false },
    { id: 'u3', name: 'Carol Williams', color: '#fb7185', position: { row: 2, col: 1 }, isActive: true },
];

// Layout Context
export const LayoutContext = {
    args: {
        context: 'layout',
        placements: samplePlacements,
        gridSize: { rows: 4, cols: 4 },
        isExpanded: true,
    },
};

// Presence Context
export const PresenceContext = {
    args: {
        context: 'presence',
        placements: samplePlacements,
        gridSize: { rows: 4, cols: 4 },
        collaborators: sampleCollaborators,
        isExpanded: true,
    },
};

// Homepoints Context
export const HomepointsContext = {
    args: {
        context: 'homepoints',
        placements: samplePlacements,
        gridSize: { rows: 4, cols: 4 },
        isExpanded: true,
    },
};

// Views Context (drop zone) - Expanded
export const ViewsContextExpanded = {
    args: {
        context: 'views',
        placements: samplePlacements,
        gridSize: { rows: 4, cols: 4 },
        isExpanded: true,
    },
};

// Views Context (drop zone) - Collapsed
export const ViewsContextCollapsed = {
    args: {
        context: 'views',
        placements: samplePlacements,
        gridSize: { rows: 4, cols: 4 },
        isExpanded: false,
    },
};

// Edit Mode
export const EditMode = () => {
    const [placements, setPlacements] = useState(samplePlacements);

    return (
        <GridLayoutPreview
            context="layout"
            placements={placements}
            gridSize={{ rows: 4, cols: 4 }}
            isExpanded={true}
            onApply={(newPlacements) => {
                console.log('Applied:', newPlacements);
                setPlacements(newPlacements);
            }}
        />
    );
};

// With Large Grid
export const LargeGrid = {
    args: {
        context: 'layout',
        placements: [
            ...samplePlacements,
            { id: '7', name: 'View 7', row: 3, col: 1, rowSpan: 1, colSpan: 1, color: 'indigo' },
            { id: '8', name: 'View 8', row: 3, col: 2, rowSpan: 1, colSpan: 1, color: 'teal' },
            { id: '9', name: 'View 9', row: 3, col: 3, rowSpan: 1, colSpan: 1, color: 'blue' },
            { id: '10', name: 'View 10', row: 4, col: 0, rowSpan: 1, colSpan: 2, color: 'green' },
            { id: '11', name: 'View 11', row: 4, col: 2, rowSpan: 1, colSpan: 2, color: 'pink' },
        ],
        gridSize: { rows: 6, cols: 4 },
        isExpanded: true,
    },
};

// Empty Grid
export const EmptyGrid = {
    args: {
        context: 'layout',
        placements: [],
        gridSize: { rows: 3, cols: 3 },
        isExpanded: true,
    },
};

// With Overlapping Placements (conflict state)
export const WithOverlaps = {
    args: {
        context: 'layout',
        placements: [
            { id: '1', name: 'View A', row: 0, col: 0, rowSpan: 2, colSpan: 2, color: 'blue' },
            { id: '2', name: 'View B', row: 1, col: 1, rowSpan: 1, colSpan: 1, color: 'red' }, // Overlaps!
            { id: '3', name: 'View C', row: 2, col: 0, rowSpan: 1, colSpan: 1, color: 'green' },
        ],
        gridSize: { rows: 4, cols: 4 },
        isExpanded: true,
    },
};

// Click to Spawn Demo
export const ClickToSpawn = () => {
    const [placements, setPlacements] = useState(samplePlacements);
    const [spawnLog, setSpawnLog] = useState([]);

    const handleSpawn = (position) => {
        const newId = `new-${Date.now()}`;
        const newPlacement = {
            id: newId,
            name: `New View`,
            row: position.row,
            col: position.col,
            rowSpan: 1,
            colSpan: 1,
            color: ['blue', 'green', 'pink', 'amber', 'teal', 'purple'][Math.floor(Math.random() * 6)],
        };
        setPlacements([...placements, newPlacement]);
        setSpawnLog([...spawnLog, `Spawned at ${position.row + 1},${position.col + 1}`]);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <GridLayoutPreview
                context="layout"
                placements={placements}
                gridSize={{ rows: 4, cols: 4 }}
                isExpanded={true}
                onSpawn={handleSpawn}
            />
            <div style={{
                padding: '8px',
                background: '#1a1a1a',
                borderRadius: '6px',
                fontSize: '11px',
                color: 'rgba(255,255,255,0.5)'
            }}>
                <p style={{ margin: 0, marginBottom: '4px', fontWeight: 500 }}>Click empty cells to spawn views</p>
                {spawnLog.length > 0 && (
                    <div style={{ color: 'rgba(45,212,191,0.8)' }}>
                        {spawnLog.slice(-3).map((log, i) => (
                            <div key={i}>{log}</div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

ClickToSpawn.decorators = [
    (Story) => (
        <div style={{
            width: '340px',
            background: '#0f0f0f',
            borderRadius: '8px',
            padding: '12px'
        }}>
            <Story />
        </div>
    ),
];

// D-Pad Boundary Demo
export const DPadBoundaryDemo = () => {
    const [viewport, setViewport] = useState({ row: 0, col: 0 });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <GridLayoutPreview
                context="layout"
                placements={samplePlacements}
                gridSize={{ rows: 4, cols: 4 }}
                isExpanded={true}
                onNavigate={(newViewport) => {
                    setViewport(newViewport);
                }}
            />
            <div style={{
                padding: '8px',
                background: '#1a1a1a',
                borderRadius: '6px',
                fontSize: '11px',
                color: 'rgba(255,255,255,0.5)'
            }}>
                <p style={{ margin: 0 }}>
                    D-Pad buttons are disabled at grid boundaries.
                    <br />
                    Current viewport: <strong style={{ color: '#fbbf24' }}>{viewport.row + 1},{viewport.col + 1}</strong>
                </p>
            </div>
        </div>
    );
};

DPadBoundaryDemo.decorators = [
    (Story) => (
        <div style={{
            width: '340px',
            background: '#0f0f0f',
            borderRadius: '8px',
            padding: '12px'
        }}>
            <Story />
        </div>
    ),
];

// External Drop Demo
export const ExternalDropDemo = () => {
    const [placements, setPlacements] = useState(samplePlacements);
    const [dropLog, setDropLog] = useState([]);

    const handleExternalDrop = (viewItem, position) => {
        console.log('External drop:', viewItem, position);
        setDropLog([...dropLog, `Dropped "${viewItem.name}" at ${position.row + 1},${position.col + 1}`]);
    };

    // Simulate a draggable ViewItem
    const DraggableItem = ({ name, color }) => (
        <div
            draggable
            onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('application/x-viewitem', JSON.stringify({
                    id: `drag-${Date.now()}`,
                    name,
                    color,
                }));
            }}
            style={{
                padding: '8px 12px',
                background: `rgba(96, 165, 250, 0.15)`,
                border: '1px solid rgba(96, 165, 250, 0.3)',
                borderRadius: '4px',
                fontSize: '11px',
                color: '#60a5fa',
                cursor: 'grab',
            }}
        >
            ⋮⋮ {name}
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
                <DraggableItem name="New Chart" color="blue" />
                <DraggableItem name="Data Table" color="green" />
            </div>
            <GridLayoutPreview
                context="views"
                placements={placements}
                gridSize={{ rows: 4, cols: 4 }}
                isExpanded={true}
                onExternalDrop={handleExternalDrop}
            />
            {dropLog.length > 0 && (
                <div style={{
                    padding: '8px',
                    background: '#1a1a1a',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: 'rgba(96, 165, 250, 0.8)'
                }}>
                    {dropLog.slice(-3).map((log, i) => (
                        <div key={i}>{log}</div>
                    ))}
                </div>
            )}
        </div>
    );
};

ExternalDropDemo.decorators = [
    (Story) => (
        <div style={{
            width: '340px',
            background: '#0f0f0f',
            borderRadius: '8px',
            padding: '12px'
        }}>
            <Story />
        </div>
    ),
];

// Interactive Example
export const Interactive = () => {
    const [placements, setPlacements] = useState(samplePlacements);
    const [gridSize, setGridSize] = useState({ rows: 4, cols: 4 });

    const handleApply = (newPlacements, newGridSize) => {
        console.log('Changes applied:', { placements: newPlacements, gridSize: newGridSize });
        setPlacements(newPlacements);
        if (newGridSize) setGridSize(newGridSize);
    };

    const handleNavigate = (viewport) => {
        console.log('Navigated to:', viewport);
    };

    const handleCellClick = (cell) => {
        console.log('Cell clicked:', cell);
    };

    const handleSpawn = (position) => {
        console.log('Spawn requested at:', position);
        const newPlacement = {
            id: `spawn-${Date.now()}`,
            name: 'New View',
            row: position.row,
            col: position.col,
            rowSpan: 1,
            colSpan: 1,
            color: 'teal',
        };
        setPlacements([...placements, newPlacement]);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <GridLayoutPreview
                context="layout"
                placements={placements}
                gridSize={gridSize}
                isExpanded={true}
                onApply={handleApply}
                onNavigate={handleNavigate}
                onCellClick={handleCellClick}
                onSpawn={handleSpawn}
            />
            <div style={{
                padding: '12px',
                background: '#1a1a1a',
                borderRadius: '6px',
                fontSize: '12px',
                color: 'rgba(255,255,255,0.5)'
            }}>
                <p>• Click Edit button to enter edit mode</p>
                <p>• Drag cells to reorder in edit mode</p>
                <p>• Click empty cells to spawn new views</p>
                <p>• Use D-Pad or click cells to navigate</p>
                <p>• D-Pad buttons disable at boundaries</p>
                <p>• Use zoom controls to adjust view</p>
            </div>
        </div>
    );
};

Interactive.decorators = [
    (Story) => (
        <div style={{
            width: '340px',
            background: '#0f0f0f',
            borderRadius: '8px',
            padding: '12px'
        }}>
            <Story />
        </div>
    ),
];

// Collapsed vs Expanded Toggle
export const CollapsedExpandedToggle = () => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                    padding: '8px 12px',
                    background: 'rgba(96, 165, 250, 0.15)',
                    border: '1px solid rgba(96, 165, 250, 0.3)',
                    borderRadius: '4px',
                    color: '#60a5fa',
                    cursor: 'pointer',
                    fontSize: '12px',
                }}
            >
                {isExpanded ? 'Collapse' : 'Expand'} Grid
            </button>
            <GridLayoutPreview
                context="views"
                placements={samplePlacements}
                gridSize={{ rows: 4, cols: 4 }}
                isExpanded={isExpanded}
            />
        </div>
    );
};

CollapsedExpandedToggle.decorators = [
    (Story) => (
        <div style={{
            width: '340px',
            background: '#0f0f0f',
            borderRadius: '8px',
            padding: '12px'
        }}>
            <Story />
        </div>
    ),
];