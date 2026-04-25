# Implementation Plan: Digital Queue System for College Offices

## Overview

Full-stack implementation using React.js (frontend), Node.js/Express.js (backend), MongoDB/Mongoose (database), Nodemailer (email), and express-session (auth). Tasks are ordered to build incrementally: project scaffold → data models → backend services → API routes → frontend pages → tests.

## Tasks

- [ ] 1. Project scaffold and configuration
  - Initialize `backend/` with `npm init`, install dependencies: `express`, `mongoose`, `express-session`, `nodemailer`, `dotenv`, `cors`
  - Initialize `frontend/` with `create-react-app` or Vite (React)
  - Install backend dev dependencies: `jest`, `supertest`, `fast-check`
  - Create `backend/.env.example` with `MONGO_URI`, `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
  - Create `backend/src/app.js` wiring Express, CORS, session middleware, and routes
  - Create `backend/src/server.js` entry point connecting to MongoDB then starting the server
  - _Requirements: 1.1, 2.1_

- [x] 2. Data models
  - [x] 2.1 Implement OTP Mongoose schema (`backend/src/models/Otp.js`)
    - Fields: `email` (String, indexed), `otp` (String), `expiresAt` (Date, TTL index `expireAfterSeconds: 0`)
    - _Requirements: 1.1, 8.1_

  - [x] 2.2 Implement Student Mongoose schema (`backend/src/models/Student.js`)
    - Fields: `email` (String, unique), `createdAt` (Date, default now)
    - _Requirements: 1.4_

  - [x] 2.3 Implement Service Mongoose schema (`backend/src/models/Service.js`)
    - Fields: `name` (String, unique), `avgServiceTimeMin` (Number, default 5), `currentTokenSeq` (Number, default 0)
    - _Requirements: 3.1, 3.2_

  - [x] 2.4 Implement Token Mongoose schema (`backend/src/models/Token.js`)
    - Fields: `tokenNumber`, `studentEmail`, `serviceId` (ref Service), `status` (enum waiting/serving/done), `createdAt`
    - Compound index `{ serviceId, status, tokenNumber }` and index `{ studentEmail, status }`
    - _Requirements: 4.1, 4.2_

  - [ ]* 2.5 Write unit test for TTL index schema
    - Verify `expiresAt` field has `expireAfterSeconds: 0` index defined in `tests/unit/schema.test.js`
    - **Validates: Requirements 8.1**

- [x] 3. Database seed script
  - [x] 3.1 Create `backend/src/seed.js` that upserts "Bonafide" (5 min), "ID Card" (7 min), "Fees" (10 min) into Services collection
    - _Requirements: 3.1_

  - [ ]* 3.2 Write unit test for seed data
    - Run seed and verify all three services exist with correct names and `avgServiceTimeMin` in `tests/unit/token.test.js`
    - **Validates: Requirements 3.1**

- [x] 4. Auth middleware
  - Create `backend/src/middleware/requireStudentAuth.js` — checks `req.session.role === 'student'`, returns 401 if not
  - Create `backend/src/middleware/requireAdminAuth.js` — checks `req.session.role === 'admin'`, returns 401 if not
  - _Requirements: 2.4, 7.1_

- [x] 5. OTP Service and Auth Service
  - [x] 5.1 Implement `backend/src/services/otpService.js`
    - `sendOtp(email)`: validate email format, upsert OTP record (invalidate old), generate 6-digit random OTP, set `expiresAt = now + 10 min`, send via Nodemailer, return OTP (for testing)
    - _Requirements: 1.1, 1.2, 1.3, 1.8_

  - [x] 5.2 Implement `backend/src/services/authService.js`
    - `verifyOtp(email, otp, session)`: find OTP record, check expiry, upsert Student, set `session.role = 'student'` and `session.email`
    - `adminLogin(email, password, session)`: compare against `process.env.ADMIN_EMAIL/ADMIN_PASSWORD`, set `session.role = 'admin'`
    - `logout(session)`: destroy session
    - _Requirements: 1.4, 1.5, 1.6, 2.2, 2.3, 7.4_

  - [ ]* 5.3 Write property test for OTP record creation (P1)
    - `// Feature: digital-queue-system, Property 1: OTP record created with correct expiry`
    - Random valid emails → call `sendOtp` → verify OTP record exists with `expiresAt` ~10 min in future (±5 s tolerance), `numRuns: 100`
    - File: `tests/property/auth.property.test.js`
    - **Property 1: OTP record created with correct expiry**
    - **Validates: Requirements 1.1**

  - [ ]* 5.4 Write property test for invalid email rejection (P2)
    - `// Feature: digital-queue-system, Property 2: Invalid email format is rejected`
    - Random non-email strings → call send-OTP endpoint → verify 400 + "Invalid email address", no OTP record created, `numRuns: 100`
    - File: `tests/property/auth.property.test.js`
    - **Property 2: Invalid email format is rejected**
    - **Validates: Requirements 1.3**

  - [ ]* 5.5 Write property test for correct OTP round trip (P3)
    - `// Feature: digital-queue-system, Property 3: Correct OTP verifies successfully`
    - Random emails → sendOtp → verifyOtp with stored OTP → session has `role: 'student'` and correct email, `numRuns: 100`
    - File: `tests/property/auth.property.test.js`
    - **Property 3: Correct OTP verifies successfully (round trip)**
    - **Validates: Requirements 1.4**

  - [ ]* 5.6 Write property test for wrong OTP rejection (P4)
    - `// Feature: digital-queue-system, Property 4: Wrong OTP is rejected`
    - Random emails + wrong OTP strings → verifyOtp → "Invalid or expired OTP", no session, `numRuns: 100`
    - File: `tests/property/auth.property.test.js`
    - **Property 4: Wrong OTP is rejected**
    - **Validates: Requirements 1.5, 1.6**

  - [ ]* 5.7 Write property test for OTP re-request invalidation (P5)
    - `// Feature: digital-queue-system, Property 5: Re-requesting OTP invalidates the previous one`
    - Random emails → sendOtp twice → first OTP rejected, second accepted, `numRuns: 100`
    - File: `tests/property/auth.property.test.js`
    - **Property 5: Re-requesting OTP invalidates the previous one**
    - **Validates: Requirements 1.8**

  - [ ]* 5.8 Write property test for wrong admin credentials (P6)
    - `// Feature: digital-queue-system, Property 6: Wrong admin credentials are rejected`
    - Random (email, password) pairs ≠ admin creds → admin-login endpoint → "Invalid admin credentials", no admin session, `numRuns: 100`
    - File: `tests/property/admin.property.test.js`
    - **Property 6: Wrong admin credentials are rejected**
    - **Validates: Requirements 2.3**

  - [ ]* 5.9 Write unit test for admin login success
    - Correct credentials → admin session established in `tests/unit/auth.test.js`
    - **Validates: Requirements 2.2**

  - [ ]* 5.10 Write property test for logout session invalidation (P17)
    - `// Feature: digital-queue-system, Property 17: Logout invalidates session`
    - Random active sessions → logout → subsequent protected request returns 401, `numRuns: 100`
    - File: `tests/property/auth.property.test.js`
    - **Property 17: Logout invalidates session (round trip)**
    - **Validates: Requirements 7.4**

- [x] 6. Auth routes
  - Create `backend/src/routes/auth.js` with:
    - `POST /api/auth/send-otp` → `otpService.sendOtp`
    - `POST /api/auth/verify-otp` → `authService.verifyOtp`
    - `POST /api/auth/admin-login` → `authService.adminLogin`
    - `POST /api/auth/logout` → `authService.logout`
  - _Requirements: 1.1, 1.4, 2.2, 7.4_

- [ ] 7. Checkpoint — backend auth layer complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Token Service
  - [x] 8.1 Implement `backend/src/services/tokenService.js`
    - `generateToken(studentEmail, serviceId)`: check for existing active token (waiting/serving), atomically increment `Service.currentTokenSeq` via `$inc`, create Token record with `status: 'waiting'`, return `{ tokenNumber, serviceName }`
    - `getActiveToken(studentEmail)`: find token with status waiting/serving for student
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 8.2 Write property test for token record creation (P9)
    - `// Feature: digital-queue-system, Property 9: Token record created with all required fields`
    - Random (student, service) pairs → generateToken → verify record has all required fields and response includes `tokenNumber` + `serviceName`, `numRuns: 100`
    - File: `tests/property/token.property.test.js`
    - **Property 9: Token record created with all required fields and correct response**
    - **Validates: Requirements 4.1, 4.4**

  - [ ]* 8.3 Write property test for sequential token numbering (P10)
    - `// Feature: digital-queue-system, Property 10: Token numbers are sequential starting from 1`
    - Generate N tokens for same service → verify numbers are 1..N in order, `numRuns: 100`
    - File: `tests/property/token.property.test.js`
    - **Property 10: Token numbers are sequential starting from 1**
    - **Validates: Requirements 4.2**

  - [ ]* 8.4 Write property test for duplicate active token rejection (P11)
    - `// Feature: digital-queue-system, Property 11: Duplicate active token is rejected`
    - Student with active token → request another → "You already have an active token", no new record, `numRuns: 100`
    - File: `tests/property/token.property.test.js`
    - **Property 11: Duplicate active token is rejected**
    - **Validates: Requirements 4.3**

- [x] 9. Queue Service
  - [x] 9.1 Implement `backend/src/services/queueService.js`
    - `getStudentStatus(studentEmail)`: find active token, count waiting tokens ahead, compute ETA = tokensAhead × avgServiceTimeMin, return `{ tokenNumber, currentlyServingToken, tokensAhead, estimatedWaitTimeMin }`
    - `getQueueForService(serviceId)`: return all tokens for service with `tokenNumber`, `studentEmail`, `status`
    - `advanceQueue(serviceId)`: set current serving token to done, set next waiting token (lowest tokenNumber) to serving; if none, return "No more tokens in queue"
    - `resetQueue(serviceId)`: set all tokens to done, set `Service.currentTokenSeq = 0`
    - _Requirements: 5.1, 5.2, 6.1, 6.2, 6.3, 6.4_

  - [ ]* 9.2 Write property test for queue status response fields (P12)
    - `// Feature: digital-queue-system, Property 12: Queue status response includes all required fields`
    - Random queue states with active student token → status endpoint → response has `tokenNumber`, `currentlyServingToken`, `tokensAhead`, `estimatedWaitTimeMin`, `numRuns: 100`
    - File: `tests/property/queue.property.test.js`
    - **Property 12: Queue status response includes all required fields**
    - **Validates: Requirements 5.1**

  - [ ]* 9.3 Write property test for ETA calculation (P13)
    - `// Feature: digital-queue-system, Property 13: ETA calculation is correct`
    - Random (n, t) pairs → verify `estimatedWaitTimeMin === n × t`, `numRuns: 100`
    - File: `tests/property/queue.property.test.js`
    - **Property 13: ETA calculation is correct**
    - **Validates: Requirements 5.2**

  - [ ]* 9.4 Write property test for admin queue response fields (P14)
    - `// Feature: digital-queue-system, Property 14: Admin queue response includes all token fields`
    - Random queue states → admin queue endpoint → each token has `tokenNumber`, `studentEmail`, `status`, `numRuns: 100`
    - File: `tests/property/queue.property.test.js`
    - **Property 14: Admin queue response includes all token fields**
    - **Validates: Requirements 6.1**

  - [ ]* 9.5 Write property test for advance queue transitions (P15)
    - `// Feature: digital-queue-system, Property 15: Advance queue transitions statuses correctly`
    - Queue with serving + waiting tokens → advanceQueue → previously serving is done, next waiting is serving, `numRuns: 100`
    - File: `tests/property/queue.property.test.js`
    - **Property 15: Advance queue transitions statuses correctly**
    - **Validates: Requirements 6.2**

  - [ ]* 9.6 Write property test for reset queue (P16)
    - `// Feature: digital-queue-system, Property 16: Reset queue sets all tokens to done and resets sequence`
    - Random queue states → resetQueue → all tokens done, next token number is 1, `numRuns: 100`
    - File: `tests/property/queue.property.test.js`
    - **Property 16: Reset queue sets all tokens to done and resets sequence**
    - **Validates: Requirements 6.4**

  - [ ]* 9.7 Write unit test for empty queue advance
    - No waiting tokens → advanceQueue → "No more tokens in queue" in `tests/unit/queue.test.js`
    - **Validates: Requirements 6.3**

- [x] 10. Service and Token routes
  - Create `backend/src/routes/services.js`: `GET /api/services` (requireStudentAuth) → return all services
  - Create `backend/src/routes/tokens.js`: `POST /api/tokens` (requireStudentAuth), `GET /api/tokens/active` (requireStudentAuth)
  - Create `backend/src/routes/queue.js`: `GET /api/queue/status` (requireStudentAuth), `GET /api/queue/:serviceId` (requireAdminAuth), `POST /api/queue/:serviceId/next` (requireAdminAuth), `POST /api/queue/:serviceId/reset` (requireAdminAuth)
  - Wire all routers into `app.js`
  - _Requirements: 3.2, 4.1, 5.1, 6.1, 6.2, 6.4_

  - [ ]* 10.1 Write property test for service list response (P8)
    - `// Feature: digital-queue-system, Property 8: Service list response includes all services with required fields`
    - Random service sets → GET /api/services → all returned with `name` and `avgServiceTimeMin`, `numRuns: 100`
    - File: `tests/property/service.property.test.js`
    - **Property 8: Service list response includes all services with required fields**
    - **Validates: Requirements 3.2**

  - [ ]* 10.2 Write property test for access control (P7)
    - `// Feature: digital-queue-system, Property 7: Access control — wrong role or unauthenticated requests are rejected`
    - Random protected routes + wrong-role or no session → 401 response, `numRuns: 100`
    - File: `tests/property/admin.property.test.js`
    - **Property 7: Access control — wrong role or unauthenticated requests are rejected**
    - **Validates: Requirements 2.4, 7.1**

- [ ] 11. Checkpoint — full backend API complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Frontend — project setup and routing
  - Configure React Router in `frontend/src/App.js` with routes: `/` (LoginPage), `/dashboard` (StudentDashboard), `/admin` (AdminDashboard)
  - Create `frontend/src/api.js` axios (or fetch) wrapper with base URL and credentials: 'include' for session cookies
  - Create global `frontend/src/index.css` with base styles
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 13. Login Page
  - [x] 13.1 Create `frontend/src/pages/LoginPage.js` with `EmailForm` and `OtpForm` sub-components
    - `EmailForm`: email input + "Send OTP" button → calls `POST /api/auth/send-otp`; on success shows `OtpForm`
    - `OtpForm`: OTP input + "Verify" button → calls `POST /api/auth/verify-otp`; on success redirects to `/dashboard` (student) or `/admin` (admin) based on session role
    - Display inline error messages for all API errors
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 7.2, 7.3_

  - [ ]* 13.2 Write unit test for post-login redirect
    - Student login → redirected to `/dashboard`; admin login → redirected to `/admin` in `tests/unit/auth.test.js`
    - **Validates: Requirements 7.2, 7.3**

- [x] 14. Student Dashboard
  - [x] 14.1 Create `frontend/src/pages/StudentDashboard.js` with `ServiceList`, `TokenStatus`, and `LogoutButton` sub-components
    - `ServiceList`: fetches `GET /api/services`, renders each service with a "Get Token" button → calls `POST /api/tokens`
    - `TokenStatus`: polls `GET /api/queue/status` every 5 seconds; displays `tokenNumber`, `tokensAhead`, `estimatedWaitTimeMin`
    - Status messages: `tokensAhead <= 1` → "Your turn is near"; `status === 'serving'` → "It's your turn now"; `status === 'done'` → "Your token has been completed"
    - Silent retry on transient poll errors; show error after 3 consecutive failures
    - `LogoutButton`: calls `POST /api/auth/logout`, redirects to `/`
    - _Requirements: 3.2, 3.3, 4.1, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 7.4_

  - [ ]* 14.2 Write unit tests for status messages
    - `status === 'serving'` → "It's your turn now"; `status === 'done'` → "Your token has been completed"; `tokensAhead <= 1` → "Your turn is near" in `tests/unit/token.test.js`
    - **Validates: Requirements 5.3, 5.5, 5.6**

- [x] 15. Admin Dashboard
  - [x] 15.1 Create `frontend/src/pages/AdminDashboard.js` with `ServiceQueuePanel` and `LogoutButton` sub-components
    - `ServiceQueuePanel` (one per service): fetches `GET /api/queue/:serviceId`, renders `TokenTable` (tokenNumber, studentEmail, status), `NextButton` ("Next Token" → `POST /api/queue/:serviceId/next`), `ResetButton` ("Reset Queue" → `POST /api/queue/:serviceId/reset`)
    - After reset, re-fetch queue and display empty list immediately
    - `LogoutButton`: calls `POST /api/auth/logout`, redirects to `/`
    - Display inline messages for "No more tokens in queue" and other API responses
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.4_

  - [ ]* 15.2 Write unit test for queue reset UI
    - After reset, admin queue panel shows empty token list in `tests/unit/queue.test.js`
    - **Validates: Requirements 6.5**

- [x] 16. Frontend access control (route guards)
  - Add route guard logic in `App.js`: unauthenticated users accessing `/dashboard` or `/admin` are redirected to `/`
  - Students accessing `/admin` are redirected to `/dashboard`
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 17. Final checkpoint — all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Run: `jest --runInBand --forceExit --testPathPattern=tests/`

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with `numRuns: 100` and must include the comment tag `// Feature: digital-queue-system, Property N: <text>`
- Unit tests use Jest + Supertest against an in-memory or test MongoDB instance
- Polling interval on the student dashboard is 5 seconds
- Admin credentials are read from `process.env.ADMIN_EMAIL` and `process.env.ADMIN_PASSWORD` — never hardcoded
