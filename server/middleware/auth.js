const { expressjwt: jwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const { jwtDecode } = require('jwt-decode');

// Auth0 JWT verification middleware
// Log configuration on startup for debugging
console.log('[JWT Middleware] Auth0 Configuration:', {
  domain: process.env.AUTH0_DOMAIN,
  audience: process.env.AUTH0_AUDIENCE,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
});

const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
  }),
  audience: process.env.AUTH0_AUDIENCE,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ['RS256']
});



// Middleware to extract user info from JWT
const extractUser = (req, res, next) => {
  if (req.auth) {
    // Extract user information from the JWT token
    req.userInfo = {
      auth0_id: req.auth.sub,
      email: req.auth.email,
      name: req.auth.name,
      roles: req.auth['https://my-app.com/roles'] || [],
      permissions: req.auth.permissions || [],
      scope: req.auth.scope || '',
      email_verified: req.auth.email_verified
    };

    // Debug logging
    console.log('[JWT] Token contents:', {
      sub: req.auth.sub,
      email: req.auth.email,
      roles: req.auth['https://my-app.com/roles'],
      permissions: req.auth.permissions,
      scope: req.auth.scope,
      email_verified: req.auth.email_verified
    });

    console.log('[JWT] Extracted userInfo:', req.userInfo);
  } else {
    console.log('[JWT] No auth object found in request');
  }
  next();
};

// Role-based authorization middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.userInfo) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRoles = req.userInfo.roles;
    const hasRole = roles.some(role => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: roles,
        current: userRoles
      });
    }

    next();
  };
};

// Permission/scope-based authorization middleware
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.userInfo) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userPermissions = req.userInfo.permissions || [];
    const userScopes = req.userInfo.scope ? req.userInfo.scope.split(' ') : [];

    // Check both permissions array and scope string
    const hasPermission = userPermissions.includes(permission) || userScopes.includes(permission);

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: [permission],
        current: userPermissions.length > 0 ? userPermissions : userScopes
      });
    }

    next();
  };
};

// Combined role OR permission check
const requireRoleOrPermission = (roles, permissions) => {
  return (req, res, next) => {
    if (!req.userInfo) {
      console.log('[Auth] No userInfo found in request');
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRoles = req.userInfo.roles || [];
    const userPermissions = req.userInfo.permissions || [];
    const userScopes = req.userInfo.scope ? req.userInfo.scope.split(' ') : [];

    console.log('[Auth] Checking permissions:', {
      required: { roles, permissions },
      user: {
        roles: userRoles,
        permissions: userPermissions,
        scopes: userScopes
      }
    });

    // Check if user has any of the required roles
    const hasRole = roles.some(role => userRoles.includes(role));

    // Check if user has any of the required permissions
    const hasPermission = permissions.some(perm =>
      userPermissions.includes(perm) || userScopes.includes(perm)
    );

    console.log('[Auth] Permission check result:', {
      hasRole,
      hasPermission,
      userRoles,
      userPermissions,
      userScopes
    });

    if (!hasRole && !hasPermission) {
      console.log('[Auth] Access denied - insufficient permissions');
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: { roles, permissions },
        current: {
          roles: userRoles,
          permissions: userPermissions.length > 0 ? userPermissions : userScopes
        }
      });
    }

    console.log('[Auth] Access granted');
    next();
  };
};

// Specific role middlewares - check database role
const requireAdmin = async (req, res, next) => {
  try {
    console.log('[requireAdmin] Checking admin access...');
    console.log('[requireAdmin] req.userInfo:', req.userInfo);
    
    if (!req.userInfo) {
      console.log('[requireAdmin] No userInfo found');
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user has admin role in database
    const User = require('../models/User');
    const user = await User.findOne({ auth0_id: req.userInfo.auth0_id });
    
    console.log('[requireAdmin] User found in DB:', user ? {
      email: user.email,
      role: user.role,
      auth0_id: user.auth0_id
    } : 'null');
    
    if (!user) {
      console.log('[requireAdmin] User not found in database');
      return res.status(404).json({ 
        error: 'User not found in database',
        auth0_id: req.userInfo.auth0_id 
      });
    }

    if (user.role !== 'admin') {
      console.log(`[requireAdmin] Access denied - User ${user.email} has role '${user.role}', requires 'admin'`);
      return res.status(403).json({ 
        error: 'Insufficient permissions - Admin role required',
        current_role: user.role,
        required_role: 'admin',
        email: user.email
      });
    }

    console.log(`[requireAdmin] ✅ Admin access granted for ${user.email}`);
    next();
  } catch (error) {
    console.error('[requireAdmin] Error in middleware:', error);
    res.status(500).json({ error: 'Failed to validate permissions' });
  }
};

const requireLecturer = requireRole(['lecturer', 'admin']);
const requireStudent = requireRole(['student', 'lecturer', 'admin']);

// Specific permission middlewares
const requireReadUsers = requirePermission('read:users');
const requireWriteUsers = requirePermission('write:users');
const requireReadStats = requirePermission('read:stats');

// Combined middlewares (role OR permission)
const requireAdminOrReadUsers = requireRoleOrPermission(['admin'], ['read:users']);
const requireAdminOrReadStats = requireRoleOrPermission(['admin'], ['read:stats']);
const requireAdminOrWriteUsers = requireRoleOrPermission(['admin'], ['write:users']);
const requireAdminOrManageUsers = requireRoleOrPermission(['admin'], ['delete:users', 'write:users', 'manage:users']);

// Middleware to check if user owns resource or is admin
const requireOwnershipOrAdmin = (userIdField = 'student_id') => {
  return async (req, res, next) => {
    if (!req.userInfo) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admins can access everything
    if (req.userInfo.roles.includes('admin')) {
      return next();
    }

    // Get the user ID from the database record
    const resourceUserId = req.resource ? req.resource[userIdField] : null;
    
    if (!resourceUserId) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    // Check if the authenticated user owns this resource
    if (resourceUserId.toString() !== req.auth.sub) {
      return res.status(403).json({ error: 'Access denied: You can only access your own resources' });
    }

    next();
  };
};

module.exports = {
  checkJwt,
  extractUser,
  requireRole,
  requirePermission,
  requireRoleOrPermission,
  requireAdmin,
  requireLecturer,
  requireStudent,
  requireReadUsers,
  requireWriteUsers,
  requireReadStats,
  requireAdminOrReadUsers,
  requireAdminOrReadStats,
  requireAdminOrWriteUsers,
  requireAdminOrManageUsers,
  requireOwnershipOrAdmin
};
