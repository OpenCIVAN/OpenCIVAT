// src/services/index.js
// =============================================================================
// CIA Web Application Services
// =============================================================================
//
// Services provide centralized business logic that coordinates between managers.
// They are the preferred API for UI components to interact with the system.
//
// ARCHITECTURE:
// - Services are singletons initialized after managers
// - They listen to events and coordinate operations
// - They emit through EventBus for UI updates
// - Components should call services, not managers directly (for complex operations)
//
// USAGE:
// import { viewLifecycleService } from '@Services';
//
// const view = await viewLifecycleService.createAndPlaceView(datasetId);
//
// =============================================================================

// View lifecycle operations
export { viewLifecycleService } from "./ViewLifecycleService.js";

// Re-export commonly used event bus items for convenience
export { eventBus, BUS_EVENTS } from "@Core/events/EventBus.js";
