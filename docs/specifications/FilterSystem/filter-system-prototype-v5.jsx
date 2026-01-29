import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Search, X, ChevronDown, Check, Filter, Tag, ArrowDownAZ, ArrowUpDown, SlidersHorizontal, Star, StarOff, CheckCircle, Circle, Users, Link2, Folder, File, FileText, Image, Box, Heart, Database, Clock, HardDrive, Eye, EyeOff, Layers, ChevronRight, RotateCcw, Sparkles, Monitor, Smartphone, PanelLeftClose, Grip, ChevronUp, MoreHorizontal } from 'lucide-react';

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_FILES = [
  { id: 'f1', name: 'brain_scan_001.nii', type: 'nifti', category: 'medical', size: 52428800, updatedAt: Date.now() - 3600000, isStarred: true, loadState: 'loaded', isShared: true, isLinked: false, tags: ['brain', 'mri'] },
  { id: 'f2', name: 'brain_scan_002.nii', type: 'nifti', category: 'medical', size: 48576000, updatedAt: Date.now() - 7200000, isStarred: true, loadState: 'loaded', isShared: false, isLinked: true, tags: ['brain', 'mri'] },
  { id: 'f3', name: 'heart_ct_series.dcm', type: 'dicom', category: 'medical', size: 125829120, updatedAt: Date.now() - 86400000, isStarred: false, loadState: 'stored', isShared: true, isLinked: false, tags: ['cardiac', 'ct'] },
  { id: 'f4', name: 'spine_mri.nii', type: 'nifti', category: 'medical', size: 31457280, updatedAt: Date.now() - 172800000, isStarred: false, loadState: 'loading', isShared: false, isLinked: false, tags: ['spine'] },
  { id: 'f5', name: 'lung_nodules.dcm', type: 'dicom', category: 'medical', size: 89128960, updatedAt: Date.now() - 259200000, isStarred: true, loadState: 'stored', isShared: true, isLinked: true, tags: ['lung', 'ct'] },
  { id: 'f6', name: 'skull_model.vtk', type: 'vtk', category: 'mesh', size: 15728640, updatedAt: Date.now() - 43200000, isStarred: false, loadState: 'loaded', isShared: false, isLinked: false, tags: ['anatomy', '3d'] },
  { id: 'f7', name: 'heart_mesh.obj', type: 'obj', category: 'mesh', size: 8388608, updatedAt: Date.now() - 129600000, isStarred: true, loadState: 'stored', isShared: true, isLinked: false, tags: ['cardiac', '3d'] },
  { id: 'f8', name: 'bone_structure.stl', type: 'stl', category: 'mesh', size: 4194304, updatedAt: Date.now() - 216000000, isStarred: false, loadState: 'stored', isShared: false, isLinked: true, tags: ['bone', '3d'] },
  { id: 'f9', name: 'full_body_scan.gltf', type: 'gltf', category: 'mesh', size: 67108864, updatedAt: Date.now() - 302400000, isStarred: false, loadState: 'error', isShared: false, isLinked: false, tags: ['full-body'] },
  { id: 'f10', name: 'xray_chest.png', type: 'png', category: 'images', size: 2097152, updatedAt: Date.now() - 14400000, isStarred: false, loadState: 'loaded', isShared: false, isLinked: false, tags: ['xray', 'chest'] },
  { id: 'f11', name: 'pathology_slide.tiff', type: 'tiff', category: 'images', size: 104857600, updatedAt: Date.now() - 345600000, isStarred: false, loadState: 'stored', isShared: true, isLinked: false, tags: ['pathology'] },
  { id: 'f12', name: 'reference_atlas.jpg', type: 'jpg', category: 'images', size: 1048576, updatedAt: Date.now() - 432000000, isStarred: true, loadState: 'loaded', isShared: false, isLinked: false, tags: ['reference'] },
  { id: 'f13', name: 'patient_data.csv', type: 'csv', category: 'documents', size: 524288, updatedAt: Date.now() - 21600000, isStarred: false, loadState: 'loaded', isShared: true, isLinked: false, tags: ['data', 'patients'] },
  { id: 'f14', name: 'analysis_report.pdf', type: 'pdf', category: 'documents', size: 3145728, updatedAt: Date.now() - 518400000, isStarred: false, loadState: 'stored', isShared: false, isLinked: false, tags: ['report'] },
  { id: 'f15', name: 'measurements.json', type: 'json', category: 'documents', size: 65536, updatedAt: Date.now() - 28800000, isStarred: false, loadState: 'loaded', isShared: false, isLinked: true, tags: ['data'] },
];

const TYPE_CATEGORIES = [
  { id: 'medical', label: 'Medical Imaging', icon: Heart, types: [
    { id: 'nifti', label: 'NIfTI' }, { id: 'dicom', label: 'DICOM' },
    { id: 'minc', label: 'MINC' }, { id: 'analyze', label: 'Analyze' },
  ]},
  { id: 'mesh', label: '3D Meshes', icon: Box, types: [
    { id: 'vtk', label: 'VTK' }, { id: 'obj', label: 'OBJ' },
    { id: 'stl', label: 'STL' }, { id: 'gltf', label: 'glTF' }, { id: 'ply', label: 'PLY' },
  ]},
  { id: 'images', label: 'Images', icon: Image, types: [
    { id: 'png', label: 'PNG' }, { id: 'jpg', label: 'JPEG' },
    { id: 'tiff', label: 'TIFF' }, { id: 'webp', label: 'WebP' },
  ]},
  { id: 'documents', label: 'Documents', icon: FileText, types: [
    { id: 'pdf', label: 'PDF' }, { id: 'csv', label: 'CSV' },
    { id: 'json', label: 'JSON' }, { id: 'xml', label: 'XML' },
  ]},
];

const ALL_TAGS = [
  { id: 'brain', name: 'brain', category: 'anatomy' },
  { id: 'cardiac', name: 'cardiac', category: 'anatomy' },
  { id: 'spine', name: 'spine', category: 'anatomy' },
  { id: 'lung', name: 'lung', category: 'anatomy' },
  { id: 'bone', name: 'bone', category: 'anatomy' },
  { id: 'mri', name: 'MRI', category: 'modality' },
  { id: 'ct', name: 'CT', category: 'modality' },
  { id: 'xray', name: 'X-Ray', category: 'modality' },
  { id: '3d', name: '3D Model', category: 'type' },
  { id: 'data', name: 'Data', category: 'type' },
  { id: 'report', name: 'Report', category: 'type' },
  { id: 'reference', name: 'Reference', category: 'type' },
];

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name (A→Z)', shortLabel: 'Name', icon: ArrowDownAZ },
  { value: 'name-desc', label: 'Name (Z→A)', shortLabel: 'Name', icon: ArrowDownAZ },
  { value: 'date-desc', label: 'Date (Newest)', shortLabel: 'Date', icon: Clock },
  { value: 'date-asc', label: 'Date (Oldest)', shortLabel: 'Date', icon: Clock },
  { value: 'size-desc', label: 'Size (Largest)', shortLabel: 'Size', icon: HardDrive },
  { value: 'size-asc', label: 'Size (Smallest)', shortLabel: 'Size', icon: HardDrive },
];

const QUICK_FILTER_DEFS = [
  { id: 'loaded', label: 'Loaded', icon: CheckCircle, predicate: (f) => f.loadState === 'loaded' },
  { id: 'starred', label: 'Starred', icon: Star, predicate: (f) => f.isStarred },
  { id: 'shared', label: 'Shared', icon: Users, predicate: (f) => f.isShared },
  { id: 'linked', label: 'Linked', icon: Link2, predicate: (f) => f.isLinked },
];

// =============================================================================
// DESIGN TOKENS
// =============================================================================

const tokens = {
  colors: {
    bg: {
      primary: 'rgba(15, 23, 42, 0.95)',
      secondary: 'rgba(30, 41, 59, 0.8)',
      tertiary: 'rgba(51, 65, 85, 0.6)',
      hover: 'rgba(71, 85, 105, 0.4)',
      active: 'rgba(59, 130, 246, 0.2)',
    },
    border: {
      subtle: 'rgba(148, 163, 184, 0.1)',
      default: 'rgba(148, 163, 184, 0.2)',
      focus: 'rgba(59, 130, 246, 0.5)',
    },
    text: {
      primary: 'rgba(248, 250, 252, 0.95)',
      secondary: 'rgba(203, 213, 225, 0.8)',
      muted: 'rgba(148, 163, 184, 0.6)',
    },
    accent: {
      blue: '#3b82f6',
      green: '#22c55e',
      amber: '#f59e0b',
      red: '#ef4444',
      purple: '#8b5cf6',
      teal: '#14b8a6',
    },
    status: {
      loaded: '#22c55e',
      loading: '#f59e0b',
      stored: '#64748b',
      error: '#ef4444',
    },
  },
  radius: { sm: '4px', md: '6px', lg: '8px', xl: '12px' },
  fontSize: { xs: '10px', sm: '11px', md: '12px', lg: '13px' },
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

// =============================================================================
// HEADLESS HOOK: useListFilter
// =============================================================================

function useListFilter({ items, searchFields = (item) => [item.name || ''], quickFilterDefs = [], initialState = {} }) {
  const [searchQuery, setSearchQuery] = useState(initialState.search || '');
  const [selectedTypes, setSelectedTypes] = useState(initialState.types || []);
  const [selectedTags, setSelectedTags] = useState(initialState.tags || []);
  const [quickFilters, setQuickFilters] = useState(initialState.quickFilters || []);
  const [sortBy, setSortBy] = useState(initialState.sortBy || 'date-desc');

  const toggleType = useCallback((typeId) => {
    setSelectedTypes(prev => prev.includes(typeId) ? prev.filter(t => t !== typeId) : [...prev, typeId]);
  }, []);

  const toggleTag = useCallback((tagId) => {
    setSelectedTags(prev => prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]);
  }, []);

  const toggleQuickFilter = useCallback((filterId) => {
    setQuickFilters(prev => prev.includes(filterId) ? prev.filter(f => f !== filterId) : [...prev, filterId]);
  }, []);

  const selectAllTypes = useCallback(() => {
    setSelectedTypes(TYPE_CATEGORIES.flatMap(cat => cat.types.map(t => t.id)));
  }, []);

  const clearAllTypes = useCallback(() => setSelectedTypes([]), []);
  const clearAllTags = useCallback(() => setSelectedTags([]), []);

  const clearAll = useCallback(() => {
    setSearchQuery('');
    setSelectedTypes([]);
    setSelectedTags([]);
    setQuickFilters([]);
  }, []);

  const applyFilters = useCallback((itemList) => {
    let result = [...itemList];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => searchFields(item).some(field => field?.toLowerCase().includes(query)));
    }
    if (selectedTypes.length > 0) {
      result = result.filter(item => selectedTypes.includes(item.type));
    }
    if (selectedTags.length > 0) {
      result = result.filter(item => item.tags?.some(tag => selectedTags.includes(tag)));
    }
    if (quickFilters.length > 0) {
      result = result.filter(item => quickFilters.every(filterId => {
        const def = quickFilterDefs.find(d => d.id === filterId);
        return def ? def.predicate(item) : true;
      }));
    }
    const [sortField, sortDir] = sortBy.split('-');
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'date') cmp = a.updatedAt - b.updatedAt;
      else if (sortField === 'size') cmp = a.size - b.size;
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return result;
  }, [searchQuery, selectedTypes, selectedTags, quickFilters, sortBy, searchFields, quickFilterDefs]);

  const applyToSections = useCallback((sections) => {
    const results = {};
    const counts = { total: 0, matched: 0, bySection: {} };
    Object.entries(sections).forEach(([key, sectionItems]) => {
      const filtered = applyFilters(sectionItems);
      results[key] = filtered;
      counts.bySection[key] = { total: sectionItems.length, matched: filtered.length };
      counts.total += sectionItems.length;
      counts.matched += filtered.length;
    });
    return { results, counts };
  }, [applyFilters]);

  const hasActiveFilters = searchQuery.length > 0 || selectedTypes.length > 0 || selectedTags.length > 0 || quickFilters.length > 0;
  const activeFilterCount = (searchQuery ? 1 : 0) + selectedTypes.length + selectedTags.length + quickFilters.length;

  return {
    searchQuery, selectedTypes, selectedTags, quickFilters, sortBy,
    hasActiveFilters, activeFilterCount,
    setSearchQuery, toggleType, toggleTag, toggleQuickFilter,
    selectAllTypes, clearAllTypes, clearAllTags, setSortBy, clearAll,
    applyFilters, applyToSections,
  };
}

// =============================================================================
// COMPONENTS
// =============================================================================

const Tooltip = ({ content, children, enabled = true }) => {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  if (!enabled) return children;
  return (
    <div
      onMouseEnter={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setPos({ x: rect.left + rect.width / 2, y: rect.top - 4 });
        setShow(true);
      }}
      onMouseLeave={() => setShow(false)}
      style={{ display: 'inline-flex' }}
    >
      {children}
      {show && (
        <div style={{
          position: 'fixed', left: pos.x, top: pos.y, transform: 'translate(-50%, -100%)',
          padding: '4px 8px', background: tokens.colors.bg.primary,
          border: `1px solid ${tokens.colors.border.default}`, borderRadius: tokens.radius.sm,
          color: tokens.colors.text.primary, fontSize: tokens.fontSize.xs,
          whiteSpace: 'nowrap', zIndex: 9999, pointerEvents: 'none',
        }}>{content}</div>
      )}
    </div>
  );
};

const Dropdown = ({ isOpen, onClose, triggerRef, children, align = 'start', width = 280 }) => {
  const dropdownRef = useRef(null);
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          triggerRef.current && !triggerRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, triggerRef]);
  if (!isOpen || !triggerRef.current) return null;
  const rect = triggerRef.current.getBoundingClientRect();
  return (
    <div ref={dropdownRef} style={{
      position: 'fixed', top: rect.bottom + 4, left: align === 'start' ? rect.left : rect.right - width,
      width, maxHeight: 450, background: tokens.colors.bg.primary,
      border: `1px solid ${tokens.colors.border.default}`, borderRadius: tokens.radius.lg,
      boxShadow: '0 10px 40px rgba(0,0,0,0.5)', zIndex: 1000, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>{children}</div>
  );
};

const SearchInput = ({ value, onChange, placeholder = 'Search...', compact = false }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: compact ? 6 : 8,
    padding: compact ? '6px 8px' : '8px 12px',
    background: tokens.colors.bg.secondary, borderRadius: tokens.radius.md,
    border: `1px solid ${tokens.colors.border.subtle}`, flex: 1, minWidth: 0,
  }}>
    <Search size={compact ? 12 : 14} color={tokens.colors.text.muted} style={{ flexShrink: 0 }} />
    <input
      type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      style={{
        flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
        color: tokens.colors.text.primary, fontSize: compact ? tokens.fontSize.sm : tokens.fontSize.md,
      }}
    />
    {value && (
      <button onClick={() => onChange('')} style={{
        background: 'transparent', border: 'none', padding: 2, cursor: 'pointer',
        display: 'flex', borderRadius: tokens.radius.sm, flexShrink: 0,
      }}>
        <X size={compact ? 10 : 12} color={tokens.colors.text.muted} />
      </button>
    )}
  </div>
);

const QuickFilterChip = ({ label, icon: Icon, active, onClick, count, compact = false }) => {
  const chip = (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: compact ? 4 : 6, padding: compact ? '5px 8px' : '5px 10px',
      background: active ? tokens.colors.bg.active : tokens.colors.bg.secondary,
      border: `1px solid ${active ? tokens.colors.accent.blue : tokens.colors.border.subtle}`,
      borderRadius: tokens.radius.md,
      color: active ? tokens.colors.accent.blue : tokens.colors.text.secondary,
      fontSize: tokens.fontSize.sm, cursor: 'pointer', whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      {Icon && <Icon size={compact ? 12 : 11} />}
      {!compact && <span>{label}</span>}
      <span style={{
        padding: '0 4px',
        background: active ? tokens.colors.accent.blue : tokens.colors.bg.tertiary,
        color: active ? '#fff' : tokens.colors.text.muted,
        borderRadius: 8, fontSize: tokens.fontSize.xs, fontWeight: 500,
        minWidth: 14, textAlign: 'center', lineHeight: '14px',
      }}>{count}</span>
    </button>
  );
  return compact ? <Tooltip content={label}>{chip}</Tooltip> : chip;
};

const DropdownTrigger = React.forwardRef(({ label, icon: Icon, isOpen, onClick, badge, active, compact = false, iconOnly = false }, ref) => {
  const btn = (
    <button ref={ref} onClick={onClick} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 5, padding: iconOnly ? '6px' : (compact ? '5px 8px' : '5px 10px'),
      background: active ? tokens.colors.bg.active : tokens.colors.bg.secondary,
      border: `1px solid ${active ? tokens.colors.accent.blue : tokens.colors.border.subtle}`,
      borderRadius: tokens.radius.md,
      color: active ? tokens.colors.accent.blue : tokens.colors.text.secondary,
      fontSize: tokens.fontSize.sm, cursor: 'pointer', whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      {Icon && <Icon size={compact || iconOnly ? 13 : 12} />}
      {!iconOnly && !compact && label && <span>{label}</span>}
      {badge > 0 && (
        <span style={{
          padding: '0 4px', background: tokens.colors.accent.blue, color: '#fff',
          borderRadius: 8, fontSize: tokens.fontSize.xs, fontWeight: 500,
          minWidth: 14, textAlign: 'center', lineHeight: '14px',
        }}>{badge}</span>
      )}
      {!iconOnly && (
        <ChevronDown size={11} style={{
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
          transition: 'transform 0.15s ease',
        }} />
      )}
    </button>
  );
  return (compact || iconOnly) ? <Tooltip content={label}>{btn}</Tooltip> : btn;
});

// =============================================================================
// COMBINED FILTERS DROPDOWN (for minimal mode)
// =============================================================================

const CombinedFiltersDropdown = ({
  isOpen,
  onClose,
  triggerRef,
  // Types
  categories,
  selectedTypes,
  typeCounts,
  onToggleType,
  onSelectAllTypes,
  onClearAllTypes,
  // Tags
  tags,
  selectedTags,
  onToggleTag,
  onClearAllTags,
}) => {
  const [activeTab, setActiveTab] = useState('types');
  const [search, setSearch] = useState('');

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setActiveTab('types');
    }
  }, [isOpen]);

  // Filter categories by search
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const query = search.toLowerCase();
    return categories.map(cat => ({ ...cat, types: cat.types.filter(t => t.label.toLowerCase().includes(query)) })).filter(cat => cat.types.length > 0);
  }, [categories, search]);

  // Filter tags by search
  const tagsByCategory = useMemo(() => {
    const cats = {};
    tags.forEach(tag => { if (!cats[tag.category]) cats[tag.category] = []; cats[tag.category].push(tag); });
    return cats;
  }, [tags]);

  const filteredTagCategories = useMemo(() => {
    if (!search.trim()) return tagsByCategory;
    const query = search.toLowerCase();
    const filtered = {};
    Object.entries(tagsByCategory).forEach(([cat, catTags]) => {
      const matching = catTags.filter(t => t.name.toLowerCase().includes(query));
      if (matching.length > 0) filtered[cat] = matching;
    });
    return filtered;
  }, [tagsByCategory, search]);

  // Only Types and Tags tabs - Sort has its own button
  const tabs = [
    { id: 'types', label: 'Types', icon: File, count: selectedTypes.length },
    { id: 'tags', label: 'Tags', icon: Tag, count: selectedTags.length },
  ];

  return (
    <Dropdown isOpen={isOpen} onClose={onClose} triggerRef={triggerRef} width={300}>
      {/* Tabs */}
      <div style={{
        display: 'flex', borderBottom: `1px solid ${tokens.colors.border.subtle}`,
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '10px 8px', background: 'transparent', border: 'none',
              borderBottom: activeTab === tab.id ? `2px solid ${tokens.colors.accent.blue}` : '2px solid transparent',
              color: activeTab === tab.id ? tokens.colors.accent.blue : tokens.colors.text.secondary,
              fontSize: tokens.fontSize.sm, cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            <tab.icon size={12} />
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span style={{
                padding: '0 5px', background: tokens.colors.accent.blue, color: '#fff',
                borderRadius: 8, fontSize: tokens.fontSize.xs,
              }}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Search (for types and tags) */}
      {activeTab !== 'sort' && (
        <div style={{ padding: 8, borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={activeTab === 'types' ? 'Search types...' : 'Search tags...'}
            compact
          />
        </div>
      )}

      {/* Types Tab */}
      {activeTab === 'types' && (
        <>
          <div style={{ display: 'flex', gap: 8, padding: '8px 12px', borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
            <button onClick={onSelectAllTypes} style={{ flex: 1, padding: '6px 8px', background: tokens.colors.bg.secondary, border: `1px solid ${tokens.colors.border.subtle}`, borderRadius: tokens.radius.sm, color: tokens.colors.text.secondary, fontSize: tokens.fontSize.sm, cursor: 'pointer' }}>Select All</button>
            <button onClick={onClearAllTypes} style={{ flex: 1, padding: '6px 8px', background: tokens.colors.bg.secondary, border: `1px solid ${tokens.colors.border.subtle}`, borderRadius: tokens.radius.sm, color: tokens.colors.text.secondary, fontSize: tokens.fontSize.sm, cursor: 'pointer' }}>Clear</button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
            {filteredCategories.map(category => {
              const CategoryIcon = category.icon;
              return (
                <div key={category.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px 4px', color: tokens.colors.text.muted, fontSize: tokens.fontSize.xs, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <CategoryIcon size={11} />{category.label}
                  </div>
                  {category.types.map(type => {
                    const count = typeCounts[type.id] || 0;
                    const isSelected = selectedTypes.includes(type.id);
                    const isEmpty = count === 0;
                    return (
                      <label key={type.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px 8px 24px', cursor: isEmpty ? 'not-allowed' : 'pointer', opacity: isEmpty ? 0.4 : 1, background: isSelected ? tokens.colors.bg.active : 'transparent' }}>
                        <div style={{ width: 16, height: 16, borderRadius: 3, border: `1.5px solid ${isSelected ? tokens.colors.accent.blue : tokens.colors.border.default}`, background: isSelected ? tokens.colors.accent.blue : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isSelected && <Check size={10} color="#fff" strokeWidth={3} />}
                        </div>
                        <input type="checkbox" checked={isSelected} disabled={isEmpty} onChange={() => !isEmpty && onToggleType(type.id)} style={{ display: 'none' }} />
                        <span style={{ flex: 1, color: tokens.colors.text.primary, fontSize: tokens.fontSize.md }}>{type.label}</span>
                        <span style={{ color: tokens.colors.text.muted, fontSize: tokens.fontSize.sm }}>({count})</span>
                      </label>
                    );
                  })}
                </div>
              );
            })}
            {filteredCategories.length === 0 && (
              <div style={{ padding: 16, textAlign: 'center', color: tokens.colors.text.muted, fontSize: tokens.fontSize.sm }}>
                No types match "{search}"
              </div>
            )}
          </div>
        </>
      )}

      {/* Tags Tab */}
      {activeTab === 'tags' && (
        <>
          <div style={{ display: 'flex', gap: 8, padding: '8px 12px', borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
            <button onClick={onClearAllTags} style={{ flex: 1, padding: '6px 8px', background: tokens.colors.bg.secondary, border: `1px solid ${tokens.colors.border.subtle}`, borderRadius: tokens.radius.sm, color: tokens.colors.text.secondary, fontSize: tokens.fontSize.sm, cursor: 'pointer' }}>Clear All</button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
            {Object.entries(filteredTagCategories).map(([category, catTags]) => (
              <div key={category}>
                <div style={{ padding: '8px 12px 4px', color: tokens.colors.text.muted, fontSize: tokens.fontSize.xs, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{category}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 12px 8px' }}>
                  {catTags.map(tag => {
                    const isSelected = selectedTags.includes(tag.id);
                    return (
                      <button key={tag.id} onClick={() => onToggleTag(tag.id)} style={{
                        padding: '4px 10px', background: isSelected ? tokens.colors.accent.purple + '30' : tokens.colors.bg.secondary,
                        border: `1px solid ${isSelected ? tokens.colors.accent.purple : tokens.colors.border.subtle}`,
                        borderRadius: 20, color: isSelected ? tokens.colors.accent.purple : tokens.colors.text.secondary,
                        fontSize: tokens.fontSize.sm, cursor: 'pointer',
                      }}>{tag.name}</button>
                    );
                  })}
                </div>
              </div>
            ))}
            {Object.keys(filteredTagCategories).length === 0 && (
              <div style={{ padding: 16, textAlign: 'center', color: tokens.colors.text.muted, fontSize: tokens.fontSize.sm }}>
                No tags match "{search}"
              </div>
            )}
          </div>
        </>
      )}
    </Dropdown>
  );
};

// =============================================================================
// INDIVIDUAL DROPDOWNS (for full/compact modes)
// =============================================================================

const TypeFilterDropdown = ({ isOpen, onClose, triggerRef, categories, selectedTypes, typeCounts, onToggle, onSelectAll, onClearAll }) => {
  const [search, setSearch] = useState('');
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const query = search.toLowerCase();
    return categories.map(cat => ({ ...cat, types: cat.types.filter(t => t.label.toLowerCase().includes(query)) })).filter(cat => cat.types.length > 0);
  }, [categories, search]);

  useEffect(() => { if (!isOpen) setSearch(''); }, [isOpen]);

  return (
    <Dropdown isOpen={isOpen} onClose={onClose} triggerRef={triggerRef} width={280}>
      <div style={{ padding: 8, borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search types..." compact />
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '8px 12px', borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
        <button onClick={onSelectAll} style={{ flex: 1, padding: '6px 8px', background: tokens.colors.bg.secondary, border: `1px solid ${tokens.colors.border.subtle}`, borderRadius: tokens.radius.sm, color: tokens.colors.text.secondary, fontSize: tokens.fontSize.sm, cursor: 'pointer' }}>Select All</button>
        <button onClick={onClearAll} style={{ flex: 1, padding: '6px 8px', background: tokens.colors.bg.secondary, border: `1px solid ${tokens.colors.border.subtle}`, borderRadius: tokens.radius.sm, color: tokens.colors.text.secondary, fontSize: tokens.fontSize.sm, cursor: 'pointer' }}>Clear</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
        {filteredCategories.map(category => {
          const CategoryIcon = category.icon;
          return (
            <div key={category.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px 4px', color: tokens.colors.text.muted, fontSize: tokens.fontSize.xs, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <CategoryIcon size={11} />{category.label}
              </div>
              {category.types.map(type => {
                const count = typeCounts[type.id] || 0;
                const isSelected = selectedTypes.includes(type.id);
                const isEmpty = count === 0;
                return (
                  <label key={type.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px 8px 24px', cursor: isEmpty ? 'not-allowed' : 'pointer', opacity: isEmpty ? 0.4 : 1, background: isSelected ? tokens.colors.bg.active : 'transparent' }}>
                    <div style={{ width: 16, height: 16, borderRadius: 3, border: `1.5px solid ${isSelected ? tokens.colors.accent.blue : tokens.colors.border.default}`, background: isSelected ? tokens.colors.accent.blue : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isSelected && <Check size={10} color="#fff" strokeWidth={3} />}
                    </div>
                    <input type="checkbox" checked={isSelected} disabled={isEmpty} onChange={() => !isEmpty && onToggle(type.id)} style={{ display: 'none' }} />
                    <span style={{ flex: 1, color: tokens.colors.text.primary, fontSize: tokens.fontSize.md }}>{type.label}</span>
                    <span style={{ color: tokens.colors.text.muted, fontSize: tokens.fontSize.sm }}>({count})</span>
                  </label>
                );
              })}
            </div>
          );
        })}
      </div>
    </Dropdown>
  );
};

const TagsFilterDropdown = ({ isOpen, onClose, triggerRef, tags, selectedTags, onToggle }) => {
  const [search, setSearch] = useState('');
  const tagsByCategory = useMemo(() => {
    const categories = {};
    tags.forEach(tag => { if (!categories[tag.category]) categories[tag.category] = []; categories[tag.category].push(tag); });
    return categories;
  }, [tags]);
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return tagsByCategory;
    const query = search.toLowerCase();
    const filtered = {};
    Object.entries(tagsByCategory).forEach(([cat, catTags]) => {
      const matchingTags = catTags.filter(t => t.name.toLowerCase().includes(query));
      if (matchingTags.length > 0) filtered[cat] = matchingTags;
    });
    return filtered;
  }, [tagsByCategory, search]);

  useEffect(() => { if (!isOpen) setSearch(''); }, [isOpen]);

  return (
    <Dropdown isOpen={isOpen} onClose={onClose} triggerRef={triggerRef} width={240}>
      <div style={{ padding: 8, borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search tags..." compact />
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
        {Object.entries(filteredCategories).map(([category, catTags]) => (
          <div key={category}>
            <div style={{ padding: '8px 12px 4px', color: tokens.colors.text.muted, fontSize: tokens.fontSize.xs, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{category}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 12px 8px' }}>
              {catTags.map(tag => {
                const isSelected = selectedTags.includes(tag.id);
                return (
                  <button key={tag.id} onClick={() => onToggle(tag.id)} style={{
                    padding: '4px 10px', background: isSelected ? tokens.colors.accent.purple + '30' : tokens.colors.bg.secondary,
                    border: `1px solid ${isSelected ? tokens.colors.accent.purple : tokens.colors.border.subtle}`,
                    borderRadius: 20, color: isSelected ? tokens.colors.accent.purple : tokens.colors.text.secondary,
                    fontSize: tokens.fontSize.sm, cursor: 'pointer',
                  }}>{tag.name}</button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Dropdown>
  );
};

const SortDropdown = ({ isOpen, onClose, triggerRef, options, value, onChange }) => (
  <Dropdown isOpen={isOpen} onClose={onClose} triggerRef={triggerRef} width={180}>
    <div style={{ padding: '4px 0' }}>
      {options.map(option => {
        const Icon = option.icon;
        const isSelected = value === option.value;
        return (
          <button key={option.value} onClick={() => { onChange(option.value); onClose(); }} style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px',
            background: isSelected ? tokens.colors.bg.active : 'transparent', border: 'none',
            color: isSelected ? tokens.colors.accent.blue : tokens.colors.text.primary,
            fontSize: tokens.fontSize.md, cursor: 'pointer', textAlign: 'left',
          }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', border: `1.5px solid ${isSelected ? tokens.colors.accent.blue : tokens.colors.border.default}`, background: isSelected ? tokens.colors.accent.blue : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isSelected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
            </div>
            <Icon size={14} />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  </Dropdown>
);

// =============================================================================
// FILE ITEM & SECTION COMPONENTS
// =============================================================================

const FileItem = ({ file, onToggleStar, compact = false }) => {
  const statusColors = { loaded: tokens.colors.status.loaded, loading: tokens.colors.status.loading, stored: tokens.colors.status.stored, error: tokens.colors.status.error };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 8 : 10, padding: compact ? '8px 10px' : '10px 12px', borderBottom: `1px solid ${tokens.colors.border.subtle}`, cursor: 'pointer' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColors[file.loadState], flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: tokens.colors.text.primary, fontSize: compact ? tokens.fontSize.sm : tokens.fontSize.md, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
        {!compact && (
          <div style={{ display: 'flex', gap: 8, color: tokens.colors.text.muted, fontSize: tokens.fontSize.xs, marginTop: 2 }}>
            <span>{file.type.toUpperCase()}</span><span>•</span><span>{formatFileSize(file.size)}</span>
          </div>
        )}
      </div>
      <button onClick={(e) => { e.stopPropagation(); onToggleStar(file.id); }} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', borderRadius: tokens.radius.sm }}>
        {file.isStarred ? <Star size={compact ? 12 : 14} fill={tokens.colors.accent.amber} color={tokens.colors.accent.amber} /> : <StarOff size={compact ? 12 : 14} color={tokens.colors.text.muted} />}
      </button>
    </div>
  );
};

const SectionHeader = ({ title, icon: Icon, count, total, expanded, onToggle }) => (
  <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: tokens.colors.bg.secondary, borderBottom: `1px solid ${tokens.colors.border.subtle}`, cursor: 'pointer' }}>
    <ChevronRight size={14} color={tokens.colors.text.muted} style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.15s ease' }} />
    {Icon && <Icon size={14} color={tokens.colors.text.secondary} />}
    <span style={{ flex: 1, color: tokens.colors.text.primary, fontSize: tokens.fontSize.md, fontWeight: 500 }}>{title}</span>
    <span style={{ color: tokens.colors.text.muted, fontSize: tokens.fontSize.sm }}>{count !== total ? `${count} of ${total}` : count}</span>
  </div>
);

// =============================================================================
// QUICK FILTERS ROW
// =============================================================================

const QuickFiltersRow = ({ quickFilterDefs, activeFilters, onToggle, items, compact = false, maxVisible = 4, collapsed = false, onToggleCollapse }) => {
  const [showOverflow, setShowOverflow] = useState(false);
  const overflowRef = useRef(null);
  
  const counts = useMemo(() => {
    const result = {};
    quickFilterDefs.forEach(def => { result[def.id] = items.filter(def.predicate).length; });
    return result;
  }, [quickFilterDefs, items]);

  const visibleFilters = quickFilterDefs.slice(0, maxVisible);
  const overflowFilters = quickFilterDefs.slice(maxVisible);
  const hasOverflow = overflowFilters.length > 0;
  const overflowActiveCount = overflowFilters.filter(f => activeFilters.includes(f.id)).length;

  if (collapsed) {
    return (
      <button onClick={onToggleCollapse} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%',
        padding: '6px 12px', background: tokens.colors.bg.secondary, border: 'none',
        borderBottom: `1px solid ${tokens.colors.border.subtle}`, color: tokens.colors.text.muted,
        fontSize: tokens.fontSize.xs, cursor: 'pointer',
      }}>
        <ChevronDown size={10} /><span>Quick filters</span>
        {activeFilters.length > 0 && <span style={{ padding: '0 5px', background: tokens.colors.accent.blue, color: '#fff', borderRadius: 10, fontSize: tokens.fontSize.xs }}>{activeFilters.length}</span>}
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: tokens.colors.bg.secondary, borderBottom: `1px solid ${tokens.colors.border.subtle}`, flexWrap: 'nowrap', overflow: 'hidden' }}>
      <span style={{ color: tokens.colors.text.muted, fontSize: tokens.fontSize.xs, fontWeight: 500, flexShrink: 0 }}>Quick:</span>
      {visibleFilters.map(def => (
        <QuickFilterChip key={def.id} label={def.label} icon={def.icon} active={activeFilters.includes(def.id)} onClick={() => onToggle(def.id)} count={counts[def.id]} compact={compact} />
      ))}
      {hasOverflow && (
        <div style={{ position: 'relative' }}>
          <Tooltip content={`${overflowFilters.length} more filters`}>
            <button ref={overflowRef} onClick={() => setShowOverflow(!showOverflow)} style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px',
              background: overflowActiveCount > 0 ? tokens.colors.bg.active : tokens.colors.bg.tertiary,
              border: `1px solid ${overflowActiveCount > 0 ? tokens.colors.accent.blue : tokens.colors.border.subtle}`,
              borderRadius: tokens.radius.md, color: overflowActiveCount > 0 ? tokens.colors.accent.blue : tokens.colors.text.muted,
              fontSize: tokens.fontSize.sm, cursor: 'pointer', flexShrink: 0,
            }}>
              <MoreHorizontal size={12} /><span>+{overflowFilters.length}</span>
              {overflowActiveCount > 0 && <span style={{ padding: '0 4px', background: tokens.colors.accent.blue, color: '#fff', borderRadius: 8, fontSize: tokens.fontSize.xs, lineHeight: '14px' }}>{overflowActiveCount}</span>}
            </button>
          </Tooltip>
          <Dropdown isOpen={showOverflow} onClose={() => setShowOverflow(false)} triggerRef={overflowRef} width={180}>
            <div style={{ padding: '8px 0' }}>
              {overflowFilters.map(def => (
                <button key={def.id} onClick={() => onToggle(def.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px',
                  background: 'transparent', border: 'none',
                  color: activeFilters.includes(def.id) ? tokens.colors.accent.blue : tokens.colors.text.primary,
                  fontSize: tokens.fontSize.md, cursor: 'pointer', textAlign: 'left',
                }}>
                  <def.icon size={14} /><span style={{ flex: 1 }}>{def.label}</span>
                  <span style={{ padding: '0 5px', background: activeFilters.includes(def.id) ? tokens.colors.accent.blue : tokens.colors.bg.tertiary, color: activeFilters.includes(def.id) ? '#fff' : tokens.colors.text.muted, borderRadius: 8, fontSize: tokens.fontSize.xs }}>{counts[def.id]}</span>
                </button>
              ))}
            </div>
          </Dropdown>
        </div>
      )}
      {onToggleCollapse && (
        <button onClick={onToggleCollapse} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', color: tokens.colors.text.muted, flexShrink: 0 }}>
          <ChevronUp size={12} />
        </button>
      )}
    </div>
  );
};

// =============================================================================
// MAIN PROTOTYPE
// =============================================================================

export default function FilterSystemPrototypeV5() {
  const [layoutMode, setLayoutMode] = useState('full');
  const [quickFiltersCollapsed, setQuickFiltersCollapsed] = useState(false);
  const [files, setFiles] = useState(MOCK_FILES);
  const [starredExpanded, setStarredExpanded] = useState(true);
  const [allExpanded, setAllExpanded] = useState(true);
  
  // Dropdown states
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [combinedDropdownOpen, setCombinedDropdownOpen] = useState(false);
  
  const typeButtonRef = useRef(null);
  const tagButtonRef = useRef(null);
  const sortButtonRef = useRef(null);
  const combinedButtonRef = useRef(null);

  const filter = useListFilter({
    items: files,
    searchFields: (file) => [file.name, file.type, ...(file.tags || [])],
    quickFilterDefs: QUICK_FILTER_DEFS,
    initialState: { sortBy: 'date-desc' },
  });

  const typeCounts = useMemo(() => {
    const counts = {};
    files.forEach(file => { counts[file.type] = (counts[file.type] || 0) + 1; });
    return counts;
  }, [files]);

  const starredFiles = useMemo(() => files.filter(f => f.isStarred), [files]);
  const { results, counts } = useMemo(() => filter.applyToSections({ starred: starredFiles, all: files }), [filter.applyToSections, starredFiles, files]);

  const toggleStar = (fileId) => setFiles(prev => prev.map(f => f.id === fileId ? { ...f, isStarred: !f.isStarred } : f));

  const currentSort = SORT_OPTIONS.find(o => o.value === filter.sortBy);
  const isCompact = layoutMode === 'compact' || layoutMode === 'minimal';
  const isMinimal = layoutMode === 'minimal';
  const isFull = layoutMode === 'full';
  const panelWidth = { full: 400, compact: 300, minimal: 240 }[layoutMode];

  // Combined filter count for minimal mode badge
  const combinedBadge = filter.selectedTypes.length + filter.selectedTags.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Mode Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: tokens.colors.bg.secondary, borderRadius: tokens.radius.lg, flexWrap: 'wrap' }}>
        <span style={{ color: tokens.colors.text.secondary, fontSize: tokens.fontSize.sm }}>Panel Width:</span>
        {[
          { id: 'full', label: 'Full (400px)', icon: Monitor },
          { id: 'compact', label: 'Compact (300px)', icon: PanelLeftClose },
          { id: 'minimal', label: 'Minimal (240px)', icon: Smartphone },
        ].map(mode => (
          <button key={mode.id} onClick={() => setLayoutMode(mode.id)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
            background: layoutMode === mode.id ? tokens.colors.bg.active : 'transparent',
            border: `1px solid ${layoutMode === mode.id ? tokens.colors.accent.blue : tokens.colors.border.subtle}`,
            borderRadius: tokens.radius.md,
            color: layoutMode === mode.id ? tokens.colors.accent.blue : tokens.colors.text.secondary,
            fontSize: tokens.fontSize.sm, cursor: 'pointer',
          }}>
            <mode.icon size={14} />{mode.label}
          </button>
        ))}
      </div>

      {/* Panel Preview */}
      <div style={{
        width: panelWidth, background: tokens.colors.bg.primary, borderRadius: tokens.radius.xl,
        overflow: 'hidden', border: `1px solid ${tokens.colors.border.default}`, transition: 'width 0.3s ease',
      }}>
        {/* Header */}
        <div style={{ padding: '12px', background: `linear-gradient(135deg, ${tokens.colors.accent.blue}15, transparent)`, borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={16} color={tokens.colors.accent.blue} />
            <span style={{ color: tokens.colors.text.primary, fontSize: tokens.fontSize.lg, fontWeight: 600 }}>Files</span>
            <span style={{ marginLeft: 'auto', color: tokens.colors.text.muted, fontSize: tokens.fontSize.xs }}>{panelWidth}px</span>
          </div>
        </div>

        {/* FILTER TOOLBAR */}
        {isFull ? (
          <div style={{ borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
            <div style={{ padding: '10px 12px 6px' }}>
              <SearchInput value={filter.searchQuery} onChange={filter.setSearchQuery} placeholder="Search files by name, type, or tag..." />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px 10px', flexWrap: 'nowrap', overflow: 'hidden' }}>
              <DropdownTrigger ref={typeButtonRef} label="Types" icon={File} isOpen={typeDropdownOpen}
                onClick={() => { setTypeDropdownOpen(!typeDropdownOpen); setTagDropdownOpen(false); setSortDropdownOpen(false); }}
                badge={filter.selectedTypes.length} active={filter.selectedTypes.length > 0} />
              <DropdownTrigger ref={tagButtonRef} label="Tags" icon={Tag} isOpen={tagDropdownOpen}
                onClick={() => { setTagDropdownOpen(!tagDropdownOpen); setTypeDropdownOpen(false); setSortDropdownOpen(false); }}
                badge={filter.selectedTags.length} active={filter.selectedTags.length > 0} />
              <DropdownTrigger ref={sortButtonRef} label={currentSort?.shortLabel || 'Sort'} icon={ArrowUpDown} isOpen={sortDropdownOpen}
                onClick={() => { setSortDropdownOpen(!sortDropdownOpen); setTypeDropdownOpen(false); setTagDropdownOpen(false); }} />
              <div style={{ flex: 1, minWidth: 8 }} />
              {filter.hasActiveFilters && (
                <Tooltip content={`Clear ${filter.activeFilterCount} filters`}>
                  <button onClick={filter.clearAll} style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px',
                    background: 'transparent', border: `1px solid ${tokens.colors.border.subtle}`,
                    borderRadius: tokens.radius.md, color: tokens.colors.text.muted,
                    fontSize: tokens.fontSize.sm, cursor: 'pointer', flexShrink: 0,
                  }}>
                    <X size={12} />
                    <span style={{ padding: '0 4px', background: tokens.colors.bg.tertiary, borderRadius: 8, fontSize: tokens.fontSize.xs, lineHeight: '14px' }}>{filter.activeFilterCount}</span>
                  </button>
                </Tooltip>
              )}
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: isMinimal ? '8px' : '10px 12px',
            borderBottom: `1px solid ${tokens.colors.border.subtle}`,
            flexWrap: 'nowrap', overflow: 'hidden',
          }}>
            <SearchInput value={filter.searchQuery} onChange={filter.setSearchQuery} placeholder="Search..." compact />
            
            {isMinimal ? (
              /* MINIMAL: Combined Filters dropdown for Types + Tags only */
              <DropdownTrigger
                ref={combinedButtonRef}
                label="Filters"
                icon={Filter}
                isOpen={combinedDropdownOpen}
                onClick={() => setCombinedDropdownOpen(!combinedDropdownOpen)}
                badge={combinedBadge}
                active={combinedBadge > 0}
                iconOnly
              />
            ) : (
              /* COMPACT: Separate icon-only dropdowns */
              <>
                <DropdownTrigger ref={typeButtonRef} label="Types" icon={File} isOpen={typeDropdownOpen}
                  onClick={() => { setTypeDropdownOpen(!typeDropdownOpen); setTagDropdownOpen(false); setSortDropdownOpen(false); }}
                  badge={filter.selectedTypes.length} active={filter.selectedTypes.length > 0} iconOnly />
                <DropdownTrigger ref={tagButtonRef} label="Tags" icon={Tag} isOpen={tagDropdownOpen}
                  onClick={() => { setTagDropdownOpen(!tagDropdownOpen); setTypeDropdownOpen(false); setSortDropdownOpen(false); }}
                  badge={filter.selectedTags.length} active={filter.selectedTags.length > 0} iconOnly />
                <DropdownTrigger ref={sortButtonRef} label="Sort" icon={ArrowUpDown} isOpen={sortDropdownOpen}
                  onClick={() => { setSortDropdownOpen(!sortDropdownOpen); setTypeDropdownOpen(false); setTagDropdownOpen(false); }} iconOnly />
              </>
            )}
            
            {/* Sort button in minimal - separate for quick access */}
            {isMinimal && (
              <DropdownTrigger ref={sortButtonRef} label="Sort" icon={ArrowUpDown} isOpen={sortDropdownOpen}
                onClick={() => { setSortDropdownOpen(!sortDropdownOpen); setCombinedDropdownOpen(false); }} iconOnly />
            )}
            
            {filter.hasActiveFilters && (
              <Tooltip content={`Clear ${filter.activeFilterCount} filters`}>
                <button onClick={filter.clearAll} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 5,
                  background: 'transparent', border: `1px solid ${tokens.colors.border.subtle}`,
                  borderRadius: tokens.radius.md, color: tokens.colors.text.muted, cursor: 'pointer', flexShrink: 0,
                }}>
                  <X size={12} />
                </button>
              </Tooltip>
            )}
          </div>
        )}

        {/* DROPDOWNS */}
        
        {/* Combined dropdown for minimal mode - Types and Tags only, Sort has its own button */}
        <CombinedFiltersDropdown
          isOpen={combinedDropdownOpen}
          onClose={() => setCombinedDropdownOpen(false)}
          triggerRef={combinedButtonRef}
          categories={TYPE_CATEGORIES}
          selectedTypes={filter.selectedTypes}
          typeCounts={typeCounts}
          onToggleType={filter.toggleType}
          onSelectAllTypes={filter.selectAllTypes}
          onClearAllTypes={filter.clearAllTypes}
          tags={ALL_TAGS}
          selectedTags={filter.selectedTags}
          onToggleTag={filter.toggleTag}
          onClearAllTags={filter.clearAllTags}
        />
        
        {/* Individual dropdowns for full/compact modes */}
        <TypeFilterDropdown isOpen={typeDropdownOpen} onClose={() => setTypeDropdownOpen(false)} triggerRef={typeButtonRef}
          categories={TYPE_CATEGORIES} selectedTypes={filter.selectedTypes} typeCounts={typeCounts}
          onToggle={filter.toggleType} onSelectAll={filter.selectAllTypes} onClearAll={filter.clearAllTypes} />
        <TagsFilterDropdown isOpen={tagDropdownOpen} onClose={() => setTagDropdownOpen(false)} triggerRef={tagButtonRef}
          tags={ALL_TAGS} selectedTags={filter.selectedTags} onToggle={filter.toggleTag} />
        <SortDropdown isOpen={sortDropdownOpen} onClose={() => setSortDropdownOpen(false)} triggerRef={sortButtonRef}
          options={SORT_OPTIONS} value={filter.sortBy} onChange={filter.setSortBy} />

        {/* Quick Filters Row - ALWAYS single line with overflow menu */}
        <QuickFiltersRow
          quickFilterDefs={QUICK_FILTER_DEFS}
          activeFilters={filter.quickFilters}
          onToggle={filter.toggleQuickFilter}
          items={files}
          compact={isCompact}
          maxVisible={isMinimal ? 2 : 3}  // Cap at 3 even in Full mode to ensure single line fit
          collapsed={quickFiltersCollapsed}
          onToggleCollapse={() => setQuickFiltersCollapsed(!quickFiltersCollapsed)}
        />

        {/* Filter Summary */}
        {filter.hasActiveFilters && (
          <div style={{
            padding: '6px 12px', background: tokens.colors.accent.blue + '10',
            borderBottom: `1px solid ${tokens.colors.border.subtle}`,
            color: tokens.colors.accent.blue, fontSize: tokens.fontSize.xs,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Filter size={10} />
            <span>{counts.matched} of {counts.total}</span>
          </div>
        )}

        {/* File Sections */}
        <div style={{ maxHeight: 280, overflow: 'auto' }}>
          <SectionHeader title="Starred" icon={Star} count={counts.bySection.starred?.matched || 0} total={counts.bySection.starred?.total || 0} expanded={starredExpanded} onToggle={() => setStarredExpanded(!starredExpanded)} />
          {starredExpanded && (
            <div>
              {results.starred?.length > 0 ? results.starred.map(file => (
                <FileItem key={file.id} file={file} onToggleStar={toggleStar} compact={isCompact} />
              )) : (
                <div style={{ padding: '16px 12px', textAlign: 'center', color: tokens.colors.text.muted, fontSize: tokens.fontSize.sm }}>
                  {filter.hasActiveFilters ? 'No matches' : 'No starred files'}
                </div>
              )}
            </div>
          )}

          <SectionHeader title="All Files" icon={Folder} count={counts.bySection.all?.matched || 0} total={counts.bySection.all?.total || 0} expanded={allExpanded} onToggle={() => setAllExpanded(!allExpanded)} />
          {allExpanded && (
            <div>
              {results.all?.length > 0 ? results.all.map(file => (
                <FileItem key={file.id} file={file} onToggleStar={toggleStar} compact={isCompact} />
              )) : (
                <div style={{ padding: '16px 12px', textAlign: 'center', color: tokens.colors.text.muted, fontSize: tokens.fontSize.sm }}>No files match filters</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Summary Card */}
      <div style={{ padding: 16, background: tokens.colors.bg.secondary, borderRadius: tokens.radius.lg, maxWidth: 500 }}>
        <div style={{ color: tokens.colors.text.primary, fontSize: tokens.fontSize.md, fontWeight: 600, marginBottom: 12 }}>
          ✅ V5 Fixes Applied
        </div>
        <div style={{ color: tokens.colors.text.secondary, fontSize: tokens.fontSize.sm, lineHeight: 1.6 }}>
          <p style={{ margin: '0 0 8px' }}>
            <strong>1. Minimal mode:</strong> Tabbed dropdown with Types + Tags only. Sort is a separate button for quick access.
          </p>
          <p style={{ margin: '0 0 8px' }}>
            <strong>2. Quick filters:</strong> Always single line. Max 3 visible in Full/Compact, max 2 in Minimal. Overflow uses "+N more" menu.
          </p>
          <p style={{ margin: 0 }}>
            <strong>3. No duplication:</strong> Sort only appears once (as its own button), not in the Filters dropdown.
          </p>
        </div>
      </div>
    </div>
  );
}
