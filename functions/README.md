# InspectPro Email Notifications

This backend uses Firebase Functions and Twilio SendGrid to send transactional email notifications.

## Official docs

- Firebase Firestore triggers: https://firebase.google.com/docs/functions/firestore-events
- SendGrid Node.js mail helper: https://github.com/sendgrid/sendgrid-nodejs

## Environment variables

Create `functions/.env` or set these before deployment:

```bash
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=notifications@yourdomain.com
SENDGRID_FROM_NAME=InspectPro
INSPECTPRO_APP_URL=https://inspectpro-715dc.web.app
```

## What gets emailed

- When a project moves to `Approved`
  - sends to assigned inspector, lead inspector, external reviewer, and manager
- When an external reviewer submits feedback
  - sends to admins and the assigned manager
- When an inspection schedule is created
  - sends to the assigned external reviewer and manager
- When an inspection schedule due date or status changes
  - sends to the assigned external reviewer and manager

## Manual test endpoint

After deploying functions:

- `sendTestNotificationEmail`
  - `POST`
  - body:

```json
{
  "to": "recipient@example.com",
  "subject": "InspectPro test"
}
```

## Install and deploy

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```
