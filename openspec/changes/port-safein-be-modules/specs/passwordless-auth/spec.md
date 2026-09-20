## Purpose

Enables passwordless sign-up and login with OTP and magic links, issues JWT access tokens and httpOnly refresh cookies, and enforces authenticated membership for protected APIs.

## ADDED Requirements

### Requirement: User can register with email
The system SHALL accept a public registration request with email (and optional name fields), create or upsert an `app_user`, and grant Community tenant membership with role `worker` when the user is new to that tenant.

#### Scenario: First-time registration
- **WHEN** an unknown email registers successfully
- **THEN** an `app_user` exists, email may be unverified, and the user has Community membership as `worker`

### Requirement: OTP request and verify
The system SHALL allow requesting a one-time password for a known email without revealing whether the email exists to callers, store only a hashed OTP, enforce expiry and attempt limits, and on successful verify mark email verified and issue access JWT plus refresh cookie.

#### Scenario: Successful OTP verify
- **WHEN** a valid unexpired OTP is verified for a user
- **THEN** the token is consumed, email is verified if not already, an access JWT is returned, and a refresh cookie is set

#### Scenario: Unknown email on OTP request
- **WHEN** OTP is requested for an email with no account
- **THEN** the API responds without indicating the email is unknown and no OTP email is required to be sent

### Requirement: Magic link request and consume
The system SHALL allow requesting a magic-link login for a known email without account enumeration, store only a hashed token, and on GET of a valid link issue access JWT plus refresh cookie and consume the token.

#### Scenario: Magic link consume
- **WHEN** a valid unexpired magic-link token is opened
- **THEN** the token is consumed and the client receives authenticated session artifacts (access token and refresh cookie)

### Requirement: Refresh and logout
The system SHALL refresh access tokens using the httpOnly refresh cookie and SHALL clear the refresh cookie on logout.

#### Scenario: Refresh with valid cookie
- **WHEN** a client with a valid refresh cookie calls refresh
- **THEN** a new access JWT is issued (and refresh may be rotated per design)

#### Scenario: Logout
- **WHEN** a client calls logout
- **THEN** the refresh cookie is cleared

### Requirement: Current user profile
The system SHALL expose an authenticated `GET /me` (or equivalent under `/api/v1`) that returns the current user identity, tenant membership context used for authorization, and role.

#### Scenario: Authenticated me
- **WHEN** a valid Bearer access token is presented to `/me`
- **THEN** the response includes user id, email, tenant id, and role from live membership

### Requirement: Global JWT enforcement with live membership
Protected routes SHALL require a valid Bearer access JWT. The system MUST reject tokens for users who are deleted or lack active membership even if the JWT signature is valid, and MUST use the role from the database membership rather than trusting a stale claim alone.

#### Scenario: Membership revoked
- **WHEN** a previously valid access token is presented but the user has no membership
- **THEN** the request is rejected as unauthorized

### Requirement: Auth emails via transactional email
OTP and magic-link messages MUST be delivered through the application's transactional email capability (SES-backed). Plaintext OTP codes and magic-link secrets MUST NOT be written to application info logs.

#### Scenario: OTP email sent
- **WHEN** a valid OTP is issued for a known user
- **THEN** an email is sent containing the OTP (or link) without logging the OTP value at info level

### Requirement: Optional JWT for guest media
Media endpoints that support anonymous Community uploads MUST accept an optional Bearer token: when present, ownership and tenant follow the authenticated user; when absent, Community tenant and null creator apply.

#### Scenario: Guest upload actor
- **WHEN** an unauthenticated client uses an optional-JWT media endpoint
- **THEN** the operation is scoped to the Community tenant with no authenticated creator
