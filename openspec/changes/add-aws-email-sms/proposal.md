## Why

SafeIn5 features (auth OTPs, Echo alerts, supervisor notifications) need reliable outbound email and SMS. The backend has no shared messaging layer yet; we need AWS-backed email and SMS services that any Nest module can inject and use without re-implementing providers.

## What Changes

- Add a Nest **messaging** module that wraps **Amazon SES** (email) and **Amazon SNS** (SMS)
- Export injectable services usable **globally** across feature modules (auth, echoes, notifications, etc.)
- Validate configuration via env (region, from-address / sender ID settings); prefer IAM role / default credential chain on EC2—no hardcoded AWS keys in source
- Define transactional send APIs: send email (to, subject, text/html), send SMS (E.164 phone, body)
- Document SES/SNS account prerequisites (verified identity, SMS spend limits, sandbox vs production)
- Out of scope: marketing campaigns, Pinpoint journeys, full OTP product logic, multi-region active-active routing, template CMS

## Capabilities

### New Capabilities
- `email-delivery`: Transactional email via SES, injectable for app-wide use
- `sms-delivery`: Transactional SMS via SNS, injectable for app-wide use

### Modified Capabilities

## Impact

- New `src/modules/messaging` (or similar) with EmailService + SmsService exported globally or via shared module
- New AWS SDK v3 clients (`@aws-sdk/client-ses`, `@aws-sdk/client-sns`)
- New env keys (e.g. `AWS_REGION`, `SES_FROM_EMAIL`, optional `SNS_SMS_SENDER_ID` / SMS type)
- EC2 instance role (or local credentials) needs `ses:SendEmail` / `sns:Publish` permissions
- Domain features call messaging services later; this change does not implement OTP or Echo notification business rules
