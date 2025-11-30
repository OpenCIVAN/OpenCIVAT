# CIA Web: Logging Guide

Structured logging for consistent, filterable, and controllable log output.

---

## Quick Start

```javascript
// Import a category-specific logger
import { dataset as log } from "@Utils/logger.js";

// Use appropriate log levels
log.info("Dataset loaded:", datasetId); // Lifecycle events
log.debug("Processing chunk:", index); // Internal operations
log.trace("Byte offset:", offset); // Very frequent/verbose
log.warn("Missing optional field:", field); // Potential issues
log.error("Failed to load:", error); // Errors
```

---

## Importing Loggers

Always alias the import to `log` for consistency:

```javascript
// Correct - alias to 'log'
import { dataset as log } from "@Utils/logger.js";
import { instance as log } from "@Utils/logger.js";
import { vr as log } from "@Utils/logger.js";

// Incorrect - don't use category names directly
import { dataset } from "@Utils/logger.js"; // Avoid
```

---

## Categories

Choose the category that best matches your file's responsibility:

| Category     | Use For                              | Default |
| ------------ | ------------------------------------ | ------- |
| `app`        | App lifecycle, initialization phases | ON      |
| `ui`         | UI component events, renders         | off     |
| `store`      | Zustand/state updates                | off     |
| `api`        | HTTP API calls                       | ON      |
| `ws`         | WebSocket events                     | ON      |
| `sync`       | Y.js sync operations                 | off     |
| `dataset`    | DatasetManager operations            | ON      |
| `view`       | ViewConfigurationManager operations  | ON      |
| `annotation` | AnnotationManager operations         | ON      |
| `workspace`  | WorkspaceCanvas, layout              | ON      |
| `instance`   | Instance lifecycle, handler calls    | ON      |
| `render`     | Render loop operations               | off     |
| `presence`   | User presence updates                | off     |
| `cursor`     | Cursor position updates              | off     |
| `vr`         | VR/XR events                         | ON      |
| `files`      | File operations, storage             | ON      |
| `auth`       | Authentication, sessions             | ON      |

### Category Selection Guide

**By file location:**

- `src/core/data/managers/` → `dataset`, `view`, `annotation`
- `src/core/instances/` → `instance`, `workspace`
- `src/core/instances/types/vtk/` → `render` (for render loop), `instance` (for lifecycle)
- `src/core/instances/types/vtk/widgets/` → `render`
- `src/core/vr/` → `vr`
- `src/core/session/` → `auth`
- `src/services/storage/` → `files`
- `src/services/collaboration/` → `presence`, `cursor`
- `src/collaboration/yjs/` → `sync`
- `src/ui/react/` → `ui`

---

## Log Levels

Use the correct level for the message type:

| Level   | When to Use                           | Examples                                 |
| ------- | ------------------------------------- | ---------------------------------------- |
| `error` | Errors that need attention            | Failed operations, caught exceptions     |
| `warn`  | Potential issues, unexpected states   | Missing optional data, deprecations      |
| `info`  | Lifecycle events, major state changes | Initialized, connected, loaded           |
| `debug` | Sub-steps, internal operations        | Processing items, state updates          |
| `trace` | Very verbose, high-frequency events   | Mouse moves, render frames, measurements |

### Level Selection Guidelines

```javascript
// INFO - Lifecycle events, things you want to see in normal operation
log.info("VTK instance initialized");
log.info("WebSocket connected to:", url);
log.info("Dataset loaded successfully:", name);

// DEBUG - Operations and sub-steps
log.debug("Processing file:", fileName);
log.debug("Camera position updated:", position);
log.debug("Widget created for instance:", instanceId);

// TRACE - High-frequency events (disabled by default)
log.trace("Render frame:", frameCount);
log.trace("Mouse position:", x, y);
log.trace("Angle measurement updated");

// WARN - Potential issues that don't break functionality
log.warn("Missing optional metadata:", fieldName);
log.warn("Retry attempt:", retryCount);
log.warn("Using fallback value:", value);

// ERROR - Actual errors
log.error("Failed to initialize:", error);
log.error("WebSocket error:", event.error);
log.error("Dataset not found:", datasetId);
```

---

## Best Practices

### Do

- Remove emoji prefixes from log messages
- Use template literals for dynamic messages
- Include relevant context (IDs, names, counts)
- Use `trace` for anything in a loop or animation frame
- Keep messages concise but informative

```javascript
// Good
log.debug(`Loading dataset ${datasetId} (${fileSize} bytes)`);
log.info(`Instance ${instanceId} initialized`);
log.trace(`Render frame ${frameCount}`);

// Bad
log.debug("📦 Loading dataset..."); // No emoji
log.info("initialized"); // Too vague
log.debug(`Render frame ${frameCount}`); // Should be trace
```

### Don't

- Use `console.log/warn/error` directly
- Log in tight loops at debug level (use trace)
- Include sensitive data in logs
- Use emojis in log messages
- Log without context (IDs, names, etc.)

---

## Runtime Control

Control logging from the browser console:

```javascript
// Show current configuration
log.status();

// Change log level
log.setLevel("trace"); // Show everything
log.setLevel("info"); // Normal operation
log.setLevel("error"); // Errors only

// Toggle categories
log.setCategory("sync", true); // Enable sync logging
log.setCategory("render", true); // Enable render logging

// Enable only specific categories
log.only("ws", "dataset"); // Only WebSocket and dataset logs

// Enable all categories
log.all();

// Quiet mode (errors only)
log.quiet();

// Reset to defaults
log.reset();
```

### URL Parameters

Configure logging via URL:

```
?log=debug                    # Set level
?logcat=ws,dataset            # Enable only these categories
?logcat=-sync,-cursor         # Disable specific categories
?logcat=*                     # Enable all categories
```

### localStorage Persistence

Settings persist in localStorage:

- `LOG_LEVEL` - Current log level
- `LOG_CATEGORIES` - Category configuration

---

## Migration Checklist

When migrating from `console.*` to structured logging:

1. **Add import at top of file:**

   ```javascript
   import { categoryName as log } from "@Utils/logger.js";
   ```

2. **Replace console calls:**

   ```javascript
   // Before
   console.log("Loading...");
   console.warn("Warning!");
   console.error("Error:", err);

   // After
   log.debug("Loading...");
   log.warn("Warning!");
   log.error("Error:", err);
   ```

3. **Remove emojis from messages:**

   ```javascript
   // Before
   console.log("📦 Dataset loaded");

   // After
   log.info("Dataset loaded");
   ```

4. **Choose correct level:**

   - `console.log` → Usually `log.debug` or `log.info`
   - `console.warn` → `log.warn`
   - `console.error` → `log.error`

5. **Consider frequency:**
   - In loops/animations → `log.trace`
   - Single operations → `log.debug`
   - Lifecycle events → `log.info`

---

## Examples by File Type

### Manager Class

```javascript
import { dataset as log } from "@Utils/logger.js";

class DatasetManager {
  async loadDataset(id) {
    log.debug(`Loading dataset: ${id}`);
    try {
      const data = await this.fetch(id);
      log.info(`Dataset loaded: ${data.name} (${data.size} bytes)`);
      return data;
    } catch (error) {
      log.error(`Failed to load dataset ${id}:`, error);
      throw error;
    }
  }
}
```

### Widget Class

```javascript
import { render as log } from "@Utils/logger.js";

class VTKLineWidget {
  initialize(instanceId, config) {
    log.debug(`Initializing line widget for ${instanceId}`);
    // ...
    log.debug(`Line widget created for ${instanceId}`);
  }

  onInteraction() {
    // In interaction callback - use trace for high frequency
    log.trace(`Line measurement: ${distance.toFixed(2)} units`);
  }

  cleanup(instanceId) {
    log.debug(`Cleaning up line widget for ${instanceId}`);
  }
}
```

### React Component (when needed)

```javascript
import { ui as log } from "@Utils/logger.js";

function DatasetPanel() {
  useEffect(() => {
    log.debug("DatasetPanel mounted");
    return () => log.debug("DatasetPanel unmounted");
  }, []);
  // ...
}
```

### VR Feature

```javascript
import { vr as log } from "@Utils/logger.js";

class VRManager {
  async enterVR() {
    log.info("Entering VR mode");
    try {
      await this.initSession();
      log.info("VR session started");
    } catch (error) {
      log.error("Failed to enter VR:", error);
    }
  }
}
```

---

## Summary

1. **Import** the appropriate category aliased as `log`
2. **Choose** the correct log level for each message
3. **Remove** emojis and include context
4. **Use** `trace` for high-frequency events
5. **Control** logging at runtime via `window.log`
