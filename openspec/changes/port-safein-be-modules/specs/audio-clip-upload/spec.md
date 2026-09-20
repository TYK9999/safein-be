## Purpose

Supports direct-to-S3 audio clip uploads via short-lived presigned PUT URLs, confirmation after upload, and listing of the caller's clips.

## ADDED Requirements

### Requirement: Presign audio clip upload
The system SHALL create a pending `audio_clip` row with a server-chosen S3 key and return a time-limited presigned PUT URL for allowed audio MIME types and size limits. Authenticated uploads MUST use the user's tenant; unauthenticated uploads MUST use the Community tenant.

#### Scenario: Presign success
- **WHEN** a client requests presign with a valid audio MIME and size within limits
- **THEN** a pending clip record exists and a PUT URL for the server-chosen key is returned

#### Scenario: Reject oversized audio
- **WHEN** declared size exceeds the configured maximum
- **THEN** the request is rejected and no clip row is created

### Requirement: Confirm uploaded object
The system SHALL verify the object exists in S3 (HeadObject), update the clip to `uploaded` with the real size, and reject confirm when the object is missing.

#### Scenario: Confirm after PUT
- **WHEN** the client confirms after a successful S3 PUT
- **THEN** clip status is `uploaded` and size reflects the object

#### Scenario: Confirm missing object
- **WHEN** confirm is called but S3 has no object at the key
- **THEN** the request fails and status remains pending

### Requirement: List my clips
The system SHALL list clips for the current actor (authenticated creator or guest Community scope) newest first, with a configurable limit.

#### Scenario: List authenticated clips
- **WHEN** an authenticated user lists clips
- **THEN** only clips they created are returned
