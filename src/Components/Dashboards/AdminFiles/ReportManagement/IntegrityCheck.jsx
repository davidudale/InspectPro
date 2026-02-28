import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../../../Auth/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import {
  Camera,
  ChevronLeft,
  FileDown,
  Printer,
  Save,
  ShieldCheck,
} from "lucide-react";
import AdminNavbar from "../../AdminNavbar";
import AdminSidebar from "../../AdminSidebar";
import ManagerNavbar from "../../ManagerFile/ManagerNavbar";
import ManagerSidebar from "../../ManagerFile/ManagerSidebar";
import SupervisorNavbar from "../../SupervisorFiles/SupervisorNavbar";
import SupervisorSidebar from "../../SupervisorFiles/SupervisorSidebar";
import InspectorNavbar from "../../InspectorsFile/InspectorNavbar";
import InspectorSidebar from "../../InspectorsFile/InspectorSidebar";
import { toast } from "react-toastify";
import { useAuth } from "../../../Auth/AuthContext";

const IntegrityCheck = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [projectDocId, setProjectDocId] = useState("");
  const [reportMode, setReportMode] = useState(false);
  const createReportNumber = () => {
    const year = String(new Date().getFullYear()).slice(-2);
    const sequence = String(Math.floor(1 + Math.random() * 999)).padStart(
      3,
      "0",
    );
    return `PEL-WPQ/${year}/${sequence}`;
  };
  const [reportData, setReportData] = useState({
    type: "Integrity Check",
    status: user?.role === "Inspector" ? "New" : "Draft",
    general: {
      client: "",
      platform: "",
      tag: "",
      reportNum: createReportNumber(),
      date: "",
      equipment: "",
      diagramImage: "",
      utCalibrationCert: "",
      projectId: "",
    },
    inspection: {
      scope: "",
      method: "",
      findings: "",
      corrosion: "",
      defects: "",
      recommendations: "",
      conclusion: "",
    },
    observations: [
      {
        id: Date.now(),
        title: "",
        description: "",
        photo: "",
      },
    ],
    utm: [
      {
        id: "A1",
        tieIn: "A1",
        points: Array.from({ length: 6 }, (_, idx) => ({
          id: `${Date.now()}-A1-${idx}`,
          point: idx + 1,
          nominal: "",
          add: "",
          min: "",
          observation: "",
        })),
      },

    ],
    signoff: {
      inspector: "",
      reviewer: "",
    },
  });
  const isSupervisorRole =
    user?.role === "Supervisor" || user?.role === "Lead Inspector";
  const canSaveReport =
    user?.role === "Inspector" ||
    user?.role === "Lead Inspector" ||
    user?.role === "Supervisor" ||
    user?.role === "Manager";
  const canSendForConfirmation = canSaveReport;
  const Navbar =
    user?.role === "Admin"
      ? AdminNavbar
      : user?.role === "Manager"
        ? ManagerNavbar
        : isSupervisorRole
          ? SupervisorNavbar
          : InspectorNavbar;
  const Sidebar =
    user?.role === "Admin"
      ? AdminSidebar
      : user?.role === "Manager"
        ? ManagerSidebar
        : isSupervisorRole
          ? SupervisorSidebar
          : InspectorSidebar;

  useEffect(() => {
    const initializeFromPrefill = async () => {
      if (!location.state?.preFill) return;

      const p = location.state.preFill;
      const projectKey = p.id || p.projectDocId || p.projectId || "";
      const reportKey = p.reportId || p.reportDocId || p.reportKey || "";

      setReportData((prev) => ({
        ...prev,
        general: {
          ...prev.general,
          tag: p.equipmentTag || p.tag || "",
          equipment: p.equipmentCategory || p.assetType || p.equipment || "",
          platform: p.locationName || p.location || "",
          client: p.clientName || p.client || "",
          reportNum: p.reportNum || p.reportNo || prev.general.reportNum,
          date: new Date().toISOString().split("T")[0],
          projectId: projectKey,
        },
      }));

      if (!projectKey) return;

      let resolvedProjectDoc = null;

      if (projectKey) {
        const directSnap = await getDoc(doc(db, "projects", projectKey));
        if (directSnap.exists()) {
          resolvedProjectDoc = directSnap;
        } else {
          const projectQuery = query(
            collection(db, "projects"),
            where("projectId", "==", projectKey),
            limit(1),
          );
          const snapshot = await getDocs(projectQuery);
          if (!snapshot.empty) {
            resolvedProjectDoc = snapshot.docs[0];
          }
        }
      }

      if (!resolvedProjectDoc && reportKey) {
        const byLegacyReportId = query(
          collection(db, "projects"),
          where("report.migratedFrom", "==", reportKey),
          limit(1),
        );
        const legacySnap = await getDocs(byLegacyReportId);
        if (!legacySnap.empty) {
          resolvedProjectDoc = legacySnap.docs[0];
        }
      }

      if (!resolvedProjectDoc && reportKey) {
        const byEmbeddedReportId = query(
          collection(db, "projects"),
          where("report.reportId", "==", reportKey),
          limit(1),
        );
        const embeddedSnap = await getDocs(byEmbeddedReportId);
        if (!embeddedSnap.empty) {
          resolvedProjectDoc = embeddedSnap.docs[0];
        }
      }

      if (resolvedProjectDoc) {
        setProjectDocId(resolvedProjectDoc.id);
        const projectData = resolvedProjectDoc.data();
        if (projectData?.report) {
          const existingData = projectData.report;
          setReportData({
            ...existingData,
            status:
              projectData?.status ||
              existingData.status ||
              (user?.role === "Inspector" ? "New" : "Draft"),
          });
          toast.info("Previous Integrity Check report loaded for correction.");
        } else if (projectData?.status) {
          setReportData((prev) => ({
            ...prev,
            status: projectData.status,
          }));
        }
      } else if (projectKey) {
        setProjectDocId(projectKey);
      }
    };

    initializeFromPrefill();
  }, [location.state]);

  const handleChange = (section, field, value) => {
    setReportData((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  const updateObservation = (id, field, value) => {
    setReportData((prev) => ({
      ...prev,
      observations: prev.observations.map((obs) =>
        obs.id === id ? { ...obs, [field]: value } : obs,
      ),
    }));
  };

  const addObservation = () => {
    setReportData((prev) => ({
      ...prev,
      observations: [
        ...prev.observations,
        { id: Date.now(), title: "", description: "", photo: "" },
      ],
    }));
  };

  const removeObservation = (id) => {
    setReportData((prev) => ({
      ...prev,
      observations: prev.observations.filter((obs) => obs.id !== id),
    }));
  };

  const addTieInGroup = () => {
    const tieInName = `TIE-${reportData.utm.length + 1}`;
    setReportData((prev) => ({
      ...prev,
      utm: [
        ...prev.utm,
        {
          id: tieInName,
          tieIn: tieInName,
          points: Array.from({ length: 6 }, (_, idx) => ({
            id: `${Date.now()}-${tieInName}-${idx}`,
            point: idx + 1,
            nominal: "",
            add: "",
            min: "",
            observation: "",
          })),
        },
      ],
    }));
  };

  const removeTieInGroup = (id) => {
    setReportData((prev) => ({
      ...prev,
      utm: prev.utm.filter((g) => g.id !== id),
    }));
  };

  const addUTPoint = (groupId) => {
    setReportData((prev) => ({
      ...prev,
      utm: prev.utm.map((g) =>
        g.id === groupId
          ? {
              ...g,
              points: [
                ...g.points,
                {
                  id: `${Date.now()}-${groupId}-${g.points.length + 1}`,
                  point: g.points.length + 1,
                  nominal: "",
                  add: "",
                  min: "",
                  observation: "",
                },
              ],
            }
          : g,
      ),
    }));
  };

  const removeUTPoint = (groupId, pointId) => {
    setReportData((prev) => ({
      ...prev,
      utm: prev.utm.map((g) =>
        g.id === groupId
          ? { ...g, points: g.points.filter((p) => p.id !== pointId) }
          : g,
      ),
    }));
  };

  const updateUTPoint = (groupId, pointId, field, value) => {
    setReportData((prev) => ({
      ...prev,
      utm: prev.utm.map((g) =>
        g.id === groupId
          ? {
              ...g,
              points: g.points.map((p) =>
                p.id === pointId ? { ...p, [field]: value } : p,
              ),
            }
          : g,
      ),
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const resolvedProjectId = projectDocId || reportData?.general?.projectId;
      if (!resolvedProjectId) {
        throw new Error("Project reference missing.");
      }

      const payload = {
        ...reportData,
        reportId: resolvedProjectId,
        status: reportData.status || "Draft",
        signoff: {
          ...reportData.signoff,
          inspector: reportData.signoff.inspector || user?.displayName || "",
        },
        timestamp: serverTimestamp(),
      };
      await setDoc(
        doc(db, "projects", resolvedProjectId),
        {
          report: payload,
          status: payload.status,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      toast.success("Integrity Check report saved.");
    } catch (error) {
      toast.error(`Error saving report: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendForConfirmation = async () => {
    setIsSaving(true);
    try {
      const resolvedProjectId = projectDocId || reportData?.general?.projectId;
      if (!resolvedProjectId) {
        throw new Error("Project reference missing.");
      }

      const payload = {
        ...reportData,
        reportId: resolvedProjectId,
        status: "Pending Confirmation",
        signoff: {
          ...reportData.signoff,
          inspector: reportData.signoff.inspector || user?.displayName || "",
        },
        timestamp: serverTimestamp(),
      };
      await setDoc(
        doc(db, "projects", resolvedProjectId),
        {
          report: payload,
          status: payload.status,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      setReportData((prev) => ({ ...prev, status: "Pending Confirmation" }));
      toast.success("Report sent for confirmation.");
    } catch (error) {
      toast.error(`Error sending for confirmation: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (reportMode) {
    return (
      <IntegrityWebView
        reportData={reportData}
        onBack={() => setReportMode(false)}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-4 sm:p-6 lg:p-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-5xl mx-auto">
            <header className="flex justify-between items-center mb-8 bg-slate-900/40 p-6 rounded-3xl border border-slate-800">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 bg-slate-950 border border-slate-800 rounded-lg hover:text-orange-500 transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <h1 className="text-2xl font-bold uppercase tracking-tighter flex items-center gap-2">
                  <ShieldCheck className="text-orange-500" /> Integrity Check
                </h1>
              </div>
              <div className="flex items-center gap-3">
                {canSendForConfirmation &&
                  reportData.status !== "Pending Confirmation" && (
                  <button
                    onClick={handleSendForConfirmation}
                    disabled={isSaving}
                    className="bg-orange-600 px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-white hover:bg-orange-700 transition-colors disabled:opacity-60"
                  >
                    {reportData.status === "Returned for correction"
                      ? "Resend"
                      : user?.role === "Inspector"
                        ? "Send For Confirmation"
                        : "ADD CHANGES"}
                  </button>
                )}
                <button
                  onClick={() => setReportMode(true)}
                  className="bg-slate-800 px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-white hover:bg-slate-700 transition-colors"
                >
                  Preview Web Report
                </button>
              </div>
            </header>

            <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 backdrop-blur-md space-y-8">
              <section className="space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
                  General Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  <InputField
                    label="Client"
                    value={reportData.general.client}
                    onChange={(v) => handleChange("general", "client", v)}
                    required
                  />
                  <InputField
                    label="Platform/Location"
                    value={reportData.general.platform}
                    onChange={(v) => handleChange("general", "platform", v)}
                    required
                  />
                  <InputField
                    label="Equipment"
                    value={reportData.general.equipment}
                    onChange={(v) => handleChange("general", "equipment", v)}
                    required
                  />
                  <InputField
                    label="Tag Number"
                    value={reportData.general.tag}
                    onChange={(v) => handleChange("general", "tag", v)}
                    required
                  />
                  <InputField
                    label="Report Number"
                    value={reportData.general.reportNum}
                    onChange={(v) => handleChange("general", "reportNum", v)}
                    required
                  />
                  <InputField
                    label="Inspection Date"
                    type="date"
                    value={reportData.general.date}
                    onChange={(v) => handleChange("general", "date", v)}
                    required
                  />
                </div>
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Upload SCHEMATIC DIAGRAM FOR ITEM IDENTIFICATION
                  </label>
                  <div className="mt-3 flex items-center gap-3">
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white hover:border-orange-500 transition-colors cursor-pointer">
                      <Camera size={14} /> Upload
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            handleChange(
                              "general",
                              "diagramImage",
                              reader.result,
                            );
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                    {reportData.general.diagramImage && (
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                        Diagram attached
                      </span>
                    )}
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
                  Integrity Assessment
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputField
                    label="Scope of Inspection"
                    value={reportData.inspection.scope}
                    onChange={(v) => handleChange("inspection", "scope", v)}
                    required
                  />
                  <InputField
                    label="Method / Technique"
                    value={reportData.inspection.method}
                    onChange={(v) => handleChange("inspection", "method", v)}
                    required
                  />
                </div>
                <TextArea
                  label="Findings Summary"
                  value={reportData.inspection.findings}
                  onChange={(v) => handleChange("inspection", "findings", v)}
                  required
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <TextArea
                    label="Corrosion/Degradation"
                    value={reportData.inspection.corrosion}
                    onChange={(v) => handleChange("inspection", "corrosion", v)}
                    required
                  />
                  <TextArea
                    label="Defects/Anomalies"
                    value={reportData.inspection.defects}
                    onChange={(v) => handleChange("inspection", "defects", v)}
                    required
                  />
                </div>
                <TextArea
                  label="Recommendations"
                  value={reportData.inspection.recommendations}
                  onChange={(v) =>
                    handleChange("inspection", "recommendations", v)
                  }
                  required
                />
                <TextArea
                  label="Conclusion / Integrity Status"
                  value={reportData.inspection.conclusion}
                  onChange={(v) => handleChange("inspection", "conclusion", v)}
                  required
                />
              </section>

              <section className="space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
                  Observations
                </h2>
                <div className="space-y-4">
                  {reportData.observations.map((obs, idx) => (
                    <div
                      key={obs.id}
                      className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          Observation {idx + 1}
                        </p>
                        {reportData.observations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeObservation(obs.id)}
                            className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <InputField
                        label="Title"
                        value={obs.title}
                        onChange={(v) => updateObservation(obs.id, "title", v)}
                        required
                      />
                      <TextArea
                        label="Description"
                        value={obs.description}
                        onChange={(v) =>
                          updateObservation(obs.id, "description", v)
                        }
                        required
                      />
                      <div className="flex items-center gap-3">
                        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white hover:border-orange-500 transition-colors cursor-pointer">
                          <Camera size={14} /> Add observations from the form
                          input side
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () => {
                                updateObservation(
                                  obs.id,
                                  "photo",
                                  reader.result,
                                );
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                        {obs.photo && (
                          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                            Photo attached
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addObservation}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white hover:border-orange-500 transition-colors"
                >
                  Add Observation
                </button>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
                    UTM Readings
                  </h2>
                  <button
                    type="button"
                    onClick={addTieInGroup}
                    className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-300 hover:text-white hover:border-orange-500 transition-colors"
                  >
                    Add Tie-In Group
                  </button>
                </div>
                <div className="space-y-6">
                  {reportData.utm.map((group) => (
                    <div
                      key={group.id}
                      className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          Tie-In {group.tieIn}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => addUTPoint(group.id)}
                            className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-300 hover:text-white hover:border-orange-500 transition-colors"
                          >
                            Add Point
                          </button>
                          {reportData.utm.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTieInGroup(group.id)}
                              className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300"
                            >
                              Remove Group
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="hidden md:grid grid-cols-[60px_1fr_1fr_1fr_2fr_auto] gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          <div className="text-center">Point</div>
                          <div>Nominal (mm)</div>
                          <div>Add (mm)</div>
                          <div>Min (mm)</div>
                          <div>Observation</div>
                          <div />
                        </div>
                        {group.points.map((point) => (
                          <div
                            key={point.id}
                            className="grid grid-cols-1 md:grid-cols-[60px_1fr_1fr_1fr_2fr_auto] gap-3 items-start"
                          >
                            <div className="text-xs font-bold text-slate-400 text-center">
                              {point.point}
                            </div>
                            <InlineField
                              placeholder="Nominal (mm)"
                              value={point.nominal}
                              onChange={(v) =>
                                updateUTPoint(group.id, point.id, "nominal", v)
                              }
                            />
                            <InlineField
                              placeholder="Add (mm)"
                              value={point.add}
                              onChange={(v) =>
                                updateUTPoint(group.id, point.id, "add", v)
                              }
                            />
                            <InlineField
                              placeholder="Min (mm)"
                              value={point.min}
                              onChange={(v) =>
                                updateUTPoint(group.id, point.id, "min", v)
                              }
                            />
                            <InlineField
                              placeholder="Observation"
                              value={point.observation}
                              onChange={(v) =>
                                updateUTPoint(
                                  group.id,
                                  point.id,
                                  "observation",
                                  v,
                                )
                              }
                            />
                            {group.points.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeUTPoint(group.id, point.id)}
                                className="px-2 py-2 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
                  Sign-Off
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputField
                    label="Inspector"
                    value={reportData.signoff.inspector}
                    onChange={(v) => handleChange("signoff", "inspector", v)}
                    required
                  />
                  <InputField
                    label="Reviewer"
                    value={reportData.signoff.reviewer}
                    onChange={(v) => handleChange("signoff", "reviewer", v)}
                    required
                  />
                </div>
              </section>
            </div>
            {canSaveReport && (
              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-orange-600 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-orange-700 shadow-lg disabled:opacity-50"
                >
                  <Save size={14} /> {isSaving ? "Saving..." : "Save Report"}
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

const InputField = ({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}) => (
  <div className="flex flex-col gap-2">
    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white focus:border-orange-500 outline-none transition-all"
    />
  </div>
);

const InlineField = ({ value, onChange, placeholder, type = "text" }) => (
  <input
    type={type}
    value={value}
    placeholder={placeholder}
    aria-label={placeholder}
    onChange={(e) => onChange(e.target.value)}
    className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-white focus:border-orange-500 outline-none transition-all"
  />
);

const TextArea = ({ label, value, onChange, required = false }) => (
  <div className="flex flex-col gap-2">
    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
      {label}
    </label>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={4}
      required={required}
      className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white focus:border-orange-500 outline-none transition-all resize-none"
    />
  </div>
);

export const IntegrityWebView = ({ reportData, onBack, hideControls = false }) => {
  const reportNumber = reportData?.general?.reportNum || "N/A";
  const allPhotos = (reportData?.observations || []).filter((o) => o.photo);
  const photosPerPage = 6;
  const photoPages = Math.max(1, Math.ceil(allPhotos.length / photosPerPage));
  const photoChunks = Array.from({ length: photoPages }, (_, idx) =>
    allPhotos.slice(idx * photosPerPage, (idx + 1) * photosPerPage),
  );
  const firstPhotoChunk = photoChunks[0] || [];
  const remainingPhotoChunks = photoChunks.slice(1);
  const secondPhotoChunk = remainingPhotoChunks[0] || [];
  const extraPhotoChunks = remainingPhotoChunks.slice(1);
  const needsPhotoFillerPage = remainingPhotoChunks.length === 0;
  const totalPages = 10;
  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-8 pb-20 print:p-0 print:bg-white">
      <style>{`
        @media print {
          .report-page {
            break-after: page;
            page-break-after: always;
          }
          .report-page:last-child {
            break-after: auto;
            page-break-after: auto;
          }
          .allow-split {
            break-inside: auto;
            page-break-inside: auto;
          }
          .split-block {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .repeat-footer {
            display: block;
            position: fixed;
            left: 20mm;
            right: 20mm;
            bottom: 12mm;
          }
        }
        .repeat-footer {
          display: none;
        }
      `}</style>
      {!hideControls && (
        <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={18} /> Back
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => window.print()}
              className="bg-slate-800 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 border border-slate-700"
            >
              <Printer size={16} /> Print
            </button>
            <button
              onClick={() => window.print()}
              className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-900/20"
            >
              <FileDown size={16} /> Save as PDF
            </button>
          </div>
        </div>
      )}

      <div className="max-w-[210mm] w-full mx-auto space-y-0 px-2 sm:px-0">
        <div className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-blue-100/70 blur-2xl" />
            <div className="absolute top-20 -right-20 h-64 w-64 rounded-full bg-cyan-100/70 blur-2xl" />
            <div className="absolute bottom-16 left-1/3 h-72 w-72 rounded-full bg-indigo-100/60 blur-2xl" />
          </div>

          <div className="relative flex items-center justify-between px-12 py-6 border-b border-slate-200/80 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/30" />
              <div className="text-blue-900 font-black text-xl tracking-wide">
                INSPECTPRO
              </div>
            </div>
          </div>

          <div className="relative flex-1 flex flex-col items-center justify-center text-center px-10">
            <div className="mb-6 text-[11px] font-black uppercase tracking-[0.4em] text-slate-500">
              Technical Inspection Report
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-blue-700 tracking-tight drop-shadow-sm">
              Integrity Check
            </h1>
            <h2 className="mt-3 text-4xl md:text-5xl font-extrabold text-blue-600 tracking-tight">
              Report
            </h2>
            <div className="mt-8 h-1 w-40 rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-indigo-500" />
            <div className="mt-10 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600">
              {reportData?.general?.platform || "Facility Name"}
            </div>
          </div>

          <div className="relative px-12 pb-10 flex items-end justify-between text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            <div>{reportData?.general?.client || "Client"}</div>
            <div>{reportData?.general?.reportNum || "Report No."}</div>
          </div>
        </div>

        <div className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute -top-24 -left-20 h-64 w-64 rounded-full bg-blue-100/70 blur-2xl" />
            <div className="absolute top-24 -right-20 h-72 w-72 rounded-full bg-cyan-100/70 blur-2xl" />
            <div className="absolute bottom-16 left-1/3 h-64 w-64 rounded-full bg-indigo-100/60 blur-2xl" />
          </div>

          <div className="relative flex items-center justify-between px-12 py-6 border-b border-slate-200/80 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/30" />
              <div className="text-blue-900 font-black text-xl tracking-wide">
                INSPECTPRO
              </div>
            </div>
            {reportData.general.clientLogo ? (
              <img
                src={reportData.general.clientLogo}
                alt="Client"
                className="h-12 w-auto object-contain"
              />
            ) : (
              <div className="h-10 w-24 rounded-lg bg-slate-200/70" />
            )}
          </div>

          <div className="relative flex-1 flex flex-col items-center text-center px-12 pt-16 gap-8">
            <div className="space-y-2">
              <p className="text-3xl md:text-4xl font-extrabold text-red-600 underline uppercase tracking-wide">
                {reportData?.general?.platform || "Facility Name"}
              </p>
              <div className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-500">
                Integrity Inspection
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-3xl px-8 py-6 shadow-xl shadow-blue-200/40">
              <p className="text-lg font-bold uppercase tracking-wide text-slate-900">
                Integrity Checks for {reportData?.general?.equipment || "Asset"}
              </p>
              <p className="text-[10px] italic text-slate-500 mt-2">
                {reportData?.general?.reportNum || "Report Number"}
              </p>
              <div className="mt-6 text-sm font-bold uppercase tracking-wider text-slate-700">
                Inspection Report
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-1">
                On
              </div>
              <div className="mt-6 text-sm font-bold uppercase tracking-wide text-slate-800">
                Project Name
              </div>
            </div>

            <div className="text-sm font-semibold uppercase tracking-wide text-slate-600">
              {reportData?.general?.Date ||
                reportData?.general?.date ||
                "Inspection Date"}
            </div>
          </div>

          <div className="relative mt-auto px-12 pb-8">
            <div className="pt-6 border-t-2 border-slate-900/80 text-center">
              <p className="text-[10px] font-black text-red-600 tracking-[0.4em]">
                Original Document
              </p>
            </div>
            <div className="pt-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">
              Page 2 of {totalPages}
            </div>
          </div>
        </div>

        <div className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute -top-20 -right-16 h-64 w-64 rounded-full bg-cyan-100/60 blur-2xl" />
            <div className="absolute bottom-16 -left-20 h-72 w-72 rounded-full bg-blue-100/60 blur-2xl" />
          </div>

          <div className="relative flex items-center justify-between px-12 py-6 border-b border-slate-200/80 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/30" />
              <div className="text-blue-900 font-black text-xl tracking-wide">
                INSPECTPRO
              </div>
            </div>
            {reportData.general.clientLogo ? (
              <img
                src={reportData.general.clientLogo}
                alt="Client"
                className="h-12 w-auto object-contain"
              />
            ) : (
              <div className="h-10 w-24 rounded-lg bg-slate-200/70" />
            )}
          </div>

          <div className="relative flex-1 flex flex-col px-12 pt-10 gap-8">
            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-slate-500">
              Section 00
            </h3>
            <div className="flex items-center gap-3">
              <ShieldCheck size={18} className="text-orange-600" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                Overview
              </h2>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-xl shadow-blue-200/40 overflow-hidden">
              <div className="grid grid-cols-2 border-b border-slate-200 text-[10px]">
                <div className="border-r border-slate-200 p-3">
                  <div className="font-bold uppercase text-slate-500">
                    Client
                  </div>
                  <div className="font-bold text-slate-800">
                    {reportData?.general?.client || "N/A"}
                  </div>
                </div>
                <div className="p-3 space-y-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="font-bold uppercase text-slate-500">
                      Report Number
                    </div>
                    <div className="font-bold">
                      {reportData?.general?.reportNum || "N/A"}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="font-bold uppercase text-slate-500">
                      Contract Number
                    </div>
                    <div className="font-bold">
                      {reportData?.general?.contract || "N/A"}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="font-bold uppercase text-slate-500">
                      Date of Inspection
                    </div>
                    <div className="font-bold">
                      {reportData?.general?.date || "N/A"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 border-b border-slate-200 text-[10px]">
                <div className="border-r border-slate-200 p-3">
                  <div className="font-bold uppercase text-slate-500">
                    Location
                  </div>
                  <div className="font-bold text-slate-800">
                    {reportData?.general?.platform || "N/A"}
                  </div>
                </div>
                <div className="p-3">
                  <div className="font-bold uppercase text-slate-500">
                    Inspection Coordinator
                  </div>
                  <div className="font-bold">
                    {reportData?.general?.coordinator || "N/A"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 border-b border-slate-200 text-[10px]">
                <div className="border-r border-slate-200 p-3">
                  <div className="font-bold uppercase text-slate-500">
                    P & ID Number / DWG No.
                  </div>
                  <div className="font-bold">
                    {reportData?.general?.pidNumber || "N/A"}
                  </div>
                </div>
                <div className="p-3">
                  <div className="font-bold uppercase text-slate-500">
                    Operating Procedure
                  </div>
                  <div className="font-bold">
                    {reportData?.general?.procedure || "N/A"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 text-[10px]">
                <div className="border-r border-slate-200 p-3">
                  <div className="font-bold uppercase text-slate-500">
                    Test Code
                  </div>
                  <div className="text-red-600 font-black">
                    {reportData?.general?.testCode || "N/A"}
                  </div>
                </div>
                <div className="p-3">
                  <div className="font-bold uppercase text-slate-500">
                    Acceptance Criteria
                  </div>
                  <div className="font-bold">
                    {reportData?.general?.criteria || "N/A"}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-xl shadow-blue-200/40 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-200">
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 text-center">
                  Table of Contents
                </p>
              </div>
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="border-r border-slate-200 p-2 w-12">S/N</th>
                    <th className="border-r border-slate-200 p-2">
                      Description
                    </th>
                    <th className="p-2 w-20">Page No.</th>
                  </tr>
                </thead>
                <tbody className="text-slate-800">
                  {[
                    { sn: "1.0", desc: "Introduction", page: "3" },
                    {
                      sn: "2.0",
                      desc: "Schematic Diagram for Item Identification",
                      page: "3",
                    },
                    { sn: "3.0", desc: "Summary of Findings", page: "4-5" },
                    {
                      sn: "4.0",
                      desc: "Inspection Finding Overview",
                      page: "5",
                    },
                    { sn: "5.0", desc: "Photographic Detail", page: "6-7" },
                    {
                      sn: "6.0",
                      desc: "UTM Readings and Observation",
                      page: "8-9",
                    },
                    {
                      sn: "7.0",
                      desc: "UT Equipment Calibration Certificate",
                      page: "10",
                    },
                    { sn: "8.0", desc: "Operators Certificate", page: "11" },
                  ].map((row, idx) => (
                    <tr
                      key={row.sn}
                      className={idx % 2 === 0 ? "bg-slate-50/70" : "bg-white"}
                    >
                      <td className="border-r border-slate-200 p-2 text-center font-bold">
                        {row.sn}
                      </td>
                      <td className="border-r border-slate-200 p-2 font-bold uppercase text-center">
                        {row.desc}
                      </td>
                      <td className="p-2 text-center font-bold">{row.page}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="relative mt-auto px-12 pb-8">
            <div className="pt-6 border-t-2 border-slate-900/80 text-center">
              <p className="text-[10px] font-black text-red-600 tracking-[0.4em]">
                Original Document
              </p>
            </div>
            <div className="pt-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">
              Page 3 of {totalPages}
            </div>
          </div>
        </div>

        <div className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute -top-20 -left-16 h-64 w-64 rounded-full bg-blue-100/60 blur-2xl" />
            <div className="absolute bottom-20 -right-20 h-72 w-72 rounded-full bg-cyan-100/60 blur-2xl" />
          </div>

          <div className="relative flex items-center justify-between px-12 py-6 border-b border-slate-200/80 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/30" />
              <div className="text-blue-900 font-black text-xl tracking-wide">
                INSPECTPRO
              </div>
            </div>
            {reportData.general.clientLogo ? (
              <img
                src={reportData.general.clientLogo}
                alt="Client"
                className="h-12 w-auto object-contain"
              />
            ) : (
              <div className="h-10 w-24 rounded-lg bg-slate-200/70" />
            )}
          </div>

          <div className="relative flex-1 flex flex-col px-12 pt-10 gap-8">
            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-slate-500">
              Section 01
            </h3>
            <div className="text-sm font-black uppercase tracking-wide text-slate-900">
              1.0 Introduction
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              As requested by {reportData?.general?.client || "the Client"}, the
              inspection team carried out General Visual Inspection (GVI) and
              Ultrasonic Thickness Measurements (UTM) on the
              {reportData?.general?.equipment || "asset"} at{" "}
              {reportData?.general?.platform || "the facility"}.
            </p>

            <div className="text-sm font-black uppercase tracking-wide text-slate-900">
              2.0 Diagram
            </div>
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-3xl shadow-xl shadow-blue-200/40 overflow-hidden p-6">
              {reportData?.general?.diagramImage ? (
                <img
                  src={reportData.general.diagramImage}
                  alt="Schematic Diagram for Item Identification"
                  className="w-full object-contain max-h-[520px] mx-auto"
                />
              ) : (
                <div className="h-[420px] border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-[0.3em] text-center px-6">
                  Upload SCHEMATIC DIAGRAM FOR ITEM IDENTIFICATION
                </div>
              )}
            </div>
          </div>

          <div className="relative mt-auto px-12 pb-8">
            <div className="pt-6 border-t-2 border-slate-900/80 text-center">
              <p className="text-[10px] font-black text-red-600 tracking-[0.4em]">
                Original Document
              </p>
            </div>
            <div className="pt-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">
              Page 4 of {totalPages}
            </div>
          </div>
        </div>

        <div className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute -top-24 -right-16 h-64 w-64 rounded-full bg-cyan-100/60 blur-2xl" />
            <div className="absolute bottom-12 -left-20 h-72 w-72 rounded-full bg-blue-100/60 blur-2xl" />
          </div>

          <div className="relative flex items-center justify-between px-12 py-6 border-b border-slate-200/80 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/30" />
              <div className="text-blue-900 font-black text-xl tracking-wide">
                INSPECTPRO
              </div>
            </div>
            {reportData.general.clientLogo ? (
              <img
                src={reportData.general.clientLogo}
                alt="Client"
                className="h-12 w-auto object-contain"
              />
            ) : (
              <div className="h-10 w-24 rounded-lg bg-slate-200/70" />
            )}
          </div>

          <div className="relative flex-1 flex flex-col px-12 pt-10 gap-8">
            <div className="text-center space-y-2">
              <div className="text-sm font-black uppercase tracking-wide text-slate-900">
                3.0 Summary of Inspection Findings (Access 1)
              </div>
              <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em]">
                Visual & UTM Observations
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-xl shadow-blue-200/40 p-6">
              {reportData?.observations?.length ? (
                <ol className="space-y-5 text-[11px] leading-relaxed text-slate-700">
                  {reportData.observations.map((item, idx) => (
                    <li
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-white/70 p-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4 items-start">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="text-red-600 font-black">
                            {idx + 1}.
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-red-600 uppercase">
                              {item.title || "Observation"}
                            </div>
                            {item.description && (
                              <p className="mt-1 text-slate-700 break-words">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="text-xs text-slate-500 font-bold uppercase tracking-[0.3em] text-center">
                  No observations added
                </div>
              )}
            </div>
          </div>

          <div className="relative mt-auto px-12 pb-8">
            <div className="pt-6 border-t-2 border-slate-900/80 text-center">
              <p className="text-[10px] font-black text-red-600 tracking-[0.4em]">
                Original Document
              </p>
            </div>
            <div className="pt-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">
              Page 5 of {totalPages}
            </div>
          </div>
        </div>

        <div className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute -top-24 -left-16 h-64 w-64 rounded-full bg-blue-100/60 blur-2xl" />
            <div className="absolute bottom-12 -right-20 h-72 w-72 rounded-full bg-cyan-100/60 blur-2xl" />
          </div>

          <div className="relative flex items-center justify-between px-12 py-6 border-b border-slate-200/80 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/30" />
              <div className="text-blue-900 font-black text-xl tracking-wide">
                INSPECTPRO
              </div>
            </div>
            {reportData.general.clientLogo ? (
              <img
                src={reportData.general.clientLogo}
                alt="Client"
                className="h-12 w-auto object-contain"
              />
            ) : (
              <div className="h-10 w-24 rounded-lg bg-slate-200/70" />
            )}
          </div>

          <div className="relative flex-1 flex flex-col px-12 pt-10 gap-8">
            <div className="text-center space-y-2">
              <div className="text-sm font-black uppercase tracking-wide text-slate-900">
                5.0 Photographic Details
              </div>
              <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em]">
                Evidence Gallery
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-xl shadow-blue-200/40 p-6">
              {firstPhotoChunk.length ? (
                <div className="grid grid-cols-2 gap-4">
                  {firstPhotoChunk.map((o, idx) => (
                    <div key={o.id || idx} className="space-y-2">
                      <div className="border border-slate-200 rounded-2xl bg-white p-2 flex items-center justify-center">
                        <img
                          src={o.photo}
                          alt={o.title || `Evidence ${idx + 1}`}
                          className="h-[180px] w-auto object-contain"
                        />
                      </div>
                      <div className="text-[10px] text-slate-700 text-center font-semibold">
                        {o.title || `Evidence ${idx + 1}`}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[360px] border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-[0.3em] text-center px-6">
                  No photographic evidence uploaded
                </div>
              )}
            </div>
          </div>

          <div className="relative mt-auto px-12 pb-8">
            <div className="pt-6 border-t-2 border-slate-900/80 text-center">
              <p className="text-[10px] font-black text-red-600 tracking-[0.4em]">
                Original Document
              </p>
            </div>
            <div className="pt-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">
              Page 6 of {totalPages}
            </div>
          </div>
        </div>

        <div className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute -top-24 -left-16 h-64 w-64 rounded-full bg-blue-100/60 blur-2xl" />
            <div className="absolute bottom-12 -right-20 h-72 w-72 rounded-full bg-cyan-100/60 blur-2xl" />
          </div>

          <div className="relative flex items-center justify-between px-12 py-6 border-b border-slate-200/80 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/30" />
              <div className="text-blue-900 font-black text-xl tracking-wide">
                INSPECTPRO
              </div>
            </div>
            {reportData.general.clientLogo ? (
              <img
                src={reportData.general.clientLogo}
                alt="Client"
                className="h-12 w-auto object-contain"
              />
            ) : (
              <div className="h-10 w-24 rounded-lg bg-slate-200/70" />
            )}
          </div>

          <div className="relative flex-1 flex flex-col px-12 pt-10 gap-8">
            <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-xl shadow-blue-200/40 p-6">
              <div className="text-center space-y-1 mb-4">
                <div className="text-sm font-black uppercase tracking-wide text-slate-900">
                  6.0 UTM Readings and Observation
                </div>
                <p className="text-[9px] text-slate-500 uppercase tracking-[0.3em]">
                  Ultrasonic Thickness Measurement Parameters
                </p>
              </div>

              <div className="text-[9px] border border-slate-900">
                <div className="border-b border-slate-900 text-center font-bold uppercase py-1">
                  Waterflood Module Deck Extension (Level 1) Modification Tie-In UT Points
                </div>
                <div className="grid grid-cols-2 border-b border-slate-900">
                  <div className="border-r border-slate-900 p-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="font-bold uppercase">Structure Material</div>
                      <div>{reportData?.general?.material || "Carbon Steel"}</div>
                      <div className="font-bold uppercase">UT Equipment</div>
                      <div>{reportData?.general?.utEquipment || "SUII SMARTOR"}</div>
                      <div className="font-bold uppercase">Equipment Serial No.</div>
                      <div>{reportData?.general?.utSerial || "M033223205600"}</div>
                      <div className="font-bold uppercase">UT Probe: Dia / MHz / Type</div>
                      <div>{reportData?.general?.utProbe || "10mm / 5MHz / Dual"}</div>
                      <div className="font-bold uppercase">Test Temperature</div>
                      <div>{reportData?.general?.testTemp || "Ambient"}</div>
                    </div>
                  </div>
                  <div className="p-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="font-bold uppercase">Material Size</div>
                      <div>{reportData?.general?.materialSize || "VARIOUS"}</div>
                      <div className="font-bold uppercase">Calibration Date</div>
                      <div>{reportData?.general?.calibrationDate || "23 JULY 2025"}</div>
                      <div className="font-bold uppercase">Couplant Used</div>
                      <div>{reportData?.general?.couplant || "Poly gel"}</div>
                      <div className="font-bold uppercase">Inspected By</div>
                      <div>{reportData?.general?.inspectBy || reportData?.general?.client || "Inspector"}</div>
                      <div className="font-bold uppercase">Date</div>
                      <div>{reportData?.general?.date || "09/11/2025"}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2">
                  <table className="w-full border-collapse text-[9px]">
                    <thead>
                      <tr className="border-b border-slate-900">
                        <th className="border-r border-slate-900 p-1 uppercase">Tie-In</th>
                        <th className="border-r border-slate-900 p-1 uppercase">UT Point</th>
                        <th className="border-r border-slate-900 p-1 uppercase">Nom (mm)</th>
                        <th className="border-r border-slate-900 p-1 uppercase">Add (mm)</th>
                        <th className="border-r border-slate-900 p-1 uppercase">Min (mm)</th>
                        <th className="p-1 uppercase">Observation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reportData.utm || [])
                        .filter((g) => g.tieIn === "A1" || g.tieIn === "A2")
                        .flatMap((g) =>
                          g.points.map((p, idx) => (
                            <tr key={p.id} className="border-b border-slate-900">
                              <td className="border-r border-slate-900 p-1 text-center">{idx === 0 ? g.tieIn : ""}</td>
                              <td className="border-r border-slate-900 p-1 text-center">{p.point}</td>
                              <td className="border-r border-slate-900 p-1 text-center">{p.nominal || "N/A"}</td>
                              <td className="border-r border-slate-900 p-1 text-center">{p.add || ""}</td>
                              <td className="border-r border-slate-900 p-1 text-center">{p.min || ""}</td>
                              <td className="p-1">{p.observation || ""}</td>
                            </tr>
                          )),
                        )}
                    </tbody>
                  </table>
                  <table className="w-full border-collapse text-[9px] border-l border-slate-900">
                    <thead>
                      <tr className="border-b border-slate-900">
                        <th className="border-r border-slate-900 p-1 uppercase">Tie-In</th>
                        <th className="border-r border-slate-900 p-1 uppercase">UT Point</th>
                        <th className="border-r border-slate-900 p-1 uppercase">Nom (mm)</th>
                        <th className="border-r border-slate-900 p-1 uppercase">Add (mm)</th>
                        <th className="border-r border-slate-900 p-1 uppercase">Min (mm)</th>
                        <th className="p-1 uppercase">Observation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reportData.utm || [])
                        .filter((g) => g.tieIn === "B1" || g.tieIn === "B2")
                        .flatMap((g) =>
                          g.points.map((p, idx) => (
                            <tr key={p.id} className="border-b border-slate-900">
                              <td className="border-r border-slate-900 p-1 text-center">{idx === 0 ? g.tieIn : ""}</td>
                              <td className="border-r border-slate-900 p-1 text-center">{p.point}</td>
                              <td className="border-r border-slate-900 p-1 text-center">{p.nominal || "N/A"}</td>
                              <td className="border-r border-slate-900 p-1 text-center">{p.add || ""}</td>
                              <td className="border-r border-slate-900 p-1 text-center">{p.min || ""}</td>
                              <td className="p-1">{p.observation || ""}</td>
                            </tr>
                          )),
                        )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="relative mt-auto px-12 pb-8">
            <div className="pt-6 border-t-2 border-slate-900/80 text-center">
              <p className="text-[10px] font-black text-red-600 tracking-[0.4em]">
                Original Document
              </p>
            </div>
            <div className="pt-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">
              Page 7 of {totalPages}
            </div>
          </div>
        </div>

        {!needsPhotoFillerPage && (
          <div className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-hidden">
            <div className="absolute inset-0">
              <div className="absolute -top-24 -left-16 h-64 w-64 rounded-full bg-blue-100/60 blur-2xl" />
              <div className="absolute bottom-12 -right-20 h-72 w-72 rounded-full bg-cyan-100/60 blur-2xl" />
            </div>

            <div className="relative flex items-center justify-between px-12 py-6 border-b border-slate-200/80 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/30" />
                <div className="text-blue-900 font-black text-xl tracking-wide">
                  INSPECTPRO
                </div>
              </div>
              {reportData.general.clientLogo ? (
                <img
                  src={reportData.general.clientLogo}
                  alt="Client"
                  className="h-12 w-auto object-contain"
                />
              ) : (
                <div className="h-10 w-24 rounded-lg bg-slate-200/70" />
              )}
            </div>

            <div className="relative flex-1 flex flex-col px-12 pt-10 gap-8">
              <div className="text-center space-y-2">
                <div className="text-sm font-black uppercase tracking-wide text-slate-900">
                  5.0 Photographic Details
                </div>
                <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em]">
                  Evidence Gallery
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-xl shadow-blue-200/40 p-6">
                {secondPhotoChunk.length ? (
                  <div className="grid grid-cols-2 gap-4">
                    {secondPhotoChunk.map((o, idx) => (
                      <div key={o.id || idx} className="space-y-2">
                        <div className="border border-slate-200 rounded-2xl bg-white p-2 flex items-center justify-center">
                          <img
                            src={o.photo}
                            alt={o.title || `Evidence ${idx + 1}`}
                            className="h-[180px] w-auto object-contain"
                          />
                        </div>
                        <div className="text-[10px] text-slate-700 text-center font-semibold">
                          {o.title || `Evidence ${idx + 1}`}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[360px] border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-[0.3em] text-center px-6">
                    No photographic evidence uploaded
                  </div>
                )}
              </div>
            </div>

            <div className="relative mt-auto px-12 pb-8">
              <div className="pt-6 border-t-2 border-slate-900/80 text-center">
                <p className="text-[10px] font-black text-red-600 tracking-[0.4em]">
                  Original Document
                </p>
              </div>
              <div className="pt-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">
                Page 8 of {totalPages}
              </div>
            </div>
          </div>
        )}

        {needsPhotoFillerPage && (
          <div className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-hidden">
            <div className="absolute inset-0">
              <div className="absolute -top-24 -left-16 h-64 w-64 rounded-full bg-blue-100/60 blur-2xl" />
              <div className="absolute bottom-12 -right-20 h-72 w-72 rounded-full bg-cyan-100/60 blur-2xl" />
            </div>

            <div className="relative flex items-center justify-between px-12 py-6 border-b border-slate-200/80 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/30" />
                <div className="text-blue-900 font-black text-xl tracking-wide">
                  INSPECTPRO
                </div>
              </div>
              {reportData.general.clientLogo ? (
                <img
                  src={reportData.general.clientLogo}
                  alt="Client"
                  className="h-12 w-auto object-contain"
                />
              ) : (
                <div className="h-10 w-24 rounded-lg bg-slate-200/70" />
              )}
            </div>

            <div className="relative flex-1 flex flex-col px-12 pt-10 gap-8">
              <div className="text-center space-y-2">
                <div className="text-sm font-black uppercase tracking-wide text-slate-900">
                  5.0 Photographic Details
                </div>
                <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em]">
                  Evidence Gallery
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-xl shadow-blue-200/40 p-6 flex-1 flex items-center justify-center">
                <div className="h-[360px] border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-[0.3em] text-center px-6">
                  No additional photographic evidence
                </div>
              </div>
            </div>

            <div className="relative mt-auto px-12 pb-8">
              <div className="pt-6 border-t-2 border-slate-900/80 text-center">
                <p className="text-[10px] font-black text-red-600 tracking-[0.4em]">
                  Original Document
                </p>
              </div>
              <div className="pt-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">
                Page 8 of {totalPages}
              </div>
            </div>
          </div>
        )}

        <div className="report-page allow-split bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-visible">
          <div className="absolute inset-0">
            <div className="absolute -top-24 -left-16 h-64 w-64 rounded-full bg-blue-100/60 blur-2xl" />
            <div className="absolute bottom-12 -right-20 h-72 w-72 rounded-full bg-cyan-100/60 blur-2xl" />
          </div>

          <div className="relative flex items-center justify-between px-12 py-6 border-b border-slate-200/80 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/30" />
              <div className="text-blue-900 font-black text-xl tracking-wide">
                INSPECTPRO
              </div>
            </div>
            {reportData.general.clientLogo ? (
              <img
                src={reportData.general.clientLogo}
                alt="Client"
                className="h-12 w-auto object-contain"
              />
            ) : (
              <div className="h-10 w-24 rounded-lg bg-slate-200/70" />
            )}
          </div>

          <div className="relative flex-1 flex flex-col px-12 pt-10 gap-8">
            <div className="text-center space-y-2">
              <div className="text-sm font-black uppercase tracking-wide text-slate-900">
                7.0 UT Equipment Calibration Certificate
              </div>
              <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em]">
                Calibration Document
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-xl shadow-blue-200/40 p-6 flex-1 flex items-center justify-center">
              {reportData?.general?.utCalibrationCert ? (
                <img
                  src={reportData.general.utCalibrationCert}
                  alt="UT Equipment Calibration Certificate"
                  className="max-h-[520px] w-auto object-contain"
                />
              ) : (
                <div className="h-[420px] w-full border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-[0.3em] text-center px-6 gap-3">
                  <Camera size={28} />
                  Upload UT Equipment Calibration Certificate
                </div>
              )}
            </div>
          </div>

          <div className="relative mt-auto px-12 pb-8">
            <div className="pt-6 border-t-2 border-slate-900/80 text-center">
              <p className="text-[10px] font-black text-red-600 tracking-[0.4em]">
                Original Document
              </p>
            </div>
            <div className="pt-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">
              Page 9 of {totalPages}
            </div>
          </div>
        </div>

        <div className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute -top-24 -left-16 h-64 w-64 rounded-full bg-blue-100/60 blur-2xl" />
            <div className="absolute bottom-12 -right-20 h-72 w-72 rounded-full bg-cyan-100/60 blur-2xl" />
          </div>

          <div className="relative flex items-center justify-between px-12 py-6 border-b border-slate-200/80 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/30" />
              <div className="text-blue-900 font-black text-xl tracking-wide">
                INSPECTPRO
              </div>
            </div>
            {reportData.general.clientLogo ? (
              <img
                src={reportData.general.clientLogo}
                alt="Client"
                className="h-12 w-auto object-contain"
              />
            ) : (
              <div className="h-10 w-24 rounded-lg bg-slate-200/70" />
            )}
          </div>

          <div className="relative flex-1 flex flex-col px-12 pt-10 gap-8">
            <div className="text-center space-y-2">
              <div className="text-sm font-black uppercase tracking-wide text-slate-900">
                Section 01: Integrity Assessment
              </div>
              <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em]">
                Inspection Summary
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-xl shadow-blue-200/40 p-6">
              <div className="space-y-6 text-xs text-slate-700 leading-relaxed">
                <SectionBlock
                  title="Scope of Inspection"
                  value={reportData?.inspection?.scope}
                />
                <SectionBlock
                  title="Method / Technique"
                  value={reportData?.inspection?.method}
                />
                <SectionBlock
                  title="Findings Summary"
                  value={reportData?.inspection?.findings}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <SectionBlock
                    title="Corrosion / Degradation"
                    value={reportData?.inspection?.corrosion}
                  />
                  <SectionBlock
                    title="Defects / Anomalies"
                    value={reportData?.inspection?.defects}
                  />
                </div>
                <SectionBlock
                  title="Recommendations"
                  value={reportData?.inspection?.recommendations}
                />
                <SectionBlock
                  title="Conclusion / Integrity Status"
                  value={reportData?.inspection?.conclusion}
                />
              </div>
            </div>

            <div className="mt-auto grid grid-cols-3 gap-8 pt-10 split-block">
              <SignatureBlock
                label="Inspector"
                name={reportData?.signoff?.inspector}
              />
              <SignatureBlock
                label="Reviewer"
                name={reportData?.signoff?.reviewer}
              />
              <SignatureBlock
                label="Admin"
                name={reportData?.signoff?.admin}
              />
            </div>
          </div>

          <div className="relative mt-auto px-12 pb-8">
            <div className="pt-6 border-t-2 border-slate-900/80 text-center">
              <p className="text-[10px] font-black text-red-600 tracking-[0.4em]">
                Original Document
              </p>
            </div>
            <div className="pt-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">
              Page 10 of {totalPages}
            </div>
          </div>

          <div className="repeat-footer">
            <div className="pt-6 border-t-2 border-slate-900/80 text-center">
              <p className="text-[10px] font-black text-red-600 tracking-[0.4em]">
                Original Document
              </p>
            </div>
            <div className="pt-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">
              Page 10 of {totalPages}
            </div>
          </div>
        </div>

        {extraPhotoChunks.map((chunk, pageIdx) => {
          return (
            <div
              key={`photo-page-extra-${pageIdx}`}
              className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-hidden"
            >
              <div className="absolute inset-0">
                <div className="absolute -top-24 -left-16 h-64 w-64 rounded-full bg-blue-100/60 blur-2xl" />
                <div className="absolute bottom-12 -right-20 h-72 w-72 rounded-full bg-cyan-100/60 blur-2xl" />
              </div>

              <div className="relative flex items-center justify-between px-12 py-6 border-b border-slate-200/80 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/30" />
                  <div className="text-blue-900 font-black text-xl tracking-wide">
                    INSPECTPRO
                  </div>
                </div>
                {reportData.general.clientLogo ? (
                  <img
                    src={reportData.general.clientLogo}
                    alt="Client"
                    className="h-12 w-auto object-contain"
                  />
                ) : (
                  <div className="h-10 w-24 rounded-lg bg-slate-200/70" />
                )}
              </div>

              <div className="relative flex-1 flex flex-col px-12 pt-10 gap-8">
                <div className="text-center space-y-2">
                  <div className="text-sm font-black uppercase tracking-wide text-slate-900">
                    5.0 Photographic Details
                  </div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em]">
                    Evidence Gallery
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-xl shadow-blue-200/40 p-6">
                  {chunk.length ? (
                    <div className="grid grid-cols-2 gap-4">
                      {chunk.map((o, idx) => (
                        <div key={o.id || idx} className="space-y-2">
                          <div className="border border-slate-200 rounded-2xl bg-white p-2 flex items-center justify-center">
                            <img
                              src={o.photo}
                              alt={o.title || `Evidence ${idx + 1}`}
                              className="h-[180px] w-auto object-contain"
                            />
                          </div>
                          <div className="text-[10px] text-slate-700 text-center font-semibold">
                            {o.title || `Evidence ${idx + 1}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-[360px] border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-[0.3em] text-center px-6">
                      No photographic evidence uploaded
                    </div>
                  )}
                </div>
              </div>

              <div className="relative mt-auto px-12 pb-8">
                <div className="pt-6 border-t-2 border-slate-900/80 text-center">
                  <p className="text-[10px] font-black text-red-600 tracking-[0.4em]">
                    Original Document
                  </p>
                </div>
                <div className="pt-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">
                  Page 8 (continued)
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SectionBlock = ({ title, value }) => (
  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 split-block">
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
      {title}
    </p>
    <p className="text-xs text-slate-800 whitespace-pre-wrap">
      {value || "N/A"}
    </p>
  </div>
);

const ReportRow = ({ label, value }) => (
  <div className="flex justify-between border-b border-slate-100 pb-1">
    <span className="font-black text-slate-400 uppercase text-[9px]">
      {label}
    </span>
    <span className="font-bold text-right uppercase">{value || "N/A"}</span>
  </div>
);

const SignatureBlock = ({ label, name }) => (
  <div className="space-y-4">
    <p className="text-[9px] font-black uppercase text-slate-400">{label}</p>
    <div className="border-b-2 border-slate-950 pb-1 font-serif italic text-lg text-slate-900">
      {name || " "}
    </div>
    
  </div>
);

export default IntegrityCheck;


