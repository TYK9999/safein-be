## Purpose

Transcodes completed video uploads into a streamable H.264/AAC faststart MP4 for broad device playback and exposes a short-lived URL when ready.

## ADDED Requirements

### Requirement: Playback transcode after complete
After multipart upload completes, the system SHALL transcode a playback rendition with ffmpeg (H.264/AAC, +faststart), store it in S3, keep the original as master, and update playback status `pending` → `ready` | `failed` with attempt limits.

#### Scenario: Playback ready
- **WHEN** transcode succeeds
- **THEN** playback status is `ready` and a playback object key is stored

### Requirement: Immediate attempt plus sweeper
The system SHALL attempt transcode promptly on completion and SHALL run a background sweeper to retry pending playback work within policy.

#### Scenario: Immediate transcode kickoff
- **WHEN** an upload completes successfully
- **THEN** a playback transcode attempt is started without requiring another client call

### Requirement: Authorized playback URL
The system SHALL return a short-lived presigned GET for the playback object when the caller is authorized and playback is ready.

#### Scenario: Get playback when ready
- **WHEN** an authorized client requests playback URL and status is ready
- **THEN** a time-limited GET URL is returned

#### Scenario: Playback not ready
- **WHEN** playback is still pending
- **THEN** the API indicates pending or not available
