import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarClock,
  FolderPlus,
  MapPin,
  PencilLine,
  ShieldAlert,
  Wrench,
  X,
} from "lucide-react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { toast } from "react-toastify";

import { db } from "../../Auth/firebase";
import { useAuth } from "../../Auth/AuthContext";
import AdminNavbar from "../AdminNavbar";
import AdminSidebar from "../AdminSidebar";
import ManagerNavbar from "../ManagerFile/ManagerNavbar";
import ManagerSidebar from "../ManagerFile/ManagerSidebar";
import ExternalNavbar from "../ExternalDashboard/ExternalNavbar";
import ExternalSideBar from "../ExternalDashboard/ExternalSideBar";
import ControlCenterTableShell from "../../Common/ControlCenterTableShell";
import TableQueryControls from "../../Common/TableQueryControls";
import { groupRowsByOption, TABLE_GROUP_NONE } from "../../../utils/tableGrouping";
import {
  getSchedulerStatus,
  INSPECTION_INTERVAL_UNITS,
  normalizeIntervalUnit,
  normalizeIntervalValue,
  toDateOrNull,
  toMillis,
} from "../../../utils/inspectionScheduling";
import { distinctRowsByLatest } from "../../../utils/distinctRows";
import { getToastErrorMessage } from "../../../utils/toast";

const formatDate = (value) => {
  const parsed = toDateOrNull(value);
  return parsed ? parsed.toLocaleDateString() : "N/A";
};

const formatDateInputValue = (value) => {
  const parsed = toDateOrNull(value);
  if (!parsed) return "";
  const year = parsed.getFullYear();
  const month = `${parsed.getMonth() + 1}`.padStart(2, "0");
  const day = `${parsed.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getEffectiveScheduleStatus = (schedule) => {
  const workflowStatus = String(schedule?.status || "").trim().toLowerCase();
  if (workflowStatus === "completed" || workflowStatus === "cancelled") {
    return workflowStatus;
  }

  const explicitStatus = String(schedule?.schedulerStatus || "").trim().toLowerCase();
  if (explicitStatus === "completed" || explicitStatus === "cancelled") {
    return explicitStatus;
  }

  return getSchedulerStatus(schedule?.dueDate);
};

const statusTone = {
  overdue: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  due_soon: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  scheduled: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  completed: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  cancelled: "border-slate-700 bg-slate-800/40 text-slate-400",
};

const statusLabel = {
  overdue: "Overdue",
  due_soon: "Due Soon",
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
};

const emptyEditorState = {
  equipmentId: "",
  equipmentTag: "",
  equipmentCategory: "",
  clientId: "",
  clientName: "",
  locationId: "",
  locationName: "",
  inspectionTypeId: "",
  inspectionTypeCode: "",
  inspectionTypeName: "",
  selectedTechnique: "",
  dueDate: "",
  intervalValue: "6",
  intervalUnit: "months",
  scheduleState: "active",
  notes: "",
};

const NextInspectionScheduler = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupBy, setGroupBy] = useState(TABLE_GROUP_NONE);
  const [loading, setLoading] = useState(true);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [editorState, setEditorState] = useState(emptyEditorState);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);
  const [clients, setClients] = useState([]);
  const [assignedClientIds, setAssignedClientIds] = useState([]);
  const [locations, setLocations] = useState([]);
  const [masterEquipment, setMasterEquipment] = useState([]);
  const [inspectionTypes, setInspectionTypes] = useState([]);

  const isExternalReviewer = user?.role === "External_Reviewer";
  const isManager = user?.role === "Manager";
  const isAdmin = user?.role === "Admin";

  useEffect(() => {
    if (!user?.uid) {
      setSchedules([]);
      setLoading(false);
      return undefined;
    }

    const schedulesQuery = isExternalReviewer
      ? query(
          collection(db, "inspection_schedules"),
          where("externalReviewerId", "==", user.uid),
        )
      : query(
          collection(db, "inspection_schedules"),
          orderBy("dueDate", "desc"),
        );

    const unsubscribe = onSnapshot(
      schedulesQuery,
      (snapshot) => {
        setSchedules(
          snapshot.docs.map((scheduleDoc) => ({
            id: scheduleDoc.id,
            ...scheduleDoc.data(),
          })),
        );
        setLoading(false);
      },
      () => {
        setSchedules([]);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [isExternalReviewer, user?.uid]);

  useEffect(() => {
    const unsubClients = onSnapshot(
      query(collection(db, "clients"), orderBy("name", "desc")),
      (snapshot) => {
        setClients(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
      },
    );

    const unsubLocations = onSnapshot(
      query(collection(db, "locations"), orderBy("name", "desc")),
      (snapshot) => {
        setLocations(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
      },
    );

    const unsubEquipment = onSnapshot(
      query(collection(db, "equipment"), orderBy("tagNumber", "desc")),
      (snapshot) => {
        setMasterEquipment(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
      },
    );

    const unsubInspectionTypes = onSnapshot(
      query(collection(db, "inspection_types"), orderBy("title", "desc")),
      (snapshot) => {
        setInspectionTypes(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
      },
    );

    return () => {
      unsubClients();
      unsubLocations();
      unsubEquipment();
      unsubInspectionTypes();
    };
  }, []);

  useEffect(() => {
    if (!user?.uid || isAdmin) {
      setAssignedClientIds([]);
      return undefined;
    }

    const assignmentField = isExternalReviewer ? "externalReviewerId" : "managerId";
    const assignedProjectsQuery = query(
      collection(db, "projects"),
      where(assignmentField, "==", user.uid),
    );

    const unsubscribe = onSnapshot(
      assignedProjectsQuery,
      (snapshot) => {
        const nextClientIds = Array.from(
          new Set(
            snapshot.docs
              .map((projectDoc) => projectDoc.data()?.clientId)
              .filter(Boolean),
          ),
        );
        setAssignedClientIds(nextClientIds);
      },
      () => {
        setAssignedClientIds([]);
      },
    );

    return () => unsubscribe();
  }, [isAdmin, isExternalReviewer, user?.uid]);

  const Navbar = isExternalReviewer
    ? ExternalNavbar
    : isManager
      ? ManagerNavbar
      : AdminNavbar;
  const Sidebar = isExternalReviewer
    ? ExternalSideBar
    : isManager
      ? ManagerSidebar
      : AdminSidebar;

  const distinctSchedules = useMemo(
    () =>
      distinctRowsByLatest(
        schedules,
        (row) => row.equipmentId || row.equipmentTag,
        (row) => -toMillis(row.dueDate),
      ),
    [schedules],
  );

  const filteredSchedules = useMemo(
    () =>
      distinctSchedules
        .map((schedule) => ({
          ...schedule,
          derivedStatus: getEffectiveScheduleStatus(schedule),
        }))
        .filter((schedule) => {
          const term = searchTerm.trim().toLowerCase();
          const matchesSearch =
            !term ||
            [
              schedule.equipmentTag,
              schedule.projectName,
              schedule.projectId,
              schedule.clientName,
              schedule.locationName,
              schedule.inspectionTypeCode,
              schedule.inspectionTypeName,
              schedule.externalReviewerName,
            ].some((value) => String(value || "").toLowerCase().includes(term));
          const matchesStatus =
            statusFilter === "all" || schedule.derivedStatus === statusFilter;
          return matchesSearch && matchesStatus;
        })
        .sort((left, right) => toMillis(left.dueDate) - toMillis(right.dueDate)),
    [distinctSchedules, searchTerm, statusFilter],
  );

  const groupedSchedules = useMemo(
    () =>
      groupRowsByOption(filteredSchedules, groupBy, [
        {
          value: "status",
          label: "Status",
          getValue: (schedule) => statusLabel[schedule.derivedStatus] || "Scheduled",
          emptyLabel: "Scheduled",
        },
        
        {
          value: "technique",
          label: "Technique",
          getValue: (schedule) =>
            schedule.selectedTechnique || schedule.inspectionTypeCode || "General Inspection",
          emptyLabel: "General Inspection",
        },
      ]),
    [filteredSchedules, groupBy],
  );

  const availableLocations = useMemo(
    () =>
      locations.filter((location) =>
        !editorState.clientName
          ? true
          : location.clientId === editorState.clientId,
      ),
    [editorState.clientId, editorState.clientName, locations],
  );

  const availableClients = useMemo(() => {
    if (isAdmin) return clients;
    if (!assignedClientIds.length) return [];
    return clients.filter((client) => assignedClientIds.includes(client.id));
  }, [assignedClientIds, clients, isAdmin]);

  const selectedInspectionType = useMemo(
    () =>
      inspectionTypes.find(
        (inspectionType) => inspectionType.id === editorState.inspectionTypeId,
      ) || null,
    [editorState.inspectionTypeId, inspectionTypes],
  );

  const availableTechniques = useMemo(() => {
    const techniques = selectedInspectionType?.requiredTechniques;
    return Array.isArray(techniques) && techniques.length > 0
      ? techniques
      : ["General Inspection"];
  }, [selectedInspectionType]);

  const openEditor = (schedule) => {
    setIsCreatingSchedule(false);
    setEditingSchedule(schedule);
    setEditorState({
      equipmentId: schedule?.equipmentId || "",
      equipmentTag: schedule?.equipmentTag || "",
      equipmentCategory: schedule?.equipmentCategory || "",
      clientId: schedule?.clientId || "",
      clientName: schedule?.clientName || "",
      locationId: schedule?.locationId || "",
      locationName: schedule?.locationName || "",
      inspectionTypeId: schedule?.inspectionTypeId || "",
      inspectionTypeCode: schedule?.inspectionTypeCode || "",
      inspectionTypeName: schedule?.inspectionTypeName || "",
      selectedTechnique: schedule?.selectedTechnique || "",
      dueDate: formatDateInputValue(schedule?.dueDate),
      intervalValue: String(schedule?.intervalValue || 6),
      intervalUnit: normalizeIntervalUnit(schedule?.intervalUnit),
      scheduleState:
        schedule?.status === "completed" || schedule?.status === "cancelled"
          ? schedule.status
          : "active",
      notes: schedule?.notes || schedule?.nextInspectionNotes || "",
    });
  };

  const openCreateSchedule = () => {
    setIsCreatingSchedule(true);
    setEditingSchedule(null);
    setEditorState(emptyEditorState);
  };

  const closeEditor = () => {
    setEditingSchedule(null);
    setIsCreatingSchedule(false);
    setEditorState(emptyEditorState);
    setSavingSchedule(false);
  };

  const handleEditorChange = (field, value) => {
    setEditorState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleClientSelect = (clientId) => {
    const selectedClient = availableClients.find((client) => client.id === clientId);
    setEditorState((current) => ({
      ...current,
      clientId,
      clientName: selectedClient?.name || "",
      locationId: "",
      locationName: "",
    }));
  };

  const handleLocationSelect = (locationId) => {
    const selectedLocation = locations.find((location) => location.id === locationId);
    setEditorState((current) => ({
      ...current,
      locationId,
      locationName: selectedLocation?.name || "",
    }));
  };

  const handleEquipmentSelect = (equipmentId) => {
    const selectedEquipment = masterEquipment.find((equipment) => equipment.id === equipmentId);
    setEditorState((current) => ({
      ...current,
      equipmentId,
      equipmentTag: selectedEquipment?.tagNumber || "",
      equipmentCategory: selectedEquipment?.assetType || selectedEquipment?.description || "",
    }));
  };

  const handleInspectionTypeSelect = (inspectionTypeId) => {
    const selectedType = inspectionTypes.find((inspectionType) => inspectionType.id === inspectionTypeId);
    const nextTechniqueOptions =
      Array.isArray(selectedType?.requiredTechniques) && selectedType.requiredTechniques.length > 0
        ? selectedType.requiredTechniques
        : ["General Inspection"];
    setEditorState((current) => ({
      ...current,
      inspectionTypeId,
      inspectionTypeCode: selectedType?.title || "",
      inspectionTypeName: selectedType?.fullName || "",
      selectedTechnique: nextTechniqueOptions[0] || "",
    }));
  };

  const handleSaveSchedule = async () => {
    if (!editingSchedule?.id && !isCreatingSchedule) {
      return toast.error("Schedule reference is missing.");
    }

    if (!editorState.dueDate) {
      return toast.error("Please choose the next due date.");
    }

    if (isCreatingSchedule && !editorState.equipmentTag.trim()) {
      return toast.error("Please provide the equipment tag.");
    }

    setSavingSchedule(true);

    try {
      const normalizedIntervalValue = normalizeIntervalValue(editorState.intervalValue);
      const normalizedIntervalUnit = normalizeIntervalUnit(editorState.intervalUnit);
      const nextDueDate = new Date(`${editorState.dueDate}T00:00:00`);
      const nextDerivedStatus =
        editorState.scheduleState === "active"
          ? getSchedulerStatus(nextDueDate)
          : editorState.scheduleState;

      const schedulePayload = {
        equipmentTag: editorState.equipmentTag.trim(),
        equipmentCategory: editorState.equipmentCategory.trim(),
        clientId: editingSchedule?.clientId || editorState.clientId || "",
        clientName: editorState.clientName.trim(),
        locationId: editingSchedule?.locationId || editorState.locationId || "",
        locationName: editorState.locationName.trim(),
        inspectionTypeId: editingSchedule?.inspectionTypeId || editorState.inspectionTypeId || "",
        inspectionTypeCode: editorState.inspectionTypeCode.trim(),
        inspectionTypeName: editorState.inspectionTypeName.trim(),
        selectedTechnique: editorState.selectedTechnique.trim(),
        dueDate: nextDueDate,
        intervalValue: normalizedIntervalValue,
        intervalUnit: normalizedIntervalUnit,
        status: editorState.scheduleState,
        schedulerStatus: nextDerivedStatus,
        notes: editorState.notes.trim(),
        updatedAt: serverTimestamp(),
        updatedBy: user?.name || user?.email || user?.fullName || "Team Member",
        updatedByRole: user?.role || "",
        externalReviewerId:
          editingSchedule?.externalReviewerId || user?.uid || "",
        externalReviewerName:
          editingSchedule?.externalReviewerName ||
          user?.fullName ||
          user?.name ||
          user?.displayName ||
          user?.email ||
          "External Reviewer",
        managerId: editingSchedule?.managerId || "",
        managerName: editingSchedule?.managerName || "",
        equipmentId: editingSchedule?.equipmentId || editorState.equipmentId || "",
        projectId: editingSchedule?.projectId || "",
        projectDocId: editingSchedule?.projectDocId || "",
        basis: editingSchedule?.basis || "manual",
        lastInspectionDate: editingSchedule?.lastInspectionDate || null,
      };

      if (isCreatingSchedule) {
        await addDoc(collection(db, "inspection_schedules"), {
          ...schedulePayload,
          createdAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, "inspection_schedules", editingSchedule.id), schedulePayload);
      }

      if (editingSchedule?.equipmentId) {
        await updateDoc(doc(db, "equipment", editingSchedule.equipmentId), {
          nextInspection: {
            dueDate: nextDueDate,
            basis: editingSchedule.basis || "interval",
            intervalValue: normalizedIntervalValue,
            intervalUnit: normalizedIntervalUnit,
            inspectionTypeId: editingSchedule.inspectionTypeId || "",
            inspectionTypeCode: editingSchedule.inspectionTypeCode || "",
            inspectionTypeName: editingSchedule.inspectionTypeName || "",
            selectedTechnique: editingSchedule.selectedTechnique || "",
            status: nextDerivedStatus,
            generatedFromProjectId: editingSchedule.projectId || "",
            generatedFromProjectDocId: editingSchedule.projectDocId || "",
            notes: editorState.notes.trim(),
            updatedAt: serverTimestamp(),
          },
          updatedAt: serverTimestamp(),
        });
      }

      toast.success(isCreatingSchedule ? "Inspection schedule created." : "Inspection schedule updated.");
      closeEditor();
    } catch (error) {
      toast.error(
        getToastErrorMessage(
          error,
          isCreatingSchedule
            ? "Unable to create the inspection schedule."
            : "Unable to update the inspection schedule.",
        ),
      );
      setSavingSchedule(false);
    }
  };

  const subtitle = isExternalReviewer
    ? "Manage your assigned inspection schedules, reschedule due dates, and keep equipment timelines aligned with field realities."
    : "Track upcoming equipment due dates, overdue inspections, and coordinate the next inspection cycle.";

  return (
    <>
      <ControlCenterTableShell
        navbar={<Navbar />}
        sidebar={<Sidebar />}
        title="Next Inspection Scheduler"
        subtitle={subtitle}
        icon={<CalendarClock size={18} />}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by equipment, project, client, or inspection type..."
        summary={`${filteredSchedules.length} Scheduled Inspection${filteredSchedules.length === 1 ? "" : "s"}`}
        loading={loading}
        hasData={filteredSchedules.length > 0}
        emptyTitle="No Scheduled Inspections"
        emptyDescription={
          isExternalReviewer
            ? "Once your approved projects generate schedules, they will appear here for scheduling actions."
            : "Approved projects will generate upcoming inspection records here."
        }
        toolbar={
          <div className="flex flex-col gap-4 p-4 sm:p-5">
            {isExternalReviewer ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={openCreateSchedule}
                  className="inline-flex items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white transition-all hover:bg-orange-600"
                >
                  <CalendarClock size={14} />
                  Schedule Inspection
                </button>
              </div>
            ) : null}
            <TableQueryControls
              filters={[
                {
                  key: "status",
                  label: "Status Filter",
                  value: statusFilter,
                  onChange: setStatusFilter,
                  options: [
                    { value: "all", label: "All Statuses" },
                    { value: "overdue", label: "Overdue" },
                    { value: "due_soon", label: "Due Soon" },
                    { value: "scheduled", label: "Scheduled" },
                    { value: "completed", label: "Completed" },
                    { value: "cancelled", label: "Cancelled" },
                  ],
                },
              ]}
              groupBy={groupBy}
              onGroupByChange={setGroupBy}
              groupOptions={[
                { value: TABLE_GROUP_NONE, label: "No Grouping" },
                { value: "status", label: "Status" },
                
                { value: "technique", label: "Technique" },
              ]}
            />
          </div>
        }
      >
        <div className="table-scroll-region max-h-[68vh] overflow-auto">
          <table className="w-full min-w-[1160px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-[#0b1326]">
              <tr className="border-b border-slate-800/80">
                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
                  S/N
                </th>
                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Equipment
                </th>
                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Inspection Type
                </th>
                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Client / Location
                </th>
                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Assignment
                </th>
                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Last Inspection
                </th>
                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Next Due Date
                </th>
                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Status
                </th>
                <th className="px-3 py-3 text-right text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {groupedSchedules.map((group) => (
                <React.Fragment key={group.key}>
                  {groupBy !== TABLE_GROUP_NONE ? (
                    <tr className="bg-[#08101f]">
                      <td
                        colSpan="9"
                        className="px-3 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-orange-400"
                      >
                        {group.label} ({group.items.length})
                      </td>
                    </tr>
                  ) : null}
                  {group.items.map((schedule, index) => (
                    <tr
                      key={schedule.id}
                      className="group border-b border-slate-800/60 transition-colors hover:bg-white/[0.03]"
                    >
                      <td className="px-3 py-4 align-top text-xs font-bold text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-3 py-4 align-top">
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-orange-500 shadow-inner">
                            <Wrench size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase text-white sm:text-sm">
                              {schedule.equipmentCategory || "Equipment"}
                            </p>
                            <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                              {schedule.equipmentTag || "Unknown Tag"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 align-top">
                        <p className="text-xs font-bold text-slate-200 sm:text-sm">
                         {schedule.selectedTechnique || "General Technique"} 
                        <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                          {schedule.inspectionTypeCode || schedule.inspectionTypeName || "Inspection"}
                        </p>
                        </p>
                      </td>
                      <td className="px-3 py-4 align-top">
                        <p className="text-xs font-bold uppercase text-slate-200 sm:text-sm">
                          {schedule.clientName || "No Client"}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-slate-300">
                          <MapPin size={14} className="shrink-0 text-orange-500/60" />
                          <span className="text-xs font-medium sm:text-sm">
                            {schedule.locationName || "No Location"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-4 align-top">
                        <p className="text-xs font-bold text-slate-200 sm:text-sm">
                          {schedule.externalReviewerName || "No External Reviewer"}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                          {schedule.managerName || "Manager Pending"}
                        </p>
                      </td>
                      <td className="px-3 py-4 align-top">
                        <p className="text-xs font-bold text-slate-200 sm:text-sm">
                          {formatDate(schedule.lastInspectionDate)}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                          {schedule.projectId || "Project Link Pending"}
                        </p>
                      </td>
                      <td className="px-3 py-4 align-top">
                        <p className="text-xs font-bold text-slate-200 sm:text-sm">
                          {formatDate(schedule.dueDate)}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                          Every {schedule.intervalValue || 6} {schedule.intervalUnit || "months"}
                        </p>
                      </td>
                      <td className="px-3 py-4 align-top">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${
                            statusTone[schedule.derivedStatus] || statusTone.scheduled
                          }`}
                        >
                          {statusLabel[schedule.derivedStatus] || "Scheduled"}
                        </span>
                        {schedule.notes ? (
                          <p className="mt-2 max-w-[220px] text-[11px] leading-relaxed text-slate-400">
                            {schedule.notes}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-4 text-right align-top">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditor(schedule)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-slate-200 transition-all hover:border-orange-500/40 hover:text-white"
                          >
                            <PencilLine size={14} />
                            Adjust Schedule
                          </button>
                          {isAdmin ? (
                            <button
                              onClick={() =>
                                navigate("/projects", {
                                  state: {
                                    schedulerPrefill: {
                                      equipmentId: schedule.equipmentId,
                                      equipmentTag: schedule.equipmentTag,
                                      equipmentCategory: schedule.equipmentCategory,
                                      clientId: schedule.clientId,
                                      clientName: schedule.clientName,
                                      locationId: schedule.locationId,
                                      locationName: schedule.locationName,
                                      inspectionTypeId: schedule.inspectionTypeId,
                                      inspectionTypeCode: schedule.inspectionTypeCode,
                                      inspectionTypeName: schedule.inspectionTypeName,
                                      selectedTechnique: schedule.selectedTechnique,
                                      sourceScheduleId: schedule.id,
                                    },
                                  },
                                })
                              }
                              className="inline-flex items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500 px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-white transition-all hover:bg-orange-600"
                            >
                              <FolderPlus size={14} />
                              Create Project
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </ControlCenterTableShell>

      {editingSchedule || isCreatingSchedule ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 px-4 py-8 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[1.75rem] border border-slate-800 bg-[#08101f] shadow-[0_28px_80px_rgba(2,6,23,0.7)]">
            <div className="flex items-start justify-between border-b border-slate-800 px-6 py-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-400">
                  Schedule Control
                </p>
                <h2 className="mt-2 text-xl font-black text-white">
                  {isCreatingSchedule
                    ? "Create Inspection Schedule"
                    : editingSchedule?.equipmentTag || "Inspection Schedule"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {isCreatingSchedule
                    ? "Create a new manual schedule for an upcoming inspection."
                    : "Update the due date, interval, workflow state, and schedule notes."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-slate-400 transition-colors hover:text-white"
                aria-label="Close schedule editor"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid max-h-[calc(90vh-170px)] gap-5 overflow-y-auto px-6 py-6 md:grid-cols-2">
              {isCreatingSchedule ? (
                <>
                  <label className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      Equipment
                    </span>
                    <select
                      value={editorState.equipmentId}
                      onChange={(event) => handleEquipmentSelect(event.target.value)}
                      className="w-full rounded-2xl border border-slate-700 bg-[#0a1224] px-4 py-3 text-sm text-slate-100 outline-none transition-colors focus:border-orange-500"
                    >
                      <option value="">Select equipment</option>
                      {masterEquipment.map((equipment) => (
                        <option key={equipment.id} value={equipment.id}>
                          {equipment.description || equipment.assetType || equipment.id}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      Equipment Category
                    </span>
                    <input
                      type="text"
                      value={editorState.equipmentCategory}
                      readOnly
                      className="w-full rounded-2xl border border-slate-700 bg-[#0a1224] px-4 py-3 text-sm text-slate-100 outline-none transition-colors focus:border-orange-500"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      Client
                    </span>
                    <select
                      value={editorState.clientId}
                      onChange={(event) => handleClientSelect(event.target.value)}
                      className="w-full rounded-2xl border border-slate-700 bg-[#0a1224] px-4 py-3 text-sm text-slate-100 outline-none transition-colors focus:border-orange-500"
                    >
                      <option value="">Select client</option>
                      {availableClients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name || client.id}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      Location
                    </span>
                    <select
                      value={editorState.locationId}
                      onChange={(event) => handleLocationSelect(event.target.value)}
                      className="w-full rounded-2xl border border-slate-700 bg-[#0a1224] px-4 py-3 text-sm text-slate-100 outline-none transition-colors focus:border-orange-500"
                    >
                      <option value="">Select location</option>
                      {availableLocations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name || location.id}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/*<label className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      Inspection Type
                    </span>
                    <select
                      value={editorState.inspectionTypeId}
                      onChange={(event) => handleInspectionTypeSelect(event.target.value)}
                      className="w-full rounded-2xl border border-slate-700 bg-[#0a1224] px-4 py-3 text-sm text-slate-100 outline-none transition-colors focus:border-orange-500"
                    >
                      <option value="">Select inspection type</option>
                      {inspectionTypes.map((inspectionType) => (
                        <option key={inspectionType.id} value={inspectionType.id}>
                          {inspectionType.fullName || inspectionType.id}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      Inspection Type Name
                    </span>
                    <input
                      type="text"
                      value={editorState.inspectionTypeName}
                      readOnly
                      className="w-full rounded-2xl border border-slate-700 bg-[#0a1224] px-4 py-3 text-sm text-slate-100 outline-none transition-colors focus:border-orange-500"
                    />
                  </label>*/}

                  <label className="space-y-2 md:col-span-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      Required Technique
                    </span>
                    <select
                      value={editorState.selectedTechnique}
                      onChange={(event) => handleEditorChange("selectedTechnique", event.target.value)}
                      className="w-full rounded-2xl border border-slate-700 bg-[#0a1224] px-4 py-3 text-sm text-slate-100 outline-none transition-colors focus:border-orange-500"
                    >
                      {availableTechniques.map((technique) => (
                        <option key={technique} value={technique}>
                          {technique}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : null}

              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Next Due Date
                </span>
                <input
                  type="date"
                  value={editorState.dueDate}
                  onChange={(event) => handleEditorChange("dueDate", event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-[#0a1224] px-4 py-3 text-sm text-slate-100 outline-none transition-colors focus:border-orange-500"
                />
              </label>

              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Schedule State
                </span>
                <select
                  value={editorState.scheduleState}
                  onChange={(event) => handleEditorChange("scheduleState", event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-[#0a1224] px-4 py-3 text-sm text-slate-100 outline-none transition-colors focus:border-orange-500"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Interval Value
                </span>
                <input
                  type="number"
                  min="1"
                  value={editorState.intervalValue}
                  onChange={(event) => handleEditorChange("intervalValue", event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-[#0a1224] px-4 py-3 text-sm text-slate-100 outline-none transition-colors focus:border-orange-500"
                />
              </label>

              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Interval Unit
                </span>
                <select
                  value={editorState.intervalUnit}
                  onChange={(event) => handleEditorChange("intervalUnit", event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-[#0a1224] px-4 py-3 text-sm text-slate-100 outline-none transition-colors focus:border-orange-500"
                >
                  {INSPECTION_INTERVAL_UNITS.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Scheduling Notes
                </span>
                <textarea
                  rows="4"
                  value={editorState.notes}
                  onChange={(event) => handleEditorChange("notes", event.target.value)}
                  placeholder="Capture why the date changed, field constraints, or coordination notes..."
                  className="w-full rounded-2xl border border-slate-700 bg-[#0a1224] px-4 py-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-orange-500"
                />
              </label>

              <div className="rounded-2xl border border-slate-800 bg-[#060b17] px-4 py-4 md:col-span-2">
                <div className="flex items-center gap-3">
                  <ShieldAlert size={18} className="text-orange-400" />
                  <p className="text-sm text-slate-300">
                    Saving here updates both the schedule record and the linked equipment&apos;s
                    next-inspection snapshot so the whole workflow stays aligned.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-800 px-6 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-slate-300 transition-colors hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSchedule}
                disabled={savingSchedule}
                className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-500/60"
              >
                {savingSchedule ? "Saving..." : "Save Schedule"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default NextInspectionScheduler;
