## Context

See proposal.md - Why. NestJS backend already has config, database, health, and realtime. Features will need outbound email/SMS (OTP, alerts). Operator has an AWS account. **Globally** means a shared Nest messaging module injectable anywhere—not multi-region active-active.

## Goals / Non-Goals

**Goals:**
- SES email + SNS SMS clients via AWS SDK v3
- Global Nest module exporting `EmailService` and `SmsService`
- Zod env: `AWS_REGION`, `SES_FROM_EMAIL`, optional `SES_REPLY_TO`, optional `SNS_SMS_SENDER_ID`, `SNS_SMS_TYPE` (Transactional default)
- Credential chain: default provider (env keys locally, instance role on EC2)
- Unit tests with mocked SES/SNS clients

**Non-Goals:**
- OTP / auth flows (consumers of these services)
- SES template management UI / bulk campaigns
- Pinpoint journeys or two-way SMS
- LocalStack wiring as a hard requirement (optional note for local mock)
- Multi-region failover

## Decisions

### 1. SES for email, SNS for SMS
- **Choice:** `@aws-sdk/client-sesv2` (or `client-ses`) + `@aws-sdk/client-sns`
- **Why:** Standard transactional stack; matches "AWS email and SMS"
- **Alternatives:** Pinpoint for both - heavier; third-party (Twilio/SendGrid) - rejected for this change

### 2. Global MessagingModule
- **Choice:** `@Global()` MessagingModule exporting EmailService + SmsService
- **Why:** "Use globally" across features without re-importing everywhere
- **Alternatives:** Non-global import per feature - more boilerplate

### 3. Credentials
- **Choice:** Default AWS credential provider chain; document `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` for local only; EC2 uses IAM role
- **Why:** No secrets in repo; aligns with existing EC2 deploy model
- **Do not** commit keys

### 4. API shape
```
EmailService.send({ to, subject, text?, html?, replyTo? })
SmsService.send({ toE164, body })
```
- Validate inputs with Zod
- Map AWS errors to Nest-friendly App errors / thrown Error with code

### 5. Logging / PII
- Log message id + channel + outcome
- Do not log OTP codes, full SMS/email bodies, or full phone/email in info logs (mask: last 4 / domain only if needed)

### 6. Config keys
| Key | Required | Purpose |
|-----|----------|---------|
| `AWS_REGION` | yes | SES/SNS region |
| `SES_FROM_EMAIL` | yes | Verified sender |
| `SES_REPLY_TO` | no | Reply-To header |
| `SNS_SMS_TYPE` | no | default `Transactional` |
| `SNS_SMS_SENDER_ID` | no | Where supported |

## Risks / Trade-offs

- [SES sandbox] -> Document production access request; verified identities required
- [SMS cost / country rules] -> Transactional type; sender ID optional; E.164 validation
- [IAM too broad] -> Document least privilege `ses:SendEmail`, `sns:Publish`
- [Local without AWS] -> Mock in unit tests; optional LocalStack later

## Migration Plan

1. Add MessagingModule + env keys + `.env.example`
2. Attach IAM policy to EC2 role / local user for SES/SNS
3. Verify identities in SES; exit SMS sandbox as needed
4. Feature modules inject services when building OTP/notifications

## Open Questions

- Prefer SESv2 vs classic SES API (default SESv2 in implementation; swap is internal)
- Whether a single `MessagingService` facade is wanted in addition to Email/Sms (optional; not required for specs)
