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
    { sn: "3.1.1", component: "Shell Courses and Longitudinal/Circumferential Weld Seams (corrosion, deformation, coating breakdown)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.1.2", component: "Upper and Lower Heads (distortion, pitting, weld toe cracking, paint condition)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.1.3", component: "Nozzles, Reinforcement Pads and Manways (leak signs, gasket staining, weld integrity)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.1.4", component: "Flanged Joints, Stud Bolts and Nuts (corrosion, missing bolts, misalignment, leakage)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.1.5", component: "Branch Connections and Small Bore Piping (vibration damage, fatigue cracks, support adequacy)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.1.6", component: "Relief Valve Body, Inlet/Outlet Piping and Discharge Route (damage, blockage, leak traces)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.1.7", component: "Skirt/Saddle/Leg Supports and Attachments (section loss, distortion, weld cracking)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.1.8", component: "Anchor Bolts, Base Plate and Grout (looseness, corrosion, grout cracking, settlement signs)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.1.9", component: "Platforms, Ladders and Handrails (structural condition, loose members, corrosion)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.1.10", component: "Insulation and Weather Cladding (damage, CUI indicators, wet spots, open seams)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.1.11", component: "Nameplate, Tagging and Design Data Markings (legibility and attachment)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.1.12", component: "Earthing/Bonding Points and External Attachments (continuity points, corrosion, fastening)", condition: "Satisfactory", notes: "", photoRef: "" }
  ],

  "Heat Exchanger (E)": [
    { sn: "3.2.1", component: "Shell and Channel Bodies (external corrosion, coating, mechanical damage)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.2.2", component: "Channel Covers, Bonnet and Flange Faces (gasket leakage stains, bolting condition)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.2.3", component: "Tube Sheet-to-Channel/Shell Junctions (leak indications, cracks, distortion)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.2.4", component: "Inlet/Outlet Nozzles and Reinforcement Areas (erosion-corrosion signs, weld condition)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.2.5", component: "Expansion Joint/Bellows (if fitted) (tears, bulging, misalignment)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.2.6", component: "Saddles, Support Brackets and Hold-downs (cracking, settlement, bolt integrity)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.2.7", component: "Lifting Lugs and Temporary Rigging Points (deformation, cracks, certification marks)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.2.8", component: "Insulation and Cladding Condition (damage, wet insulation, CUI risk)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.2.9", component: "External Leakage at Flanges/Drains/Vents (hydrocarbon staining, active drips)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.2.10", component: "Identification Plates, Flow Direction Arrows and Tags (visibility and correctness)", condition: "Satisfactory", notes: "", photoRef: "" }
  ],

  "Atmospheric Storage Tank (T)": [
    { sn: "3.3.1", component: "Shell Courses and Vertical/Horizontal Welds (corrosion, buckling, coating condition)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.3.2", component: "Bottom Annular Region and Chime Area (settlement signs, corrosion, leakage traces)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.3.3", component: "Roof Plates and Roof-to-Shell Joint (corrosion, ponding, seam defects)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.3.4", component: "Floating Roof/Pontoon and Seal System (if applicable) (seal integrity, damage, product marks)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.3.5", component: "Roof Drains, Vents and Gauge Hatches (blockage, corrosion, mechanical damage)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.3.6", component: "Nozzles, Manways and Reinforcement Pads (gasket leaks, deformation, weld condition)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.3.7", component: "Shell-to-Bottom Weld Region (cracks, seepage, localized corrosion)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.3.8", component: "Stairways, Platforms and Handrails (structural stability, corrosion, loose fasteners)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.3.9", component: "Foundation Ring Wall and Settlement Indicators (tilt, cracks, erosion)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.3.10", component: "External Coating and Corrosion Protection System (holidays, peeling, rust bloom)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.3.11", component: "Earthing/Lightning Protection Attachments (continuity points, corrosion, damage)", condition: "Satisfactory", notes: "", photoRef: "" }
  ],

  "Distillation Column (C)": [
    { sn: "3.4.1", component: "Column Shell and Longitudinal/Circumferential Welds (corrosion, bulging, coating)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.4.2", component: "Top Head/Bottom Head and Transition Zones (distortion, weld condition, leakage)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.4.3", component: "Process Nozzles, Draw-off and Return Connections (leakage signs, support condition)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.4.4", component: "Manways and Flanged Openings (gasket staining, bolting integrity)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.4.5", component: "Tray/Internals Access Openings and Covers (external indications, distortion)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.4.6", component: "Reboiler/Condenser Tie-in Lines and Branches (leaks, vibration wear, supports)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.4.7", component: "Column Skirt, Base Ring and Anchor Bolts (corrosion, grout cracking, settlement)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.4.8", component: "Platforms, Ladders and Access Cage (integrity, corrosion, loose members)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.4.9", component: "Insulation/Cladding and CUI-Prone Areas (wet spots, cladding damage, corrosion bleed)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.4.10", component: "Nameplate and Process Identification/Tagging (legibility and correctness)", condition: "Satisfactory", notes: "", photoRef: "" }
  ],

  "Piping System (P)": [
    { sn: "3.5.1", component: "Main Pipe Runs and Routing (external corrosion, coating, alignment)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.5.2", component: "Welded Joints and HAZ Regions (surface cracking, corrosion at weld toes)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.5.3", component: "Flanged Joints, Gaskets and Bolting (leak marks, missing bolts, misalignment)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.5.4", component: "Valves, Valve Bodies and Actuators (packing leaks, damage, support)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.5.5", component: "Small Bore Connections and Instrument Tappings (fatigue cracks, vibration damage)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.5.6", component: "Pipe Supports, Shoes, Guides and Springs (load transfer, corrosion, displacement)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.5.7", component: "Expansion Loops/Bellows/Flexible Elements (distortion, tears, restraint condition)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.5.8", component: "Insulation and Weatherproofing (damage, CUI indications, open seams)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.5.9", component: "Pipe Rack Steelwork and Clamp Interfaces (corrosion, clamp wear, movement)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.5.10", component: "Leakage, Drips, Staining and Housekeeping Around Line (containment signs)", condition: "Satisfactory", notes: "", photoRef: "" }
  ],

  "Boiler (B)": [
    { sn: "3.6.1", component: "Boiler Drum/Shell and External Surface (corrosion, hot spots, coating damage)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.6.2", component: "Headers and External Tube Connections (leaks, distortion, corrosion)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.6.3", component: "Burner Front/Access Doors and Seals (warping, leakage, refractory distress)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.6.4", component: "Refractory Casing/Insulation Cladding (cracks, bulging, missing sections)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.6.5", component: "Steam/Feedwater Nozzles and Flanges (leak signs, gasket condition, bolting)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.6.6", component: "Safety Valves and Discharge Lines (damage, obstruction, leakage)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.6.7", component: "Economizer/Superheater External Surfaces (fouling, corrosion, leakage marks)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.6.8", component: "Boiler Supports, Frames and Anchor Points (corrosion, distortion, bolt integrity)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.6.9", component: "Access Platforms, Stairs and Handrails (mechanical condition, corrosion)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.6.10", component: "Nameplate/Tags and Warning Labels (legibility and attachment)", condition: "Satisfactory", notes: "", photoRef: "" }
  ],

  "Centrifugal Pump (P)": [
    { sn: "3.7.1", component: "Pump Casing and Cover Flanges (leakage, corrosion, impact damage)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.7.2", component: "Suction and Discharge Nozzles (strain, leaks, misalignment)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.7.3", component: "Mechanical Seal/Seal Pot Area (drips, flush line integrity, overheating signs)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.7.4", component: "Bearing Housings and Lubrication Points (leaks, discoloration, contamination)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.7.5", component: "Coupling, Guard and Alignment Indicators (damage, guard security)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.7.6", component: "Baseplate, Hold-down Bolts and Grout (looseness, cracks, soft foot indicators)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.7.7", component: "Auxiliary Piping and Instrument Connections (leaks, vibration, support)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.7.8", component: "External Vibration/Noise Indicators and Overall Condition", condition: "Satisfactory", notes: "", photoRef: "" }
  ],

  "Centrifugal Compressor (K)": [
    { sn: "3.8.1", component: "Compressor Casing and Split Line (leaks, cracking, fastener condition)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.8.2", component: "Suction/Discharge Nozzles and Piping Interfaces (movement, leaks, stress)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.8.3", component: "Seal System (dry gas/oil seals) and Seal Piping (leakage, contamination)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.8.4", component: "Bearing Housing and Lube Oil Console Interfaces (leaks, temperature discoloration)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.8.5", component: "Coupling and Guard (condition, security, evidence of rub)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.8.6", component: "Driver-Compressor Skid, Hold-downs and Grout (integrity and settlement signs)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.8.7", component: "Anti-surge/Recycle Valves and Related Piping (leaks, support, accessibility)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.8.8", component: "General Vibration/Noise and External Mechanical Condition", condition: "Satisfactory", notes: "", photoRef: "" }
  ],

  "Reciprocating Compressor (RK)": [
    { sn: "3.9.1", component: "Frame/Crankcase and Distance Piece (oil leaks, cracks, foundation bolts)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.9.2", component: "Cylinder Bodies, Heads and Valve Covers (leaks, hot spots, fastener condition)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.9.3", component: "Suction and Discharge Pulsation Bottles/Nozzles (supports, vibration, corrosion)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.9.4", component: "Packing Cases and Rod Seals (vent leakage, wear indicators)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.9.5", component: "Crosshead Guides and Lubrication Lines (leaks, looseness, contamination)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.9.6", component: "Intercooler/Aftercooler External Condition and Connections (leaks, corrosion)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.9.7", component: "Coupling/Belt Guard and Driver Interface (guard integrity, alignment indicators)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.9.8", component: "Skid Structure, Anchor Bolts and Grout (cracks, movement, corrosion)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.9.9", component: "General Vibration/Noise and Housekeeping Around Unit", condition: "Satisfactory", notes: "", photoRef: "" }
  ],

  Default: [
    { sn: "3.0.1", component: "General External Condition (corrosion, coating, impact and deformation)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.0.2", component: "Welds/Joints/Connections (visible cracks, leaks, looseness)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.0.3", component: "Supports, Structures and Anchorage (integrity, alignment, settlement)", condition: "Satisfactory", notes: "", photoRef: "" },
    { sn: "3.0.4", component: "Tagging, Nameplate and Safety Markings (legibility and attachment)", condition: "Satisfactory", notes: "", photoRef: "" }
  ]
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

  // --- SUB-COMPONENT: WEB REPORT VIEW ---
  const WebView = () => {
    const observations = reportData.observations || [];
    const evidencePhotos = observations.filter((obs) => obs.photoRef);
    const satisfactoryCount = observations.filter(
      (obs) => (obs.condition || "").toLowerCase() === "satisfactory",
    ).length;
    const actionRequiredCount = Math.max(observations.length - satisfactoryCount, 0);

    const standardsUsed = [
      reportData.general.defaultStandard,
      reportData.general.designCode,
      reportData.general.assetType,
      "API 510 / API 570 / API 653 (as applicable)",
    ].filter(Boolean);

    const classifyFinding = (condition) => {
      const normalized = (condition || "").toLowerCase();
      if (normalized === "satisfactory") return "Acceptable";
      if (normalized.includes("minor") || normalized.includes("monitor")) return "Monitor";
      return "Action Required";
    };

    const findingClassName = (classification) => {
      if (classification === "Acceptable") return "text-emerald-700";
      if (classification === "Monitor") return "text-amber-700";
      return "text-red-700";
    };

    const ReportRow = ({ label, value }) => (
      <div className="flex justify-between border-b border-slate-100 pb-1">
        <span className="font-black text-slate-400 uppercase text-[9px]">{label}</span>
        <span className="font-bold text-right uppercase">{value || "N/A"}</span>
      </div>
    );

    const SummaryCard = ({ label, value }) => (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
        <p className="text-2xl font-black text-slate-900 mt-1">{value}</p>
      </div>
    );

    const SignatureBlock = ({ label, name }) => (
      <div className="space-y-4">
        <p className="text-[9px] font-black uppercase text-slate-400">{label}</p>
        <div className="border-b-2 border-slate-950 pb-1 font-serif italic text-lg text-slate-900">
          {name || "____________________"}
        </div>
        <p className="text-[8px] text-slate-500 uppercase">Electronic Verification Signature</p>
      </div>
    );

    return (
      <div className="min-h-screen bg-slate-900 p-4 md:p-8 pb-20 print:p-0 print:bg-white">
        <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
          <button
            onClick={() => setReportMode(false)}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={18} /> Back
          </button>
          <div className="flex gap-4">
            <button
              onClick={() => window.print()}
              className="bg-slate-800 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 border border-slate-700"
            >
              <Printer size={18} /> Print
            </button>
            <button
              onClick={() => setReportMode(false)}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-900/20"
            >
              <XCircle size={18} /> Close Preview
            </button>
          </div>
        </div>

        <div className="max-w-[210mm] mx-auto space-y-0">
          <div className="bg-white text-slate-950 p-[20mm] min-h-[297mm] flex flex-col page-break">
            <div className="flex justify-between items-start border-b-2 border-slate-950 pb-6 mb-12">
              <div className="text-blue-800 font-black text-xl">INSPECTPRO</div>
              {reportData.general.clientLogo ? (
                <img
                  src={reportData.general.clientLogo}
                  alt="Client"
                  className="h-16 w-auto object-contain"
                />
              ) : null}
            </div>

            <div className="flex-1">
              <h1 className="text-4xl font-black uppercase tracking-tight mb-3">
                Oil & Gas Visual Inspection Report
              </h1>
              <p className="text-sm text-slate-600 mb-8 uppercase tracking-[0.2em] font-bold">
                Visual Testing (VT) | Condition and Integrity Screening
              </p>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                  <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3">
                    Project Information
                  </h3>
                  <ReportRow label="Client" value={reportData.general.client} />
                  <ReportRow label="Facility/Location" value={reportData.general.platform} />
                  <ReportRow label="Report Number" value={reportData.general.reportNum} />
                  <ReportRow label="Inspection Date" value={reportData.general.date} />
                </div>
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                  <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3">
                    Asset Information
                  </h3>
                  <ReportRow label="Asset Tag" value={reportData.general.tag} />
                  <ReportRow label="Asset Type" value={reportData.general.assetType} />
                  <ReportRow label="Equipment Class" value={reportData.general.equipment} />
                  <ReportRow label="Ambient Temp" value={`${reportData.environmental.temp || "N/A"} �C`} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <SummaryCard label="Total Findings" value={observations.length} />
                <SummaryCard label="Acceptable" value={satisfactoryCount} />
                <SummaryCard label="Action Required" value={actionRequiredCount} />
              </div>

              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3">
                  Scope & Reference Standards
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed mb-3">
                  This report presents visual inspection findings for externally accessible components.
                  Scope includes visible corrosion, coating condition, leaks, deformation, mechanical
                  damage, and general asset integrity indicators.
                </p>
                <ul className="text-xs text-slate-700 list-disc pl-4 space-y-1">
                  {standardsUsed.map((standard, idx) => (
                    <li key={`${standard}-${idx}`}>{standard}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-auto pt-10 border-t-4 border-slate-900 text-center">
              <p className="text-[10px] font-black text-red-600 tracking-[0.4em]">
                CONTROLLED ENGINEERING DOCUMENT - CONFIDENTIAL
              </p>
            </div>
          </div>

          <div className="bg-white text-slate-950 p-[20mm] min-h-[297mm] flex flex-col page-break">
            <h3 className="text-sm font-black uppercase border-b-2 border-slate-900 pb-2 mb-8 flex items-center gap-2">
              <ShieldCheck size={16} className="text-orange-600" /> Section 01: Findings Register
            </h3>

            <table className="w-full text-left border-collapse mb-10">
              <thead>
                <tr className="bg-slate-100 border-y border-slate-300">
                  <th className="py-3 px-3 text-[10px] font-black uppercase">Ref</th>
                  <th className="py-3 px-3 text-[10px] font-black uppercase">Component</th>
                  <th className="py-3 px-3 text-[10px] font-black uppercase">Observed Condition</th>
                  <th className="py-3 px-3 text-[10px] font-black uppercase">Classification</th>
                  <th className="py-3 px-3 text-[10px] font-black uppercase">Remarks / Evidence</th>
                </tr>
              </thead>
              <tbody className="text-[11px] divide-y divide-slate-200">
                {observations.map((obs) => {
                  const classification = classifyFinding(obs.condition);
                  return (
                    <tr key={obs.sn}>
                      <td className="p-4 font-mono font-bold">{obs.sn}</td>
                      <td className="p-4 font-bold uppercase">{obs.component}</td>
                      <td className="p-4">
                        <span
                          className={`font-black uppercase ${
                            obs.condition === "Satisfactory" ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {obs.condition}
                        </span>
                      </td>
                      <td className={`p-4 font-black uppercase ${findingClassName(classification)}`}>
                        {classification}
                      </td>
                      <td className="p-4 italic text-slate-600">
                        {obs.notes || "No adverse condition observed during VT."}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="mb-8">
              <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">
                Section 02: Recommendations
              </h4>
              <ul className="text-xs text-slate-700 list-disc pl-4 space-y-1">
                <li>
                  Address all items classified as <span className="font-black">Action Required</span>{" "}
                  before the next operational cycle.
                </li>
                <li>
                  Items classified as <span className="font-black">Monitor</span> should be trended and
                  reassessed at the next planned inspection interval.
                </li>
                <li>
                  Re-inspection interval should align with asset criticality and the site integrity
                  management plan.
                </li>
              </ul>
            </div>

            <div className="mt-auto grid grid-cols-2 gap-10">
              <SignatureBlock label="Field Inspector" name={reportData.inspector} />
              <SignatureBlock label="Authorized By" name={user?.displayName || user?.name || user?.email} />
            </div>
          </div>

          {evidencePhotos.length > 0 && (
            <div className="bg-white text-slate-950 p-[20mm] min-h-[297mm] page-break">
              <h3 className="text-sm font-black uppercase border-b-2 border-slate-900 pb-2 mb-8">
                Section 03: Photographic Evidence Appendix
              </h3>
              <div className="grid grid-cols-2 gap-8">
                {evidencePhotos.map((obs, idx) => (
                  <div key={idx} className="space-y-2 break-inside-avoid">
                    <div className="border-2 border-slate-100 p-1 rounded-lg">
                      <img
                        src={obs.photoRef}
                        className="w-full aspect-[4/3] object-cover rounded"
                        alt="Technical Evidence"
                      />
                    </div>
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[10px] font-black uppercase">Ref {obs.sn}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase truncate">
                        {obs.component?.split("(")[0] || "Component"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
                    className="bg-blue-800 uppercase px-6 py-2 rounded-xl text-xs font-bold border border-slate-700 hover:bg-slate-700 transition-all"
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


