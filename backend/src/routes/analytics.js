const express = require('express');
const router = express.Router();
const Token = require('../models/Token');
const requireAdminAuth = require('../middleware/requireAdminAuth');

// GET /api/analytics?roomCode=XXX (optional filter by room)
router.get('/', requireAdminAuth, async (req, res) => {
  try {
    const { roomCode } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const baseQuery = { createdAt: { $gte: today } };
    if (roomCode) baseQuery.roomCode = roomCode.toUpperCase();

    const allTokensToday = await Token.find(baseQuery);
    const doneTokens = allTokensToday.filter(t => t.status === 'done' && t.servedAt);

    // Average wait time (createdAt → servedAt)
    const avgWaitTimeMin = doneTokens.length
      ? Math.round(doneTokens.reduce((sum, t) => sum + (t.servedAt - t.createdAt) / 60000, 0) / doneTokens.length)
      : 0;

    // Peak time distribution
    const peakBuckets = { morning: 0, afternoon: 0, evening: 0 };
    for (const t of allTokensToday) {
      const hour = new Date(t.createdAt).getHours();
      if (hour < 12) peakBuckets.morning++;
      else if (hour < 17) peakBuckets.afternoon++;
      else peakBuckets.evening++;
    }

    // Status distribution (for pie chart)
    const statusCounts = { waiting: 0, serving: 0, done: 0 };
    for (const t of allTokensToday) {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    }

    res.json({
      totalToday: allTokensToday.length,
      totalServed: doneTokens.length,
      avgWaitTimeMin,
      peakDistribution: [
        { name: 'Morning (before 12pm)', value: peakBuckets.morning },
        { name: 'Afternoon (12–5pm)', value: peakBuckets.afternoon },
        { name: 'Evening (after 5pm)', value: peakBuckets.evening },
      ],
      statusDistribution: [
        { name: 'Waiting', value: statusCounts.waiting },
        { name: 'Serving', value: statusCounts.serving },
        { name: 'Done', value: statusCounts.done },
      ],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
