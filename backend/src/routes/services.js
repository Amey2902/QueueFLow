const express = require('express');
const router = express.Router();
const Service = require('../models/Service');

// Allow students, admins, and organizers to list services
function requireAuth(req, res, next) {
  if (['student', 'admin', 'organizer', 'user', 'participant'].includes(req.session.role)) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

router.get('/', requireAuth, async (req, res) => {
  const services = await Service.find({}, '_id name avgServiceTimeMin');
  res.json(services);
});

module.exports = router;
