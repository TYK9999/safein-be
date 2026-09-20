## Purpose

Accepts large video uploads via a lockstep S3 multipart flow where the client uploads parts directly to S3 and the API never receives video bytes.

## ADDED Requirements

### Requirement: Lockstep multipart next endpoint
The system SHALL drive multipart upload through a single next-step endpoint: first call creates the multipart upload and returns a presigned URL for part 1; subsequent calls accept the previous part's ETag, advance state, and either return the next part URL or complete the multipart upload when finished.

#### Scenario: Start multipart
- **WHEN** a client starts an upload with valid filename, video MIME, size, and chunk plan within configured limits
- **THEN** an `upload_session` in `in_progress` exists with a session token capability and a presigned URL for chunk 1

#### Scenario: Confirm part and get next
- **WHEN** the client confirms the current chunk with a valid ETag
- **THEN** the part is recorded and either the next chunk URL is returned or the upload is completed

#### Scenario: Reject invalid ETag sequence
- **WHEN** the client sends a wrong chunk number or ETag out of sequence
- **THEN** the request fails and session state is unchanged

### Requirement: Session token capability
The opaque session token MUST be required on subsequent next calls and MUST authorize access to that session for anonymous or authenticated actors without exposing other sessions.

#### Scenario: Wrong session token
- **WHEN** a client uses an unknown session token
- **THEN** the request fails without leaking other sessions

### Requirement: Tenant and creator scoping
Authenticated uploads MUST associate the session with the user's tenant and user id. Unauthenticated uploads MUST use the Community tenant and null creator.

#### Scenario: Authenticated uploader
- **WHEN** an authenticated user completes start
- **THEN** the session tenant matches their membership tenant and created_by is their user id

### Requirement: Abandoned multipart cleanup
Incomplete multipart uploads MUST be reclaimable via S3 lifecycle (AbortIncompleteMultipartUpload). The API is not required to expose an abort endpoint in this change.

#### Scenario: Lifecycle owns abort
- **WHEN** a client abandons an in-progress multipart upload
- **THEN** cleanup is expected from S3 lifecycle configuration documented for operators
