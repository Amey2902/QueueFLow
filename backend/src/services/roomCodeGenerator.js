const Room = require('../models/Room');

const WORDS = [
  'HAK', 'PITCH', 'QUEUE', 'FAST', 'OPEN', 'NOVA', 'APEX', 'BOLT',
  'RUSH', 'WAVE', 'SYNC', 'LINK', 'GATE', 'HUB', 'CORE', 'EDGE',
  'FLOW', 'GRID', 'NODE', 'SPARK', 'TRACK', 'VAULT', 'ZONE', 'PULSE',
  'SHIFT', 'STACK', 'TOKEN', 'RELAY', 'NEXUS', 'ORBIT'
];
const ALPHANUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateCode() {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const suffixLen = 3 + Math.floor(Math.random() * 2);
  const suffix = Array.from({ length: suffixLen }, () =>
    ALPHANUM[Math.floor(Math.random() * ALPHANUM.length)]
  ).join('');
  return `${word}-${suffix}`;
}

async function generateUniqueCode(maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateCode();
    const exists = await Room.exists({ roomCode: code });
    if (!exists) return code;
  }
  throw new Error('Failed to generate unique room code after 10 attempts');
}

module.exports = { generateCode, generateUniqueCode };
