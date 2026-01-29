/**
 * FilterToolbar Stories
 *
 * Main filter UI component with responsive layouts.
 */

import React, { useState, useMemo } from 'react';
import { FilterToolbar, LAYOUT_BREAKPOINTS } from './FilterToolbar';
import { useListFilter } from '@UI/react/hooks/useListFilter';
import { FILES_FILTER_CONFIG } from '@UI/react/hooks/useListFilter/filterConfigs';

export default {
  title: 'Organisms/FilterToolbar',
  component: FilterToolbar,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    layout: {
      control: 'select',
      options: ['auto', 'full', 'compact', 'minimal'],
    },
    width: {
      control: { type: 'range', min: 200, max: 600 },
    },
    showQuickFilters: { control: 'boolean' },
    maxVisibleQuickFilters: { control: { type: 'number', min: 1, max: 6 } },
  },
};

// Sample data for demonstrations
const SAMPLE_TYPE_COUNTS = {
  nifti: 23,
  dicom: 156,
  minc: 0,
  analyze: 5,
  vtk: 12,
  obj: 8,
  stl: 3,
  gltf: 0,
  ply: 1,
  png: 45,
  jpg: 89,
  tiff: 12,
  webp: 0,
  pdf: 7,
  csv: 15,
  json: 22,
  xml: 4,
};

const SAMPLE_QUICK_FILTER_COUNTS = {
  loaded: 42,
  starred: 12,
  shared: 8,
  linked: 5,
};

const SAMPLE_TAGS = [
  { id: 'brain', name: 'Brain', color: '#3b82f6', count: 45 },
  { id: 'spine', name: 'Spine', color: '#22c55e', count: 12 },
  { id: 'heart', name: 'Heart', color: '#ef4444', count: 8 },
  { id: 'important', name: 'Important', color: '#f59e0b', count: 15 },
  { id: 'review', name: 'Needs Review', color: '#8b5cf6', count: 6 },
];

// Base template with useListFilter
const Template = (args) => {
  const filter = useListFilter(FILES_FILTER_CONFIG);

  return (
    <div
      style={{
        width: args.width || '100%',
        maxWidth: 600,
        background: '#1a1a2e',
        padding: 16,
        borderRadius: 8,
      }}
    >
      <FilterToolbar
        filter={filter}
        config={FILES_FILTER_CONFIG}
        counts={SAMPLE_TYPE_COUNTS}
        quickFilterCounts={SAMPLE_QUICK_FILTER_COUNTS}
        tags={SAMPLE_TAGS}
        {...args}
      />
    </div>
  );
};

// Default - Full Layout
export const Default = Template.bind({});
Default.args = {
  layout: 'auto',
  width: 450,
  showQuickFilters: true,
  maxVisibleQuickFilters: 4,
};

// Full Layout (≥400px)
export const FullLayout = Template.bind({});
FullLayout.args = {
  layout: 'full',
  width: 500,
};

// Compact Layout (300-399px)
export const CompactLayout = Template.bind({});
CompactLayout.args = {
  layout: 'compact',
  width: 350,
};

// Minimal Layout (<300px)
export const MinimalLayout = Template.bind({});
MinimalLayout.args = {
  layout: 'minimal',
  width: 280,
};

// Interactive - Resize to See Layouts
export const InteractiveResize = () => {
  const [width, setWidth] = useState(450);
  const filter = useListFilter(FILES_FILTER_CONFIG);

  const layoutMode =
    width >= LAYOUT_BREAKPOINTS.FULL
      ? 'full'
      : width >= LAYOUT_BREAKPOINTS.COMPACT
        ? 'compact'
        : 'minimal';

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <input
          type="range"
          min={200}
          max={600}
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
          style={{ flex: 1 }}
        />
        <span style={{ color: '#fff', fontFamily: 'monospace' }}>
          {width}px ({layoutMode})
        </span>
      </div>

      <div
        style={{
          width: width,
          background: '#1a1a2e',
          padding: 16,
          borderRadius: 8,
          transition: 'width 0.2s ease',
        }}
      >
        <FilterToolbar
          filter={filter}
          config={FILES_FILTER_CONFIG}
          counts={SAMPLE_TYPE_COUNTS}
          quickFilterCounts={SAMPLE_QUICK_FILTER_COUNTS}
          tags={SAMPLE_TAGS}
          width={width}
        />
      </div>
    </div>
  );
};

// With Active Filters
export const WithActiveFilters = () => {
  const filter = useListFilter({
    ...FILES_FILTER_CONFIG,
    initialState: {
      search: 'brain',
      types: ['nifti', 'dicom'],
      quickFilters: ['loaded', 'starred'],
    },
  });

  return (
    <div
      style={{
        width: 500,
        background: '#1a1a2e',
        padding: 16,
        borderRadius: 8,
      }}
    >
      <FilterToolbar
        filter={filter}
        config={FILES_FILTER_CONFIG}
        counts={SAMPLE_TYPE_COUNTS}
        quickFilterCounts={SAMPLE_QUICK_FILTER_COUNTS}
        tags={SAMPLE_TAGS}
      />
    </div>
  );
};

// Without Quick Filters
export const WithoutQuickFilters = Template.bind({});
WithoutQuickFilters.args = {
  layout: 'full',
  width: 500,
  showQuickFilters: false,
};

// Without Tags
export const WithoutTags = () => {
  const filter = useListFilter(FILES_FILTER_CONFIG);

  return (
    <div
      style={{
        width: 450,
        background: '#1a1a2e',
        padding: 16,
        borderRadius: 8,
      }}
    >
      <FilterToolbar
        filter={filter}
        config={FILES_FILTER_CONFIG}
        counts={SAMPLE_TYPE_COUNTS}
        quickFilterCounts={SAMPLE_QUICK_FILTER_COUNTS}
        tags={[]}
      />
    </div>
  );
};

// All Layouts Side by Side
export const AllLayouts = () => {
  const filterFull = useListFilter(FILES_FILTER_CONFIG);
  const filterCompact = useListFilter(FILES_FILTER_CONFIG);
  const filterMinimal = useListFilter(FILES_FILTER_CONFIG);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h3 style={{ color: '#fff', marginBottom: 8 }}>Full (≥400px)</h3>
        <div
          style={{
            width: 500,
            background: '#1a1a2e',
            padding: 16,
            borderRadius: 8,
          }}
        >
          <FilterToolbar
            filter={filterFull}
            config={FILES_FILTER_CONFIG}
            counts={SAMPLE_TYPE_COUNTS}
            quickFilterCounts={SAMPLE_QUICK_FILTER_COUNTS}
            tags={SAMPLE_TAGS}
            layout="full"
          />
        </div>
      </div>

      <div>
        <h3 style={{ color: '#fff', marginBottom: 8 }}>Compact (300-399px)</h3>
        <div
          style={{
            width: 350,
            background: '#1a1a2e',
            padding: 16,
            borderRadius: 8,
          }}
        >
          <FilterToolbar
            filter={filterCompact}
            config={FILES_FILTER_CONFIG}
            counts={SAMPLE_TYPE_COUNTS}
            quickFilterCounts={SAMPLE_QUICK_FILTER_COUNTS}
            tags={SAMPLE_TAGS}
            layout="compact"
          />
        </div>
      </div>

      <div>
        <h3 style={{ color: '#fff', marginBottom: 8 }}>Minimal (&lt;300px)</h3>
        <div
          style={{
            width: 260,
            background: '#1a1a2e',
            padding: 16,
            borderRadius: 8,
          }}
        >
          <FilterToolbar
            filter={filterMinimal}
            config={FILES_FILTER_CONFIG}
            counts={SAMPLE_TYPE_COUNTS}
            quickFilterCounts={SAMPLE_QUICK_FILTER_COUNTS}
            tags={SAMPLE_TAGS}
            layout="minimal"
          />
        </div>
      </div>
    </div>
  );
};
