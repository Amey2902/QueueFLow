const Room = require('../models/Room');
const Token = require('../models/Token');
const { generateUniqueCode } = require('./roomCodeGenerator');

async function createRoom(name, avgServiceTimeMin, organizerId = null) {
  if (!name || typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100) {
    throw Object.assign(new Error('Room name is required and must be 100 characters or fewer'), { status: 400 });
  }
  const avg = Number(avgServiceTimeMin);
  if (!Number.isInteger(avg) || avg < 1 || avg > 120) {
    throw Object.assign(new Error('Average service time must be between 1 and 120 minutes'), { status: 400 });
  }
  const roomCode = await generateUniqueCode();
  const room = await Room.create({ name: name.trim(), roomCode, avgServiceTimeMin: avg, organizerId });
  return { roomCode: room.roomCode, name: room.name, _id: room._id };
}

async function lookupRoom(code) {
  if (!code) throw Object.assign(new Error('Room not found. Please check your code and try again.'), { statusCode: 404 });
  const room = await Room.findOne({ roomCode: code.toUpperCase().trim() });
  if (!room) throw Object.assign(new Error('Room not found. Please check your code and try again.'), { statusCode: 404 });
  if (room.status === 'closed') throw Object.assign(new Error('This queue is closed.'), { statusCode: 410 });
  return { roomName: room.name, status: room.status, roomCode: room.roomCode };
}

async function listRooms(organizerId = null) {
  const filter = organizerId ? { organizerId } : {};
  const rooms = await Room.find(filter).sort({ createdAt: -1 });
  const result = await Promise.all(rooms.map(async (room) => {
    const tokenCount = await Token.countDocuments({ roomCode: room.roomCode, status: { $in: ['waiting', 'serving'] } });
    return {
      _id: room._id,
      name: room.name,
      roomCode: room.roomCode,
      status: room.status,
      avgServiceTimeMin: room.avgServiceTimeMin,
      tokenCount,
      createdAt: room.createdAt
    };
  }));
  return result;
}

async function setRoomStatus(roomCode, status) {
  if (!['active', 'closed'].includes(status)) {
    throw Object.assign(new Error('Invalid status'), { status: 400 });
  }
  const room = await Room.findOneAndUpdate(
    { roomCode: roomCode.toUpperCase().trim() },
    { status },
    { new: true }
  );
  if (!room) throw Object.assign(new Error('Room not found. Please check your code and try again.'), { status: 404 });
  return { roomCode: room.roomCode, status: room.status };
}

module.exports = { createRoom, lookupRoom, listRooms, setRoomStatus };
