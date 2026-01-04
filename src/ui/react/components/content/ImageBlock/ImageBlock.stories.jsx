// src/ui/react/components/content/ImageBlock/ImageBlock.stories.jsx
import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

// Mock ImageBlock for Storybook
const MockImageBlock = ({
    image = {},
    readOnly = false,
    isLoading = false,
    hasError = false,
}) => {
    const [showControls, setShowControls] = useState(false);

    const { src, caption, fit = 'contain', originalName = 'image.jpg' } = image;

    return (
        <div
            style={{
                position: 'relative',
                width: '300px',
                height: '200px',
                background: '#1a1a2e',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
        >
            {/* Image container */}
            <div style={{
                width: '100%',
                height: caption ? 'calc(100% - 32px)' : '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                {isLoading && (
                    <div style={{ color: '#6b7280', fontSize: '13px' }}>
                        <Icon name="loader" size={20} style={{ marginBottom: '8px' }} />
                        <div>Loading...</div>
                    </div>
                )}

                {hasError && (
                    <div style={{ textAlign: 'center', color: '#ef4444' }}>
                        <Icon name="imageOff" size={24} style={{ marginBottom: '8px' }} />
                        <div style={{ fontSize: '12px' }}>Failed to load image</div>
                        <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px' }}>
                            {originalName}
                        </div>
                    </div>
                )}

                {!isLoading && !hasError && src && (
                    <img
                        src={src}
                        alt={caption || originalName}
                        style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: fit,
                        }}
                    />
                )}

                {!isLoading && !hasError && !src && (
                    <div style={{ textAlign: 'center', color: '#6b7280' }}>
                        <Icon name="image" size={32} style={{ marginBottom: '8px' }} />
                        <div style={{ fontSize: '12px' }}>No image source</div>
                    </div>
                )}
            </div>

            {/* Caption */}
            {caption && (
                <div style={{
                    padding: '6px 12px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    color: '#9ca3af',
                    fontSize: '12px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                }}>
                    {caption}
                </div>
            )}

            {/* Controls overlay */}
            {showControls && !readOnly && !isLoading && !hasError && (
                <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    display: 'flex',
                    gap: '4px',
                }}>
                    <button style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        background: 'rgba(0, 0, 0, 0.6)',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        cursor: 'pointer',
                    }}>
                        <Icon name="move" size={14} />
                    </button>
                    <button style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        background: 'rgba(0, 0, 0, 0.6)',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#ef4444',
                        cursor: 'pointer',
                    }}>
                        <Icon name="trash2" size={14} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default {
    title: 'Content/ImageBlock',
    component: MockImageBlock,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        readOnly: { control: 'boolean' },
        isLoading: { control: 'boolean' },
        hasError: { control: 'boolean' },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f' }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    args: {
        image: {
            src: 'https://picsum.photos/300/200',
            caption: 'Sample Image',
            fit: 'contain',
        },
    },
};

export const WithCaption = {
    args: {
        image: {
            src: 'https://picsum.photos/300/200',
            caption: 'Data visualization screenshot from analysis session',
            fit: 'contain',
        },
    },
};

export const Loading = {
    args: {
        image: { originalName: 'chart.png' },
        isLoading: true,
    },
};

export const Error = {
    args: {
        image: { originalName: 'missing-image.jpg' },
        hasError: true,
    },
};

export const ReadOnly = {
    args: {
        image: {
            src: 'https://picsum.photos/300/200',
            caption: 'View-only image',
        },
        readOnly: true,
    },
};

export const NoSource = {
    args: {
        image: {},
    },
};
