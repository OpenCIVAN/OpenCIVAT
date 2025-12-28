// server/src/middleware/auth.js
// Keycloak JWT validation middleware with development bypass

const jwt = require("jsonwebtoken");
const jwksRsa = require("jwks-rsa");
const { createLogger } = require("../utils/logger");

const log = createLogger("auth");

// Keycloak configuration
const KEYCLOAK_URL = process.env.KEYCLOAK_URL || "http://localhost:8080";
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || "cia-web";

// Development bypass - allows testing without Keycloak
const DEV_BYPASS_AUTH =
  process.env.NODE_ENV === "development" &&
  process.env.DEV_BYPASS_AUTH === "true";

// Mock user for development bypass
const DEV_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  externalId: "dev-user-001",
  email: "developer@localhost",
  name: "Development User",
  roles: ["user", "admin"],
};

/**
 * Get user ID from request
 */
function getUserId(req) {
  if (req.user?.id) return req.user.id;
  
  if (DEV_BYPASS_AUTH) {
    const userId = req.get("x-user-id") || DEV_USER.id;
    if (typeof userId === "object") {
      log.warn("getUserId received object instead of string");
      return userId.id || DEV_USER.id;
    }
    return userId;
  }
  return null;
}

/**
 * Get full user info from request
 */
function getUser(req) {
  if (req.user) return req.user;
  
  if (DEV_BYPASS_AUTH) {
    return {
      id: getUserId(req),
      email: req.get("x-user-email") || DEV_USER.email,
      name: req.get("x-user-name") || DEV_USER.name,
    };
  }
  return null;
}

/**
 * Check if user has access to project
 * @returns {string|null} User's role or null if no access
 */
async function checkProjectAccess(pool, projectId, userId) {
  const result = await pool.query(
    `SELECT pm.role FROM projects p
     LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $2
     WHERE p.id = $1 AND (p.visibility = 'public' OR pm.user_id IS NOT NULL)`,
    [projectId, userId]
  );
  return result.rows.length > 0 ? result.rows[0].role : null;
}

/**
 * Get workspace IDs user can access in a project
 */
async function getUserWorkspaceIds(pool, projectId, userId) {
  const result = await pool.query(
    `SELECT w.id FROM workspaces w
     LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
     WHERE w.project_id = $1
       AND (w.owner_id = $2 OR wm.user_id = $2 OR w.type = 'project')`,
    [projectId, userId]
  );
  return result.rows.map((r) => r.id);
}

/**
 * Extract full user info from request
 */
function getUserInfo(req) {
  if (req.user) {
    return req.user;
  }

  if (DEV_BYPASS_AUTH) {
    return {
      id: getUserId(req),
      email: req.headers["x-user-email"] || DEV_USER.email,
      name: req.headers["x-user-name"] || DEV_USER.name,
    };
  }

  return null;
}

// JWKS client for fetching Keycloak public keys
const jwksClient = jwksRsa({
  jwksUri: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`,
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
});

// Get signing key from JWKS
function getKey(header, callback) {
  jwksClient.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Authentication middleware
 * Validates JWT token from Authorization header
 * In dev bypass mode, uses mock user (from headers if provided)
 */
async function authenticate(req, res, next) {
  // Development bypass
  if (DEV_BYPASS_AUTH) {
    // Check for custom user headers (from DevUserSwitcher)
    const userId = req.get("x-user-id");
    const userName = req.get("x-user-name");
    const userEmail = req.get("x-user-email");

    if (userId && userName) {
      log.debug(`Dev bypass mode - using custom user: ${userName}`);
      req.user = {
        id: userId,
        externalId: userId,
        email: userEmail || DEV_USER.email,
        name: userName,
        roles: DEV_USER.roles, // Keep admin roles for dev
      };
    } else {
      log.debug("Dev bypass mode - using default mock user");
      req.user = DEV_USER;
    }
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Missing or invalid Authorization header",
      hint: 'Include "Authorization: Bearer <token>" header',
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = await new Promise((resolve, reject) => {
      jwt.verify(
        token,
        getKey,
        {
          issuer: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`,
          algorithms: ["RS256"],
        },
        (err, decoded) => {
          if (err) reject(err);
          else resolve(decoded);
        }
      );
    });

    // Attach user info to request
    req.user = {
      id: decoded.sub,
      externalId: decoded.sub,
      email: decoded.email,
      name: decoded.name || decoded.preferred_username,
      roles: decoded.realm_access?.roles || [],
    };

    next();
  } catch (error) {
    log.error("Authentication failed:", error.message);
    return res.status(401).json({
      error: "Invalid or expired token",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

/**
 * Optional authentication - populates req.user if token present
 * Useful for endpoints that work both authenticated and anonymously
 */
function optionalAuth(req, res, next) {
  // In dev bypass, always set user (from headers if provided)
  if (DEV_BYPASS_AUTH) {
    const userId = req.get("x-user-id");
    const userName = req.get("x-user-name");
    const userEmail = req.get("x-user-email");

    if (userId && userName) {
      req.user = {
        id: userId,
        externalId: userId,
        email: userEmail || DEV_USER.email,
        name: userName,
        roles: DEV_USER.roles,
      };
    } else {
      req.user = DEV_USER;
    }
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.user = null;
    return next();
  }

  // Try to authenticate, but don't fail if it doesn't work
  authenticate(req, res, (err) => {
    if (err) {
      req.user = null;
    }
    next();
  });
}

/**
 * Require specific role
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!req.user.roles.includes(role)) {
      return res.status(403).json({
        error: "Insufficient permissions",
        required: role,
      });
    }

    next();
  };
}

// Log auth mode on startup
if (DEV_BYPASS_AUTH) {
  log.info("Development bypass mode ENABLED");
} else {
  log.info("Keycloak authentication enabled");
  log.debug("Keycloak URL:", KEYCLOAK_URL);
  log.debug("Realm:", KEYCLOAK_REALM);
}

module.exports = {
  authenticate,
  optionalAuth,
  requireRole,
  getUserId,
  getUser,
  checkProjectAccess,
  getUserWorkspaceIds,
  DEV_BYPASS_AUTH,
};