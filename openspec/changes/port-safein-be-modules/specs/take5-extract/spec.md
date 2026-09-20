## Purpose

Extracts text from safety documents and uses an AI agent to produce prioritized yes/no Take 5 checklist prompts for field use.

## ADDED Requirements

### Requirement: Accept document inputs
The system SHALL accept a public extract request with one or more documents, each providing exactly one of `filePath`, `text`, or `contentBase64`, and SHALL reject invalid combinations.

#### Scenario: Valid text document
- **WHEN** a client submits a document with inline text
- **THEN** extraction proceeds using that text

#### Scenario: Invalid dual source
- **WHEN** a document provides both filePath and text
- **THEN** validation fails

### Requirement: Sandboxed filePath reads
When `filePath` is used, the system MUST only read files under the configured documentation sandbox directory and MUST reject path traversal outside that root.

#### Scenario: Path traversal rejected
- **WHEN** filePath attempts to escape the sandbox (e.g. `../`)
- **THEN** the request is rejected

### Requirement: Multi-format text extraction
The system SHALL extract text from supported formats (at minimum PDF, DOCX, XLSX, txt, md, html) up to a configured character budget, truncating or rejecting when limits are exceeded per product rules from the source implementation.

#### Scenario: PDF extract
- **WHEN** a supported PDF is provided within limits
- **THEN** extracted text is available to the AI step

### Requirement: AI-generated Take 5 checks
When the AI provider is configured, the system SHALL return a structured list of prioritized checks `{ priority, prompt }` suitable for yes/no Take 5 questions. When the AI provider is not configured, the system SHALL fail with a clear not-configured error (e.g. HTTP 503).

#### Scenario: Configured success
- **WHEN** Cursor (or configured agent) credentials are present and documents extract successfully
- **THEN** the response includes a non-empty normalized list of checks with priority and prompt

#### Scenario: AI not configured
- **WHEN** the AI API key is missing
- **THEN** the extract endpoint fails with a not-configured error without hanging indefinitely
