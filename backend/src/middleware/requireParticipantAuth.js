module.exports = function requireParticipantAuth(req, res, next) {
  if (req.session.role === 'participant' || req.session.role === 'user') return next();
  return res.status(401).json({ error: 'Unauthorized' });
};
