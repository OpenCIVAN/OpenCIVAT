// src/stories/molecules/DirectionalButton.stories.jsx
import React, { useState } from 'react';
import { DirectionalButton } from '@UI/react/components/molecules';

export default {
    title: 'Molecules/DirectionalButton',
    component: DirectionalButton,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
Navigation button for D-pads and navigators.

Use for:
- D-pad controllers
- Viewport navigators
- Canvas navigators
                `,
            },
        },
    },
    argTypes: {
        direction: { control: 'select', options: ['up', 'down', 'left', 'right', 'center'] },
        size: { control: 'select', options: ['sm', 'md', 'lg'] },
        active: { control: 'boolean' },
        disabled: { control: 'boolean' },
    },
};

export const Default = {
    args: {
        direction: 'up',
    },
};

export const AllDirections = {
    render: () => (
        <div style={{ display: 'flex', gap: '8px' }}>
            <DirectionalButton direction="up" />
            <DirectionalButton direction="down" />
            <DirectionalButton direction="left" />
            <DirectionalButton direction="right" />
            <DirectionalButton direction="center" />
        </div>
    ),
};

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <DirectionalButton direction="up" size="sm" />
            <DirectionalButton direction="up" size="md" />
            <DirectionalButton direction="up" size="lg" />
        </div>
    ),
};

export const DPadController = {
    render: () => {
        const [lastPressed, setLastPressed] = useState('none');

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 40px)',
                    gridTemplateRows: 'repeat(3, 40px)',
                    gap: '4px',
                }}>
                    <div />
                    <DirectionalButton
                        direction="up"
                        onClick={() => setLastPressed('up')}
                    />
                    <div />
                    <DirectionalButton
                        direction="left"
                        onClick={() => setLastPressed('left')}
                    />
                    <DirectionalButton
                        direction="center"
                        onClick={() => setLastPressed('center')}
                    />
                    <DirectionalButton
                        direction="right"
                        onClick={() => setLastPressed('right')}
                    />
                    <div />
                    <DirectionalButton
                        direction="down"
                        onClick={() => setLastPressed('down')}
                    />
                    <div />
                </div>
                <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>
                    Last pressed: {lastPressed}
                </p>
            </div>
        );
    },
};

export const NavigatorBar = {
    render: () => (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '6px',
        }}>
            <DirectionalButton direction="left" size="sm" tooltip="Previous" />
            <DirectionalButton direction="center" size="sm" tooltip="Home" />
            <DirectionalButton direction="right" size="sm" tooltip="Next" />
        </div>
    ),
};

export const WithLongPress = {
    render: () => {
        const [count, setCount] = useState(0);
        const [longPressed, setLongPressed] = useState(false);

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <DirectionalButton
                    direction="up"
                    size="lg"
                    onClick={() => setCount(c => c + 1)}
                    onLongPress={() => {
                        setLongPressed(true);
                        setTimeout(() => setLongPressed(false), 1000);
                    }}
                />
                <div style={{ textAlign: 'center' }}>
                    <p style={{ color: '#e0e0e0', margin: '0 0 4px' }}>Count: {count}</p>
                    <p style={{ color: longPressed ? '#4ecdc4' : '#888', fontSize: '12px', margin: 0 }}>
                        {longPressed ? 'Long press detected!' : 'Try long pressing'}
                    </p>
                </div>
            </div>
        );
    },
};
