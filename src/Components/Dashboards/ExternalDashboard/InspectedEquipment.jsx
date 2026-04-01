import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
} from "firebase/firestore";
import {
  Activity,
  Building2,
  ClipboardCheck,
  MapPin,
  Search,
  ShieldAlert,
  Wrench,
} from "lucide-react";

import { db } from "../../Auth/firebase";
import { useAuth } from "../../Auth/AuthContext";
import ExternalNavbar from "./ExternalNavbar";
import ExternalSideBar from "./ExternalSideBar";
import TableQueryControls from "../../Common/TableQueryControls";
import { groupRowsByOption, TABLE_GROUP_NONE } from "../../../utils/tableGrouping";
import { matchesExternalReviewerProject } from "../../../utils/externalReviewerAccess";

function getInspectionEndDate(project) {
  const normalizedStatus = String(project?.status || "").trim().toLowerCase();

  if (normalizedStatus !== "approved") {
    return null;
  }

  return (
    project?.approvedAt ||
    project?.confirmedAt ||
    project?.confirmationDate ||
    project?.updatedAt ||
    project?.lastUpdated ||
    null
  );
}

const InspectedEquipment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [equipmentRegistry, setEquipmentRegistry] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingEquipment, setLoadingEquipment] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupBy, setGroupBy] = useState(TABLE_GROUP_NONE);

  useEffect(() => {
    if (!user?.uid) {
      setProjects([]);
      setLoadingProjects(false);
      return undefined;
    }

    const unsubscribe = onSnapshot(
      collection(db, "projects"),
      (snapshot) => {
        setProjects(
          snapshot.docs.map((projectDoc) => ({
            id: projectDoc.id,
            ...projectDoc.data(),
          }))
          .filter((project) => matchesExternalReviewerProject(project, user)),
        );
        setLoadingProjects(false);
      },
      (error) => {
        console.error("Failed to load assigned reviewer projects:", error);
        setProjects([]);
        setLoadingProjects(false);
      },
    );

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "equipment"),
      (snapshot) => {
        setEquipmentRegistry(
          snapshot.docs.map((equipmentDoc) => ({
            id: equipmentDoc.id,
            ...equipmentDoc.data(),
          })),
        );
        setLoadingEquipment(false);
      },
      (error) => {
        console.error("Failed to load equipment registry:", error);
        setEquipmentRegistry([]);
        setLoadingEquipment(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const equipmentRows = useMemo(() => {
    return projects
      .map((project) => {
        const linkedEquipment = equipmentRegistry.find(
          (equipment) => equipment.id === project.equipmentId,
        );

        return {
          id: `${project.id}-${project.equipmentId || project.equipmentTag || "equipment"}`,
          projectDocId: project.id,
          projectId: project.projectId || project.id,
          requiredTechnique:
            project.selectedTechnique ||
            project.reportTemplate ||
            project.inspectionTypeCode ||
            project.inspectionTypeName ||
            "General Inspection",
          clientName: project.clientName || project.client || "N/A",
          locationName: project.locationName || project.location || "N/A",
          status: project.status || "Pending",
          inspectionStartDate:
            project.startDate ||
            project.deploymentDate ||
            project.inspectionStartedAt ||
            project.createdAt ||
            project.timestamp ||
            null,
          inspectionEndDate: getInspectionEndDate(project),
          nextInspectionDate:
            linkedEquipment?.nextInspection?.dueDate ||
            project?.nextInspectionDate ||
            null,
          tagReference:
            linkedEquipment?.tagNumber ||
            project.equipmentTag ||
            project.tag ||
            "N/A",
          equipmentName:
            linkedEquipment?.description ||
            linkedEquipment?.assetType ||
            project.equipmentCategory ||
            project.assetType ||
            "N/A",
          equipmentType:
            linkedEquipment?.assetType ||
            project.equipmentCategory ||
            project.assetType ||
            "N/A",
          service:
            linkedEquipment?.service ||
            linkedEquipment?.status ||
            "N/A",
          countdown: getCountdownDetails(
            linkedEquipment?.nextInspection?.dueDate || project?.nextInspectionDate || null,
          ),
        };
      })
      .filter((row) => row.tagReference !== "N/A" || row.equipmentName !== "N/A");
  }, [equipmentRegistry, projects]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return [...equipmentRows]
      .filter((row) => {
        if (!term) return true;

        return [
          row.projectName,
          row.requiredTechnique,
          row.clientName,
          row.locationName,
          row.tagReference,
          row.equipmentName,
          row.equipmentType,
          row.status,
          row.service,
          row.countdown?.label,
        ].some((value) => String(value || "").toLowerCase().includes(term));
      }) 
      .filter(
        (row) =>
          statusFilter === "all" ||
          String(row.status || "").toLowerCase() === statusFilter,
      )
      .sort(
        (left, right) =>
          toMillis(right.inspectionStartDate) - toMillis(left.inspectionStartDate),
      );
  }, [equipmentRows, searchTerm, statusFilter]);

  const groupedRows = useMemo(
    () =>
      groupRowsByOption(filteredRows, groupBy, [
        {
          value: "status",
          label: "Status",
          getValue: (row) => row.status,
          emptyLabel: "Pending",
        },
        {
          value: "client",
          label: "Client",
          getValue: (row) => row.clientName,
          emptyLabel: "Unassigned Client",
        },
        {
          value: "equipmentType",
          label: "Equipment Type",
          getValue: (row) => row.equipmentType,
          emptyLabel: "Unknown Type",
        },
      ]),
    [filteredRows, groupBy],
  );

  const metrics = useMemo(() => {
    const approvedEquipment = equipmentRows.filter((row) =>
      String(row.status || "").toLowerCase().startsWith("approved"),
    ).length;

    return {
      totalEquipment: equipmentRows.length,
      totalProjects: new Set(equipmentRows.map((row) => row.projectDocId)).size,
      approvedEquipment,
    };
  }, [equipmentRows]);

  const loading = loadingProjects || loadingEquipment;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <ExternalNavbar />
      <div className="flex flex-1">
        <ExternalSideBar />
        <main className="flex-1 ml-16 lg:ml-64 p-4 sm:p-6 lg:p-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-7xl mx-auto">
            <div className="mb-10 flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h1 className="flex items-center gap-3 text-3xl font-bold uppercase tracking-tighter text-white">
                  <Wrench className="text-orange-500" /> Inspected Equipment
                </h1>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
                  Equipment linked to projects assigned to this external reviewer
                </p>
              </div>

              <div className="relative w-full md:w-96 group">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 transition-colors group-focus-within:text-orange-500"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Search by tag, client, project, or equipment..."
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900/50 p-4 pl-12 text-xs outline-none transition-all shadow-inner backdrop-blur-md focus:border-orange-500"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </div>
            {loading ? (
              <div className="flex justify-center py-20">
                <Activity className="animate-spin text-orange-500" />
              </div>
            ) : filteredRows.length > 0 ? (
              <div className="overflow-hidden rounded-[2.5rem] border border-slate-800 bg-slate-900/40 shadow-2xl backdrop-blur-md">
                <TableQueryControls
                  filters={[
                    {
                      key: "status",
                      label: "Status Filter",
                      value: statusFilter,
                      onChange: setStatusFilter,
                      options: [
                        { value: "all", label: "All Statuses" },
                        ...Array.from(new Set(equipmentRows.map((row) => row.status).filter(Boolean))).map((status) => ({
                          value: String(status).toLowerCase(),
                          label: status,
                        })),
                      ],
                    },
                  ]}
                  groupBy={groupBy}
                  onGroupByChange={setGroupBy}
                  groupOptions={[
                    { value: TABLE_GROUP_NONE, label: "No Grouping" },
                    { value: "status", label: "Status" },
                    { value: "client", label: "Client" },
                    { value: "equipmentType", label: "Equipment Type" },
                  ]}
                />
                <div className="table-scroll-region max-h-[68vh] overflow-auto">
                  <table className="min-w-[1120px] w-full border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm">
                      <tr className="border-b border-slate-800 bg-slate-950/50">
                        <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
                          S/N
                        </th>
                        <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
                          Equipment
                        </th>
                        <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
                          Required Technique
                        </th>
                        <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
                          Location
                        </th>
                        <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
                          Inspection Start Date
                        </th>
                        <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
                          Inspection End Date
                        </th>
                        <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
                          Next Inspection Date
                        </th>
                        <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
                          Countdown Timer
                        </th>
                       {/* <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500">
                          Status
                        </th>
                        <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">
                          View
                        </th>*/}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {groupedRows.map((group) => (
                        <React.Fragment key={group.key}>
                          {groupBy !== TABLE_GROUP_NONE ? (
                            <tr className="bg-slate-950/80">
                              <td
                                 colSpan="9"
                                className="px-3 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-orange-400"
                              >
                                {group.label} ({group.items.length})
                              </td>
                            </tr>
                          ) : null}
                          {group.items.map((row, index) => (
                        <tr key={row.id} className="group transition-colors hover:bg-white/5">
                          <td className="px-3 py-4 text-xs font-bold text-slate-400">
                            {index + 1}
                          </td>
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-3">
                              <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-orange-500 shadow-inner transition-all group-hover:border-orange-500/50">
                                <Wrench size={16} />
                              </div>
                              <div className="min-w-0">
                                <p className="max-w-[180px] truncate text-xs font-bold uppercase tracking-tight text-white transition-colors group-hover:text-orange-500 sm:text-sm">
                                  {row.equipmentName}
                                </p>
                                <p className="mt-0.5 font-mono text-[9px] uppercase text-slate-500">
                                  {row.tagReference}
                                </p>
                                <p className="mt-1 text-[9px] uppercase tracking-widest text-slate-600">
                                  {row.equipmentType}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <p className="max-w-[170px] truncate text-[11px] font-semibold uppercase text-slate-300 sm:text-xs">
                              {row.requiredTechnique}
                            </p>
                            <p className="font-mono text-[9px] uppercase text-slate-500">
                              {row.projectId}
                            </p>
                          </td>
                          
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-2 text-slate-400">
                              <MapPin size={13} className="shrink-0 text-orange-500/50" />
                              <span className="max-w-[150px] truncate text-[11px] font-medium sm:text-xs">
                                {row.locationName}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-4 text-[11px] font-medium text-slate-300 sm:text-xs">
                            {formatDate(row.inspectionStartDate)}
                          </td>
                          <td className="px-3 py-4 text-[11px] font-medium text-slate-300 sm:text-xs">
                            {row.inspectionEndDate ? formatDate(row.inspectionEndDate) : "Pending"}
                          </td>
                          <td className="px-3 py-4 text-[11px] font-medium text-slate-300 sm:text-xs">
                            {row.nextInspectionDate ? formatDate(row.nextInspectionDate) : "Not Scheduled"}
                          </td>
                          <td className="px-3 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] sm:text-[9px] ${row.countdown.classes}`}
                            >
                              {row.countdown.label}
                            </span>
                          </td>
                          {/*<td className="p-6">
                            <StatusBadge status={row.status} />
                          </td>
                          <td className="p-6 text-right">
                            <button
                              onClick={() => navigate(`/admin/project/${row.projectDocId}`)}
                              className="inline-flex rounded-xl bg-orange-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-orange-900/20 transition-all hover:bg-orange-700"
                            >
                              View Report
                            </button>
                          </td>*/}
                        </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/30 p-4">
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">
                    Total Registered Equipment: {filteredRows.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                      Real-time sync active
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-slate-800 bg-slate-900/10 py-32">
                <ShieldAlert size={48} className="mb-4 text-slate-800" />
                <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
                  No Equipment Assigned
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

const MetricCard = ({ icon, label, value }) => (
  <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg">
    <div className="mb-4 inline-flex rounded-2xl bg-slate-950/50 p-3 text-orange-500">
      {icon}
    </div>
    <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
      {label}
    </p>
    <p className="mt-3 text-3xl font-black text-white">{value}</p>
  </div>
);

const StatusBadge = ({ status }) => {
  const normalizedStatus = String(status || "").trim().toLowerCase();
  const isApproved = normalizedStatus.startsWith("approved");
  const isReviewing =
    normalizedStatus.startsWith("in lead review") ||
    normalizedStatus.startsWith("pending confirmation");

  const classes = isApproved
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
    : isReviewing
      ? "border-orange-500/30 bg-orange-500/10 text-orange-300"
      : "border-slate-700 bg-slate-800/40 text-slate-300";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-widest ${classes}`}
    >
      {status || "Pending"}
    </span>
  );
};

const formatDate = (value) => {
  if (!value) return "N/A";
  if (typeof value?.toDate === "function") {
    return value.toDate().toLocaleDateString();
  }
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "N/A" : parsed.toLocaleDateString();
};

const getCountdownDetails = (value) => {
  if (!value) {
    return {
      label: "Not Scheduled",
      classes: "border-slate-700 bg-slate-800/40 text-slate-300",
    };
  }

  const dueDate =
    typeof value?.toDate === "function"
      ? value.toDate()
      : value instanceof Date
        ? value
        : new Date(value);

  if (Number.isNaN(dueDate.getTime())) {
    return {
      label: "Not Scheduled",
      classes: "border-slate-700 bg-slate-800/40 text-slate-300",
    };
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const diffDays = Math.ceil((dueDay.getTime() - startOfToday.getTime()) / 86400000);

  if (diffDays < 0) {
    return {
      label: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"}`,
      classes: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    };
  }

  if (diffDays === 0) {
    return {
      label: "Due Today",
      classes: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    };
  }

  return {
    label: `${diffDays} day${diffDays === 1 ? "" : "s"} left`,
    classes:
      diffDays <= 30
        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  };
};

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  return 0;
};

export default InspectedEquipment;
