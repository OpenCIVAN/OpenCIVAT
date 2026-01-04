// src/ui/react/components/atoms/Slider/Slider.stories.jsx
import React, { useState } from 'react';
import { Slider } from './Slider';

export default {
    title: 'Atoms/Slider',
    component: Slider,
    parameters: {
        layout: 'centered',
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f', width: '300px' }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    render: function DefaultStory() {
        const [value, setValue] = useState(50);
        return <Slider value={value} onChange={setValue} />;
    },
};

export const WithLabel = {
    render: function WithLabelStory() {
        const [value, setValue] = useState(75);
        return <Slider value={value} onChange={setValue} label="Volume" />;
    },
};

export const HideValue = {
    render: function HideValueStory() {
        const [value, setValue] = useState(50);
        return <Slider value={value} onChange={setValue} label="Brightness" showValue={false} />;
    },
};

export const CustomRange = {
    render: function CustomRangeStory() {
        const [value, setValue] = useState(0);
        return (
            <Slider
                value={value}
                onChange={setValue}
                min={-100}
                max={100}
                label="Balance"
            />
        );
    },
};

export const WithStep = {
    render: function WithStepStory() {
        const [value, setValue] = useState(25);
        return (
            <Slider
                value={value}
                onChange={setValue}
                min={0}
                max={100}
                step={25}
                label="Quality"
            />
        );
    },
};

export const CustomFormatter = {
    render: function CustomFormatterStory() {
        const [value, setValue] = useState(50);
        return (
            <Slider
                value={value}
                onChange={setValue}
                label="Opacity"
                valueFormatter={(v) => `${v}%`}
            />
        );
    },
};

export const Disabled = {
    args: {
        value: 40,
        label: 'Disabled',
        disabled: true,
    },
};

export const TemperatureSlider = {
    render: function TemperatureStory() {
        const [temp, setTemp] = useState(22);
        return (
            <Slider
                value={temp}
                onChange={setTemp}
                min={16}
                max={30}
                step={0.5}
                label="Temperature"
                valueFormatter={(v) => `${v}°C`}
            />
        );
    },
};

export const MultipleSliders = {
    render: function MultipleSlidersStory() {
        const [values, setValues] = useState({ r: 128, g: 64, b: 200 });

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Slider
                    value={values.r}
                    onChange={(v) => setValues((prev) => ({ ...prev, r: v }))}
                    min={0}
                    max={255}
                    label="Red"
                />
                <Slider
                    value={values.g}
                    onChange={(v) => setValues((prev) => ({ ...prev, g: v }))}
                    min={0}
                    max={255}
                    label="Green"
                />
                <Slider
                    value={values.b}
                    onChange={(v) => setValues((prev) => ({ ...prev, b: v }))}
                    min={0}
                    max={255}
                    label="Blue"
                />
                <div style={{
                    height: '40px',
                    borderRadius: '4px',
                    background: `rgb(${values.r}, ${values.g}, ${values.b})`,
                }} />
            </div>
        );
    },
};

export const ZoomControl = {
    render: function ZoomControlStory() {
        const [zoom, setZoom] = useState(100);
        return (
            <Slider
                value={zoom}
                onChange={setZoom}
                min={25}
                max={400}
                step={25}
                label="Zoom"
                valueFormatter={(v) => `${v}%`}
            />
        );
    },
};
