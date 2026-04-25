module.exports = function requireRoomInSession(req, res, next) {
  if (req.session.roomCode) return next();
  return res.status(403).json({ error: 'No room code associated with this session.' });
};
