// src/utils/logger.js
// Client-side structured logging with levels and categories
// Control verbosity via localStorage or URL params

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4,
};

// Default category states (can be overridden at runtime)
const DEFAULT_CATEGORIES = {
  app: true, // App lifecycle
  ui: false, // UI events (noisy)
  store: false, // Store updates (noisy)
  api: true, // API calls
  ws: true, // WebSocket events
  sync: false, // Y.js sync (very noisy)
  vr: true, // VR/XR events
  render: false, // Render loop (extremely noisy)
  files: true, // File operations
  auth: true, // Authentication
};

// Parse configuration from localStorage or URL
function getConfig() {
  // Check URL params first: ?log=debug&logcat=ws,api
  const urlParams = new URLSearchParams(window.location.search);

  // Level from URL, localStorage, or default based on hostname
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  const defaultLevel = isLocalhost ? "debug" : "warn";

  const level =
    urlParams.get("log") || localStorage.getItem("LOG_LEVEL") || defaultLevel;

  // Categories from URL or localStorage
  const categoryConfig =
    urlParams.get("logcat") || localStorage.getItem("LOG_CATEGORIES") || "";

  const categories = { ...DEFAULT_CATEGORIES };

  if (categoryConfig) {
    if (categoryConfig.startsWith("-")) {
      // Disable mode: "-ui,-sync" disables those
      categoryConfig.split(",").forEach((cat) => {
        const name = cat.replace("-", "").trim();
        if (name in categories) categories[name] = false;
      });
    } else if (categoryConfig === "*") {
      // Enable all
      Object.keys(categories).forEach((k) => (categories[k] = true));
    } else {
      // Enable only specified: "ws,api"
      Object.keys(categories).forEach((k) => (categories[k] = false));
      categoryConfig.split(",").forEach((cat) => {
        const name = cat.trim();
        if (name in categories) categories[name] = true;
        if (name === "all")
          Object.keys(categories).forEach((k) => (categories[k] = true));
      });
    }
  }

  return {
    level: LOG_LEVELS[level] ?? LOG_LEVELS.debug,
    categories,
    levelName: level,
  };
}

let config = getConfig();

// Style prefixes for browser console
const STYLES = {
  error: "color: #ff6b6b; font-weight: bold",
  warn: "color: #feca57; font-weight: bold",
  info: "color: #54a0ff",
  debug: "color: #a0a0a0",
  trace: "color: #707070; font-size: 0.9em",
};

const CATEGORY_COLORS = {
  app: "#48dbfb",
  ui: "#ff9ff3",
  store: "#feca57",
  api: "#1dd1a1",
  ws: "#5f27cd",
  sync: "#ee5a24",
  vr: "#00d2d3",
  render: "#636e72",
  files: "#0984e3",
  auth: "#6c5ce7",
};

/**
 * Create a logger for a specific category
 */
function createLogger(category) {
  const categoryColor = CATEGORY_COLORS[category] || "#888";
  const categoryStyle = `color: ${categoryColor}; font-weight: bold`;

  function shouldLog(level) {
    const categoryEnabled = config.categories[category] ?? true;
    return categoryEnabled && LOG_LEVELS[level] <= config.level;
  }

  function log(level, ...args) {
    if (!shouldLog(level)) return;

    const method = level === "trace" ? "log" : level;
    const style = STYLES[level];

    // Use styled logging in browsers that support it
    if (typeof args[0] === "string") {
      console[method](
        `%c[${level.toUpperCase()}]%c [${category}] ${args[0]}`,
        style,
        categoryStyle,
        ...args.slice(1)
      );
    } else {
      console[method](
        `%c[${level.toUpperCase()}]%c [${category}]`,
        style,
        categoryStyle,
        ...args
      );
    }
  }

  return {
    error: (...args) => log("error", ...args),
    warn: (...args) => log("warn", ...args),
    info: (...args) => log("info", ...args),
    debug: (...args) => log("debug", ...args),
    trace: (...args) => log("trace", ...args),
    isEnabled: (level) => shouldLog(level),
  };
}

// Pre-created loggers
const loggers = {
  app: createLogger("app"),
  ui: createLogger("ui"),
  store: createLogger("store"),
  api: createLogger("api"),
  ws: createLogger("ws"),
  sync: createLogger("sync"),
  vr: createLogger("vr"),
  render: createLogger("render"),
  files: createLogger("files"),
  auth: createLogger("auth"),
};

// Runtime configuration API
const logConfig = {
  /**
   * Set log level at runtime
   * @param {string} level - 'error', 'warn', 'info', 'debug', 'trace'
   */
  setLevel(level) {
    if (level in LOG_LEVELS) {
      config.level = LOG_LEVELS[level];
      config.levelName = level;
      localStorage.setItem("LOG_LEVEL", level);
      console.log(`Log level set to: ${level}`);
    }
  },

  /**
   * Enable/disable a category
   * @param {string} category - Category name
   * @param {boolean} enabled - Whether to enable
   */
  setCategory(category, enabled) {
    if (category in config.categories) {
      config.categories[category] = enabled;
      console.log(`Category '${category}' ${enabled ? "enabled" : "disabled"}`);
    }
  },

  /**
   * Enable multiple categories (disables others)
   * @param {string[]} categories - Categories to enable
   */
  only(...categories) {
    Object.keys(config.categories).forEach((k) => {
      config.categories[k] = categories.includes(k);
    });
    console.log(`Logging only: ${categories.join(", ")}`);
  },

  /**
   * Enable all categories
   */
  all() {
    Object.keys(config.categories).forEach(
      (k) => (config.categories[k] = true)
    );
    console.log("All log categories enabled");
  },

  /**
   * Show current configuration
   */
  status() {
    console.table({
      level: config.levelName,
      ...Object.fromEntries(
        Object.entries(config.categories).map(([k, v]) => [k, v ? "ON" : "off"])
      ),
    });
  },

  /**
   * Reset to defaults
   */
  reset() {
    localStorage.removeItem("LOG_LEVEL");
    localStorage.removeItem("LOG_CATEGORIES");
    config = getConfig();
    console.log("Log config reset to defaults");
  },
};

// Expose to window for debugging
if (typeof window !== "undefined") {
  window.log = logConfig;
  window.loggers = loggers;
}

export { createLogger, logConfig };
export const { app, ui, store, api, ws, sync, vr, render, files, auth } =
  loggers;

// Default export for simple usage
export default loggers.app;
