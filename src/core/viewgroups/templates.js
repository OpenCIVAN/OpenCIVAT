/**
 * @file templates.js
 * @description ViewGroup template definitions and utilities
 *
 * Templates are pre-configured ViewGroup layouts that can be instantiated
 * on the canvas. They define the layout structure, default color, and
 * view slot configuration.
 */

import { apiClient } from '@Services/apiClient.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * @typedef {Object} VGTemplate
 * @property {string} id - Unique template identifier
 * @property {string} name - Display name
 * @property {string} description - Short description
 * @property {string} layoutId - References BUILTIN_LAYOUTS
 * @property {string} color - Default accent color
 * @property {number} viewSlots - Number of view slots (capacity)
 * @property {'personal' | 'team' | 'project'} scope - Visibility scope
 * @property {string} [createdBy] - Creator user ID (for personal/team templates)
 * @property {string} [createdAt] - ISO timestamp
 */

// =============================================================================
// SCOPE CONFIGURATIONS
// =============================================================================

/**
 * Scope definitions with icons and colors
 */
export const SCOPE_CONFIG = {
  personal: {
    id: 'personal',
    label: 'Personal',
    description: 'Only visible to you',
    icon: 'user',
    color: '#3b82f6', // blue
  },
  team: {
    id: 'team',
    label: 'Team',
    description: 'Shared with your team',
    icon: 'users',
    color: '#a855f7', // purple
  },
  project: {
    id: 'project',
    label: 'Project',
    description: 'Available to all project members',
    icon: 'globe',
    color: '#14b8a6', // teal
  },
};

// =============================================================================
// BUILT-IN TEMPLATES
// =============================================================================

/**
 * Built-in ViewGroup templates
 * These are always available to all users
 */
export const BUILTIN_TEMPLATES = [
  {
    id: 'template-single',
    name: 'Single View',
    description: 'One focused view',
    layoutId: 'single',
    color: '#3b82f6',
    viewSlots: 1,
    scope: 'project',
  },
  {
    id: 'template-comparison',
    name: 'Side by Side',
    description: 'Compare two views',
    layoutId: 'side-by-side',
    color: '#22c55e',
    viewSlots: 2,
    scope: 'project',
  },
  {
    id: 'template-stacked',
    name: 'Stacked',
    description: 'Two views vertically',
    layoutId: 'stacked',
    color: '#f59e0b',
    viewSlots: 2,
    scope: 'project',
  },
  {
    id: 'template-quad',
    name: '2x2 Grid',
    description: 'Four views in a grid',
    layoutId: '2x2',
    color: '#a855f7',
    viewSlots: 4,
    scope: 'project',
  },
  {
    id: 'template-main-detail',
    name: 'Main + Details',
    description: 'Large view with two detail views',
    layoutId: '1+2',
    color: '#ec4899',
    viewSlots: 3,
    scope: 'project',
  },
  {
    id: 'template-sidebar',
    name: 'With Sidebar',
    description: 'Two views with sidebar',
    layoutId: '2+1',
    color: '#22d3ee',
    viewSlots: 3,
    scope: 'project',
  },
  {
    id: 'template-triple',
    name: 'Triple',
    description: 'Three views horizontally',
    layoutId: '3-up',
    color: '#f97316',
    viewSlots: 3,
    scope: 'project',
  },
  {
    id: 'template-9-grid',
    name: '3x3 Grid',
    description: 'Nine views in a grid',
    layoutId: '3x3',
    color: '#14b8a6',
    viewSlots: 9,
    scope: 'project',
  },
];

// =============================================================================
// CUSTOM TEMPLATES (LOCAL STORAGE)
// =============================================================================

export const CUSTOM_TEMPLATE_STORAGE_KEY = 'cia-vg-templates';
export const TEMPLATES_UPDATED_EVENT = 'cia:templates-updated';

function canUseStorage() {
  return typeof window !== 'undefined' && !!window.localStorage;
}

export function loadCustomTemplates() {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_TEMPLATE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to load custom templates:', err);
    return [];
  }
}

export function saveCustomTemplates(templates) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(CUSTOM_TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
  } catch (err) {
    console.warn('Failed to save custom templates:', err);
  }
}

export function addCustomTemplate(template) {
  if (!template) return [];
  const current = loadCustomTemplates();
  const next = [
    ...current.filter((t) => t.id !== template.id),
    template,
  ];
  saveCustomTemplates(next);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TEMPLATES_UPDATED_EVENT));
  }
  return next;
}

export function getAllTemplates() {
  return [
    ...BUILTIN_TEMPLATES,
    ...loadCustomTemplates(),
  ];
}

// =============================================================================
// SERVER-SIDE TEMPLATES
// =============================================================================

export async function loadServerTemplates({ projectId, workspaceId, scope = 'all' } = {}) {
  if (!projectId && !workspaceId) return [];
  try {
    const endpoint = projectId
      ? `/projects/${projectId}/viewgroup-templates?scope=${scope}`
      : `/workspaces/${workspaceId}/viewgroup-templates?scope=${scope}`;
    const response = await apiClient.get(endpoint);
    return response?.templates || [];
  } catch (err) {
    console.warn('Failed to load server templates:', err);
    return [];
  }
}

export async function saveServerTemplate({ projectId, workspaceId, template, scope } = {}) {
  if (!template) return null;
  if (!projectId && !workspaceId) return null;
  try {
    const endpoint = projectId
      ? `/projects/${projectId}/viewgroup-templates`
      : `/workspaces/${workspaceId}/viewgroup-templates`;
    const payload = {
      name: template.name,
      description: template.description || '',
      layoutId: template.layoutId,
      color: template.color,
      viewSlots: template.viewSlots || 1,
      scope: scope || template.scope || 'personal',
      workspaceId,
    };
    const response = await apiClient.post(endpoint, payload);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(TEMPLATES_UPDATED_EVENT));
    }
    return response?.template || null;
  } catch (err) {
    console.warn('Failed to save server template:', err);
    return null;
  }
}

export async function updateServerTemplate({ projectId, workspaceId, templateId, updates } = {}) {
  if (!templateId) return null;
  if (!projectId && !workspaceId) return null;
  try {
    const endpoint = projectId
      ? `/projects/${projectId}/viewgroup-templates/${templateId}`
      : `/workspaces/${workspaceId}/viewgroup-templates/${templateId}`;
    const response = await apiClient.put(endpoint, updates || {});
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(TEMPLATES_UPDATED_EVENT));
    }
    return response?.template || null;
  } catch (err) {
    console.warn('Failed to update server template:', err);
    return null;
  }
}

export async function deleteServerTemplate({ projectId, workspaceId, templateId } = {}) {
  if (!templateId) return false;
  if (!projectId && !workspaceId) return false;
  try {
    const endpoint = projectId
      ? `/projects/${projectId}/viewgroup-templates/${templateId}`
      : `/workspaces/${workspaceId}/viewgroup-templates/${templateId}`;
    await apiClient.delete(endpoint);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(TEMPLATES_UPDATED_EVENT));
    }
    return true;
  } catch (err) {
    console.warn('Failed to delete server template:', err);
    return false;
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get template by ID
 * @param {string} templateId - Template ID
 * @param {VGTemplate[]} customTemplates - Custom templates to include
 * @returns {VGTemplate|null}
 */
export function getTemplateById(templateId, customTemplates = []) {
  return (
    BUILTIN_TEMPLATES.find((t) => t.id === templateId) ||
    customTemplates.find((t) => t.id === templateId) ||
    null
  );
}

/**
 * Get templates by scope
 * @param {'personal' | 'team' | 'project'} scope - Scope to filter by
 * @param {VGTemplate[]} templates - Templates to filter
 * @returns {VGTemplate[]}
 */
export function getTemplatesByScope(scope, templates) {
  return templates.filter((t) => t.scope === scope);
}

/**
 * Create a new ViewGroup from a template
 * @param {VGTemplate} template - Template to instantiate
 * @param {Object} options - Additional options
 * @returns {Object} New ViewGroup object
 */
export function createViewGroupFromTemplate(template, options = {}) {
  const id = options.id || `vg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return {
    id,
    name: options.name || template.name,
    layoutId: template.layoutId,
    color: options.color || template.color,
    views: [],
    scope: options.scope || 'personal',
    createdFrom: template.id,
    createdAt: new Date().toISOString(),
    createdBy: options.userId,
  };
}

/**
 * Create a custom template from an existing ViewGroup
 * @param {Object} viewGroup - ViewGroup to create template from
 * @param {Object} options - Template options
 * @returns {VGTemplate}
 */
export function createTemplateFromViewGroup(viewGroup, options = {}) {
  const resolvedLayoutId =
    viewGroup.layoutId ||
    viewGroup.layout?.id ||
    viewGroup.layout?.type ||
    'single';

  return {
    id: options.id || `template-${Date.now()}`,
    name: options.name || `${viewGroup.name} Template`,
    description: options.description || '',
    layoutId: resolvedLayoutId,
    color: viewGroup.color,
    viewSlots: viewGroup.views?.length || 1,
    scope: options.scope || 'personal',
    createdBy: options.userId,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Filter templates by layout size
 * @param {VGTemplate[]} templates - Templates to filter
 * @param {number} maxRows - Maximum rows
 * @param {number} maxCols - Maximum columns
 * @param {boolean} strict - If true, must match exactly; if false, must fit within
 * @returns {VGTemplate[]}
 */
export function filterTemplatesBySize(templates, maxRows, maxCols, strict = false) {
  // This would need layout info - simplified version based on viewSlots
  const maxSlots = maxRows * maxCols;
  return templates.filter((t) => {
    if (strict) {
      return t.viewSlots === maxSlots;
    }
    return t.viewSlots <= maxSlots;
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  SCOPE_CONFIG,
  BUILTIN_TEMPLATES,
  CUSTOM_TEMPLATE_STORAGE_KEY,
  TEMPLATES_UPDATED_EVENT,
  loadCustomTemplates,
  saveCustomTemplates,
  addCustomTemplate,
  getAllTemplates,
  loadServerTemplates,
  saveServerTemplate,
  updateServerTemplate,
  deleteServerTemplate,
  getTemplateById,
  getTemplatesByScope,
  createViewGroupFromTemplate,
  createTemplateFromViewGroup,
  filterTemplatesBySize,
};
