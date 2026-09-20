## Purpose

Defines transactional SMS delivery for SafeIn5 so any backend feature can send SMS through Amazon SNS via a shared application service.

## ADDED Requirements

### Requirement: Application can send transactional SMS
The system MUST provide an application-facing SMS send capability that delivers a text message to an E.164 phone number using Amazon SNS.

#### Scenario: Successful SMS send
- **WHEN** a feature requests SMS send with a valid E.164 destination and message body
- **THEN** the system publishes the message via SNS SMS and reports success including a provider message identifier when available

#### Scenario: Invalid phone number is rejected
- **WHEN** a feature requests SMS send with a destination that is not a valid E.164 number
- **THEN** the system rejects the request before calling SNS

#### Scenario: SNS failure is surfaced
- **WHEN** SNS rejects or fails the publish
- **THEN** the SMS capability fails with an error that does not expose AWS credentials, and the failure is logged without logging the full message body

### Requirement: SMS configuration is explicit
The system MUST load AWS region and any SMS sender options (such as SMS type transactional) from configuration. Optional sender ID MAY be configured where the destination country supports it.

#### Scenario: Region is required
- **WHEN** AWS region configuration is missing
- **THEN** configuration validation fails at startup

### Requirement: SMS service is available app-wide
The SMS capability MUST be injectable from Nest feature modules without each module constructing its own SNS client.

#### Scenario: Feature module injects SMS service
- **WHEN** a Nest feature module depends on the SMS service
- **THEN** it receives the shared implementation provided by the messaging module
