import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import logger from "firebase-functions/logger";
import sgMail from "@sendgrid/mail";

initializeApp();

const firestore = getFirestore();

const {
  SENDGRID_API_KEY,
  SENDGRID_FROM_EMAIL,
  SENDGRID_FROM_NAME,
  INSPECTPRO_APP_URL,
} = process.env;

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

const APP_URL = INSPECTPRO_APP_URL || "https://inspectpro-715dc.web.app";

const canSendEmail = () => Boolean(SENDGRID_API_KEY && SENDGRID_FROM_EMAIL);

const getFrom = () => ({
  email: SENDGRID_FROM_EMAIL,
  name: SENDGRID_FROM_NAME || "InspectPro",
});

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const getUserDisplayName = (user) =>
  user?.fullName || user?.displayName || user?.name || user?.email || "InspectPro User";

const formatTechnique = (data = {}) =>
  data.selectedTechnique ||
  data.reportTemplate ||
  data.inspectionTypeCode ||
  data.inspectionTypeName ||
  data.requiredTechnique ||
  "General Inspection";

const formatProjectLabel = (data = {}) =>
  data.projectName || data.projectId || data.id || "Project";

const formatDate = (value) => {
  if (!value) return "N/A";
  if (typeof value?.toDate === "function") {
    return value.toDate().toLocaleDateString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "N/A" : parsed.toLocaleDateString();
};

const dedupeUsersByEmail = (users) => {
  const seen = new Set();
  return users.filter((user) => {
    const email = normalizeEmail(user?.email);
    if (!email || seen.has(email)) return false;
    seen.add(email);
    return true;
  });
};

const createNotificationRecord = async ({
  channel = "email",
  eventType,
  recipientUserId = "",
  recipientEmail = "",
  recipientName = "",
  subject = "",
  payload = {},
  status = "pending",
  error = "",
}) => {
  await firestore.collection("notification_logs").add({
    channel,
    eventType,
    recipientUserId,
    recipientEmail,
    recipientName,
    subject,
    payload,
    status,
    error,
    createdAt: FieldValue.serverTimestamp(),
  });
};

const getUserById = async (uid) => {
  if (!uid) return null;
  const snapshot = await firestore.collection("users").doc(uid).get();
  if (!snapshot.exists) return null;
  return { id: snapshot.id, ...snapshot.data() };
};

const getUsersByRole = async (role) => {
  const snapshot = await firestore.collection("users").where("role", "==", role).get();
  return snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    ...docSnapshot.data(),
  }));
};

const sendEmail = async ({ to, subject, text, html, eventType, recipientUserId, recipientName, payload }) => {
  const email = normalizeEmail(to);
  if (!email) return null;

  if (!canSendEmail()) {
    logger.warn("Skipping email send because SendGrid is not configured.", { eventType, to: email });
    return null;
  }

  try {
    const [response] = await sgMail.send({
      to: email,
      from: getFrom(),
      subject,
      text,
      html,
    });

    await createNotificationRecord({
      eventType,
      recipientUserId,
      recipientEmail: email,
      recipientName,
      subject,
      payload,
      status: response?.statusCode >= 200 && response?.statusCode < 300 ? "sent" : "queued",
    });

    return response;
  } catch (error) {
    logger.error("SendGrid email send failed", { eventType, to: email, error });
    await createNotificationRecord({
      eventType,
      recipientUserId,
      recipientEmail: email,
      recipientName,
      subject,
      payload,
      status: "failed",
      error: error?.message || "Unknown SendGrid error",
    });
    throw error;
  }
};

const queueEmailToUsers = async ({ users, subject, text, html, eventType, payload }) => {
  const uniqueUsers = dedupeUsersByEmail(users);
  await Promise.all(
    uniqueUsers.map((user) =>
      sendEmail({
        to: user.email,
        subject,
        text,
        html,
        eventType,
        recipientUserId: user.id,
        recipientName: getUserDisplayName(user),
        payload,
      }),
    ),
  );
};

const renderEmailShell = ({ heading, intro, details = [], ctaLabel = "Open InspectPro", ctaUrl = APP_URL }) => {
  const detailItems = details
    .map(
      ({ label, value }) =>
        `<tr><td style="padding:8px 0;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:.08em;">${label}</td><td style="padding:8px 0;color:#e2e8f0;font-size:14px;font-weight:600;">${value}</td></tr>`,
    )
    .join("");

  return `
    <div style="margin:0;padding:24px;background:#020617;font-family:Arial,sans-serif;color:#e2e8f0;">
      <div style="max-width:640px;margin:0 auto;border:1px solid #1e293b;border-radius:24px;overflow:hidden;background:#0f172a;">
        <div style="padding:28px 32px;border-bottom:1px solid #1e293b;background:linear-gradient(135deg,#7c2d12,#ea580c);">
          <div style="font-size:11px;font-weight:800;letter-spacing:.24em;text-transform:uppercase;color:#ffedd5;">InspectPro Alert</div>
          <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2;color:white;">${heading}</h1>
        </div>
        <div style="padding:28px 32px;">
          <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#cbd5e1;">${intro}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${detailItems}</table>
          <div style="margin-top:28px;">
            <a href="${ctaUrl}" style="display:inline-block;padding:12px 18px;border-radius:14px;background:#f97316;color:white;text-decoration:none;font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">${ctaLabel}</a>
          </div>
        </div>
      </div>
    </div>
  `;
};

export const sendTestNotificationEmail = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const to = normalizeEmail(req.body?.to);
  if (!to) {
    res.status(400).json({ error: "Recipient email is required." });
    return;
  }

  try {
    const subject = req.body?.subject || "InspectPro Test Notification";
    const html = renderEmailShell({
      heading: "Test Email",
      intro: "This is a test email from InspectPro's notification backend.",
      details: [
        { label: "Recipient", value: to },
        { label: "Environment", value: "Firebase Functions" },
      ],
    });

    await sendEmail({
      to,
      subject,
      text: "This is a test email from InspectPro's notification backend.",
      html,
      eventType: "test_email",
      payload: { to },
    });

    res.status(200).json({ ok: true, to });
  } catch (error) {
    logger.error("Failed to send test email", error);
    res.status(500).json({ error: error?.message || "Unable to send test email." });
  }
});

export const notifyOnProjectApprovalEmail = onDocumentUpdated("projects/{projectId}", async (event) => {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();
  if (!after) return;

  const previousStatus = String(before?.status || "").trim().toLowerCase();
  const nextStatus = String(after?.status || "").trim().toLowerCase();

  if (nextStatus !== "approved" || previousStatus === "approved") {
    return;
  }

  const assignedUsers = await Promise.all([
    getUserById(after.inspectorId),
    getUserById(after.supervisorId),
    getUserById(after.externalReviewerId),
    getUserById(after.managerId),
  ]);

  const subject = `InspectPro: ${formatProjectLabel(after)} approved`;
  const text =
    `${formatProjectLabel(after)} has been approved.\n` +
    `Technique: ${formatTechnique(after)}\n` +
    `Client: ${after.clientName || after.client || "N/A"}\n` +
    `Location: ${after.locationName || after.location || "N/A"}\n` +
    `Open app: ${APP_URL}`;
  const html = renderEmailShell({
    heading: "Project Approved",
    intro: `${formatProjectLabel(after)} has been approved and is now available in the next stage of the workflow.`,
    details: [
      { label: "Project", value: formatProjectLabel(after) },
      { label: "Technique", value: formatTechnique(after) },
      { label: "Client", value: after.clientName || after.client || "N/A" },
      { label: "Location", value: after.locationName || after.location || "N/A" },
    ],
  });

  await queueEmailToUsers({
    users: assignedUsers.filter(Boolean),
    subject,
    text,
    html,
    eventType: "project_approved_email",
    payload: {
      projectDocId: event.params.projectId,
      projectId: after.projectId || "",
      status: after.status || "",
    },
  });
});

export const notifyOnExternalFeedbackEmail = onDocumentCreated(
  "external_feedback/{feedbackId}",
  async (event) => {
    const feedback = event.data?.data();
    if (!feedback) return;

    const admins = await getUsersByRole("Admin");
    const projectSnapshot = feedback.projectDocId
      ? await firestore.collection("projects").doc(feedback.projectDocId).get()
      : null;
    const projectData = projectSnapshot?.exists ? projectSnapshot.data() : {};
    const managerUser = projectData?.managerId ? await getUserById(projectData.managerId) : null;

    const subject = `InspectPro: External feedback ${String(feedback.decision || "submitted").toLowerCase()}`;
    const text =
      `External reviewer ${feedback.externalReviewerName || "Reviewer"} ` +
      `${String(feedback.decision || "submitted feedback").toLowerCase()} for ${feedback.projectName || feedback.projectId || "a project"}.\n` +
      `Technique: ${formatTechnique({ ...projectData, ...feedback })}\n` +
      `Message: ${feedback.message || "No details provided"}\n` +
      `Open app: ${APP_URL}`;
    const html = renderEmailShell({
      heading: "External Feedback Submitted",
      intro:
        `An external reviewer has ${String(feedback.decision || "submitted feedback").toLowerCase()} ` +
        `for ${feedback.projectName || feedback.projectId || "a project"}.`,
      details: [
        { label: "Reviewer", value: feedback.externalReviewerName || "External Reviewer" },
        { label: "Decision", value: feedback.decision || "Pending" },
        { label: "Project", value: feedback.projectName || feedback.projectId || "N/A" },
        { label: "Technique", value: formatTechnique({ ...projectData, ...feedback }) },
        { label: "Message", value: feedback.message || "No details provided" },
      ],
    });

    await queueEmailToUsers({
      users: [...admins, ...(managerUser ? [managerUser] : [])],
      subject,
      text,
      html,
      eventType: "external_feedback_email",
      payload: {
        feedbackId: event.params.feedbackId,
        projectDocId: feedback.projectDocId || "",
        decision: feedback.decision || "",
      },
    });
  },
);

export const notifyOnScheduleCreatedEmail = onDocumentCreated(
  "inspection_schedules/{scheduleId}",
  async (event) => {
    const schedule = event.data?.data();
    if (!schedule) return;

    const recipients = await Promise.all([
      getUserById(schedule.externalReviewerId),
      getUserById(schedule.managerId),
    ]);

    const subject = `InspectPro: Next inspection scheduled for ${schedule.equipmentTag || "equipment"}`;
    const text =
      `A new inspection schedule has been created.\n` +
      `Equipment: ${schedule.equipmentTag || "N/A"}\n` +
      `Due Date: ${formatDate(schedule.dueDate)}\n` +
      `Technique: ${formatTechnique(schedule)}\n` +
      `Open app: ${APP_URL}`;
    const html = renderEmailShell({
      heading: "Inspection Scheduled",
      intro: `A new next-inspection schedule is active and ready for coordination.`,
      details: [
        { label: "Equipment", value: schedule.equipmentTag || "N/A" },
        { label: "Due Date", value: formatDate(schedule.dueDate) },
        { label: "Technique", value: formatTechnique(schedule) },
        { label: "Client", value: schedule.clientName || "N/A" },
      ],
    });

    await queueEmailToUsers({
      users: recipients.filter(Boolean),
      subject,
      text,
      html,
      eventType: "inspection_schedule_created_email",
      payload: {
        scheduleId: event.params.scheduleId,
        equipmentId: schedule.equipmentId || "",
      },
    });
  },
);

export const notifyOnScheduleUpdatedEmail = onDocumentUpdated(
  "inspection_schedules/{scheduleId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;

    const beforeDue = before.dueDate?.toMillis?.() || 0;
    const afterDue = after.dueDate?.toMillis?.() || 0;
    const beforeStatus = String(before.status || before.schedulerStatus || "").trim().toLowerCase();
    const afterStatus = String(after.status || after.schedulerStatus || "").trim().toLowerCase();

    if (beforeDue === afterDue && beforeStatus === afterStatus) {
      return;
    }

    const recipients = await Promise.all([
      getUserById(after.externalReviewerId),
      getUserById(after.managerId),
    ]);

    const subject = `InspectPro: Schedule updated for ${after.equipmentTag || "equipment"}`;
    const text =
      `An inspection schedule has been updated.\n` +
      `Equipment: ${after.equipmentTag || "N/A"}\n` +
      `New Due Date: ${formatDate(after.dueDate)}\n` +
      `Status: ${after.status || after.schedulerStatus || "active"}\n` +
      `Open app: ${APP_URL}`;
    const html = renderEmailShell({
      heading: "Schedule Updated",
      intro: `An existing inspection schedule has changed and needs attention.`,
      details: [
        { label: "Equipment", value: after.equipmentTag || "N/A" },
        { label: "Previous Due", value: formatDate(before.dueDate) },
        { label: "New Due", value: formatDate(after.dueDate) },
        { label: "Status", value: after.status || after.schedulerStatus || "active" },
      ],
    });

    await queueEmailToUsers({
      users: recipients.filter(Boolean),
      subject,
      text,
      html,
      eventType: "inspection_schedule_updated_email",
      payload: {
        scheduleId: event.params.scheduleId,
        equipmentId: after.equipmentId || "",
      },
    });
  },
);
