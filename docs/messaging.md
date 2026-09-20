# Messaging (SES email + SNS SMS)

Outbound email and SMS via AWS. Inject `EmailService` or `SmsService` anywhere — `MessagingModule` is `@Global()`.

## Prerequisites

1. **Region** — set `AWS_REGION` to the SES/SNS region you use (e.g. `ap-south-1`).
2. **SES identity** — verify the From address or domain in SES. Sandbox only allows verified recipients until production access is approved.
3. **SMS** — new accounts are often in the SNS SMS sandbox; register/exit sandbox and check country rules for sender IDs.
4. **IAM** — least privilege for the app role or local user:
   - `ses:SendEmail` (SESv2) on the verified identity
   - `sns:Publish` for SMS to phone numbers
5. **Credentials** — default AWS provider chain (env keys locally; instance profile on EC2). Do not commit keys.

## Env

| Variable | Required | Notes |
|----------|----------|--------|
| `AWS_REGION` | yes | Shared by SES and SNS clients |
| `SES_FROM_EMAIL` | yes | Verified sender |
| `SES_REPLY_TO` | no | Default Reply-To; overridable per send |
| `SNS_SMS_TYPE` | no | `Transactional` (default) or `Promotional` |
| `SNS_SMS_SENDER_ID` | no | Where the destination country supports it |

See `.env.example`.

## Usage

```ts
constructor(
  private readonly email: EmailService,
  private readonly sms: SmsService,
) {}

await this.email.send({
  to: 'user@example.com',
  subject: 'Welcome',
  text: 'Hello',
  // html optional; at least one of text/html required
});

await this.sms.send({
  toE164: '+14155552671',
  body: 'Your alert message',
});
```

Validation failures throw `MessagingValidationError`. Provider failures throw `MessagingProviderError`. Logs include message id and outcome only — not OTP codes, full bodies, or full addresses.
