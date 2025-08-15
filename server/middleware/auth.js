const { expressjwt: jwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');

// Auth0 JWT verification middleware
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
  if (req.user) {
    // Extract user information from the JWT token
    req.userInfo = {
      auth0_id: req.user.sub,
      email: req.user.email,
      name: req.user.name,
      roles: req.user['https://my-app.com/roles'] || [],
      email_verified: req.user.email_verified
    };
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

// Specific role middlewares
const requireAdmin = requireRole(['admin']);
const requireLecturer = requireRole(['lecturer', 'admin']);
const requireStudent = requireRole(['student', 'lecturer', 'admin']);

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
    if (resourceUserId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied: You can only access your own resources' });
    }

    next();
  };
};

module.exports = {
  checkJwt,
  extractUser,
  requireRole,
  requireAdmin,
  requireLecturer,
  requireStudent,
  requireOwnershipOrAdmin
};
