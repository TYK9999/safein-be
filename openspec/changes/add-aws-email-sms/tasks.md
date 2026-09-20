## 1. Dependencies and config

- [x] 1.1 Add AWS SDK packages for SES and SNS (`@aws-sdk/client-sesv2` or `client-ses`, `@aws-sdk/client-sns`)
- [x] 1.2 Extend Zod env schema + `.env.example` with `AWS_REGION`, `SES_FROM_EMAIL`, optional `SES_REPLY_TO`, `SNS_SMS_TYPE`, `SNS_SMS_SENDER_ID`
- [x] 1.3 Map new keys in `configuration.ts`

## 2. Messaging module

- [x] 2.1 Create global `MessagingModule` under `src/modules/messaging`
- [x] 2.2 Implement `EmailService.send` via SES with Zod input validation
- [x] 2.3 Implement `SmsService.send` via SNS with E.164 validation
- [x] 2.4 Wire clients with region from config and default credential chain; export services from the module
- [x] 2.5 Ensure failures do not log secrets, OTPs, or full message bodies

## 3. Docs and tests

- [x] 3.1 Document AWS prerequisites (verified SES identity, IAM permissions, SMS sandbox) in `docs/messaging.md` and link from README
- [x] 3.2 Add unit tests with mocked SES/SNS clients for success and validation/error paths
- [x] 3.3 Confirm MessagingModule is imported in AppModule so services are available app-wide
