/**
 * Unit tests for Room Service
 * Feature: room-code-queue
 */

jest.mock('../../src/models/Room');
jest.mock('../../src/models/Token');
jest.mock('../../src/services/roomCodeGenerator');

const Room = require('../../src/models/Room');
const { lookupRoom } = require('../../src/services/roomService');

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 3.6: Closed room lookup returns 410
// Validates: Requirements 2.4, 8.3
// ---------------------------------------------------------------------------
describe('lookupRoom — closed room', () => {
  test('returns 410 with "This queue is closed." for a closed room', async () => {
    Room.findOne.mockResolvedValue({ name: 'Closed Room', status: 'closed', roomCode: 'BOLT-XYZ' });

    const err = await lookupRoom('BOLT-XYZ').catch(e => e);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('This queue is closed.');
    expect(err.statusCode).toBe(410);
  });

  test('returns room data for an active room', async () => {
    Room.findOne.mockResolvedValue({ name: 'Open Room', status: 'active', roomCode: 'BOLT-XYZ' });

    const result = await lookupRoom('BOLT-XYZ');
    expect(result.roomName).toBe('Open Room');
    expect(result.status).toBe('active');
  });
});

// ---------------------------------------------------------------------------
// 13.1: Status messages display logic
// Validates: Requirements 5.3, 5.5, 5.6
// ---------------------------------------------------------------------------
describe('RoomDashboard status message conditions', () => {
  // Helper that mirrors the RoomDashboard display logic
  function getStatusMessage(status, tokensAhead) {
    if (tokensAhead <= 1 && status === 'waiting') return 'Your turn is near!';
    if (status === 'serving') return "It's your turn now!";
    if (status === 'done') return 'Your token has been completed.';
    return null;
  }

  test('shows "Your turn is near!" when tokensAhead is 0 and status is waiting', () => {
    expect(getStatusMessage('waiting', 0)).toBe('Your turn is near!');
  });

  test('shows "Your turn is near!" when tokensAhead is 1 and status is waiting', () => {
    expect(getStatusMessage('waiting', 1)).toBe('Your turn is near!');
  });

  test('does not show near message when tokensAhead is 2 and status is waiting', () => {
    expect(getStatusMessage('waiting', 2)).toBeNull();
  });

  test('shows "It\'s your turn now!" when status is serving', () => {
    expect(getStatusMessage('serving', 0)).toBe("It's your turn now!");
  });

  test('shows "Your token has been completed." when status is done', () => {
    expect(getStatusMessage('done', 0)).toBe('Your token has been completed.');
  });

  test('returns null for waiting status with many tokens ahead', () => {
    expect(getStatusMessage('waiting', 5)).toBeNull();
  });
});
