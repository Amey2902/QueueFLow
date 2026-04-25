module.exports = function requireStudentAuth(req, res, next) {
  if (req.session.role !== 'student') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
