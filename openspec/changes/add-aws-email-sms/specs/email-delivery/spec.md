## Purpose

Defines transactional email delivery for SafeIn5 so any backend feature can send email through Amazon SES via a shared application service.

## ADDED Requirements

### Requirement: Application can send transactional email
The system MUST provide an application-facing email send capability that delivers a message to one or more recipients with a subject and text and/or HTML body using Amazon SES.

#### Scenario: Successful email send
- **WHEN** a feature requests email send with a valid recipient, subject, and body
- **THEN** the system submits the message to SES and reports success including a provider message identifier when available

#### Scenario: SES failure is surfaced
- **WHEN** SES rejects or fails the send
- **THEN** the email capability fails with an error that does not expose AWS credentials, and the failure is logged without logging the full message body or recipient PII beyond what is required for ops correlation

### Requirement: Email sender identity comes from configuration
The system MUST use a configured verified from-address (and optional reply-to) from environment configuration. The from-address MUST NOT be hardcoded in feature code.

#### Scenario: Missing from-address fails boot or send setup
- **WHEN** the required SES from-email configuration is missing
- **THEN** configuration validation fails at startup (or the messaging module refuses to initialize) rather than sending with an invented address

### Requirement: Email service is available app-wide
The email capability MUST be injectable from Nest feature modules without each module constructing its own SES client.

#### Scenario: Feature module injects email service
- **WHEN** a Nest feature module depends on the email service
- **THEN** it receives the shared implementation provided by the messaging module
