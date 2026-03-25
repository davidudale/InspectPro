import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { db } from "../../../Auth/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  Shield,
  Building2,
  MapPin,
  Zap,
  Cog,
  Calendar,
  Briefcase,
  Package,
  FileText,
  UserCheck,
  ArrowLeft,
  Save,
} from "lucide-react";
import AdminNavbar from "../../AdminNavbar";
import AdminSidebar from "../../AdminSidebar";
import { toast } from "react-toastify";
import { getToastErrorMessage } from "../../../../utils/toast";
import { useAuth } from "../../../Auth/AuthContext";

const ProjectEdit = () => {
  const { user } = useAuth();
  const { id, projectId } = useParams();
  const routeProjectId = projectId || id || "";
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [projectDocId, setProjectDocId] = useState("");

  const [clients, setClients] = useState([]);
  const [locations, setLocations] = useState([]);
  const [inspectionTypes, setInspectionTypes] = useState([]);
  const [masterEquipment, setMasterEquipment] = useState([]);
  const [inspectors, setInspectors] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [externalReviewers, setExternalReviewers] = useState([]);
  const [managers, setManagers] = useState([]);

  const [setupData, setSetupData] = useState({
    projectId: "",
    projectName: "",
    clientId: "",
    clientName: "",
    clientLogo: "",
    locationId: "",
    locationName: "",
    inspectionTypeId: "",
    inspectionTypeCode: "",
    inspectionTypeName: "",
    selectedTechnique: "",
    reportTemplate: "",
    equipmentId: "",
    equipmentTag: "",
    equipmentCategory: "",
    reportNum: "",
    contractNumber: "",
    pidNumber: "",
    inspectorId: "",
    inspectorName: "",
    supervisorId: "",
    supervisorName: "",
    externalReviewerId: "",
    externalReviewerName: "",
    managerId: "",
    managerName: "",
    startDate: "",
    status: "Not started- Report With Inspector",
  });

  useEffect(() => {
    const unsubClients = onSnapshot(
      query(collection(db, "clients"), orderBy("name", "asc")),
      (snap) => setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    const unsubLocs = onSnapshot(
      query(collection(db, "locations"), orderBy("name", "asc")),
      (snap) => setLocations(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    const unsubTypes = onSnapshot(
      query(collection(db, "inspection_types"), orderBy("title", "asc")),
      (snap) =>
        setInspectionTypes(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    const unsubEquip = onSnapshot(
      query(collection(db, "equipment"), orderBy("tagNumber", "asc")),
      (snap) =>
        setMasterEquipment(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    const unsubInspectors = onSnapshot(
      query(collection(db, "users"), where("role", "==", "Inspector")),
      (snap) =>
        setInspectors(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    const unsubSupervisors = onSnapshot(
      query(collection(db, "users"), where("role", "==", "Lead Inspector")),
      (snap) =>
        setSupervisors(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    const unsubExternalReviewers = onSnapshot(
      query(collection(db, "users"), where("role", "==", "External_Reviewer")),
      (snap) =>
        setExternalReviewers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    const unsubManagers = onSnapshot(
      query(collection(db, "users"), where("role", "==", "Manager")),
      (snap) => setManagers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );

    return () => {
      unsubClients();
      unsubLocs();
      unsubTypes();
      unsubEquip();
      unsubInspectors();
      unsubSupervisors();
      unsubExternalReviewers();
      unsubManagers();
    };
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      if (location.state?.project) {
        setSetupData((prev) => ({ ...prev, ...location.state.project }));
        setProjectDocId(location.state.project.id || "");
        setLoading(false);
        return;
      }

      if (!routeProjectId) {
        setLoading(false);
        return;
      }

      try {
        let resolvedDoc = null;
        const projectQuery = query(
          collection(db, "projects"),
          where("projectId", "==", routeProjectId),
          limit(1),
        );
        const snapshot = await getDocs(projectQuery);
        if (!snapshot.empty) {
          resolvedDoc = snapshot.docs[0];
        }

        if (!resolvedDoc) {
          const docSnap = await getDoc(doc(db, "projects", routeProjectId));
          if (docSnap.exists()) {
            resolvedDoc = docSnap;
          }
        }

        if (!resolvedDoc) {
          toast.error("Project not found.");
          navigate("/admin/projects");
          return;
        }

        setProjectDocId(resolvedDoc.id);
        setSetupData((prev) => ({ ...prev, ...resolvedDoc.data() }));
      } catch (error) {
        toast.error(getToastErrorMessage(error, "Unable to load the project."));
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [location.state, routeProjectId, navigate]);

  const availableLocations = useMemo(
    () => locations.filter((loc) => loc.clientId === setupData.clientId),
    [locations, setupData.clientId],
  );
  const selectedProtocol = useMemo(
    () => inspectionTypes.find((t) => t.id === setupData.inspectionTypeId),
    [inspectionTypes, setupData.inspectionTypeId],
  );
  const authorizedTechniques = selectedProtocol?.requiredTechniques || [];
  const isTechniqueRequired = authorizedTechniques.length > 0;
  const inspectorStatusName = setupData.inspectorName || "Inspector";
  const supervisorStatusName = setupData.supervisorName || "Lead Inspector";
  const managerStatusName = setupData.managerName || "Manager";
  const statusOptions = useMemo(
    () => [
      `Not started- Report With ${inspectorStatusName}`,
      "Planned",
      `In Progress - Report With ${inspectorStatusName}`,
      `Pending Confirmation- Report With ${supervisorStatusName}`,
      `Passed and Forwarded to ${managerStatusName}`,
      "On-Hold",
      "Completed",
      "Approved",
    ],
    [inspectorStatusName, supervisorStatusName, managerStatusName],
  );
  const resolvedStatusOptions = statusOptions.includes(setupData.status)
    ? statusOptions
    : [...statusOptions, setupData.status].filter(Boolean);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      let resolvedDocId = projectDocId;
      if (!resolvedDocId && setupData.projectId) {
        const projectQuery = query(
          collection(db, "projects"),
          where("projectId", "==", setupData.projectId),
          limit(1),
        );
        const snapshot = await getDocs(projectQuery);
        if (!snapshot.empty) {
          resolvedDocId = snapshot.docs[0].id;
        }
      }
      if (!resolvedDocId) {
        throw new Error("Project reference missing.");
      }

      await updateDoc(doc(db, "projects", resolvedDocId), {
        ...setupData,
        approvedAt:
          setupData.status === "Approved"
            ? setupData.approvedAt || serverTimestamp()
            : setupData.approvedAt || null,
        lastUpdated: serverTimestamp(),
        adminId: user?.uid || "",
        adminName: user?.displayName || user?.name || "System Admin",
      });
      toast.success("Project updated successfully.");
      navigate("/admin/projects");
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Unable to update the project."));
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-950 text-orange-500">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <AdminNavbar />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-4 sm:p-6 lg:p-8 bg-slate-950">
          <div className="max-w-6xl mx-auto">
            <header className="mb-10 border-b border-slate-900 pb-8">
              <div className="flex items-center justify-between">
                <div>
                  <button
                    onClick={() => navigate("/admin/projects")}
                    className="flex items-center gap-2 text-slate-500 hover:text-orange-500 transition-colors text-[10px] font-bold uppercase tracking-widest mb-4"
                  >
                    <ArrowLeft size={14} /> Back to Directory
                  </button>
                  <h1 className="text-3xl font-bold uppercase tracking-tighter flex items-center gap-3 text-white">
                    <Shield className="text-orange-500" /> Project Update
                  </h1>
                </div>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em]">
                  Project ID: {setupData.projectId || "N/A"}
                </p>
              </div>
            </header>

            <form
              onSubmit={handleUpdate}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] backdrop-blur-md">
                  <h2 className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                    <Building2 size={14} /> 1. Client & Facility Assignment
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">
                        Select Client
                      </label>
                      <select
                        required
                        className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white"
                        value={setupData.clientId}
                        onChange={(e) => {
                          const selected = clients.find(
                            (c) => c.id === e.target.value,
                          );
                          setSetupData((prev) => ({
                            ...prev,
                            clientId: selected?.id || "",
                            clientName: selected?.name || "",
                            clientLogo: selected?.logo || "",
                            locationId: "",
                            locationName: "",
                          }));
                        }}
                      >
                        <option value="">Select client</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">
                        Select Location
                      </label>
                      <select
                        required
                        className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white"
                        value={setupData.locationId}
                        onChange={(e) => {
                          const selected = availableLocations.find(
                            (l) => l.id === e.target.value,
                          );
                          setSetupData((prev) => ({
                            ...prev,
                            locationId: selected?.id || "",
                            locationName: selected?.name || "",
                          }));
                        }}
                      >
                        <option value="">Select location</option>
                        {availableLocations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] backdrop-blur-md">
                  <h2 className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                    <Zap size={14} /> 2. Inspection Protocol & Technique
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">
                        Inspection Type
                      </label>
                      <select
                        required
                        className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white"
                        value={setupData.inspectionTypeId}
                        onChange={(e) => {
                          const selected = inspectionTypes.find(
                            (t) => t.id === e.target.value,
                          );
                          setSetupData((prev) => ({
                            ...prev,
                            inspectionTypeId: selected?.id || "",
                            inspectionTypeCode: selected?.title || "",
                            inspectionTypeName: selected?.fullName || "",
                            selectedTechnique: "",
                            reportTemplate: "",
                          }));
                        }}
                      >
                        <option value="">Select inspection type</option>
                        {inspectionTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.title} - {type.fullName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">
                        Technique
                      </label>
                      <select
                        required={isTechniqueRequired}
                        className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white"
                        value={setupData.selectedTechnique}
                        onChange={(e) =>
                          setSetupData((prev) => ({
                            ...prev,
                            selectedTechnique: e.target.value,
                            reportTemplate: e.target.value,
                          }))
                        }
                      >
                        <option value="">Select technique</option>
                        {(authorizedTechniques.length
                          ? authorizedTechniques
                          : ["Visual", "Ultrasonic Test", "Detailed", "Integrity Check", "AUT", "MUT"]
                        ).map((tech) => (
                          <option key={tech} value={tech}>
                            {tech}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] backdrop-blur-md">
                  <h2 className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                    <Package size={14} /> 3. Asset Identification
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">
                        Select Equipment
                      </label>
                      <select
                        required
                        className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white"
                        value={setupData.equipmentId}
                        onChange={(e) => {
                          const selected = masterEquipment.find(
                            (eq) => eq.id === e.target.value,
                          );
                          setSetupData((prev) => ({
                            ...prev,
                            equipmentId: selected?.id || "",
                            equipmentTag: selected?.tagNumber || "",
                            equipmentCategory: selected?.category || "",
                          }));
                        }}
                      >
                        <option value="">Select equipment</option>
                        {masterEquipment.map((eq) => (
                          <option key={eq.id} value={eq.id}>
                            {eq.tagNumber} - {eq.category}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">
                        Equipment Tag
                      </label>
                      <input
                        className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white"
                        value={setupData.equipmentTag}
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] backdrop-blur-md">
                  <h2 className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                    <UserCheck size={14} /> 4. Team Assignment
                  </h2>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">
                        Assign Inspector
                      </label>
                      <select
                        required
                        className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white"
                        value={setupData.inspectorId}
                        onChange={(e) => {
                          const selected = inspectors.find(
                            (ins) => ins.id === e.target.value,
                          );
                          const assignedInspectorName =
                            selected?.displayName || selected?.name || "";
                          setSetupData((prev) => ({
                            ...prev,
                            inspectorId: selected?.id || "",
                            inspectorName: assignedInspectorName,
                            status:
                              !prev.status ||
                              String(prev.status).toLowerCase().startsWith("not started")
                                ? `Not started- Report With ${assignedInspectorName || "Inspector"}`
                                : prev.status,
                          }));
                        }}
                      >
                        <option value="">Select inspector</option>
                        {inspectors.map((ins) => (
                          <option key={ins.id} value={ins.id}>
                            {ins.displayName || ins.name || ins.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">
                        Assign Reviewer
                      </label>
                      <select
                        required
                        className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white"
                        value={setupData.supervisorId}
                        onChange={(e) => {
                          const selected = supervisors.find(
                            (sup) => sup.id === e.target.value,
                          );
                          setSetupData((prev) => ({
                            ...prev,
                            supervisorId: selected?.id || "",
                            supervisorName:
                              selected?.displayName || selected?.name || "",
                          }));
                        }}
                      >
                        <option value="">Select lead inspector</option>
                        {supervisors.map((sup) => (
                          <option key={sup.id} value={sup.id}>
                            {sup.displayName || sup.name || sup.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">
                        Assign External Reviewer
                      </label>
                      <select
                        required
                        className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white"
                        value={setupData.externalReviewerId}
                        onChange={(e) => {
                          const selected = externalReviewers.find(
                            (reviewer) => reviewer.id === e.target.value,
                          );
                          setSetupData((prev) => ({
                            ...prev,
                            externalReviewerId: selected?.id || "",
                            externalReviewerName:
                              selected?.displayName ||
                              selected?.name ||
                              selected?.fullName ||
                              "",
                          }));
                        }}
                      >
                        <option value="">Select external reviewer</option>
                        {externalReviewers.map((reviewer) => (
                          <option key={reviewer.id} value={reviewer.id}>
                            {reviewer.displayName || reviewer.name || reviewer.fullName || reviewer.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">
                        Assign Manager
                      </label>
                      <select
                        required
                        className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white"
                        value={setupData.managerId}
                        onChange={(e) => {
                          const selected = managers.find(
                            (mgr) => mgr.id === e.target.value,
                          );
                          setSetupData((prev) => ({
                            ...prev,
                            managerId: selected?.id || "",
                            managerName:
                              selected?.displayName ||
                              selected?.name ||
                              selected?.fullName ||
                              "",
                          }));
                        }}
                      >
                        <option value="">Select manager</option>
                        {managers.map((mgr) => (
                          <option key={mgr.id} value={mgr.id}>
                            {mgr.displayName || mgr.name || mgr.fullName || mgr.email}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] backdrop-blur-md">
                  <h2 className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                    <FileText size={14} /> 5. Documentation
                  </h2>
                  <div className="space-y-4">
                    <EditInput
                      label="Project Name"
                      value={setupData.projectName}
                      onChange={(val) =>
                        setSetupData((prev) => ({ ...prev, projectName: val }))
                      }
                    />
                    <EditInput
                      label="Report Number"
                      value={setupData.reportNum}
                      onChange={(val) =>
                        setSetupData((prev) => ({ ...prev, reportNum: val }))
                      }
                    />
                    <EditInput
                      label="Contract Number"
                      value={setupData.contractNumber}
                      onChange={(val) =>
                        setSetupData((prev) => ({
                          ...prev,
                          contractNumber: val,
                        }))
                      }
                    />
                    <EditInput
                      label="P&ID Number"
                      value={setupData.pidNumber}
                      onChange={(val) =>
                        setSetupData((prev) => ({ ...prev, pidNumber: val }))
                      }
                    />
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] backdrop-blur-md">
                  <h2 className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                    <Calendar size={14} /> 6. Scheduling & Status
                  </h2>
                  <div className="space-y-4">
                    <EditInput
                      label="Deployment Date"
                      type="date"
                      value={setupData.startDate}
                      onChange={(val) =>
                        setSetupData((prev) => ({ ...prev, startDate: val }))
                      }
                    />
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">
                        Operational Status
                      </label>
                      <select
                        className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white"
                        value={setupData.status}
                        onChange={(e) =>
                          setSetupData((prev) => ({
                            ...prev,
                            status: e.target.value,
                          }))
                        }
                      >
                        {resolvedStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-3">
                <button
                  disabled={isUpdating}
                  type="submit"
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white py-6 rounded-[2rem] font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all shadow-2xl shadow-orange-900/20 active:scale-95"
                >
                  {isUpdating ? "Updating..." : "Update Project"}
                  <Save size={18} />
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

const EditInput = ({ label, value, onChange, type = "text" }) => (
  <div className="space-y-2">
    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">
      {label}
    </label>
    <input
      type={type}
      className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white focus:border-orange-500 outline-none transition-all shadow-inner"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

export default ProjectEdit;
