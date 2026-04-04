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

const userAllowsEmail = (user) => {
  if (!user) return false;
  if (!normalizeEmail(user.email)) return false;
  if (user.emailNotificationsEnabled === false) return false;
  if (user?.notificationChannels?.email === false) return false;
  return true;
};

const formatTechnique = (data = {}) =>
  data.selectedTechnique ||
  data.reportTemplate ||
  data.inspectionTypeCode ||
  data.inspectionTypeName ||
  data.requiredTechnique ||
  "General Inspection";

const formatProjectLabel = (data = {}) =>
  data.projectName || data.projectId || data.id || "Project";

const startsWithForwardedToInspector = (status) =>
  String(status || "").trim().toLowerCase().startsWith("not started- report with ");

const startsWithReturnedForCorrection = (status) =>
  String(status || "").trim().toLowerCase().startsWith("returned for correction");

const isClientReviewInProgress = (status) =>
  String(status || "").trim().toLowerCase() === "client review in progress";

const isReportAccepted = (status) =>
  String(status || "").trim().toLowerCase() === "report accepted";

const isReportRejected = (status) =>
  String(status || "").trim().toLowerCase() === "report rejected";

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

const sendEmailToUser = async ({ user, subject, text, html, eventType, payload }) => {
  if (!userAllowsEmail(user)) {
    logger.info("Skipping email because user preferences disable email notifications.", {
      eventType,
      userId: user?.id || "",
      email: normalizeEmail(user?.email),
    });
    return null;
  }

  return sendEmail({
    to: user.email,
    subject,
    text,
    html,
    eventType,
    recipientUserId: user.id,
    recipientName: getUserDisplayName(user),
    payload,
  });
};

const queueEmailToUsers = async ({ users, subject, text, html, eventType, payload }) => {
  const uniqueUsers = dedupeUsersByEmail(users).filter((user) => userAllowsEmail(user));
  await Promise.all(
    uniqueUsers.map((user) =>
      sendEmailToUser({
        user,
        subject,
        text,
        html,
        eventType,
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

export const notifyOnProjectForwardedToInspectorEmail = onDocumentCreated(
  "projects/{projectId}",
  async (event) => {
    const project = event.data?.data();
    if (!project || !startsWithForwardedToInspector(project.status)) return;

    const inspectorUser = await getUserById(project.inspectorId);
    if (!inspectorUser?.email) {
      logger.warn("Skipping inspector notification because no inspector email was found.", {
        projectId: event.params.projectId,
        inspectorId: project.inspectorId || "",
      });
      return;
    }

    const subject = `InspectPro: ${formatProjectLabel(project)} forwarded to you`;
    const text =
      `A new project has been forwarded to you for inspection.\n` +
      `Project: ${formatProjectLabel(project)}\n` +
      `Technique: ${formatTechnique(project)}\n` +
      `Client: ${project.clientName || project.client || "N/A"}\n` +
      `Location: ${project.locationName || project.location || "N/A"}\n` +
      `Project ID: ${project.projectId || event.params.projectId}\n` +
      `Open app: ${APP_URL}/my_inspection`;
    const html = renderEmailShell({
      heading: "New Project Forwarded",
      intro:
        `${formatProjectLabel(project)} has been forwarded to you and is ready for inspection work in InspectPro.`,
      details: [
        { label: "Project", value: formatProjectLabel(project) },
        { label: "Project ID", value: project.projectId || event.params.projectId },
        { label: "Technique", value: formatTechnique(project) },
        { label: "Client", value: project.clientName || project.client || "N/A" },
        { label: "Location", value: project.locationName || project.location || "N/A" },
        { label: "Assigned Inspector", value: getUserDisplayName(inspectorUser) },
      ],
      ctaLabel: "Open My Inspections",
      ctaUrl: `${APP_URL}/my_inspection`,
    });

    await sendEmailToUser({
      user: inspectorUser,
      subject,
      text,
      html,
      eventType: "project_forwarded_to_inspector_email",
      payload: {
        projectDocId: event.params.projectId,
        projectId: project.projectId || "",
        status: project.status || "",
        inspectorId: project.inspectorId || "",
      },
    });
  },
);

export const notifyOnProjectReassignedToInspectorEmail = onDocumentUpdated(
  "projects/{projectId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;

    const previousInspectorId = String(before.inspectorId || "").trim();
    const nextInspectorId = String(after.inspectorId || "").trim();
    const previousStatus = String(before.status || "").trim();
    const nextStatus = String(after.status || "").trim();

    const inspectorChanged = previousInspectorId !== nextInspectorId;
    const newlyForwarded =
      !startsWithForwardedToInspector(previousStatus) && startsWithForwardedToInspector(nextStatus);

    if (!nextInspectorId || (!inspectorChanged && !newlyForwarded)) {
      return;
    }

    const inspectorUser = await getUserById(nextInspectorId);
    if (!inspectorUser?.email) {
      logger.warn("Skipping reassignment notification because no inspector email was found.", {
        projectId: event.params.projectId,
        inspectorId: nextInspectorId,
      });
      return;
    }

    const subject = `InspectPro: ${formatProjectLabel(after)} assigned to you`;
    const text =
      `A project has been assigned or forwarded to you for inspection.\n` +
      `Project: ${formatProjectLabel(after)}\n` +
      `Technique: ${formatTechnique(after)}\n` +
      `Client: ${after.clientName || after.client || "N/A"}\n` +
      `Location: ${after.locationName || after.location || "N/A"}\n` +
      `Project ID: ${after.projectId || event.params.projectId}\n` +
      `Open app: ${APP_URL}/my_inspection`;
    const html = renderEmailShell({
      heading: "Inspection Assignment Updated",
      intro:
        `${formatProjectLabel(after)} has just been assigned to you for inspection in InspectPro.`,
      details: [
        { label: "Project", value: formatProjectLabel(after) },
        { label: "Project ID", value: after.projectId || event.params.projectId },
        { label: "Technique", value: formatTechnique(after) },
        { label: "Client", value: after.clientName || after.client || "N/A" },
        { label: "Location", value: after.locationName || after.location || "N/A" },
        { label: "Status", value: after.status || "Assigned" },
      ],
      ctaLabel: "Open My Inspections",
      ctaUrl: `${APP_URL}/my_inspection`,
    });

    await sendEmailToUser({
      user: inspectorUser,
      subject,
      text,
      html,
      eventType: "project_reassigned_to_inspector_email",
      payload: {
        projectDocId: event.params.projectId,
        projectId: after.projectId || "",
        status: after.status || "",
        previousInspectorId,
        inspectorId: nextInspectorId,
      },
    });
  },
);

export const notifyOnProjectReturnedForCorrectionEmail = onDocumentUpdated(
  "projects/{projectId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;

    const previousStatus = String(before.status || "").trim();
    const nextStatus = String(after.status || "").trim();

    if (
      !startsWithReturnedForCorrection(nextStatus) ||
      startsWithReturnedForCorrection(previousStatus)
    ) {
      return;
    }

    const inspectorUser = await getUserById(after.inspectorId);
    if (!inspectorUser?.email) {
      logger.warn("Skipping return-for-correction email because no inspector email was found.", {
        projectId: event.params.projectId,
        inspectorId: after.inspectorId || "",
      });
      return;
    }

    const feedbackMessage =
      after.returnNote ||
      after.remark ||
      after.remarks ||
      after.adminRemark ||
      after.adminRemarks ||
      "A reviewer requested corrections on your report submission.";

    const subject = `InspectPro: ${formatProjectLabel(after)} returned for correction`;
    const text =
      `A project assigned to you has been returned for correction.\n` +
      `Project: ${formatProjectLabel(after)}\n` +
      `Technique: ${formatTechnique(after)}\n` +
      `Client: ${after.clientName || after.client || "N/A"}\n` +
      `Feedback: ${feedbackMessage}\n` +
      `Open app: ${APP_URL}/my_inspection`;
    const html = renderEmailShell({
      heading: "Project Returned For Correction",
      intro:
        `${formatProjectLabel(after)} has been returned for correction. Review the feedback and update the report package.`,
      details: [
        { label: "Project", value: formatProjectLabel(after) },
        { label: "Technique", value: formatTechnique(after) },
        { label: "Client", value: after.clientName || after.client || "N/A" },
        { label: "Feedback", value: feedbackMessage },
      ],
      ctaLabel: "Open My Inspections",
      ctaUrl: `${APP_URL}/my_inspection`,
    });

    await sendEmailToUser({
      user: inspectorUser,
      subject,
      text,
      html,
      eventType: "project_returned_for_correction_email",
      payload: {
        projectDocId: event.params.projectId,
        projectId: after.projectId || "",
        status: after.status || "",
        inspectorId: after.inspectorId || "",
      },
    });
  },
);

export const notifyOnClientReviewStartedEmail = onDocumentUpdated(
  "projects/{projectId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;

    const previousStatus = String(before.status || "").trim();
    const nextStatus = String(after.status || "").trim();

    if (!isClientReviewInProgress(nextStatus) || isClientReviewInProgress(previousStatus)) {
      return;
    }

    const recipients = await Promise.all([
      getUserById(after.inspectorId),
      getUserById(after.supervisorId),
      getUserById(after.managerId),
      getUserById(after.externalReviewerId),
      getUserById(after.externalReviewerId2),
      getUserById(after.externalReviewerId3),
      getUserById(after.externalReviewerId4),
      getUserById(after.externalReviewerId5),
      getUserById(after.externalReviewerId6),
    ]);

    const subject = `InspectPro: Client review started for ${formatProjectLabel(after)}`;
    const text =
      `Client review has started for a project in your workflow.\n` +
      `Project: ${formatProjectLabel(after)}\n` +
      `Technique: ${formatTechnique(after)}\n` +
      `Client: ${after.clientName || after.client || "N/A"}\n` +
      `Location: ${after.locationName || after.location || "N/A"}\n` +
      `Open app: ${APP_URL}`;
    const html = renderEmailShell({
      heading: "Client Review Started",
      intro:
        `${formatProjectLabel(after)} is now in client review. Stakeholders can track reviewer feedback and final decision progress.`,
      details: [
        { label: "Project", value: formatProjectLabel(after) },
        { label: "Technique", value: formatTechnique(after) },
        { label: "Client", value: after.clientName || after.client || "N/A" },
        { label: "Location", value: after.locationName || after.location || "N/A" },
        { label: "Status", value: after.status || "Client Review In Progress" },
      ],
    });

    await queueEmailToUsers({
      users: recipients.filter(Boolean),
      subject,
      text,
      html,
      eventType: "client_review_started_email",
      payload: {
        projectDocId: event.params.projectId,
        projectId: after.projectId || "",
        status: after.status || "",
      },
    });
  },
);

export const notifyOnFinalClientDecisionEmail = onDocumentUpdated(
  "projects/{projectId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;

    const previousStatus = String(before.status || "").trim();
    const nextStatus = String(after.status || "").trim();
    const becameAccepted = isReportAccepted(nextStatus) && !isReportAccepted(previousStatus);
    const becameRejected = isReportRejected(nextStatus) && !isReportRejected(previousStatus);

    if (!becameAccepted && !becameRejected) {
      return;
    }

    const recipients = await Promise.all([
      getUserById(after.inspectorId),
      getUserById(after.supervisorId),
      getUserById(after.managerId),
      getUserById(after.externalReviewerId),
      getUserById(after.externalReviewerId2),
      getUserById(after.externalReviewerId3),
      getUserById(after.externalReviewerId4),
      getUserById(after.externalReviewerId5),
      getUserById(after.externalReviewerId6),
    ]);

    const decisionLabel = becameAccepted ? "Report Accepted" : "Report Rejected";
    const decisionBy =
      after.clientReviewDecisionBy ||
      after.reportAcceptedBy ||
      after.reportRejectedBy ||
      "External Reviewer";
    const decisionAt =
      after.clientReviewDecisionAt ||
      after.reportAcceptedAt ||
      after.reportRejectedAt ||
      null;

    const subject = `InspectPro: ${formatProjectLabel(after)} ${decisionLabel.toLowerCase()}`;
    const text =
      `${formatProjectLabel(after)} has reached a final client decision.\n` +
      `Decision: ${decisionLabel}\n` +
      `Decision By: ${decisionBy}\n` +
      `Decision At: ${formatDate(decisionAt)}\n` +
      `Technique: ${formatTechnique(after)}\n` +
      `Open app: ${APP_URL}`;
    const html = renderEmailShell({
      heading: decisionLabel,
      intro:
        `${formatProjectLabel(after)} has been marked as ${decisionLabel.toLowerCase()} in the client review workflow.`,
      details: [
        { label: "Project", value: formatProjectLabel(after) },
        { label: "Decision", value: decisionLabel },
        { label: "Decision By", value: decisionBy },
        { label: "Decision At", value: formatDate(decisionAt) },
        { label: "Technique", value: formatTechnique(after) },
      ],
    });

    await queueEmailToUsers({
      users: recipients.filter(Boolean),
      subject,
      text,
      html,
      eventType: becameAccepted ? "report_accepted_email" : "report_rejected_email",
      payload: {
        projectDocId: event.params.projectId,
        projectId: after.projectId || "",
        status: after.status || "",
        decisionBy,
      },
    });
  },
);

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
