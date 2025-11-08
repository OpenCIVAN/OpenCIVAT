// src/auth/authManager.js

class AuthManager {
  constructor() {
    this.providers = new Map();
    this.sessions = new Map();
    this.permissions = new Map();
  }

  // Support multiple auth providers
  registerProvider(name, provider) {
    this.providers.set(name, provider);
  }

  // Role-based access control (RBAC)
  async checkPermission(userId, resource, action) {
    const user = await this.getUser(userId);
    const roles = user.roles || ['guest'];
    
    for (const role of roles) {
      const permissions = this.permissions.get(role);
      if (permissions?.includes(`${resource}:${action}`)) {
        return true;
      }
    }
    
    // Check resource-specific permissions
    if (resource.owner === userId) {
      return true; // Owners have full access
    }
    
    if (resource.sharedWith?.includes(userId)) {
      return action === 'read'; // Shared users can read
    }
    
    return false;
  }

  // Session management with refresh
  async createSession(userId, metadata = {}) {
    const session = {
      id: generateSessionId(),
      userId,
      createdAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      metadata,
      refreshToken: generateToken()
    };
    
    this.sessions.set(session.id, session);
    return session;
  }
}