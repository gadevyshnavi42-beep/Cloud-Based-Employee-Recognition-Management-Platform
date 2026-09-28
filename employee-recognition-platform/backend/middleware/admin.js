// Role checks. Use AFTER the auth middleware.
// adminOnly      -> only role "admin"
// managerOrAdmin -> role "manager" or "admin" (read-only admin pages)
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ message: 'Admin access required' });
};

const managerOrAdmin = (req, res, next) => {
  if (req.user && ['admin', 'manager'].includes(req.user.role)) return next();
  return res.status(403).json({ message: 'Manager or admin access required' });
};

module.exports = adminOnly;
module.exports.adminOnly = adminOnly;
module.exports.managerOrAdmin = managerOrAdmin;
