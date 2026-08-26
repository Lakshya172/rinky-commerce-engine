// Require logged-in user
exports.requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) return next();
  return res.status(401).json({ success: false, message: 'Please log in first.' });
};

// Require admin role
exports.requireAdmin = (req, res, next) => {
  if (req.session && req.session.role === 'admin') return next();
  return res.status(403).json({ success: false, message: 'Admin access required.' });
};
