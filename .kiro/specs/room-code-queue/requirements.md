# Requirements Document

## Introduction

The Room Code Queue feature extends the existing Digital Queue System with private, room-scoped access control. An admin creates a queue (service) and receives a short, human-readable room code (e.g. `HAK-2024`, `PITCH-7X3`). The admin shares this code out-of-band (WhatsApp, email, printed flyer, etc.). A participant enters the room code on the landing page, then authenticates via OTP, and can only see and join the queue associated with that room code. Queues without a room code remain inaccessible to participants who do not possess the code. This makes the system universal — suitable for hackathons, college offices, hospitals, restaurants, job fairs, or any context that requires a private, scoped queue.

The feature builds on the existing stack: React.js frontend, Node.js/Express.js backend, MongoDB, and express-session authentication.

---

## Glossary

- **System**: The Digital Queue System web application, extended with the Room Code Queue feature
- **Admin**: An authenticated administrator who creates and manages queues
- **Participant**: A user (formerly "Student") who joins a queue after entering a room code and authenticating via OTP
- **Room**: A named, scoped queue instance created by an Admin, identified by a unique Room_Code
- **Room_Code**: A short, uppercase alphanumeric code (e.g. `HAK-2024`, `PITCH-7X3`) that uniquely identifies a Room and grants access to its queue
- **Room_Code_Generator**: The backend component responsible for generating unique Room_Codes
- **Room_Service**: The backend component responsible for creating, retrieving, and managing Rooms
- **Queue_Service**: The existing backend component responsible for queue status queries and admin queue operations, extended to be room-scoped
- **Token_Service**: The existing backend component responsible for generating tokens, extended to be room-scoped
- **Auth_Service**: The existing backend component responsible for OTP verification and session management
- **OTP_Service**: The existing backend component responsible for generating and sending OTPs
- **Room_Dashboard**: The frontend page shown to an authenticated Participant scoped to a specific Room
- **Admin_Dashboard**: The existing frontend page shown to authenticated Admins, extended to support Room creation and management
- **Landing_Page**: The frontend entry page where a Participant enters a Room_Code before authenticating
- **Session**: A server-side record indicating a user is authenticated, extended to carry the active Room_Code for Participants

---

## Requirements

### Requirement 1: Room Creation by Admin

**User Story:** As an admin, I want to create a new queue with a room code, so that I can share the code with participants and give them scoped access to that queue only.

#### Acceptance Criteria

1. WHEN an authenticated admin submits a room creation request with a room name and an average service time, THE Room_Service SHALL create a new Room record containing the room name, average service time, a system-generated Room_Code, status `"active"`, and a creation timestamp.
2. WHEN a Room is created, THE Room_Code_Generator SHALL produce a Room_Code in the format `WORD-SUFFIX`, where `WORD` is 3–6 uppercase alphabetic characters and `SUFFIX` is 3–4 uppercase alphanumeric characters (e.g. `HAK-2024`, `PITCH-7X3`).
3. THE Room_Code_Generator SHALL guarantee that the generated Room_Code is unique across all existing Room records at the time of creation; IF a collision is detected, THEN THE Room_Code_Generator SHALL regenerate until a unique code is produced, up to 10 attempts.
4. IF the room name submitted by the admin is empty or exceeds 100 characters, THEN THE System SHALL return an error message stating "Room name is required and must be 100 characters or fewer".
5. IF the average service time submitted is not a positive integer between 1 and 120, THEN THE System SHALL return an error message stating "Average service time must be between 1 and 120 minutes".
6. WHEN a Room is successfully created, THE System SHALL return the Room_Code, room name, and room ID to the admin.

---

### Requirement 2: Room Code Entry on Landing Page

**User Story:** As a participant, I want to enter a room code on the landing page, so that I can access the specific queue I was invited to.

#### Acceptance Criteria

1. THE Landing_Page SHALL display a room code input field and a "Join Queue" button before any authentication step.
2. WHEN a participant submits a Room_Code, THE System SHALL look up the Room record matching that code (case-insensitive).
3. IF the submitted Room_Code does not match any existing Room record, THEN THE System SHALL return an error message stating "Room not found. Please check your code and try again."
4. IF the submitted Room_Code matches a Room with status `"closed"`, THEN THE System SHALL return an error message stating "This queue is closed."
5. WHEN the submitted Room_Code matches an active Room, THE System SHALL store the Room_Code in the participant's session and proceed to the OTP authentication step.
6. THE System SHALL accept Room_Code input in a case-insensitive manner and normalize it to uppercase before lookup.

---

### Requirement 3: Room-Scoped OTP Authentication

**User Story:** As a participant, I want to log in via OTP after entering a valid room code, so that my session is tied to the specific queue I was invited to.

#### Acceptance Criteria

1. WHEN a participant completes OTP verification after entering a valid Room_Code, THE Auth_Service SHALL establish a session containing the participant's email, role `"participant"`, and the active Room_Code.
2. WHILE a participant session is active, THE System SHALL scope all queue and token operations to the Room associated with the session's Room_Code.
3. IF a participant attempts to access a queue endpoint without a Room_Code in their session, THEN THE System SHALL return a 403 error with the message "No room code associated with this session."

---

### Requirement 4: Room-Scoped Token Generation

**User Story:** As a participant, I want to generate a token for the queue associated with my room code, so that I can join that specific queue.

#### Acceptance Criteria

1. WHEN an authenticated participant requests a token, THE Token_Service SHALL create a Token record linked to the Room's service, the participant's email, and the Room_Code, with status `"waiting"` and a sequentially incremented token number for that Room.
2. THE Token_Service SHALL assign token numbers starting from 1 for each Room's queue and increment by 1 for each new token in FIFO order.
3. IF a participant already has an active token (status `"waiting"` or `"serving"`) in any Room, THEN THE Token_Service SHALL return an error message stating "You already have an active token" and SHALL NOT create a duplicate token.
4. WHEN a token is successfully created, THE System SHALL return the token number, room name, and Room_Code to the participant.

---

### Requirement 5: Room-Scoped Queue Status for Participants

**User Story:** As a participant, I want to see my token number, position in the queue, and estimated wait time for my specific room, so that I can plan accordingly.

#### Acceptance Criteria

1. WHEN an authenticated participant requests queue status, THE Queue_Service SHALL return the participant's token number, the currently serving token number, the count of tokens ahead of the participant, and the estimated wait time in minutes, all scoped to the participant's Room.
2. THE Queue_Service SHALL calculate estimated wait time as: (number of tokens ahead) × (average service time of the Room) in minutes.
3. WHEN the number of tokens ahead of the participant is 1 or 0, THE Room_Dashboard SHALL display the message "Your turn is near".
4. WHILE a participant session is active and the participant has an active token, THE Room_Dashboard SHALL display the queue status.
5. WHEN a participant's token status changes to `"serving"`, THE Room_Dashboard SHALL display the message "It's your turn now".
6. WHEN a participant's token status changes to `"done"`, THE Room_Dashboard SHALL display the message "Your token has been completed".

---

### Requirement 6: Admin Room Management

**User Story:** As an admin, I want to view, manage, and close each room's queue independently, so that I can operate multiple queues simultaneously without interference.

#### Acceptance Criteria

1. WHILE an admin session is active, THE Admin_Dashboard SHALL display all Rooms created by the admin, showing each Room's name, Room_Code, status, and token count.
2. WHEN an admin selects a Room, THE Admin_Dashboard SHALL display the full token list for that Room, showing token number, participant email, and status.
3. WHEN an admin clicks "Next Token" for a Room, THE Queue_Service SHALL set the currently serving token's status to `"done"` and set the next `"waiting"` token's status to `"serving"` in FIFO order, scoped to that Room.
4. IF there are no `"waiting"` tokens remaining for a Room when the admin clicks "Next Token", THEN THE Queue_Service SHALL return a message stating "No more tokens in queue".
5. WHEN an admin clicks "Reset Queue" for a Room, THE Queue_Service SHALL set all tokens for that Room to status `"done"` and reset the token number sequence for that Room to start from 1 on the next token generation.
6. WHEN an admin clicks "Close Room" for a Room, THE Room_Service SHALL set the Room's status to `"closed"`, preventing new participants from joining via that Room_Code.
7. WHEN an admin clicks "Reopen Room" for a closed Room, THE Room_Service SHALL set the Room's status to `"active"`, allowing participants to join again using the same Room_Code.
8. THE Admin_Dashboard SHALL display the Room_Code prominently for each Room so the admin can easily copy and share it.

---

### Requirement 7: Access Isolation Between Rooms

**User Story:** As a system operator, I want each room's queue to be fully isolated from other rooms, so that participants in one room cannot see or interact with another room's queue.

#### Acceptance Criteria

1. THE System SHALL ensure that a participant with a session scoped to Room_Code `A` cannot retrieve tokens, queue status, or any data belonging to a Room with a different Room_Code.
2. WHEN a participant attempts to generate a token for a Room other than the one in their session, THE Token_Service SHALL return a 403 error with the message "Access denied to this room."
3. THE System SHALL not expose any endpoint that returns queue data across multiple rooms to unauthenticated or participant-role requests.

---

### Requirement 8: Room Code Lookup Endpoint

**User Story:** As a participant, I want the system to validate my room code before I log in, so that I know immediately if the code is wrong before going through OTP.

#### Acceptance Criteria

1. THE System SHALL expose a public (unauthenticated) endpoint `GET /api/rooms/lookup?code=ROOM_CODE` that returns the room name and status for a valid, active Room_Code.
2. IF the Room_Code does not match any Room, THEN THE System SHALL return a 404 response with the message "Room not found. Please check your code and try again."
3. IF the Room_Code matches a closed Room, THEN THE System SHALL return a 410 response with the message "This queue is closed."
4. THE System SHALL NOT return sensitive room data (e.g. token list, participant emails) from the public lookup endpoint.

---

### Requirement 9: Backward Compatibility

**User Story:** As a system operator, I want the existing admin authentication and session management to continue working unchanged, so that the room code feature is additive and does not break existing functionality.

#### Acceptance Criteria

1. THE System SHALL preserve all existing admin login, OTP, and session management behavior defined in the digital-queue-system requirements.
2. WHEN an admin logs in, THE System SHALL NOT require a Room_Code in the admin session.
3. THE System SHALL continue to support the existing `GET /api/services` endpoint for admin use without requiring a Room_Code.

