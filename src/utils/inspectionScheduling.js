import { serverTimestamp } from "firebase/firestore";

export const DEFAULT_INSPECTION_INTERVAL_VALUE = 6;
export const DEFAULT_INSPECTION_INTERVAL_UNIT = "months";

export const INSPECTION_INTERVAL_UNITS = [
  { value: "days", label: "Days" },
  { value: "weeks", label: "Weeks" },
  { value: "months", label: "Months" },
  { value: "years", label: "Years" },
];

export const toDateOrNull = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const toMillis = (value) => {
  const date = toDateOrNull(value);
  return date ? date.getTime() : 0;
};

export const normalizeIntervalValue = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_INSPECTION_INTERVAL_VALUE;
  }
  return Math.round(parsed);
};

export const normalizeIntervalUnit = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return INSPECTION_INTERVAL_UNITS.some((option) => option.value === normalized)
    ? normalized
    : DEFAULT_INSPECTION_INTERVAL_UNIT;
};

export const addIntervalToDate = (baseDateInput, intervalValue, intervalUnit) => {
  const baseDate = toDateOrNull(baseDateInput) || new Date();
  const nextDate = new Date(baseDate);
  const value = normalizeIntervalValue(intervalValue);
  const unit = normalizeIntervalUnit(intervalUnit);

  if (unit === "days") {
    nextDate.setDate(nextDate.getDate() + value);
  } else if (unit === "weeks") {
    nextDate.setDate(nextDate.getDate() + value * 7);
  } else if (unit === "years") {
    nextDate.setFullYear(nextDate.getFullYear() + value);
  } else {
    nextDate.setMonth(nextDate.getMonth() + value);
  }

  return nextDate;
};

export const resolveInspectionInterval = (inspectionType = {}) => ({
  intervalValue: normalizeIntervalValue(inspectionType?.defaultIntervalValue),
  intervalUnit: normalizeIntervalUnit(inspectionType?.defaultIntervalUnit),
});

export const getSchedulerStatus = (dueDateInput) => {
  const dueDate = toDateOrNull(dueDateInput);
  if (!dueDate) return "scheduled";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(
    dueDate.getFullYear(),
    dueDate.getMonth(),
    dueDate.getDate(),
  );

  if (dueDay.getTime() < startOfToday.getTime()) return "overdue";

  const diffDays = Math.ceil((dueDay.getTime() - startOfToday.getTime()) / 86400000);
  if (diffDays <= 30) return "due_soon";

  return "scheduled";
};

export const buildScheduleFromProject = ({
  project,
  inspectionType,
  approvedAt,
  approvedBy,
}) => {
  const interval = resolveInspectionInterval(inspectionType);
  const lastInspectionDate =
    toDateOrNull(approvedAt) ||
    toDateOrNull(project?.approvedAt) ||
    toDateOrNull(project?.confirmedAt) ||
    toDateOrNull(project?.confirmationDate) ||
    new Date();
  const dueDate = addIntervalToDate(
    lastInspectionDate,
    interval.intervalValue,
    interval.intervalUnit,
  );

  const basePayload = {
    equipmentId: project?.equipmentId || "",
    equipmentTag: project?.equipmentTag || project?.tag || "",
    equipmentCategory: project?.equipmentCategory || project?.assetType || "",
    projectId: project?.projectId || project?.id || "",
    projectDocId: project?.id || "",
    projectName: project?.projectName || "",
    clientId: project?.clientId || "",
    clientName: project?.clientName || project?.client || "",
    locationId: project?.locationId || "",
    locationName: project?.locationName || project?.location || "",
    inspectionTypeId: project?.inspectionTypeId || inspectionType?.id || "",
    inspectionTypeCode:
      project?.inspectionTypeCode || inspectionType?.title || "",
    inspectionTypeName:
      project?.inspectionTypeName || inspectionType?.fullName || "",
    selectedTechnique:
      project?.selectedTechnique ||
      project?.reportTemplate ||
      "",
    lastInspectionDate,
    dueDate,
    intervalValue: interval.intervalValue,
    intervalUnit: interval.intervalUnit,
    basis: "interval",
    schedulerStatus: getSchedulerStatus(dueDate),
    approvedBy: approvedBy || "",
    inspectorId: project?.inspectorId || "",
    inspectorName: project?.inspectorName || "",
    supervisorId: project?.supervisorId || "",
    supervisorName: project?.supervisorName || "",
    managerId: project?.managerId || "",
    managerName: project?.managerName || "",
    externalReviewerId: project?.externalReviewerId || "",
    externalReviewerName: project?.externalReviewerName || "",
  };

  return {
    scheduleDoc: {
      ...basePayload,
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    equipmentSnapshot: {
      lastInspection: {
        projectId: basePayload.projectId,
        projectDocId: basePayload.projectDocId,
        inspectionTypeId: basePayload.inspectionTypeId,
        inspectionTypeCode: basePayload.inspectionTypeCode,
        inspectionTypeName: basePayload.inspectionTypeName,
        selectedTechnique: basePayload.selectedTechnique,
        approvedBy: approvedBy || "",
        completedAt: lastInspectionDate,
      },
      nextInspection: {
        dueDate,
        basis: "interval",
        intervalValue: interval.intervalValue,
        intervalUnit: interval.intervalUnit,
        inspectionTypeId: basePayload.inspectionTypeId,
        inspectionTypeCode: basePayload.inspectionTypeCode,
        inspectionTypeName: basePayload.inspectionTypeName,
        selectedTechnique: basePayload.selectedTechnique,
        status: getSchedulerStatus(dueDate),
        generatedFromProjectId: basePayload.projectId,
        generatedFromProjectDocId: basePayload.projectDocId,
        notes: "",
        updatedAt: serverTimestamp(),
      },
    },
  };
};
