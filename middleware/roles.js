function normalizeRoles(roles) {
  if (!Array.isArray(roles)) {
    roles = [roles];
  }

  return roles
    .filter(Boolean)
    .map(role => String(role).trim().toLowerCase());
}

function getUserRole(user) {
  if (!user || typeof user !== 'object') {
    return null;
  }

  const role =
    user.role ??
    user.user_role ??
    user.userRole;

  if (!role) {
    return null;
  }

  return String(role).trim().toLowerCase();
}

function requireRole(...allowedRoles) {
  const roles = normalizeRoles(allowedRoles);

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Autenticación requerida'
      });
    }

    const userRole = getUserRole(req.user);

    if (!userRole) {
      return res.status(403).json({
        success: false,
        error: 'El usuario no tiene un rol asignado'
      });
    }

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'No tenés permisos para realizar esta operación'
      });
    }

    next();
  };
}

function requireAnyRole(...allowedRoles) {
  return requireRole(...allowedRoles);
}

function requireAdmin(req, res, next) {
  return requireRole('admin')(req, res, next);
}

function requireUser(req, res, next) {
  return requireRole('user')(req, res, next);
}

module.exports = {
  requireRole,
  requireAnyRole,
  requireAdmin,
  requireUser,
  getUserRole
};
