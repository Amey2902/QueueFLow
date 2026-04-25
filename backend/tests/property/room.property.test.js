/**
 * Property-based tests for Room Service
 * Feature: room-code-queue
 * Uses fast-check with { numRuns: 100 }
 */

const fc = require('fast-check');
const mongoose = require('mongoose');

// We test the service functions directly without a real DB by mocking mongoose models
jest.mock('../../src/models/Room');
jest.mock('../../src/models/Token');
jest.mock('../../src/services/roomCodeGenerator');

const Room = require('../../src/models/Room');
const { generateUniqueCode } = require('../../src/services/roomCodeGenerator');
const { createRoom, lookupRoom } = require('../../src/services/roomService');

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Property 1: Room creation record fields invariant
// Validates: Requirements 1.1, 1.6
// ---------------------------------------------------------------------------
test('P1: createRoom returns roomCode, name, _id for any valid inputs', async () => {
  // Feature: room-code-queue, Property 1: Room creation record fields invariant
  await fc.assert(
    fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0 && s.trim().length <= 100),
      fc.integer({ min: 1, max: 120 }),
      async (name, avgServiceTimeMin) => {
        const fakeCode = 'APEX-AB1';
        const fakeId = new mongoose.Types.ObjectId();
        generateUniqueCode.mockResolvedValue(fakeCode);
        Room.create.mockResolvedValue({
          roomCode: fakeCode,
          name: name.trim(),
          _id: fakeId,
          avgServiceTimeMin,
          status: 'active',
          createdAt: new Date(),
        });

        const result = await createRoom(name, avgServiceTimeMin);

        expect(result).toHaveProperty('roomCode', fakeCode);
        expect(result).toHaveProperty('name', name.trim());
        expect(result).toHaveProperty('_id', fakeId);
      }
    ),
    { numRuns: 100 }
  );
});

// ---------------------------------------------------------------------------
// Property 4: Invalid room name is rejected
// Validates: Requirements 1.4
// ---------------------------------------------------------------------------
test('P4: createRoom rejects invalid room names', async () => {
  // Feature: room-code-queue, Property 4: Invalid room name is rejected
  const invalidNames = fc.oneof(
    fc.constant(''),
    fc.constant('   '),
    fc.string({ minLength: 101, maxLength: 200 }),
    fc.constant(null),
    fc.constant(undefined),
    fc.integer().map(n => n) // non-string
  );

  await fc.assert(
    fc.asyncProperty(invalidNames, async (name) => {
      await expect(createRoom(name, 30)).rejects.toThrow(
        'Room name is required and must be 100 characters or fewer'
      );
    }),
    { numRuns: 100 }
  );
});

// ---------------------------------------------------------------------------
// Property 5: Invalid average service time is rejected
// Validates: Requirements 1.5
// ---------------------------------------------------------------------------
test('P5: createRoom rejects invalid avgServiceTimeMin values', async () => {
  // Feature: room-code-queue, Property 5: Invalid average service time is rejected
  const invalidTimes = fc.oneof(
    fc.constant(0),
    fc.integer({ min: -1000, max: 0 }),
    fc.integer({ min: 121, max: 10000 }),
    fc.double({ min: 1.1, max: 119.9 }).filter(n => !Number.isInteger(n)),
    fc.constant(null),
    fc.constant(undefined),
    fc.constant('thirty'),
    fc.constant(NaN)
  );

  await fc.assert(
    fc.asyncProperty(invalidTimes, async (avg) => {
      await expect(createRoom('Valid Room', avg)).rejects.toThrow(
        'Average service time must be between 1 and 120 minutes'
      );
    }),
    { numRuns: 100 }
  );
});

// ---------------------------------------------------------------------------
// Property 6: Case-insensitive room code lookup
// Validates: Requirements 2.2, 2.6
// ---------------------------------------------------------------------------
test('P6: lookupRoom is case-insensitive', async () => {
  // Feature: room-code-queue, Property 6: Case-insensitive room code lookup
  await fc.assert(
    fc.asyncProperty(
      fc.stringMatching(/^[A-Z]{3,6}-[A-Z0-9]{3,4}$/),
      async (roomCode) => {
        const fakeRoom = { name: 'Test Room', status: 'active', roomCode };
        Room.findOne.mockResolvedValue(fakeRoom);

        // Mixed-case variant
        const mixedCase = roomCode
          .split('')
          .map((c, i) => (i % 2 === 0 ? c.toLowerCase() : c))
          .join('');

        const result = await lookupRoom(mixedCase);
        expect(result.roomName).toBe('Test Room');
        expect(result.status).toBe('active');

        // Verify findOne was called with uppercase
        expect(Room.findOne).toHaveBeenCalledWith({ roomCode: roomCode.toUpperCase().trim() });
      }
    ),
    { numRuns: 100 }
  );
});

// ---------------------------------------------------------------------------
// Property 7: Unknown room code returns not-found error
// Validates: Requirements 2.3, 8.2
// ---------------------------------------------------------------------------
test('P7: lookupRoom throws 404 for unknown room codes', async () => {
  // Feature: room-code-queue, Property 7: Unknown room code returns not-found error
  await fc.assert(
    fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 20 }),
      async (code) => {
        Room.findOne.mockResolvedValue(null);

        const err = await lookupRoom(code).catch(e => e);
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe('Room not found. Please check your code and try again.');
        expect(err.statusCode).toBe(404);
      }
    ),
    { numRuns: 100 }
  );
});
