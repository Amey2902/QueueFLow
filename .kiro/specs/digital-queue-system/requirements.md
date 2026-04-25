# Requirements Document

## Introduction

The Digital Queue System for College Offices is a full-stack web application that replaces physical queues at college administrative offices. Students can log in via OTP-based email authentication, select a service (e.g., Bonafide, ID Card, Fees), generate a digital token, and track their queue position in real time. Admins can manage the queue by advancing to the next token and resetting the queue. The system uses React.js on the frontend, Node.js/Express.js on the backend, MongoDB for persistence, and Nodemailer for OTP delivery.

## Glossary

- **System**: The Digital Queue System web application
- **Student**: A college student who uses the system to take a token and track queue status
- **Admin**: A college office staff member who manages the queue
- **Token**: A numbered ticket assigned to a student for a specific service
- **Queue**: The ordered list of tokens waiting for a specific service (FIFO)
- **Service**: An office function offered to students (e.g., Bonafide, ID Card, Fees)
- **OTP**: A 6-digit one-time password sent to a student's email for authentication
- **OTP_Service**: The backend component responsible for generating and sending OTPs via Nodemailer
- **Auth_Service**: The backend component responsible for verifying OTPs and managing login state
- **Token_Service**: The backend component responsible for generating tokens and managing queue logic
- **Queue_Service**: The backend component responsible for queue status queries and admin queue operations
- **Student_Dashboard**: The frontend page shown to authenticated students
- **Admin_Dashboard**: The frontend page shown to authenticated admins
- **Session**: A server-side or client-side record indicating a user is authenticated

---

## Requirements

### Requirement 1: OTP-Based Student Authentication

**User Story:** As a student, I want to log in using my college email and a one-time password, so that I can access the queue system without managing a separate password.

#### Acceptance Criteria

1. WHEN a student submits a valid email address on the login page, THE OTP_Service SHALL generate a cryptographically random 6-digit numeric OTP and store it in the OTP Collection with an expiry of 10 minutes.
2. WHEN a student submits a valid email address on the login page, THE OTP_Service SHALL send the OTP to that email address via Nodemailer within 30 seconds.
3. IF the email address submitted is not a valid email format, THEN THE System SHALL return an error message stating "Invalid email address".
4. WHEN a student submits the correct OTP within the expiry window, THE Auth_Service SHALL mark the student as authenticated and establish a login session.
5. IF a student submits an incorrect OTP, THEN THE Auth_Service SHALL return an error message stating "Invalid or expired OTP".
6. IF a student submits an OTP after the 10-minute expiry window, THEN THE Auth_Service SHALL return an error message stating "Invalid or expired OTP" and SHALL NOT authenticate the student.
7. WHEN an OTP expires, THE System SHALL delete the OTP record from the OTP Collection.
8. WHEN a student requests a new OTP while a valid unexpired OTP exists, THE OTP_Service SHALL invalidate the previous OTP and generate a new one.

---

### Requirement 2: Admin Authentication

**User Story:** As an admin, I want to log in with a fixed credential, so that I can access the admin dashboard to manage the queue.

#### Acceptance Criteria

1. THE System SHALL support a hardcoded admin credential (email and password) configured via environment variables.
2. WHEN an admin submits the correct admin email and password, THE Auth_Service SHALL establish an admin session.
3. IF an admin submits incorrect credentials, THEN THE Auth_Service SHALL return an error message stating "Invalid admin credentials".
4. WHILE an admin session is active, THE System SHALL restrict access to admin-only endpoints and the Admin_Dashboard.

---

### Requirement 3: Service Listing

**User Story:** As a student, I want to view all available office services, so that I can choose the service I need and join the correct queue.

#### Acceptance Criteria

1. THE System SHALL store at least three default services in the Services collection: "Bonafide", "ID Card", and "Fees".
2. WHEN an authenticated student requests the list of services, THE System SHALL return all available services including each service's name and average service time in minutes.
3. WHILE a student session is active, THE Student_Dashboard SHALL display the list of available services.

---

### Requirement 4: Token Generation

**User Story:** As a student, I want to generate a token for a selected service, so that I can join the digital queue and wait my turn.

#### Acceptance Criteria

1. WHEN an authenticated student selects a service and requests a token, THE Token_Service SHALL create a Token record with a sequentially incremented token number for that service, the student's email, the service ID, status "waiting", and the creation timestamp.
2. THE Token_Service SHALL assign token numbers starting from 1 for each service queue and increment by 1 for each new token in FIFO order.
3. IF a student already has an active token (status "waiting" or "serving") for any service, THEN THE Token_Service SHALL return an error message stating "You already have an active token" and SHALL NOT create a duplicate token.
4. WHEN a token is successfully created, THE System SHALL return the token number and service name to the student.

---

### Requirement 5: Real-Time Queue Status for Students

**User Story:** As a student, I want to see my token number, how many people are ahead of me, and the estimated wait time, so that I can plan my visit to the office.

#### Acceptance Criteria

1. WHEN an authenticated student requests queue status for their active token, THE Queue_Service SHALL return the student's token number, the currently serving token number, the count of tokens ahead of the student, and the estimated wait time in minutes.
2. THE Queue_Service SHALL calculate estimated wait time as: (number of tokens ahead) × (average service time of the selected service) in minutes.
3. WHEN the number of tokens ahead of the student is 1 or 0, THE Student_Dashboard SHALL display the message "Your turn is near".
4. WHILE a student session is active and the student has an active token, THE Student_Dashboard SHALL display the queue status.
5. WHEN a student's token status changes to "serving", THE Student_Dashboard SHALL display the message "It's your turn now".
6. WHEN a student's token status changes to "done", THE Student_Dashboard SHALL display the message "Your token has been completed".

---

### Requirement 6: Admin Queue Management

**User Story:** As an admin, I want to view the current queue and advance to the next token, so that I can serve students in order and keep the queue moving.

#### Acceptance Criteria

1. WHILE an admin session is active, THE Admin_Dashboard SHALL display the list of all tokens in the queue for each service, showing token number, student email, and status.
2. WHEN an admin clicks "Next Token" for a service, THE Queue_Service SHALL set the currently serving token's status to "done" and set the next "waiting" token's status to "serving" in FIFO order.
3. IF there are no "waiting" tokens remaining for a service when the admin clicks "Next Token", THEN THE Queue_Service SHALL return a message stating "No more tokens in queue".
4. WHEN an admin clicks "Reset Queue" for a service, THE Queue_Service SHALL set all tokens for that service to status "done" and reset the token number sequence for that service to start from 1 on the next token generation.
5. WHEN the queue is reset, THE Admin_Dashboard SHALL reflect the updated empty queue immediately.

---

### Requirement 7: Session Management and Access Control

**User Story:** As a system operator, I want unauthenticated users to be redirected to the login page, so that only authenticated users can access the queue system.

#### Acceptance Criteria

1. WHILE a user is not authenticated, THE System SHALL redirect any request to a protected route to the login page.
2. WHEN a student is authenticated, THE System SHALL redirect the student to the Student_Dashboard.
3. WHEN an admin is authenticated, THE System SHALL redirect the admin to the Admin_Dashboard.
4. WHEN a user logs out, THE System SHALL invalidate the session and redirect the user to the login page.

---

### Requirement 8: OTP Expiry Cleanup

**User Story:** As a system operator, I want expired OTPs to be automatically removed from the database, so that the OTP Collection does not accumulate stale records.

#### Acceptance Criteria

1. THE System SHALL use a MongoDB TTL index on the OTP Collection's `expiresAt` field so that expired OTP documents are automatically deleted by MongoDB.
2. WHEN an OTP document's `expiresAt` timestamp is reached, THE System SHALL remove the document from the OTP Collection without requiring manual intervention.
