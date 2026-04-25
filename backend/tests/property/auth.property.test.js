/**
 * Property-based tests for Auth Service
 * Feature: room-code-queue
 * Uses fast-check with { numRuns: 100 }
 */

const fc = require('fast-check');

jest.mock('../../src/models/Otp');
jest.mock('../../src/models/Student');

const Otp = require('../../src/models/Otp');
const Student = require('../../src/models/Student');
const { verifyOtp } = require('../../src/services/authService');

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Property 8: Session contains roomCode and participant role after OTP verification
// Validates: Requirements 2.5, 3.1
// ---------------------------------------------------------------------------
test('P8: verifyOtp sets participant role, email, and roomCode in session when roomCode is provided', async () => {
  // Feature: room-code-queue, Property 8: Session contains roomCode and participant role after OTP verification
  await fc.assert(
    fc.asyncProperty(
      fc.emailAddress(),
      fc.string({ minLength: 6, maxLength: 6 }).map(s => s.toUpperCase()),
      fc.stringMatching(/^[A-Z]{3,6}-[A-Z0-9]{3,4}$/),
      async (email, otp, roomCode) => {
        const futureDate = new Date(Date.now() + 60_000);
        Otp.findOne.mockResolvedValue({ email, otp, expiresAt: futureDate });
        Otp.deleteOne.mockResolvedValue({});
        Student.findOneAndUpdate.mockResolvedValue({ email });

        const session = {};
        const result = await verifyOtp(email, otp, session, roomCode);

        expect(session.role).toBe('participant');
        expect(session.email).toBe(email);
        expect(session.roomCode).toBe(roomCode);
        expect(result).toEqual({ role: 'participant', email, roomCode });
      }
    ),
    { numRuns: 100 }
  );
});

test('P8b: verifyOtp sets student role and email (no roomCode) when roomCode is omitted', async () => {
  // Feature: room-code-queue, Property 8: Session contains roomCode and participant role after OTP verification
  await fc.assert(
    fc.asyncProperty(
      fc.emailAddress(),
      fc.string({ minLength: 6, maxLength: 6 }).map(s => s.toUpperCase()),
      async (email, otp) => {
        const futureDate = new Date(Date.now() + 60_000);
        Otp.findOne.mockResolvedValue({ email, otp, expiresAt: futureDate });
        Otp.deleteOne.mockResolvedValue({});
        Student.findOneAndUpdate.mockResolvedValue({ email });

        const session = {};
        const result = await verifyOtp(email, otp, session);

        expect(session.role).toBe('user');
        expect(session.email).toBe(email);
        expect(session.roomCode).toBeUndefined();
        expect(result).toEqual({ role: 'user', email });
      }
    ),
    { numRuns: 100 }
  );
});
