// src/core/pluginSystem.js

class PluginSystem {
  constructor() {
    this.plugins = new Map();
    this.hooks = new Map();
    this.apis = new Map();
  }

  // Register a plugin
  async register(plugin) {
    // Validate plugin manifest
    if (!this.validateManifest(plugin.manifest)) {
      throw new Error(`Invalid plugin manifest: ${plugin.name}`);
    }

    // Check dependencies
    for (const dep of plugin.manifest.dependencies) {
      if (!this.plugins.has(dep.name) || !this.checkVersion(dep.version)) {
        throw new Error(`Missing dependency: ${dep.name}`);
      }
    }

    // Initialize plugin with sandboxed API
    const api = this.createPluginAPI(plugin.manifest.permissions);
    await plugin.initialize(api);

    // Register hooks
    for (const hook of plugin.manifest.hooks) {
      this.registerHook(hook.name, plugin[hook.handler]);
    }

    this.plugins.set(plugin.manifest.id, plugin);
    console.log(`✅ Plugin registered: ${plugin.manifest.name}`);
  }
}
