/**
 * @file LeftPanelTabRegistry.js
 * @description Registers all left panel tab content components.
 *
 * This file MUST be imported early in the app initialization to ensure
 * all tab components are registered before they're needed.
 *
 * Import this file in your app entry point or in LeftPanelProvider:
 * @example
 * // In App.jsx or CIAWebApp.jsx:
 * import '@UI/react/components/panels/LeftPanel/LeftPanelTabRegistry';
 *
 * @see LeftPanelContext.jsx for the registration API
 */

import { registerLeftPanelTab } from "./LeftPanelContext";

// Import all tab content components
import { FilesPanelContent } from "./tabs/FilesTab";
import { DatasetsPanelContent } from "./tabs/DatasetsTab";
import { ViewsPanelContent } from "./tabs/ViewsTab";
import { InstanceToolsPanelContent } from "./tabs/InstanceToolsTab";
import { LayoutPanelContent } from "./tabs/LayoutTab";
import { AnnotationsPanelContent } from "./tabs/AnnotationsTab";
import { BookmarksFiltersPanelContent } from "./tabs/BookmarksFiltersTab";
import { CursorsPanelContent } from "./tabs/CursorsTab";

// =============================================================================
// REGISTER ALL TAB COMPONENTS
// =============================================================================

// DATA SOURCES
registerLeftPanelTab("files", FilesPanelContent);
registerLeftPanelTab("datasets", DatasetsPanelContent);

// VISUALIZATION
registerLeftPanelTab("views", ViewsPanelContent);
registerLeftPanelTab("tools", InstanceToolsPanelContent);
registerLeftPanelTab("layout", LayoutPanelContent);

// SPATIAL & STATE
registerLeftPanelTab("annotations", AnnotationsPanelContent);
registerLeftPanelTab("bookmarks", BookmarksFiltersPanelContent);

// PRESENCE
registerLeftPanelTab("cursors", CursorsPanelContent);

// Log registration status in development
if (process.env.NODE_ENV === "development") {
  console.log("[LeftPanel] All 8 tab components registered");
}
