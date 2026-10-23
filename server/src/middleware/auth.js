const config = require('../config');

/**
 * Authentication & Access Control Middleware for TrustIssues.
 * Enforces API token authentication and role-based access control.
 * In development, defaults to a local authenticated security researcher context.
 */

function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const apiKeyHeader = req.headers['x-api-key'];
  const expectedToken = process.env.API_AUTH_TOKEN || process.env.TRUSTISSUES_API_KEY;

  let providedToken = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    providedToken = authHeader.substring(7).trim();
  } else if (apiKeyHeader) {
    providedToken = String(apiKeyHeader).trim();
  }

  // If authentication token is enforced via environment or in production
  if (expectedToken || config.env === 'production') {
    if (!providedToken) {
      return res.status(401).json({
        error: {
          message: 'Authentication Required: Missing Bearer token or X-API-KEY header.',
          status: 401,
          timestamp: new Date().toISOString()
        }
      });
    }

    if (providedToken !== expectedToken) {
      return res.status(403).json({
        error: {
          message: 'Authorization Denied: Invalid security API token.',
          status: 403,
          timestamp: new Date().toISOString()
        }
      });
    }

    req.user = {
      id: 'authenticated-auditor',
      email: 'auditor@trustissues.internal',
      role: 'SECURITY_AUDITOR',
      authenticated: true
    };
    return next();
  }

  // Development mode: automatically attach local security researcher context
  req.user = {
    id: 'local-researcher',
    email: 'security-researcher@trustissues.internal',
    role: 'SECURITY_AUDITOR',
    authenticated: true,
    isLocalDev: true
  };

  next();
}

/**
 * Role-Based Access Control Middleware.
 * Restricts sensitive administrative or privileged operations to authorized roles.
 */
function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: { message: 'Unauthorized: User context missing', status: 401 }
      });
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          message: `Access Denied: Role '${req.user.role}' is not authorized for this operation. Required: ${allowedRoles.join(', ')}`,
          status: 403
        }
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  requireRole
};
