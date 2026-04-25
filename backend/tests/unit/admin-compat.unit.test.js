/**
 * Unit tests for Auth Service backward compatibility
 * Feature: room-code-queue
 * Validates: Requirements 9.1, 9.2
 */

jest.mock('../../src/models/Otp');
jest.mock('../../src/models/Student');

const { adminLogin, logout } = require('../../src/services/authService');

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'secret';

beforeAll(() => {
  process.env.ADMIN_EMAIL = ADMIN_EMAIL;
  process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;
});

// ---------------------------------------------------------------------------
// 4.2: Backward compat — admin login unchanged
// Validates: Requirements 9.1, 9.2
// ---------------------------------------------------------------------------
describe('adminLogin — backward compatibility', () => {
  test('sets session.role = "admin" and session.email on valid credentials', async () => {
    const session = {};
    const result = await adminLogin(ADMIN_EMAIL, ADMIN_PASSWORD, session);

    expect(session.role).toBe('admin');
    expect(session.email).toBe(ADMIN_EMAIL);
    expect(result).toEqual({ role: 'admin', email: ADMIN_EMAIL });
  });

  test('throws on invalid credentials', async () => {
    const session = {};
    await expect(adminLogin('wrong@example.com', 'badpass', session)).rejects.toThrow(
      'Invalid admin credentials'
    );
  });

  test('does not set roomCode in admin session', async () => {
    const session = {};
    await adminLogin(ADMIN_EMAIL, ADMIN_PASSWORD, session);

    expect(session.roomCode).toBeUndefined();
  });

  test('logout destroys session', async () => {
    const session = {
      destroy: jest.fn(cb => cb(null)),
    };
    await expect(logout(session)).resolves.toBeUndefined();
    expect(session.destroy).toHaveBeenCalled();
  });
});
