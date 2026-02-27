import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../../Auth/firebase";
import {
  collection,
  addDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  setDoc,
  serverTimestamp,
  where,
} from "firebase/firestore";
import {
  Shield,
  X,
  Building2,
  MapPin,
  Zap,
  Cog,
  Calendar,
  Briefcase,
  ArrowRight,
  Package,
  FileText,
  UserCheck,
} from "lucide-react";
import AdminNavbar from "../../AdminNavbar";
import AdminSidebar from "../../AdminSidebar";
import { toast } from "react-toastify";
import { useAuth } from "../../../Auth/AuthContext";

const buildUniqueReportNumber = (projectDocId) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const suffix = (projectDocId || "").slice(0, 6).toUpperCase();
  return `RPT-${y}${m}${d}-${suffix}`;
};

const ProjectSetup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Master Directory State ---
  const [clients, setClients] = useState([]);
  const [locations, setLocations] = useState([]);
  const [inspectionTypes, setInspectionTypes] = useState([]);
  const [masterEquipment, setMasterEquipment] = useState([]);
  const [inspectors, setInspectors] = useState([]);
  const [supervisor, setSupervisor] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  // --- Consolidated Project Manifest State ---
  const [setupData, setSetupData] = useState({
    projectId: `PRJ-${Math.floor(1000 + Math.random() * 9000)}`,
    projectName: "",
    clientId: "",
    clientName: "",
    clientLogo: "",
    locationId: "",
    locationName: "",
    inspectionTypeId: "",
    inspectionTypeCode: "",
    selectedTechnique: "",
    equipmentId: "",
    equipmentTag: "",
    equipmentCategory: "",
    inspectorId: "",
    inspectorName: "",
    supervisorId: "",
    supervisorName: "",
    startDate: "",
    status: "Forwarded to Inspector", // Status updated for workflow
  });

  // --- 1. Real-time Synchronization across all Management Modules ---
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

    // Sync qualified Inspectors from Users Management
    const unsubInspectors = onSnapshot(
      query(collection(db, "users"), where("role", "==", "Inspector")),
      (snap) =>
        setInspectors(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );

    // Sync qualified Lead Inspectors from Users Management
    const unsubSupervisor = onSnapshot(
      query(collection(db, "users"), where("role", "in", ["Lead Inspector", "Supervisor"])),
      (snap) =>
        setSupervisor(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );

    return () => {
      unsubClients();
      unsubLocs();
      unsubTypes();
      unsubEquip();
      unsubInspectors();
      unsubSupervisor();
    };
  }, []);

  // --- 2. Relationship Filter Logic ---
  const availableLocations = locations.filter(
    (loc) => loc.clientId === setupData.clientId,
  );
  const selectedProtocol = inspectionTypes.find(
    (t) => t.id === setupData.inspectionTypeId,
  );
  const authorizedTechniques = selectedProtocol?.requiredTechniques || [];

  // --- 3. Submission & Forwarding Logic ---
  // 1. Validation Logic (Triggers the Modal)
  // --- 3. Submission & Forwarding Logic ---
  const triggerPreview = (e) => {
    e.preventDefault();
    
    // Cleaned up validation: ensure all required keys have values
    if (
      !setupData.projectName ||
      !setupData.clientId ||
      !setupData.inspectorId ||
      !setupData.equipmentId ||
      !setupData.supervisorId // Ensure you have actually selected a supervisor in the UI
    ) {
      toast.warn("Incomplete Manifest: Ensure Client, Asset, Inspector, and Lead Inspector are assigned.");
      return;
    }

    setShowPreview(true);
  };

  // 2. Final Submission Logic (Inside the Modal)
  const handleFinalConfirm = async () => {
    setIsSubmitting(true);
    try {
      const projectRef = doc(collection(db, "projects"));
      const reportNum = buildUniqueReportNumber(projectRef.id);

      await setDoc(projectRef, {
        ...setupData,
        reportNum,
        adminId: user?.uid,
        adminName: user?.displayName || user?.name || "System Admin",
        deploymentDate: serverTimestamp(),
      });

      await addDoc(collection(db, "activity_logs"), {
        message: `Project Deployed: ${setupData.projectName}`,
        target: setupData.projectId,
        userEmail: user?.email || "system@local",
        type: "info",
        timestamp: serverTimestamp(),
      });

      // Inspector-targeted log so InspectionDashboard feed updates instantly.
      const targetInspectorIds =
        Array.isArray(setupData.inspectorIds) && setupData.inspectorIds.length > 0
          ? setupData.inspectorIds
          : setupData.inspectorId
            ? [setupData.inspectorId]
            : [];

      const selectedInspectors = inspectors.filter((ins) =>
        targetInspectorIds.includes(ins.id),
      );

      if (selectedInspectors.length > 0) {
        await Promise.all(
          selectedInspectors.map((ins) =>
            addDoc(collection(db, "activity_logs"), {
              message: `New Inspection Sent: ${setupData.projectName}`,
              target: setupData.projectId,
              userEmail: ins?.email || "",
              userId: ins?.id || "",
              type: "alert",
              timestamp: serverTimestamp(),
            }),
          ),
        );
      }

      toast.success(`Project Successfully Forwarded to ${setupData.inspectorName}`);
      navigate("/admin/projects");
    } catch (error) {
      toast.error("Deployment Failure: " + error.message);
    } finally {
      setIsSubmitting(false);
      setShowPreview(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <AdminNavbar />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-4 sm:p-6 lg:p-8 bg-slate-950">
          <div className="max-w-6xl mx-auto">
            <header className="mb-10 border-b border-slate-900 pb-8">
              <h1 className="text-3xl font-bold uppercase tracking-tighter flex items-center gap-3 text-white">
                <Shield className="text-orange-500" /> Project Initialization
              </h1>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">
                Project ID: {setupData.projectId}
              </p>
            </header>

            <form
              onSubmit={triggerPreview} className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 space-y-6">
                {/* SECTION 1: CLIENT & FACILITY (LINKED) */}
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
                          setSetupData({
                            ...setupData,
                            clientId: e.target.value,
                            clientName: selected?.name || "",
                            // NEW: Capturing the logo from the selected client object
                            clientLogo: selected?.logo || "",
                            locationId: "",
                          });
                        }}
                      >
                        <option value="">Select Client...</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">
                        Project Name
                      </label>
                      <div className="flex gap-3">
                        {/* NEW: Logo Preview Badge */}
                        {setupData.clientLogo && (
                          <div className="h-[52px] w-[52px] flex-shrink-0 bg-white rounded-xl p-1 border border-slate-800 flex items-center justify-center overflow-hidden shadow-lg animate-in zoom-in-50 duration-300">
                            <img
                              src={setupData.clientLogo}
                              alt="Client Logo"
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                        )}
                        <input
                          required
                          className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white focus:border-orange-500 outline-none"
                          placeholder="e.g. Tank 01 Annual NDT"
                          value={setupData.projectName}
                          onChange={(e) =>
                            setSetupData({
                              ...setupData,
                              projectName: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">
                        Facility/Location
                      </label>
                      <select
                        required
                        disabled={!setupData.clientId}
                        className={`w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white ${!setupData.clientId && "opacity-30"}`}
                        value={setupData.locationId}
                        onChange={(e) => {
                          const selected = locations.find(
                            (l) => l.id === e.target.value,
                          );
                          setSetupData({
                            ...setupData,
                            locationId: e.target.value,
                            locationName: selected?.name || "",
                          });
                        }}
                      >
                        <option value="">Select Facility...</option>
                        {availableLocations.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: ASSET MANAGEMENT INTEGRATION */}
                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem]">
                  <h2 className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                    <Package size={14} /> 2. Select Equipment
                  </h2>
                  <select
                    required
                    className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white cursor-pointer"
                    value={setupData.equipmentId}
                    onChange={(e) => {
                      const selected = masterEquipment.find(
                        (eq) => eq.id === e.target.value,
                      );
                      setSetupData({
                        ...setupData,
                        equipmentId: e.target.value,
                        equipmentTag: selected?.tagNumber || "",
                        equipmentCategory: selected?.assetType || "",
                      });
                    }}
                  >
                    <option value="">Assign Asset Tag...</option>
                    {masterEquipment.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.tagNumber} - {eq.assetType}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SECTION 3: INSPECTOR ASSIGNMENT (USER MANAGEMENT) */}
                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] backdrop-blur-md">
                  <h2 className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                    <UserCheck size={14} /> 3. Assign Inspection
                  </h2>
                  <select
                    required
                    className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white"
                    value={setupData.inspectorId}
                    onChange={(e) => {
                      const selected = inspectors.find(
                        (ins) => ins.id === e.target.value,
                      );
                      setSetupData({
                        ...setupData,
                        inspectorId: e.target.value,
                        inspectorName:
                          selected?.name ||
                          selected?.displayName ||
                          selected?.fullName ||
                          "Technical Resource",
                      });
                    }}
                  >
                    <option value="">Choose Assigned Inspector...</option>
                    {inspectors.map((ins) => (
                      <option key={ins.id} value={ins.id}>
                        {ins.name || ins.displayName || ins.fullName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] backdrop-blur-md">
                  <h2 className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                    <UserCheck size={14} /> 3. Assign Lead Inspector
                  </h2>
                  <select
                    required
                    className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white"
                    value={setupData.supervisorId}
                    onChange={(e) => {
                      const selected = supervisor.find(
                        (ins) => ins.id === e.target.value,
                      );
                      setSetupData({
                        ...setupData,
                        supervisorId: e.target.value,
                        supervisorName:
                          selected?.displayName ||
                          selected?.name ||
                          selected?.fullName ||
                          "Technical Resource",
                      });
                    }}
                  >
                    <option value="">Choose Lead Inspector...</option>
                    {supervisor.map((ins) => (
                      <option key={ins.id} value={ins.id}>
                        {ins.name || ins.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SIDEBAR: TECHNICAL STANDARDS & DEPLOYMENT */}
              <div className="space-y-6">
                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] space-y-6 shadow-xl">
                  <h2 className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Zap size={14} /> 4. Inspection Type
                  </h2>

                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">
                      Inspection Code
                    </label>
                    <select
                      required
                      className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white"
                      value={setupData.inspectionTypeId}
                      onChange={(e) => {
                        const selected = inspectionTypes.find(
                          (t) => t.id === e.target.value,
                        );
                        setSetupData({
                          ...setupData,
                          inspectionTypeId: e.target.value,
                          inspectionTypeCode: selected?.title || "",
                          selectedTechnique: "",
                        });
                      }}
                    >
                      <option value="">Select Code...</option>
                      {inspectionTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title} - {t.fullName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">
                      Specific Technique
                    </label>
                    <select
                      required
                      disabled={!setupData.inspectionTypeId}
                      className={`w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white ${!setupData.inspectionTypeId && "opacity-30"}`}
                      value={setupData.selectedTechnique}
                      onChange={(e) =>
                        setSetupData({
                          ...setupData,
                          selectedTechnique: e.target.value,
                        })
                      }
                    >
                      <option value="">Select Technique...</option>
                      {authorizedTechniques.map((tech, index) => (
                        <option key={index} value={tech}>
                          {tech}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-slate-800">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">
                      Schedule Start
                    </label>
                    <input
                      type="date"
                      required
                      className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white focus:border-orange-500 outline-none"
                      value={setupData.startDate}
                      onChange={(e) =>
                        setSetupData({
                          ...setupData,
                          startDate: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <button
                  disabled={isSubmitting}
                  type="submit"
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white py-6 rounded-[2.5rem] font-bold uppercase text-[11px] tracking-[0.3em] flex items-center justify-center gap-3 transition-all shadow-2xl active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? "Syncing Modules..." : "Forward to Inspector"}{" "}
                  <ArrowRight size={18} />
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
      {/* PREVIEW MODAL */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-50" />
            
            <header className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white uppercase tracking-tighter flex items-center gap-3">
                  <FileText className="text-orange-500" /> Project Initiation
                </h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Project ID: {setupData.projectId}</p>
              </div>
              <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
                <X size={24} />
              </button>
            </header>

            <div className="grid grid-cols-2 gap-8 mb-10">
              <PreviewItem label="Project Name" value={setupData.projectName} icon={<Briefcase size={14}/>} />
              <PreviewItem label="Client" value={setupData.clientName} icon={<Building2 size={14}/>} />
              <PreviewItem label="Asset" value={setupData.equipmentTag} icon={<Package size={14}/>} />
              <PreviewItem label="Technique" value={setupData.selectedTechnique} icon={<Zap size={14}/>} />
              <PreviewItem label="Assigned Inspector" value={setupData.inspectorName} icon={<UserCheck size={14}/>} />
              <PreviewItem label="Schedule Start" value={setupData.startDate} icon={<Calendar size={14}/>} />
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setShowPreview(false)}
                className="flex-1 py-5 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-800 transition-all"
              >
                Back to Edit
              </button>
              <button 
                onClick={handleFinalConfirm}
                disabled={isSubmitting}
                className="flex-[2] bg-orange-600 hover:bg-orange-700 text-white py-5 rounded-3xl font-black uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl shadow-orange-900/20 active:scale-95 disabled:opacity-50 transition-all"
              >
                {isSubmitting ? "Processing..." : "Confirm & Forward"}
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default ProjectSetup;

const PreviewItem = ({ label, value, icon }) => (
  <div className="space-y-1">
    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
      {icon} {label}
    </label>
    <p className="text-sm font-bold text-white uppercase truncate">{value || "Not Assigned"}</p>
  </div>
);


