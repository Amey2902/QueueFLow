# Implementation Plan: Room Code Queue

## Overview

Extend the existing Digital Queue System with room-scoped access. Backend adds Room model, Room service, code generator, new routes, middleware, and extensions to Token/Queue/Auth services. Frontend adds landing page room code entry, a new RoomDashboard, and AdminDashboard extensions.

## Tasks

- [x] 1. Room model and Room Code Generator
  - Create `backend/src/models/Room.js` with the schema defined in the design (name, roomCode, avgServiceTimeMin, currentTokenSeq, status, createdAt) and indexes
  - Create `backend/src/services/roomCodeGenerator.js` with `generateCode()` and `generateUniqueCode(maxAttempts)` as specified in the design
  - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 1.1 Write property test for Room code format (P2)
    - **Property 2: Room code format invariant**
    - **Validates: Requirements 1.2**

  - [ ]* 1.2 Write property test for Room code uniqueness (P3)
    - **Property 3: Room code uniqueness across concurrent creations**
    - **Validates: Requirements 1.3**

- [x] 2. Extend Token model
  - Add optional `roomCode` field (`{ type: String, default: null }`) to `backend/src/models/Token.js`
  - Make `serviceId` optional (remove `required: true`)
  - Add compound index `{ roomCode: 1, status: 1, tokenNumber: 1 }` as specified in the design
  - _Requirements: 4.1, 4.2_

- [x] 3. Room Service
  - Create `backend/src/services/roomService.js` implementing:
    - `createRoom(name, avgServiceTimeMin)` — validates inputs, calls `generateUniqueCode`, saves Room, returns `{ roomCode, name, _id }`
    - `lookupRoom(code)` — case-insensitive lookup, returns `{ roomName, status }` or throws 404/410
    - `listRooms()` — returns all rooms with token counts
    - `setRoomStatus(roomCode, status)` — sets `"active"` or `"closed"`
  - _Requirements: 1.1, 1.4, 1.5, 1.6, 2.2, 2.3, 2.4, 6.1, 6.6, 6.7_

  - [ ]* 3.1 Write property test for Room creation record fields (P1)
    - **Property 1: Room creation record fields invariant**
    - **Validates: Requirements 1.1, 1.6**

  - [ ]* 3.2 Write property test for invalid room name rejection (P4)
    - **Property 4: Invalid room name is rejected**
    - **Validates: Requirements 1.4**

  - [ ]* 3.3 Write property test for invalid avgServiceTimeMin rejection (P5)
    - **Property 5: Invalid average service time is rejected**
    - **Validates: Requirements 1.5**

  - [ ]* 3.4 Write property test for case-insensitive lookup (P6)
    - **Property 6: Case-insensitive room code lookup**
    - **Validates: Requirements 2.2, 2.6**

  - [ ]* 3.5 Write property test for unknown room code returns 404 (P7)
    - **Property 7: Unknown room code returns not-found error**
    - **Validates: Requirements 2.3, 8.2**

  - [ ]* 3.6 Write unit test for closed room lookup returning 410
    - Lookup of a closed room returns 410 + "This queue is closed."
    - _Requirements: 2.4, 8.3_

- [x] 4. Auth Service extension
  - Extend `backend/src/services/authService.js` `verifyOtp` to accept an optional `roomCode` parameter
  - When `roomCode` is provided, set `session.role = "participant"`, `session.email`, and `session.roomCode`
  - Existing admin and student session logic must remain unchanged
  - _Requirements: 2.5, 3.1, 9.1, 9.2_

  - [ ]* 4.1 Write property test for session fields after OTP verification (P8)
    - **Property 8: Session contains roomCode and participant role after OTP verification**
    - **Validates: Requirements 2.5, 3.1**

  - [ ]* 4.2 Write unit test for backward compat — admin login unchanged
    - Admin login still works without roomCode
    - _Requirements: 9.1, 9.2_

- [x] 5. Participant middleware
  - Create `backend/src/middleware/requireParticipantAuth.js` — checks `session.role === "participant"`, returns 401 on failure
  - Create `backend/src/middleware/requireRoomInSession.js` — checks `session.roomCode` exists, returns 403 with `"No room code associated with this session."` on failure
  - _Requirements: 3.2, 3.3_

  - [ ]* 5.1 Write unit test for missing roomCode in session returning 403
    - Participant session without roomCode → 403
    - _Requirements: 3.3_

- [x] 6. Token Service extension
  - Extend `backend/src/services/tokenService.js` with `generateRoomToken(email, roomCode)`:
    - Check for existing active token (waiting/serving) across all rooms → reject with "You already have an active token"
    - Atomically increment `Room.currentTokenSeq` via `findOneAndUpdate` with `$inc`
    - Create Token with `{ tokenNumber, studentEmail: email, roomCode, status: "waiting" }`
    - Return `{ tokenNumber, roomName, roomCode }`
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 6.1 Write property test for token record fields invariant (P9)
    - **Property 9: Token record fields invariant**
    - **Validates: Requirements 4.1, 4.4**

  - [ ]* 6.2 Write property test for sequential token numbering per room (P10)
    - **Property 10: Token numbers are sequential starting from 1 per room**
    - **Validates: Requirements 4.2**

  - [ ]* 6.3 Write property test for duplicate active token rejection (P11)
    - **Property 11: Duplicate active token is rejected**
    - **Validates: Requirements 4.3**

- [x] 7. Queue Service extension
  - Extend `backend/src/services/queueService.js` with:
    - `getParticipantStatus(email, roomCode)` — returns `{ tokenNumber, currentlyServingToken, tokensAhead, estimatedWaitTimeMin, status }` scoped to room
    - `getRoomQueue(roomCode)` — returns all active tokens for room with `{ tokenNumber, studentEmail, status }`
    - `advanceRoomQueue(roomCode)` — sets serving token to done, next waiting to serving (FIFO); returns "No more tokens in queue" if none waiting
    - `resetRoomQueue(roomCode)` — sets all room tokens to done, resets `Room.currentTokenSeq = 0`
  - _Requirements: 5.1, 5.2, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 7.1 Write property test for queue status response fields (P12)
    - **Property 12: Queue status response includes all required fields**
    - **Validates: Requirements 5.1**

  - [ ]* 7.2 Write property test for ETA calculation correctness (P13)
    - **Property 13: ETA calculation correctness**
    - **Validates: Requirements 5.2**

  - [ ]* 7.3 Write property test for admin room list response fields (P14)
    - **Property 14: Admin room list response includes all rooms with required fields**
    - **Validates: Requirements 6.1**

  - [ ]* 7.4 Write property test for admin room queue response fields (P15)
    - **Property 15: Admin room queue response includes all token fields**
    - **Validates: Requirements 6.2**

  - [ ]* 7.5 Write property test for advance queue status transitions (P16)
    - **Property 16: Advance queue transitions statuses correctly**
    - **Validates: Requirements 6.3**

  - [ ]* 7.6 Write property test for reset queue (P17)
    - **Property 17: Reset queue sets all tokens to done and resets sequence**
    - **Validates: Requirements 6.5**

  - [ ]* 7.7 Write unit test for empty queue advance
    - No waiting tokens → "No more tokens in queue"
    - _Requirements: 6.4_

- [x] 8. Room routes
  - Create `backend/src/routes/rooms.js` with:
    - `GET /api/rooms/lookup?code=` → `roomService.lookupRoom` (public)
    - `POST /api/rooms` → `roomService.createRoom` (requireAdminAuth)
    - `GET /api/rooms` → `roomService.listRooms` (requireAdminAuth)
    - `PATCH /api/rooms/:roomCode/status` → `roomService.setRoomStatus` (requireAdminAuth)
  - Mount router in `backend/src/app.js`
  - _Requirements: 1.1, 1.6, 2.1, 2.2, 6.1, 6.6, 6.7, 8.1, 8.4_

  - [ ]* 8.1 Write property test for public lookup not exposing sensitive data (P20)
    - **Property 20: Public lookup endpoint does not expose sensitive data**
    - **Validates: Requirements 8.1, 8.4**

- [x] 9. Token and Queue routes extension
  - Add `POST /api/tokens/room` to `backend/src/routes/tokens.js` → `tokenService.generateRoomToken` (requireParticipantAuth + requireRoomInSession)
  - Add to `backend/src/routes/queue.js`:
    - `GET /api/queue/room-status` → `queueService.getParticipantStatus` (requireParticipantAuth + requireRoomInSession)
    - `GET /api/queue/room/:roomCode` → `queueService.getRoomQueue` (requireAdminAuth)
    - `POST /api/queue/room/:roomCode/next` → `queueService.advanceRoomQueue` (requireAdminAuth)
    - `POST /api/queue/room/:roomCode/reset` → `queueService.resetRoomQueue` (requireAdminAuth)
  - _Requirements: 3.2, 4.1, 5.1, 6.2, 6.3, 6.5, 7.1, 7.2_

  - [ ]* 9.1 Write property test for room isolation — cross-room access denied (P19)
    - **Property 19: Room isolation — cross-room access is denied**
    - **Validates: Requirements 7.1, 7.2**

  - [ ]* 9.2 Write unit test for backward compat — GET /api/services unchanged
    - Returns services for admin session without roomCode
    - _Requirements: 9.3_

- [ ] 10. Checkpoint — backend wired and tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Frontend API additions
  - Add to `frontend/src/api.js`:
    - `lookupRoom(code)` → `GET /api/rooms/lookup?code=`
    - `sendOtp(email)` (already exists — verify it passes through unchanged)
    - `verifyOtp(email, otp, roomCode)` → `POST /api/auth/verify-otp` with roomCode
    - `generateRoomToken()` → `POST /api/tokens/room`
    - `getRoomStatus()` → `GET /api/queue/room-status`
    - `createRoom(name, avgServiceTimeMin)` → `POST /api/rooms`
    - `listRooms()` → `GET /api/rooms`
    - `getRoomQueue(roomCode)` → `GET /api/queue/room/:roomCode`
    - `advanceRoomQueue(roomCode)` → `POST /api/queue/room/:roomCode/next`
    - `resetRoomQueue(roomCode)` → `POST /api/queue/room/:roomCode/reset`
    - `setRoomStatus(roomCode, status)` → `PATCH /api/rooms/:roomCode/status`
  - _Requirements: 2.1, 4.1, 5.1, 6.1, 6.2, 6.3, 6.5, 6.6, 6.7_

- [x] 12. LandingPage — room code entry flow
  - Replace or extend `frontend/src/pages/LoginPage.jsx` with a new `LandingPage.jsx` that implements the three-step flow:
    - Step 1: RoomCodeForm — room code input + "Join Queue" button; calls `lookupRoom`, shows inline errors for 404/410
    - Step 2: EmailForm — email input + "Send OTP" (shown after valid room code)
    - Step 3: OtpForm — OTP input + "Verify"; passes roomCode to `verifyOtp`; on success redirects to `/room/:roomCode`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1_

  - [ ]* 12.1 Write unit test for landing page renders room code input
    - Page renders input field and "Join Queue" button
    - _Requirements: 2.1_

- [x] 13. RoomDashboard — new participant page
  - Create `frontend/src/pages/RoomDashboard.jsx`:
    - On mount: call `generateRoomToken()` if no active token; poll `getRoomStatus()` every 5 seconds
    - Display: room name + room code badge, token number, tokens ahead, estimated wait time
    - Status messages: tokensAhead ≤ 1 → "Your turn is near"; status `"serving"` → "It's your turn now"; status `"done"` → "Your token has been completed"
    - Show inline error after 3 consecutive polling failures
    - LogoutButton
  - _Requirements: 4.1, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 13.1 Write unit tests for status messages display
    - tokensAhead ≤ 1 → "Your turn is near"; status "serving" → "It's your turn now"; status "done" → "Your token has been completed"
    - _Requirements: 5.3, 5.5, 5.6_

- [x] 14. AdminDashboard extension
  - Extend `frontend/src/pages/AdminDashboard.jsx`:
    - Add `CreateRoomForm` — room name + avg service time inputs + "Create Room" button; calls `createRoom`; shows inline errors
    - Add `RoomList` that fetches `listRooms()` on mount and after any mutation
    - Add `RoomPanel` per room containing:
      - `RoomCodeBadge` — prominent display of roomCode + copy button
      - `StatusBadge` — "active" / "closed"
      - `TokenTable` — token number, participant email, status (from `getRoomQueue`)
      - "Next Token" button → `advanceRoomQueue`
      - "Reset Queue" button → `resetRoomQueue`
      - "Close Room" / "Reopen Room" toggle → `setRoomStatus`
  - _Requirements: 1.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [ ]* 14.1 Write unit test for room code badge visible in admin UI
    - Room code appears in rendered RoomPanel
    - _Requirements: 6.8_

  - [ ]* 14.2 Write property test for close then reopen round trip (P18)
    - **Property 18: Close then reopen restores active status (round trip)**
    - **Validates: Requirements 6.6, 6.7**

- [x] 15. Frontend routing changes
  - Update `frontend/src/App.jsx`:
    - `/` → `LandingPage`
    - `/room/:roomCode` → `RoomDashboard` (protected: participant role)
    - `/admin` → `AdminDashboard` (protected: admin role)
    - Preserve existing `/dashboard` route for legacy student sessions
  - _Requirements: 2.1, 3.1, 9.1_

- [ ] 16. Final checkpoint — full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use fast-check with `{ numRuns: 100 }` and a comment tag `// Feature: room-code-queue, Property N: ...`
- Run tests once with: `jest --runInBand --forceExit`
