## Purpose

Turns uploaded audio into text via AWS Transcribe: presign input audio, start a job, and poll or list jobs with stored transcript when complete.

## ADDED Requirements

### Requirement: Presign STT input audio
The system SHALL provide a presigned PUT for STT input objects under a dedicated key prefix, with MIME/size validation consistent with audio limits, supporting optional JWT guest/Community scoping.

#### Scenario: STT presign
- **WHEN** a client requests STT audio presign with valid parameters
- **THEN** a time-limited PUT URL and object identity needed to start a job are returned

### Requirement: Start transcription job
The system SHALL start an AWS Transcribe job for a previously uploaded object, persist a `transcription_job` in `queued`/`in_progress` state with a server-minted job name used as the client job id capability, and scope tenant/creator like other media.

#### Scenario: Job started
- **WHEN** a client starts a job for a valid uploaded STT object
- **THEN** a job row exists and AWS Transcribe has been invoked with the server-minted job name

### Requirement: Poll job advances status
The system SHALL, on get-by-job-id, refresh status from AWS when non-terminal, store flattened transcript text on completion (or failure reason on failure), and return the current job state.

#### Scenario: Completed transcript available
- **WHEN** AWS reports the job complete and the client polls the job id
- **THEN** the response includes status completed and the flattened transcript text

#### Scenario: Failed job
- **WHEN** AWS reports failure
- **THEN** status is failed and a failure reason is available to the client

### Requirement: List jobs for actor
The system SHALL list transcription jobs for the current actor (authenticated creator or guest Community scope), newest first.

#### Scenario: List my STT jobs
- **WHEN** a client lists STT jobs
- **THEN** only jobs for that actor scope are returned
