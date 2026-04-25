module.exports = function requireAdminAuth(req, res, next) {
  if (req.session.role === 'admin' || req.session.role === 'organizer') return next();
  return res.status(401).json({ error: 'Unauthorized' });
};
