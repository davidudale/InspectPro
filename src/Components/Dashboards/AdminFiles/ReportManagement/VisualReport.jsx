import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { db } from "../../../Auth/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  getDocs,
  query,
  where,
  limit,
} from "firebase/firestore";

import {
  Eye,
  ChevronLeft,
  Save,
  XCircle,
  Printer,
  Zap,
  ClipboardCheck,
  Activity,
  ShieldCheck,
  Camera,
} from "lucide-react";
import AdminNavbar from "../../AdminNavbar";
import AdminSidebar from "../../AdminSidebar";
import { toast } from "react-toastify";
import { useAuth } from "../../../Auth/AuthContext";
import InspectorNavbar from "../../InspectorsFile/InspectorNavbar";
import InspectorSidebar from "../../InspectorsFile/InspectorSidebar";

// --- TECHNICAL SCHEMAS (Internal mapping updated with photoRef) ---
const INSPECTION_SCHEMAS = {
  "Pressure Vessel (V)": [
    {
      sn: "3.1.1",
      component:
        "Shell and Transition Cone (external surface, weld seams, deformation, coating condition)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.1.2",
      component:
        "Lower Head (corrosion, distortion, drains, welds and coating condition)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.1.3",
      component:
        "Upper Head (corrosion, nozzles interface, vents, welds and coating condition)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.1.4",
      component:
        "Process Nozzles, Manways and Reinforcement Pads (leakage signs, cracks, gasket seating and weld condition)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.1.5",
      component:
        "Flanges, Stud Bolts and Gaskets (bolt condition, alignment, leakage, corrosion and insulation damage)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.1.6",
      component:
        "Small Bore Connections and Branch Pipes (vibration damage, cracking, supports and leakage)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.1.7",
      component:
        "Platforms, Ladders, Handrails and Attachments (structural integrity, corrosion and fastening)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.1.8",
      component:
        "Lifting Lugs, Trunnions and Temporary Rigging Points (cracks, deformation and certification markings)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.1.9",
      component:
        "Support Skirt, Saddles or Legs (corrosion at interface, drainage, cracks and settlement indicators)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.1.10",
      component:
        "Anchor Bolts, Base Plates and Grouting (corrosion, looseness, missing nuts and grout cracking)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.1.11",
      component:
        "Thermal Insulation System and Cladding (damaged areas, moisture ingress, CUI risk and sealing)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.1.12",
      component:
        "General External Condition corrosion, dents, bulging, mechanical impact damage and hot spots",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.1.13",
      component:
        "Nameplate, Design Data Plate and Tag Markings (legibility, correctness and attachment)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.1.14",
      component:
        "Earthing / Bonding Connections to Vessel (continuity, corrosion and secure fastening)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.1.15",
      component:
        "Safety Relief Valves and Associated Piping (visual condition, supports, leakage and discharge routing)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
  ],
  "Atmospheric Storage Tank (T)": [
    {
      sn: "3.2.1",
      component: "Tank Shell Plates",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.2.2",
      component: "Tank Bottom and Annular Ring",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.2.3",
      component: "Tank Roof Plates",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.2.4",
      component: "Floating Roof / Pontoon (if applicable)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.2.5",
      component: "Roof Seals and Drain System",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.2.6",
      component: "Nozzles and Manways",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.2.7",
      component: "Shell to Bottom Welds",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.2.8",
      component: "Stairs, Walkways and Handrails",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.2.9",
      component: "Tank Foundation and Settlement",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.2.10",
      component: "External Corrosion and Coating Condition",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
  ],
  "Piping System (P)": [
    {
      sn: "3.3.1",
      component: "Pipe Runs and Routing",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.3.2",
      component: "Pipe Supports, Shoes and Guides",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.3.3",
      component: "Flanges and Bolting",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.3.4",
      component: "Expansion Joints / Bellows",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.3.5",
      component: "Valves and Actuators",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.3.6",
      component: "Small Bore Branch Connections",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.3.7",
      component: "Pipe Racks and Structural Steel",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.3.8",
      component: "Insulation and Weather Protection",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.3.9",
      component: "Leakage, Corrosion and Vibration",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
  ],
  "Centrifugal Pump (P)": [
    {
      sn: "3.4.1",
      component: "Pump Casing and Covers",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.4.2",
      component: "Suction and Discharge Nozzles",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.4.3",
      component: "Mechanical Seal / Packing Area",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.4.4",
      component: "Bearing Housing",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.4.5",
      component: "Coupling and Guard",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.4.6",
      component: "Baseplate and Foundation Bolts",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.4.7",
      component: "Lubrication System",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.4.8",
      component: "Vibration and Noise Condition",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
  ],
  Default: [
    {
      sn: "3.0.1",
      component: "General Body Condition",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.0.2",
      component: "Support Structure Integrity",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
  ],
};

const VisualReport = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();

  const [reportMode, setReportMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("logistics");
  const [existingReportId, setExistingReportId] = useState(null);

  const [reportData, setReportData] = useState({
    general: {
      platform: " ",
      equipment: "",
      tag: "",
      reportNum: "",
      date: new Date().toISOString().split("T")[0],
      client: "",
      clientLogo: "",
      testCode: "API 510",
      contractNum: "N/A",
      location: " ",
      inspect_by: "",
      projectId: "",
    },
    environmental: {
      lighting: "Natural",
      surface: "Cleaned",
      access: "Ground Level",
      temp: "Ambient",
    },
    observations: [],
    images: [],
  });

  useEffect(() => {
    const initializeManifest = async () => {
      if (location.state?.preFill) {
        const p = location.state.preFill;
        const assetCategory = p.equipmentCategory || p.assetType;
        const schema =
          INSPECTION_SCHEMAS[assetCategory] || INSPECTION_SCHEMAS["Default"];

        setReportData((prev) => ({
          ...prev,
          general: {
            ...prev.general,
            ...p,
            client: p.clientName || p.client || "",
            platform: p.locationName || p.location || "",
            tag: p.equipmentTag || p.tag || "",
            projectId: p.id || p.projectId || "",
          },
          observations: schema.map((item) => ({ ...item, photoRef: "" })),
        }));

        const pId = p.id || p.projectId;
        if (pId) {
          const q = query(
            collection(db, "inspection_reports"),
            where("general.projectId", "==", pId),
            limit(1),
          );
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const existingDoc = querySnapshot.docs[0];
            setExistingReportId(existingDoc.id);
            setReportData(existingDoc.data());
            // toast.info("Existing manifest loaded for modification.");
          }
        }
      }
    };
    initializeManifest();
  }, [location.state]);

  const handlePhotoUpload = async (e, idx) => {
    const file = e.target.files[0];
    if (!file) return;
    const cloudName = "dsgzpl0xt";
    const uploadPreset = "inspectpro";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    try {
      toast.info(
        `Uploading evidence for ${reportData.observations[idx].sn}...`,
      );
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        },
      );
      const d = await res.json();
      const newObs = [...reportData.observations];
      newObs[idx].photoRef = d.secure_url;
      setReportData({ ...reportData, observations: newObs });
      toast.success("Evidence linked to component");
    } catch (err) {
      toast.error("Upload failed");
    }
  };

  const handleSaveToFirebase = async (isFinalizing = false) => {
    setIsSaving(true);

    // 1. DYNAMIC WORKFLOW LOGIC
    let workflowStatus = "Forwarded to Inspector"; // Default for "Save Draft"

    if (isFinalizing) {
      // When Inspector submits, it skips "Review" and goes straight to "Pending Confirmation"
      if (isFinalizing && user?.role === "Inspector") {
        workflowStatus = "Pending Confirmation";
      }
      // When Supervisor submits, it moves to "Authorized"
      else if (user?.role === "Supervisor") {
        workflowStatus = "Completed";
      }
      // Admin or other roles move to "Completed"
      else if (user?.role === "Admin") {
        workflowStatus = "Completed";
      }
    } else {
      // If NOT finalizing (just saving draft), keep current status
      workflowStatus = reportData.status || "Forwarded to Inspector";
    }

    const currentUserIdentifier =
      user?.displayName || user?.name || user?.email || "Technical User";

    try {
      if (existingReportId) {
        // --- RESUBMISSION/UPDATE ---
        const reportRef = doc(db, "inspection_reports", existingReportId);
        await updateDoc(reportRef, {
          ...reportData,
          status: workflowStatus,
          lastModifiedBy: currentUserIdentifier,
          updatedAt: serverTimestamp(),
        });
      } else {
        // --- FIRST TIME SAVE ---
        const newDoc = await addDoc(collection(db, "inspection_reports"), {
          ...reportData,
          technique: "Visual (VT)",
          inspector: currentUserIdentifier,
          inspectorUid: user.uid,
          status: workflowStatus,
          roleAtSubmission: user?.role || "Inspector",
          timestamp: serverTimestamp(),
        });
        setExistingReportId(newDoc.id);
      }

      // 2. SYNC PROJECT MANIFEST
      if (reportData.general.projectId) {
        const projectRef = doc(db, "projects", reportData.general.projectId);

        // Final mapping for the Project collection
        let projectFinalStatus = workflowStatus;
        if (workflowStatus === "Authorized") {
          projectFinalStatus = "Completed";
        }
        await updateDoc(projectRef, {
          status: projectFinalStatus,
          lastModifiedBy: currentUserIdentifier,
          updatedAt: serverTimestamp(),
        });
      }

      toast.success(
        isFinalizing
          ? `Manifest sent for Confirmation ${user.role}`
          : "Technical draft synced",
      );
        
        
      if (isFinalizing)  setReportMode(true);
    } catch (error) {
      console.error("Technical Fault:", error);
      toast.error(`Sync Failure: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // --- SUB-COMPONENT: WEB REPORT VIEW (REMAINS AS PROVIDED) ---
  const WebView = () => {
    const totalPages = 4;
    const evidencePhotos = reportData.observations.filter(
      (obs) => obs.photoRef,
    );``

    const PageHeader = () => (
      <div className="grid grid-cols-[1fr_2fr_1fr] border-2 border-slate-900 mb-6 text-center items-center font-bold">
        <div className="border-r-2 border-slate-900 p-2 h-16 flex items-center justify-center bg-slate-50 uppercase text-[9px] text-black">
          <img
            src={reportData.general.clientLogo}
            className="w-[70px] h-full object-cover"
            alt="Technical Evidence"
          />
        </div>
        <div className="p-2 space-y-1 text-black">
          <div className="text-[10px] uppercase tracking-widest">
            {reportData.general.platform}
          </div>
          <div className="text-[11px] uppercase font-black">
            {reportData.general.equipment}: {reportData.general.tag}
          </div>
        </div>
        <div className="border-l-2 border-slate-900 p-2 text-[10px] text-blue-800 font-black uppercase tracking-widest">
          INSPECTPRO™
        </div>
      </div>
    );

    const PageFooter = ({ pageNum }) => (
      <div className="mt-auto border-t-2 border-slate-900 pt-2 flex justify-between text-[9px] font-bold uppercase text-black">
        <div>
          Ref: <span className="font-normal">{reportData.general.tag}</span>
        </div>
        <div>
          Page {pageNum} of {totalPages}
        </div>
      </div>
    );

    return (
      <div className="min-h-screen bg-slate-100 py-10 overflow-y-auto no-scrollbar font-sans text-black">
        <div className="fixed right-10 top-10 flex flex-col gap-4 no-print z-50">
          <button
            onClick={() => window.print()}
            className="bg-orange-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all"
          >
            <Printer size={24} />
          </button>
          <button
            onClick={() => setReportMode(false)}
            className="bg-slate-900 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all"
          >
            <XCircle size={24} />
          </button>
        </div>

        {/* PAGE 1: COVER */}
        <div
          className="max-w-[850px] mx-auto bg-white border border-slate-300 p-20 shadow-2xl mb-10 min-h-[1100px] flex flex-col print:m-0 break-after-page"
          style={{ breakAfter: "page" }}
        >
          <div className="flex justify-between items-center mb-20 uppercase font-black text-xl italic text-slate-900">
            <img
              src={reportData.general.clientLogo}
              className="w-[70px] h-full object-cover"
              alt="Technical Evidence"
            />
            <div className="text-blue-900">INSPECTPRO</div>
          </div>
          <div className="text-center flex-1">
            <h1 className="text-4xl font-serif font-bold underline mb-4 uppercase">
              {reportData.general.platform}
            </h1>
            <h2 className="text-2xl font-bold mb-10 uppercase tracking-widest text-slate-800">
              Visual Testing (VT) Report
            </h2>
            <div className="w-full aspect-video bg-slate-100 border-2 border-slate-900 mx-auto mb-10 flex items-center justify-center overflow-hidden shadow-inner">
              <Activity size={80} className="text-slate-200" />
            </div>
            <div className="space-y-4 text-left inline-block font-bold">
              <p className="text-sm uppercase">
                Report ID:{" "}
                <span className="font-normal">
                  {reportData.general.reportNum}
                </span>
              </p>
              <p className="text-sm uppercase">
                Asset Ref:{" "}
                <span className="font-normal">{reportData.general.tag}</span>
              </p>
              <p className="text-sm uppercase">
                Date:{" "}
                <span className="font-normal">{reportData.general.date}</span>
              </p>
            </div>
          </div>
          <div className="mt-auto border-t-4 border-slate-900 pt-6 text-center text-[10px] font-black text-red-600 tracking-[0.3em]">
            CONFIDENTIAL ENGINEERING DOCUMENT
          </div>
        </div>

        {/* PAGE 2: LOGISTICS [cite: 8, 9, 21] */}
        <div
          className="max-w-[850px] mx-auto bg-white border border-slate-300 p-12 shadow-2xl mb-10 min-h-[1100px] flex flex-col print:m-0 break-after-page"
          style={{ breakAfter: "page" }}
        >
          <PageHeader />
          <div className=" gap-px bg-slate-900 border-2 border-slate-900 text-[11px] mb-10">
            <div className="bg-slate-50 p-3 font-bold uppercase">
              <h3 className=" gap-px font-bold text-sm mb-7">INTRODUCTION</h3>
              <p className=" text-[12px] capitalize mb-7">
                At the request of{" "}
                <span className="text-red-500">
                  {reportData.general.client}
                </span>
                , Visual Testing (VT) Inspection was carried out on Equipment
                Name{" "}
                <span className="text-red-500"> {reportData.general.tag} </span>{" "}
                at
                <span className="text-red-500">
                  {reportData.general.platform}
                </span>
                platform of {reportData.general.tag} facilities.
              </p>
              <h3 className=" gap-px font-bold text-sm mb-3">
                Table of Content
              </h3>
              <table className="w-full border-collapse border-2 border-slate-900 text-[10px]">
                <thead>
                  <tr className="bg-slate-100 uppercase font-black border-b-2 border-slate-900 text-black">
                    <th className="p-3 text-left border-r-2 text-[12px] border-slate-900 w-16">
                      S/N
                    </th>
                    <th className="p-3 text-left border-r-2 text-[12px] border-slate-900 w-1/3">
                      Description
                    </th>
                    <th className="p-3 text-left border-r-2 text-[12px] border-slate-900">
                      Page No.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-900 text-black">
                    <td className="border-r-2 text-[12px] border-slate-900 p-3 font-mono ">
                      1.
                    </td>
                    <td className="border-r-2 text-[12px] capitalize border-slate-900 p-3 font-bold uppercase">
                      1.0 Inspection Logistics & Setup
                    </td>
                  </tr>
                  <tr className="border-b border-slate-900 text-black">
                    <td className="border-r-2 text-[12px] border-slate-900 p-3 font-mono ">
                      2.
                    </td>
                    <td className="border-r-2 text-[12px] capitalize border-slate-900 p-3 font-bold uppercase">
                      2.0 Assessment Summary
                    </td>

                    <td className="p-2 italic"></td>
                  </tr>
                  <tr className="border-b border-slate-900 text-black">
                    <td className="border-r-2 text-[12px] border-slate-900 p-3 font-mono ">
                      3.
                    </td>
                    <td className="border-r-2 text-[12px] capitalize border-slate-900 p-3 font-bold uppercase">
                      3.0 Visual Evidence Appendix
                    </td>

                    <td className="p-2 italic"></td>
                  </tr>
                  <tr className="border-b border-slate-900 text-black">
                    <td className="border-r-2 text-[12px] border-slate-900 p-3 font-mono ">
                      1.
                    </td>
                    <td className="border-r-2 text-[12px] capitalize border-slate-900 p-3 font-bold uppercase">
                      Inspection Logistics & Setup
                    </td>

                    <td className="p-2 italic"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <PageFooter pageNum={1} />
        </div>
        <div
          className="max-w-[850px] mx-auto bg-white border border-slate-300 p-12 shadow-2xl mb-10 min-h-[1100px] flex flex-col print:m-0 break-after-page"
          style={{ breakAfter: "page" }}
        >
          <PageHeader />
          <h3 className="bg-slate-900 text-white px-4 py-2 text-xs font-bold uppercase mb-6 tracking-widest text-left">
            1.0 Inspection Logistics & Setup
          </h3>
          <div className="grid grid-cols-2 gap-px bg-slate-900 border-2 border-slate-900 text-[11px] mb-10">
            <div className="bg-slate-50 p-3 font-bold uppercase">
              Lighting Method
            </div>
            <div className="bg-white p-3">
              {reportData.environmental.lighting}
            </div>
            <div className="bg-slate-50 p-3 font-bold uppercase">
              Surface Preparation
            </div>
            <div className="bg-white p-3">
              {reportData.environmental.surface}
            </div>
            <div className="bg-slate-50 p-3 font-bold uppercase">
              Access Method
            </div>
            <div className="bg-white p-3">
              {reportData.environmental.access}
            </div>
            <div className="bg-slate-50 p-3 font-bold uppercase">
              Equipment Temp
            </div>
            <div className="bg-white p-3">
              {reportData.environmental.temp} °C
            </div>
          </div>
          <PageFooter pageNum={2} />
        </div>

        {/* PAGE 3: FINDINGS [cite: 23, 24, 28, 60] */}
        <div
          className="max-w-[850px] mx-auto bg-white border border-slate-300 p-12 shadow-2xl mb-10 min-h-[1100px] flex flex-col print:m-0 break-after-page"
          style={{ breakAfter: "page" }}
        >
          <PageHeader />
          <h3 className="bg-slate-900 text-white px-4 py-2 text-xs font-bold uppercase mb-4 tracking-widest text-left">
            2.0 Assessment Summary
          </h3>
          <table className="w-full border-collapse border-2 border-slate-900 text-[10px]">
            <thead>
              <tr className="bg-slate-100 uppercase font-black border-b-2 border-slate-900 text-black">
                <th className="p-3 text-left border-r-2 border-slate-900 w-16">
                  S/N
                </th>
                <th className="p-3 text-left border-r-2 border-slate-900 w-1/3">
                  Area
                </th>
                <th className="p-3 text-left border-r-2 border-slate-900">
                  Status
                </th>
                <th className="p-3 text-left">Observations</th>
              </tr>
            </thead>
            <tbody>
              {reportData.observations.map((obs) => (
                <tr
                  key={obs.sn}
                  className="border-b border-slate-900 text-black"
                >
                  <td className="border-r-2 border-slate-900 p-3 font-mono text-[9px]">
                    {obs.sn}
                  </td>
                  <td className="border-r-2 border-slate-900 p-3 font-bold uppercase">
                    {obs.component}
                  </td>
                  <td
                    className={`border-r-2 border-slate-900 p-3 font-bold uppercase ${obs.condition === "Satisfactory" ? "text-emerald-700" : "text-red-600"}`}
                  >
                    {obs.condition}
                  </td>
                  <td className="p-2 italic">
                    <textarea
                      readOnly
                      rows={2}
                      value={obs.notes || "Satisfactory."}
                      className="w-full bg-transparent border-none text-[10px] italic resize-none outline-none overflow-hidden text-black leading-snug"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <PageFooter pageNum={3} />
        </div>

        {/* PAGE 4: PHOTOGRAPHIC APPENDIX (Restored) */}
        <div className="max-w-[850px] mx-auto bg-white border border-slate-300 p-12 shadow-2xl min-h-[1100px] flex flex-col print:m-0">
          <PageHeader />
          <h3 className="bg-slate-900 text-white px-4 py-2 text-xs font-bold uppercase mb-8 tracking-widest text-left">
            3.0 Visual Evidence Appendix
          </h3>
          <div className="flex-1">
            {evidencePhotos.length > 0 ? (
              <div className="grid grid-cols-2 gap-8">
                {evidencePhotos.map((obs, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="border-2 border-slate-900 aspect-video bg-slate-50 flex items-center justify-center overflow-hidden shadow-sm">
                      <img
                        src={obs.photoRef}
                        className="w-full h-full object-cover"
                        alt="Technical Evidence"
                      />
                    </div>
                    <p className="text-[9px] font-black text-center uppercase text-black leading-tight">
                      Ref {obs.sn}: {obs.component.split("(")[0]}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 uppercase font-bold text-[10px] tracking-widest">
                No photographic evidence attached
              </div>
            )}
          </div>
          <PageFooter pageNum={4} />
        </div>
      </div>
    );
  };

  if (reportMode) return <WebView />;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      {user?.role === "Admin" ? <AdminNavbar /> : <InspectorNavbar />}
      <div className="flex">
        {user?.role === "Admin" ? <AdminSidebar /> : <InspectorSidebar />}
        <main className="flex-1 ml-16 lg:ml-64 p-8 bg-slate-950">
          <div className="max-w-6xl mx-auto">
            <header className="flex justify-between items-center mb-8 bg-slate-900/40 p-6 rounded-3xl border border-slate-800 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-orange-500 hover:bg-orange-600 transition-all shadow-inner"
                >
                  <ChevronLeft size={20} />
                </button>
                <h1 className="text-2xl font-bold uppercase tracking-tighter flex items-center gap-2">
                  <Eye className="text-orange-500" /> Visual Inspection 
                </h1>
              </div>
              <div className="flex gap-3">
                {user == "Admin" ? (
                  " "
                ) : (
                  <button
                    onClick={() => setReportMode(true)}
                    className="bg-slate-800 px-6 py-2 rounded-xl text-xs font-bold border border-slate-700 hover:bg-slate-700 transition-all"
                  >
                    Preview before sending
                  </button>
                )}
                <button
                  onClick={handleSaveToFirebase}
                  disabled={isSaving}
                  className="bg-orange-600 px-6 py-2 rounded-xl text-xs font-bold uppercase shadow-lg shadow-orange-900/20 active:scale-95 transition-all"
                >
                  {isSaving ? "Syncing..." : "Send for confirmation"}
                </button>
              </div>
            </header>

            <div className="flex gap-6 border-b border-slate-800 mb-8 overflow-x-auto">
              {/*{["logistics", "findings"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all whitespace-nowrap ${activeTab === tab ? "text-orange-500 border-b-2 border-orange-500" : "text-slate-500"}`}
                >
                  {tab}
                </button>
              ))}*/}
            </div>

            <div className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 backdrop-blur-sm min-h-[450px]">
              
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
                  <InputField
                    label="Asset Tag Number"
                    value={reportData.general.tag}
                    readOnly
                  />
                  <InputField
                    label="Asset Category"
                    value={reportData.general.assetType}
                    readOnly
                  />
                  <InputField
                    label="Asset Category"
                    value={reportData.general.platform}
                    readOnly
                  />
                  <InputField
                    label="Report #"
                    value={reportData.general.reportNum}
                    onChange={(v) =>
                      setReportData({
                        ...reportData,
                        general: { ...reportData.general, reportNum: v },
                      })
                    }
                  />
                  
                  <InputField
                    label="Ambient Temp (°C)"
                    value={reportData.environmental.temp}
                    onChange={(v) =>
                      setReportData({
                        ...reportData,
                        environmental: { ...reportData.environmental, temp: v },
                      })
                    }
                  />
                </div>
              

              
                <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-500 mt-4">
                  <div className="grid grid-cols-12 gap-4 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 text-left">
                    <div className="col-span-4">Technical Area</div>
                    <div className="col-span-2">Condition</div>
                    <div className="col-span-4">Notes</div>
                    <div className="col-span-2 text-center">Reference</div>
                  </div>
                  {reportData.observations.map((item, idx) => (
                    <div
                      key={item.sn}
                      className="grid grid-cols-12 gap-4 bg-slate-950/50 p-4 rounded-2xl border border-slate-800 items-center hover:border-orange-500/30 transition-colors"
                    >
                      <div className="col-span-4 text-[11px] font-bold uppercase text-white px-2 leading-tight">
                        {item.component}
                      </div>
                      <div className="col-span-2">
                        <select
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-[10px] font-bold text-orange-500 outline-none"
                          value={item.condition}
                          onChange={(e) => {
                            const newObs = [...reportData.observations];
                            newObs[idx].condition = e.target.value;
                            setReportData({
                              ...reportData,
                              observations: newObs,
                            });
                          }}
                        >
                          <option>Satisfactory</option>
                          <option>Non-Conformity</option>
                        </select>
                      </div>
                      <div className="col-span-4">
                        <textarea
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-slate-400 outline-none resize-none shadow-inner"
                          rows={1}
                          value={item.notes}
                          onChange={(e) => {
                            const newObs = [...reportData.observations];
                            newObs[idx].notes = e.target.value;
                            setReportData({
                              ...reportData,
                              observations: newObs,
                            });
                          }}
                        />
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <label className="cursor-pointer p-3 bg-slate-950 rounded-full border border-slate-800 hover:border-orange-500 transition-all text-slate-500 hover:text-orange-500 shadow-inner group">
                          {item.photoRef ? (
                            <Activity
                              size={18}
                              className="text-emerald-500 animate-pulse"
                            />
                          ) : (
                            <Camera size={18} />
                          )}
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handlePhotoUpload(e, idx)}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
           
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

// --- TECHNICAL HELPER COMPONENTS (Scoped Globally) ---
const InputField = ({
  label,
  value,
  onChange,
  type = "text",
  readOnly = false,
}) => (
  <div className="flex flex-col gap-2 w-full">
    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
      {label}
    </label>
    <input
      type={type}
      value={value}
      readOnly={readOnly}
      onChange={(e) => onChange && onChange(e.target.value)}
      className={`bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white outline-none ${readOnly ? "opacity-50 cursor-not-allowed border-slate-900" : "focus:border-orange-500 shadow-inner"}`}
    />
  </div>
);

export default VisualReport;
