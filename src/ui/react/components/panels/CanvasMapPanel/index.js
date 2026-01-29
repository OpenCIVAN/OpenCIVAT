/**
 * CanvasMapPanel - Public API
 *
 * Floating panel for unified canvas navigation and editing control.
 * Uses PanelShell architecture (floating-first).
 *
 * Usage:
 * 1. Render CanvasMapPanel inside PanelShellProvider
 * 2. Toggle with keyboard shortcut 'm' or dispatch 'cia:toggle-canvas-map' event
 * 3. Programmatically control via usePanelShell().togglePanel('canvas-map')
 */

export { CanvasMapPanel, default, CANVAS_MAP_PANEL_ID } from './CanvasMapPanel';
export { CanvasMapContent } from './CanvasMapContent';
