# Assessment Taking Module Routes

## Core Session Management

- `POST /assessments/:id/start` - Start assessment session
- `GET /assessments/sessions/:sessionToken` - Get session status
- `POST /assessments/sessions/:sessionToken/submit` - Submit final assessment

## Answer Management

- `POST /assessments/sessions/:sessionToken/answers` - Submit answer for question

## Progress Tracking

- `PATCH /assessments/sessions/:sessionToken/progress` - Update progress
- `POST /assessments/sessions/:sessionToken/heartbeat` - Connectivity heartbeat

## Session Control

- `POST /assessments/sessions/:sessionToken/pause` - Pause session
- `POST /assessments/sessions/:sessionToken/resume` - Resume session

## Security & Monitoring

- `POST /assessments/sessions/:sessionToken/security-events` - Report security event
- `GET /assessments/sessions/:sessionId/analytics` - Get session analytics

## WebSocket Events (Real-time)

- `heartbeat` - Continuous connectivity monitoring
- `security_event` - Real-time security event reporting
- `update_progress` - Real-time progress updates
- `monitor_session` - Teacher/Admin monitoring

## Event Emissions

- `assessment.session.started` - Session initialization
- `assessment.session.completed` - Session completion
- `assessment.security.violation` - Security violations
- `assessment.time.warning` - Time warnings
- `assessment.session.expired` - Session expiration
