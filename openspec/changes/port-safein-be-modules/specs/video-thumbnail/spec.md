## Purpose

Generates a web-friendly poster thumbnail after a video upload completes and exposes a short-lived URL for authorized clients to fetch it.

## ADDED Requirements

### Requirement: Thumbnail generation after complete
After a video multipart upload completes, the system SHALL generate a poster frame (ffmpeg) and store a WebP (or configured image) beside the video in S3, updating thumbnail status from `pending` to `ready` or `failed` with attempt accounting and a retry cap.

#### Scenario: Thumbnail becomes ready
- **WHEN** thumbnail generation succeeds for a completed upload
- **THEN** thumbnail status is `ready` and a thumbnail object key is stored

#### Scenario: Thumbnail fails after retries
- **WHEN** generation keeps failing past the attempt cap
- **THEN** thumbnail status is `failed`

### Requirement: Background retry sweep
The system SHALL periodically retry pending thumbnails for completed sessions so transient ffmpeg/S3 failures can recover without another client upload.

#### Scenario: Sweeper picks pending work
- **WHEN** a completed session remains thumbnail-pending within retry policy
- **THEN** a background job attempts generation again

### Requirement: Authorized thumbnail URL
The system SHALL return a short-lived presigned GET for the thumbnail when the caller is authorized for that upload session (owner/session token rules matching the uploads module) and the thumbnail is ready.

#### Scenario: Get thumbnail when ready
- **WHEN** an authorized client requests the thumbnail URL and status is ready
- **THEN** a time-limited GET URL is returned

#### Scenario: Thumbnail not ready
- **WHEN** an authorized client requests the thumbnail before it is ready
- **THEN** the API indicates pending or not available without fabricating a URL
