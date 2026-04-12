export const buildExternalFeedbackProjectFields = ({
  feedbackId,
  message,
  decisionAt,
  reviewerName,
  reviewerEmail,
}) => ({
  externalFeedbackLatestMessage: String(message || "").trim(),
  externalFeedbackLatestDecisionAt: decisionAt || null,
  externalFeedbackLatestBy: String(reviewerName || "").trim(),
  externalFeedbackLatestByEmail: String(reviewerEmail || "").trim(),
  externalFeedbackLatestId: String(feedbackId || "").trim(),
  externalFeedbackLatestStatus: "Rejected",
});

export const clearExternalFeedbackProjectFields = () => ({
  externalFeedbackLatestMessage: null,
  externalFeedbackLatestDecisionAt: null,
  externalFeedbackLatestBy: null,
  externalFeedbackLatestByEmail: null,
  externalFeedbackLatestId: null,
  externalFeedbackLatestStatus: null,
});

export const getExternalFeedbackSummary = (project) => {
  const status = String(project?.externalFeedbackLatestStatus || "").trim().toLowerCase();
  if (status !== "rejected") {
    return "";
  }

  return String(project?.externalFeedbackLatestMessage || "").trim();
};
