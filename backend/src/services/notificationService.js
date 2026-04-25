const nodemailer = require('nodemailer');
const Token = require('../models/Token');

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const THRESHOLDS = [10, 5, 4, 3, 2, 1]; // notify when tokensAhead drops to these values

async function sendQueueEmail(to, subject, text) {
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      text,
    });
    console.log(`Notification sent to ${to}: ${subject}`);
  } catch (err) {
    console.error(`Failed to send notification to ${to}:`, err.message);
  }
}

// Call this after advancing the queue (for both room and service queues)
// Pass the roomCode or serviceId to scope the query
async function sendQueueNotifications({ roomCode, serviceId, counterLabel, queueName, avgServiceTimeMin }) {
  let query;
  if (roomCode) {
    query = { roomCode: roomCode.toUpperCase(), status: 'waiting' };
    if (counterLabel) query.counterLabel = counterLabel; // scope to this counter's queue
  } else {
    query = { serviceId, status: 'waiting' };
  }

  // Sort by sortOrder (same as actual queue order) so tokensAhead is accurate
  const waitingTokens = await Token.find(query).sort({ sortOrder: 1, tokenNumber: 1 });

  for (let i = 0; i < waitingTokens.length; i++) {
    const token = waitingTokens[i];
    const tokensAhead = i;
    const estimatedWaitMin = tokensAhead * (avgServiceTimeMin || 5);
    const expectedTime = new Date(Date.now() + estimatedWaitMin * 60000);
    const timeStr = expectedTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    // Find the highest threshold that applies and hasn't been sent yet
    const sent = token.notificationsSent || [];
    const applicable = THRESHOLDS.filter(t => tokensAhead <= t && !sent.includes(t));
    if (applicable.length === 0) continue;

    // Only send the highest applicable threshold (e.g. if 3 ahead, send "5" not "2" and "1")
    const threshold = Math.max(...applicable);
    const subject = `Queue Update — ${queueName}`;
    const text = `Hi,\n\nYou have ${tokensAhead} person${tokensAhead === 1 ? '' : 's'} ahead of you in the queue for "${queueName}".\n\nYour token number: #${token.tokenNumber}\nEstimated wait: ~${estimatedWaitMin} min\nExpected time: around ${timeStr}\n\nPlease be ready.`;
    await sendQueueEmail(token.studentEmail, subject, text);
    // Mark all lower-or-equal thresholds as sent so they don't fire later
    const toMark = THRESHOLDS.filter(t => t >= tokensAhead && !sent.includes(t));
    await Token.findByIdAndUpdate(token._id, { $push: { notificationsSent: { $each: toMark } } });
  }
}

// Call this when a token becomes 'serving'
async function sendServingNotification(token, queueName) {
  const sent = token.notificationsSent || [];
  if (sent.includes(0)) return;
  const subject = `It's Your Turn — ${queueName}`;
  const text = `Hi,\n\nIt's your turn now! Please proceed to the counter for "${queueName}" immediately.\n\nYour token number: #${token.tokenNumber}`;
  await sendQueueEmail(token.studentEmail, subject, text);
  await Token.findByIdAndUpdate(token._id, { $push: { notificationsSent: 0 } });
}

module.exports = { sendQueueEmail, sendQueueNotifications, sendServingNotification };
