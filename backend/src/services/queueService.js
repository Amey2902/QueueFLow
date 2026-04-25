const Token = require('../models/Token');
const Service = require('../models/Service');
const Room = require('../models/Room');
const { sendQueueNotifications, sendServingNotification } = require('./notificationService');

// Calculate dynamic avg service time from last 5 completed tokens
async function getDynamicAvgTime({ roomCode, serviceId, fallback = 5 }) {
  const query = roomCode
    ? { roomCode: roomCode.toUpperCase(), status: 'done', startedServingAt: { $ne: null }, servedAt: { $ne: null } }
    : { serviceId, status: 'done', startedServingAt: { $ne: null }, servedAt: { $ne: null } };

  const recent = await Token.find(query).sort({ servedAt: -1 }).limit(5);
  if (recent.length === 0) return fallback;

  const avgMs = recent.reduce((sum, t) => sum + (t.servedAt - t.startedServingAt), 0) / recent.length;
  return Math.max(2, Math.round(avgMs / 60000)); // min 2 minutes to avoid 0
}


async function getStudentStatus(studentEmail) {
  const token = await Token.findOne({
    studentEmail,
    status: { $in: ['waiting', 'serving'] }
  }).populate('serviceId');

  if (!token) throw new Error('No active token found');

  const tokensAhead = await Token.countDocuments({
    serviceId: token.serviceId._id,
    status: 'waiting',
    tokenNumber: { $lt: token.tokenNumber }
  });

  const servingToken = await Token.findOne({
    serviceId: token.serviceId._id,
    status: 'serving'
  });

  const estimatedWaitTimeMin = tokensAhead * token.serviceId.avgServiceTimeMin;

  return {
    tokenNumber: token.tokenNumber,
    currentlyServingToken: servingToken?.tokenNumber || null,
    tokensAhead,
    estimatedWaitTimeMin,
    status: token.status,
    serviceName: token.serviceId.name
  };
}

async function getQueueForService(serviceId) {
  const tokens = await Token.find({
    serviceId,
    status: { $in: ['waiting', 'serving'] }
  }).sort({ tokenNumber: 1 });

  return tokens.map(t => ({
    tokenNumber: t.tokenNumber,
    studentEmail: t.studentEmail,
    status: t.status
  }));
}

async function advanceQueue(serviceId) {
  const servingToken = await Token.findOne({ serviceId, status: 'serving' });
  if (servingToken) {
    await Token.findByIdAndUpdate(servingToken._id, { status: 'done', servedAt: new Date() });
  }

  const nextToken = await Token.findOne({ serviceId, status: 'waiting' }).sort({ tokenNumber: 1 });
  if (!nextToken) return { message: 'No more tokens in queue' };

  await Token.findByIdAndUpdate(nextToken._id, { status: 'serving', startedServingAt: new Date() });

  const service = await Service.findById(serviceId);
  const queueName = service?.name || 'Queue';
  const avgServiceTimeMin = await getDynamicAvgTime({ serviceId, fallback: service?.avgServiceTimeMin || 5 });

  sendServingNotification(nextToken, queueName).catch(() => {});
  sendQueueNotifications({ serviceId, queueName, avgServiceTimeMin }).catch(() => {});

  return { message: 'Advanced to next token', tokenNumber: nextToken.tokenNumber };
}

async function resetQueue(serviceId) {
  await Token.updateMany({ serviceId }, { status: 'done' });
  await Service.findByIdAndUpdate(serviceId, { currentTokenSeq: 0 });
  return { message: 'Queue reset' };
}

async function getParticipantStatus(email, roomCode) {
  const token = await Token.findOne({
    studentEmail: email,
    roomCode: roomCode.toUpperCase(),
    status: { $in: ['waiting', 'serving'] }
  });
  if (!token) throw new Error('No active token found');

  const effectiveOrder = token.sortOrder ?? (token.tokenNumber * 1000);

  // Scope tokensAhead to the same counter if assigned, for accurate wait time
  const counterQuery = token.counterLabel
    ? { counterLabel: token.counterLabel }
    : {};

  const tokensAhead = await Token.countDocuments({
    roomCode: roomCode.toUpperCase(),
    status: 'waiting',
    _id: { $ne: token._id },
    ...counterQuery,
    $or: [
      { sortOrder: { $lt: effectiveOrder } },
      { sortOrder: null, tokenNumber: { $lt: effectiveOrder / 1000 } }
    ]
  });

  const servingToken = await Token.findOne({
    roomCode: roomCode.toUpperCase(),
    status: 'serving',
    ...counterQuery
  });
  const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });
  const dynamicAvg = await getDynamicAvgTime({ roomCode, fallback: room?.avgServiceTimeMin || 5 });
  const estimatedWaitTimeMin = tokensAhead * dynamicAvg;
  const expectedAt = new Date(Date.now() + estimatedWaitTimeMin * 60000);
  const expectedTimeStr = expectedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  return {
    tokenNumber: token.tokenNumber,
    currentlyServingToken: servingToken?.tokenNumber || null,
    tokensAhead,
    estimatedWaitTimeMin,
    expectedTime: expectedTimeStr,
    highTraffic: tokensAhead >= 20,
    status: token.status,
    roomName: room.name,
    counterLabel: token.counterLabel || null,
    isSlotBooking: token.isSlotBooking || false
  };
}

async function getRoomQueue(roomCode) {
  // Fix any tokens with null sortOrder (legacy/seed tokens) — assign based on tokenNumber
  const nullTokens = await Token.find(
    { roomCode: roomCode.toUpperCase(), status: { $in: ['waiting', 'serving'] }, sortOrder: null }
  );
  for (const t of nullTokens) {
    await Token.findByIdAndUpdate(t._id, { sortOrder: t.tokenNumber * 1000 });
  }

  const tokens = await Token.find({
    roomCode: roomCode.toUpperCase(),
    status: { $in: ['waiting', 'serving', 'missed'] }
  }).sort({ sortOrder: 1, tokenNumber: 1 });

  const HIGH_TRAFFIC_THRESHOLD = 20;
  const waitingCount = tokens.filter(t => t.status === 'waiting').length;

  return {
    tokens: tokens.map(t => ({ tokenNumber: t.tokenNumber, studentEmail: t.studentEmail, status: t.status, counterLabel: t.counterLabel, isSlotBooking: t.isSlotBooking || false, sortOrder: t.sortOrder ?? t.tokenNumber * 1000 })),
    highTraffic: waitingCount >= HIGH_TRAFFIC_THRESHOLD,
    waitingCount
  };
}

async function advanceRoomQueue(roomCode, counterLabel = null) {
  const baseQuery = { roomCode: roomCode.toUpperCase() };
  if (counterLabel) baseQuery.counterLabel = counterLabel;

  const serving = await Token.findOneAndUpdate(
    { ...baseQuery, status: 'serving' },
    { status: 'done', servedAt: new Date() },
    { new: false }
  );

  const next = await Token.findOneAndUpdate(
    { ...baseQuery, status: 'waiting' },
    { status: 'serving', startedServingAt: new Date() },
    { new: true, sort: { sortOrder: 1, tokenNumber: 1 } }
  );

  if (!next) return { message: 'No more tokens in queue' };

  const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });
  const queueName = room?.name || roomCode;
  const avgServiceTimeMin = await getDynamicAvgTime({ roomCode, fallback: room?.avgServiceTimeMin || 5 });

  sendServingNotification(next, queueName).catch(() => {});
  sendQueueNotifications({ roomCode, counterLabel, queueName, avgServiceTimeMin }).catch(() => {})

  return { message: 'Advanced to next token', tokenNumber: next.tokenNumber };
}

async function skipCurrentToken(roomCode, counterLabel = null) {
  const query = { roomCode: roomCode.toUpperCase(), status: 'serving' };
  if (counterLabel) query.counterLabel = counterLabel;

  const missed = await Token.findOneAndUpdate(
    query,
    { status: 'missed' },
    { new: true }
  );

  if (!missed) return { message: 'No token currently being served' };
  return { message: `Token #${missed.tokenNumber} marked as missed` };
}


async function resetRoomQueue(roomCode) {
  await Token.deleteMany({ roomCode: roomCode.toUpperCase() });
  await Room.findOneAndUpdate({ roomCode: roomCode.toUpperCase() }, { currentTokenSeq: 0 });
  return { message: 'Queue reset' };
}

module.exports = { getStudentStatus, getQueueForService, advanceQueue, resetQueue, getParticipantStatus, getRoomQueue, advanceRoomQueue, resetRoomQueue, skipCurrentToken };
