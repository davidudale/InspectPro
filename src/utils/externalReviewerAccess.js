const REVIEWER_ID_KEYS = [
  "externalReviewerId",
  "externalReviewerId2",
  "externalReviewerId3",
  "externalReviewerId4",
  "externalReviewerId5",
  "externalReviewerId6",
];

const normalizeValue = (value) => String(value || "").trim().toLowerCase();

export const getProjectExternalReviewerIds = (project) =>
  REVIEWER_ID_KEYS.map((key) => normalizeValue(project?.[key])).filter(Boolean);

export const matchesExternalReviewerProject = (project, user) => {
  const userId = normalizeValue(user?.uid);
  const userClientId = normalizeValue(user?.clientId);
  const userClientName = normalizeValue(user?.clientName);
  const projectClientId = normalizeValue(project?.clientId);
  const projectClientName = normalizeValue(project?.clientName || project?.client);
  const reviewerIds = getProjectExternalReviewerIds(project);

  if (userId && reviewerIds.includes(userId)) {
    return true;
  }

  if (userClientId && projectClientId && userClientId === projectClientId) {
    return true;
  }

  if (userClientName && projectClientName && userClientName === projectClientName) {
    return true;
  }

  return false;
};
