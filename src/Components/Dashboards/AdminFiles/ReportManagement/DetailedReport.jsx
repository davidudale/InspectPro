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
  XCircle,
  Printer,
  Activity,
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

const DetailedReport = () => {
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
      projectDocId: "",
    },
    environmental: {
      lighting: "Natural",
      surface: "Cleaned",
      access: "Ground Level",
      temp: "Ambient",
    },
    observations: [],
    autMetrics: [
      {
        id: Date.now(),
        axialX: "",
        axialY: "",
        nominal: "",
        min: "",
        location: "",
        remark: "",
      },
    ],
    mutNozzles: [
      {
        id: Date.now() + 1,
        nozzleTag: "",
        dia: "",
        nominal: "",
        actual: "",
        minThk: "",
      },
    ],
    images: [],
  });

  useEffect(() => {
    const initializeManifest = async () => {
      if (location.state?.preFill) {
        const p = location.state.preFill;
        const assetCategory = p.equipmentCategory || p.assetType;
        const projectBusinessId = p.projectId || "";
        const projectDocId = p.id || p.projectDocId || "";
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
            // Use projectId as the canonical correction key.
            projectId: projectBusinessId || projectDocId || "",
            // Keep the Firestore project document id for status sync updates.
            projectDocId,
          },
          observations: schema.map((item) => ({ ...item, photoRef: "" })),
        }));

        let existingDoc = null;
        if (projectBusinessId) {
          const qByProjectId = query(
            collection(db, "inspection_reports"),
            where("general.projectId", "==", projectBusinessId),
            limit(1),
          );
          const snapshotByProjectId = await getDocs(qByProjectId);
          if (!snapshotByProjectId.empty) {
            existingDoc = snapshotByProjectId.docs[0];
          }
        }

        // Backward compatibility for older records keyed by project doc id.
        if (!existingDoc && projectDocId) {
          const qByDocId = query(
            collection(db, "inspection_reports"),
            where("general.projectId", "==", projectDocId),
            limit(1),
          );
          const snapshotByDocId = await getDocs(qByDocId);
          if (!snapshotByDocId.empty) {
            existingDoc = snapshotByDocId.docs[0];
          }
        }

        if (existingDoc) {
          const existingData = existingDoc.data();
          setExistingReportId(existingDoc.id);
          setReportData({
            ...existingData,
            general: {
              ...existingData.general,
              projectId:
                projectBusinessId ||
                existingData?.general?.projectId ||
                projectDocId ||
                "",
              projectDocId:
                projectDocId || existingData?.general?.projectDocId || "",
            },
          });
          toast.info("Previous inspection details loaded for correction.");
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

  const updateTableRow = (tableKey, rowId, field, value) => {
    const nextRows = (reportData[tableKey] || []).map((row) =>
      row.id === rowId ? { ...row, [field]: value } : row,
    );
    setReportData({ ...reportData, [tableKey]: nextRows });
  };

  const addTableRow = (tableKey, template) => {
    setReportData((prev) => ({
      ...prev,
      [tableKey]: [...(prev[tableKey] || []), { ...template, id: Date.now() + Math.random() }],
    }));
  };

  const setGeneralField = (field, value) => {
    setReportData((prev) => ({
      ...prev,
      general: { ...prev.general, [field]: value },
    }));
  };

  const setEnvironmentalField = (field, value) => {
    setReportData((prev) => ({
      ...prev,
      environmental: { ...prev.environmental, [field]: value },
    }));
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
      // When Lead Inspector submits, it moves to "Authorized"
      else if (user?.role === "Lead Inspector" || user?.role === "Supervisor") {
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
          technique: "Detailed Report",
          inspector: currentUserIdentifier,
          inspectorUid: user.uid,
          status: workflowStatus,
          roleAtSubmission: user?.role || "Inspector",
          timestamp: serverTimestamp(),
        });
        setExistingReportId(newDoc.id);
      }

      // 2. SYNC PROJECT MANIFEST
      const targetProjectDocId =
        reportData.general.projectDocId || location.state?.preFill?.id || "";

      if (targetProjectDocId || reportData.general.projectId) {
        let projectRef = null;
        if (targetProjectDocId) {
          projectRef = doc(db, "projects", targetProjectDocId);
        } else if (reportData.general.projectId) {
          const projectLookup = query(
            collection(db, "projects"),
            where("projectId", "==", reportData.general.projectId),
            limit(1),
          );
          const projectSnapshot = await getDocs(projectLookup);
          if (!projectSnapshot.empty) {
            projectRef = doc(db, "projects", projectSnapshot.docs[0].id);
          }
        }

        // Final mapping for the Project collection
        let projectFinalStatus = workflowStatus;
        if (workflowStatus === "Authorized") {
          projectFinalStatus = "Completed";
        }
        if (projectRef) {
          await updateDoc(projectRef, {
            status: projectFinalStatus,
            lastModifiedBy: currentUserIdentifier,
            updatedAt: serverTimestamp(),
          });
        }
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
    const autMetrics = reportData.autMetrics || [];
    const mutNozzles = reportData.mutNozzles || [];
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
    const hasActionRequired = actionRequiredCount > 0;
    const introText = `At the request of ${
      reportData.general.client || "the client"
    }, corrosion mapping inspection was carried out on ${
      reportData.general.tag || "the identified vessel"
    } at ${reportData.general.platform || "the stated location"}.`;
    const inspectionSummary = hasActionRequired
      ? `${actionRequiredCount} finding(s) require corrective action before the next operation cycle.`
      : "No critical defect indication was observed from the inspected points.";
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
        <div className="max-w-[210mm] w-full mx-auto space-y-0 px-2 sm:px-0">
          <div className="bg-white text-slate-950 p-4 sm:p-8 print:p-[20mm] min-h-[297mm] flex flex-col page-break">
            <div className="flex justify-between items-start border-b border-slate-400 pb-6 mb-10">
              <div className="text-blue-900 font-black text-xl tracking-tight">INSPECTPRO</div>
              {reportData.general.clientLogo ? (
                <img
                  src={reportData.general.clientLogo}
                  alt="Client"
                  className="h-16 w-auto object-contain"
                />
              ) : null}
            </div>
            <div className="flex-1">
              <p className="text-sm uppercase tracking-widest font-bold text-slate-600 mb-2">
                {reportData.general.platform || "Work Location"}
              </p>
              <h1 className="text-[28px] font-black uppercase leading-tight tracking-tight mb-2">
                Corrosion Mapping Inspection Report
              </h1>
              <h2 className="text-[18px] font-bold uppercase mb-10">
                {reportData.general.assetType || "Vessel"} ({reportData.general.tag || "N/A"})
              </h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[11px] mb-8">
                <p className="font-bold">Client: <span className="font-normal">{reportData.general.client || "N/A"}</span></p>
                <p className="font-bold">Report Number: <span className="font-normal">{reportData.general.reportNum || "N/A"}</span></p>
                <p className="font-bold">Contract Number: <span className="font-normal">{reportData.general.contractNum || "N/A"}</span></p>
                <p className="font-bold">Location: <span className="font-normal">{reportData.general.platform || "N/A"}</span></p>
                <p className="font-bold">Date of Inspection: <span className="font-normal">{reportData.general.date || "N/A"}</span></p>
                <p className="font-bold">Inspected By: <span className="font-normal">{reportData.general.inspect_by || reportData.inspector || "N/A"}</span></p>
                <p className="font-bold">Test Code: <span className="font-normal">{reportData.general.testCode || "API 510"}</span></p>
                <p className="font-bold">Acceptance Criteria: <span className="font-normal">Client&apos;s requirement</span></p>
              </div>
              <div className="border border-slate-300 p-4 text-[11px]">
                <p className="font-black uppercase mb-2">Introduction</p>
                <p className="leading-relaxed">{introText}</p>
              </div>
            </div>
          </div>
          <div className="bg-white text-slate-950 p-4 sm:p-8 print:p-[20mm] min-h-[297mm] flex flex-col page-break">
            <h3 className="text-sm font-black uppercase border-b border-slate-500 pb-2 mb-5">
              Contents
            </h3>
            <table className="w-full text-[11px] border-collapse mb-6">
              <thead>
                <tr className="border-b border-slate-300">
                  <th className="py-2 text-left font-black uppercase">S/N</th>
                  <th className="py-2 text-left font-black uppercase">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr><td className="py-2">1</td><td className="py-2">Summary of Inspection Results</td></tr>
                <tr><td className="py-2">2</td><td className="py-2">Vessel General Data</td></tr>
                <tr><td className="py-2">3</td><td className="py-2">External Visual Inspection</td></tr>
                <tr><td className="py-2">4</td><td className="py-2">Photographic Details</td></tr>
                <tr><td className="py-2">5</td><td className="py-2">AUT Corrosion Mapping Inspection</td></tr>
                <tr><td className="py-2">6</td><td className="py-2">Manual Ultrasonic Thickness Measurement on Nozzles</td></tr>
                <tr><td className="py-2">7</td><td className="py-2">Ultrasonic Shear Wave Examination of Nozzle/Shell Welds</td></tr>
              </tbody>
            </table>
            <div className="space-y-6 text-[11px] leading-relaxed">
              <div>
                <h4 className="font-black uppercase mb-2">1. Summary of Inspection Results</h4>
                <p><span className="font-bold">Visual Inspection:</span> {inspectionSummary}</p>
                <p><span className="font-bold">AUT Inspection:</span> {autMetrics.length > 0 ? `${autMetrics.length} AUT reading point(s) captured.` : "No AUT records captured."}</p>
                <p><span className="font-bold">MUT Inspection:</span> {mutNozzles.length > 0 ? `${mutNozzles.length} nozzle record(s) captured.` : "No MUT records captured."}</p>
                <p><span className="font-bold">Shear Wave UT of Welds:</span> No defect indication reported in this template section.</p>
              </div>
              <div>
                <h4 className="font-black uppercase mb-2">2. Vessel General Data</h4>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                  <p>Vessel Tag No: {reportData.general.tag || "N/A"}</p>
                  <p>Vessel Name: {reportData.general.equipment || reportData.general.assetType || "N/A"}</p>
                  <p>Design Data: Obtained from nameplate</p>
                  <p>Test Code: {reportData.general.testCode || "API 510"}</p>
                  <p>Operating Procedure: {reportData.general.vesselOperatingProcedure || "N/A"}</p>
                  <p>Ambient Temp: {reportData.environmental.temp || "N/A"} C</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white text-slate-950 p-4 sm:p-8 print:p-[20mm] min-h-[297mm] flex flex-col page-break">
            <h3 className="text-sm font-black uppercase border-b border-slate-500 pb-2 mb-5">
              3. External Visual Inspection
            </h3>
            <h4 className="text-[11px] font-black uppercase mb-2">3.1 External Surface of The Vessel</h4>
            <table className="w-full text-left border-collapse mb-6">
              <thead>
                <tr className="border-y border-slate-300">
                  <th className="py-2 px-2 text-[10px] font-black uppercase">S/N</th>
                  <th className="py-2 px-2 text-[10px] font-black uppercase">Vessel Components</th>
                  <th className="py-2 px-2 text-[10px] font-black uppercase">Observations</th>
                  <th className="py-2 px-2 text-[10px] font-black uppercase">Photos</th>
                </tr>
              </thead>
              <tbody className="text-[11px] divide-y divide-slate-200 align-top">
                {observations.map((obs) => (
                  <tr key={obs.sn}>
                    <td className="p-2 font-bold">{obs.sn}</td>
                    <td className="p-2">{obs.component}</td>
                    <td className="p-2">
                      {obs.notes || (obs.condition === "Satisfactory" ? "No adverse condition observed." : "Condition requires attention.")}
                    </td>
                    <td className="p-2">{obs.photoRef ? obs.sn : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h4 className="text-[11px] font-black uppercase mb-2">3.2 Auxiliary Components Associated with Vessel</h4>
            <table className="w-full text-left border-collapse mb-6">
              <thead>
                <tr className="border-y border-slate-300">
                  <th className="py-2 px-2 text-[10px] font-black uppercase">S/N</th>
                  <th className="py-2 px-2 text-[10px] font-black uppercase">Vessel Components</th>
                  <th className="py-2 px-2 text-[10px] font-black uppercase">Observation</th>
                  <th className="py-2 px-2 text-[10px] font-black uppercase">Photos</th>
                </tr>
              </thead>
              <tbody className="text-[11px] divide-y divide-slate-200">
                <tr>
                  <td className="p-2">3.2.1</td>
                  <td className="p-2">Platforms and Handrails</td>
                  <td className="p-2">
                    {observations.some((o) => (o.component || "").toLowerCase().includes("platform"))
                      ? "Findings captured in section 3.1."
                      : "N/A"}
                  </td>
                  <td className="p-2">-</td>
                </tr>
                <tr>
                  <td className="p-2">3.2.2</td>
                  <td className="p-2">Ladders / Stairways</td>
                  <td className="p-2">
                    {observations.some((o) => (o.component || "").toLowerCase().includes("ladder"))
                      ? "Relevant observations recorded."
                      : "N/A"}
                  </td>
                  <td className="p-2">-</td>
                </tr>
              </tbody>
            </table>
            <h4 className="text-[11px] font-black uppercase mb-2">3.3 Instrumentation and Associated Hardware</h4>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-y border-slate-300">
                  <th className="py-2 px-2 text-[10px] font-black uppercase">S/N</th>
                  <th className="py-2 px-2 text-[10px] font-black uppercase">Vessel Components</th>
                  <th className="py-2 px-2 text-[10px] font-black uppercase">Observation</th>
                  <th className="py-2 px-2 text-[10px] font-black uppercase">Photos</th>
                </tr>
              </thead>
              <tbody className="text-[11px] divide-y divide-slate-200">
                <tr>
                  <td className="p-2">3.3.1</td>
                  <td className="p-2">Pressure / Level / Temperature Instruments</td>
                  <td className="p-2">
                    {observations.some((o) =>
                      /(gauge|instrument|thermo|level|pressure)/i.test(o.component || ""),
                    )
                      ? "Instrument-related notes available in findings."
                      : "No specific anomaly captured."}
                  </td>
                  <td className="p-2">-</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="bg-white text-slate-950 p-4 sm:p-8 print:p-[20mm] min-h-[297mm] page-break">
            <h3 className="text-sm font-black uppercase border-b border-slate-500 pb-2 mb-5">
              5. AUT Corrosion Mapping Inspection
            </h3>
            <div className="text-[11px] space-y-3 mb-6">
              <h4 className="font-black uppercase">5.1 AUT HydroForm Technique - Introduction and Limitation</h4>
              <p>
                This report details wall thickness measurement using AUT corrosion mapping.
                Measurements are used to assess vessel integrity and maintenance priority.
              </p>
              <p>
                Limitations apply in inaccessible areas such as welded surroundings, nozzles,
                and support interfaces where manual UT may be required.
              </p>
              <p className="font-bold">
                Reference Standards: {standardsUsed.length > 0 ? standardsUsed.join(", ") : "Client standard"}
              </p>
            </div>
            <h4 className="text-[11px] font-black uppercase mb-2">5.4 AUT Data Acquisition</h4>
            <table className="w-full text-left border-collapse mb-6">
              <thead>
                <tr className="border-y border-slate-300">
                  <th className="py-2 px-2 text-[10px] font-black uppercase">Axial X</th>
                  <th className="py-2 px-2 text-[10px] font-black uppercase">Axial Y</th>
                  <th className="py-2 px-2 text-[10px] font-black uppercase">Nominal</th>
                  <th className="py-2 px-2 text-[10px] font-black uppercase">Minimum</th>
                  <th className="py-2 px-2 text-[10px] font-black uppercase">Location</th>
                  <th className="py-2 px-2 text-[10px] font-black uppercase">Remark</th>
                </tr>
              </thead>
              <tbody className="text-[11px] divide-y divide-slate-200">
                {autMetrics.length > 0 ? (
                  autMetrics.map((row) => (
                    <tr key={row.id}>
                      <td className="p-2">{row.axialX || "-"}</td>
                      <td className="p-2">{row.axialY || "-"}</td>
                      <td className="p-2">{row.nominal || "-"}</td>
                      <td className="p-2">{row.min || "-"}</td>
                      <td className="p-2">{row.location || "-"}</td>
                      <td className="p-2">{row.remark || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="p-2 text-slate-500" colSpan={6}>
                      No AUT records captured.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <h3 className="text-sm font-black uppercase border-b border-slate-500 pb-2 mb-5">
              6. Manual Ultrasonic Thickness Measurement on Nozzles
            </h3>
            <table className="w-full text-left border-collapse mb-6">
              <thead>
                <tr className="border-y border-slate-300">
                  <th className="py-2 px-2 text-[10px] font-black uppercase">Nozzle</th>
                  <th className="py-2 px-2 text-[10px] font-black uppercase">Dia</th>
                  <th className="py-2 px-2 text-[10px] font-black uppercase">Nominal</th>
                  <th className="py-2 px-2 text-[10px] font-black uppercase">Actual</th>
                  <th className="py-2 px-2 text-[10px] font-black uppercase">Min Thk</th>
                </tr>
              </thead>
              <tbody className="text-[11px] divide-y divide-slate-200">
                {mutNozzles.length > 0 ? (
                  mutNozzles.map((row) => (
                    <tr key={row.id}>
                      <td className="p-2">{row.nozzleTag || "-"}</td>
                      <td className="p-2">{row.dia || "-"}</td>
                      <td className="p-2">{row.nominal || "-"}</td>
                      <td className="p-2">{row.actual || "-"}</td>
                      <td className="p-2">{row.minThk || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="p-2 text-slate-500" colSpan={5}>
                      No MUT records captured.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <h3 className="text-sm font-black uppercase border-b border-slate-500 pb-2 mb-4">
              7. Ultrasonic Shear Wave Examination of Nozzle/Shell Circumferential Welds
            </h3>
            <p className="text-[11px]">
              No defect indication was logged from nozzle/shell circumferential weld checks in this report template.
            </p>
            <div className="mt-auto pt-8 grid grid-cols-2 gap-8 text-[10px]">
              <div>
                <p className="font-black uppercase mb-6">Inspected By</p>
                <div className="border-b border-slate-600 pb-1">
                  {reportData.general.inspect_by || reportData.inspector || "________________"}
                </div>
              </div>
              <div>
                <p className="font-black uppercase mb-6">Authorized By</p>
                <div className="border-b border-slate-600 pb-1">
                  {user?.displayName || user?.name || user?.email || "________________"}
                </div>
              </div>
            </div>
          </div>
          {evidencePhotos.length > 0 && (
            <div className="bg-white text-slate-950 p-4 sm:p-8 print:p-[20mm] min-h-[297mm] page-break">
              <h3 className="text-sm font-black uppercase border-b border-slate-500 pb-2 mb-5">
                4. Photographic Details
              </h3>
              <div className="grid grid-cols-2 gap-8">
                {evidencePhotos.map((obs, idx) => (
                  <div key={idx} className="space-y-2 break-inside-avoid">
                    <div className="border border-slate-200 p-1 rounded">
                      <img
                        src={obs.photoRef}
                        className="w-full aspect-[4/3] object-cover rounded"
                        alt="Inspection evidence"
                      />
                    </div>
                    <p className="text-[10px] font-bold">
                      Photo #{String(idx + 1).padStart(2, "0")}: {obs.notes || obs.component || "Inspection detail"}
                    </p>
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
        <main className="flex-1 ml-16 lg:ml-64 p-4 sm:p-6 lg:p-8 bg-slate-950">
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
                  <Eye className="text-orange-500" /> Detailed Inspection Report
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
                    label="Client"
                    value={reportData.general.client}
                    onChange={(v) => setGeneralField("client", v)}
                  />
                  <InputField
                    label="Contract Number"
                    value={reportData.general.contractNum}
                    onChange={(v) => setGeneralField("contractNum", v)}
                  />
                  <InputField
                    label="Date of Inspection"
                    type="date"
                    value={reportData.general.date}
                    onChange={(v) => setGeneralField("date", v)}
                  />
                  <InputField
                    label="Inspected By"
                    value={reportData.general.inspect_by}
                    onChange={(v) => setGeneralField("inspect_by", v)}
                  />
                  <InputField
                    label="Test Code"
                    value={reportData.general.testCode}
                    onChange={(v) => setGeneralField("testCode", v)}
                  />
                  <InputField
                    label="Operating Procedure"
                    value={reportData.general.vesselOperatingProcedure || ""}
                    onChange={(v) => setGeneralField("vesselOperatingProcedure", v)}
                  />
                  <InputField
                    label="Asset Tag Number"
                    value={reportData.general.tag}
                    readOnly
                  />
                  <InputField
                    label="Asset Type"
                    value={reportData.general.assetType}
                    readOnly
                  />
                  <InputField
                    label="Location"
                    value={reportData.general.platform}
                    onChange={(v) => setGeneralField("platform", v)}
                  />
                  <InputField
                    label="Report Number"
                    value={reportData.general.reportNum}
                    onChange={(v) => setGeneralField("reportNum", v)}
                  />
                  
                  <InputField
                    label="Ambient Temp (C)"
                    value={reportData.environmental.temp}
                    onChange={(v) => setEnvironmentalField("temp", v)}
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

                <div className="mt-10">
                  <h3 className="text-[11px] font-black text-orange-500 uppercase tracking-widest mb-3">
                    AUT Thickness Mapping
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/50">
                          <th className="p-3 text-[10px] font-black uppercase text-slate-500">Axial X</th>
                          <th className="p-3 text-[10px] font-black uppercase text-slate-500">Axial Y</th>
                          <th className="p-3 text-[10px] font-black uppercase text-slate-500">Nominal</th>
                          <th className="p-3 text-[10px] font-black uppercase text-slate-500">Minimum</th>
                          <th className="p-3 text-[10px] font-black uppercase text-slate-500">Location</th>
                          <th className="p-3 text-[10px] font-black uppercase text-slate-500">Remark</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {(reportData.autMetrics || []).map((row) => (
                          <tr key={row.id}>
                            <td className="p-2"><input value={row.axialX} onChange={(e) => updateTableRow("autMetrics", row.id, "axialX", e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white" /></td>
                            <td className="p-2"><input value={row.axialY} onChange={(e) => updateTableRow("autMetrics", row.id, "axialY", e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white" /></td>
                            <td className="p-2"><input value={row.nominal} onChange={(e) => updateTableRow("autMetrics", row.id, "nominal", e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white" /></td>
                            <td className="p-2"><input value={row.min} onChange={(e) => updateTableRow("autMetrics", row.id, "min", e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white" /></td>
                            <td className="p-2"><input value={row.location} onChange={(e) => updateTableRow("autMetrics", row.id, "location", e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white" /></td>
                            <td className="p-2"><input value={row.remark} onChange={(e) => updateTableRow("autMetrics", row.id, "remark", e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white" /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      addTableRow("autMetrics", {
                        axialX: "",
                        axialY: "",
                        nominal: "",
                        min: "",
                        location: "",
                        remark: "",
                      })
                    }
                    className="mt-3 text-xs font-bold uppercase tracking-widest text-orange-500 hover:text-orange-400"
                  >
                    + Add AUT Row
                  </button>
                </div>

                <div className="mt-10">
                  <h3 className="text-[11px] font-black text-orange-500 uppercase tracking-widest mb-3">
                    MUT Nozzle Measurements
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/50">
                          <th className="p-3 text-[10px] font-black uppercase text-slate-500">Nozzle</th>
                          <th className="p-3 text-[10px] font-black uppercase text-slate-500">Dia</th>
                          <th className="p-3 text-[10px] font-black uppercase text-slate-500">Nominal</th>
                          <th className="p-3 text-[10px] font-black uppercase text-slate-500">Actual</th>
                          <th className="p-3 text-[10px] font-black uppercase text-slate-500">Min Thk</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {(reportData.mutNozzles || []).map((row) => (
                          <tr key={row.id}>
                            <td className="p-2"><input value={row.nozzleTag} onChange={(e) => updateTableRow("mutNozzles", row.id, "nozzleTag", e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white" /></td>
                            <td className="p-2"><input value={row.dia} onChange={(e) => updateTableRow("mutNozzles", row.id, "dia", e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white" /></td>
                            <td className="p-2"><input value={row.nominal} onChange={(e) => updateTableRow("mutNozzles", row.id, "nominal", e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white" /></td>
                            <td className="p-2"><input value={row.actual} onChange={(e) => updateTableRow("mutNozzles", row.id, "actual", e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white" /></td>
                            <td className="p-2"><input value={row.minThk} onChange={(e) => updateTableRow("mutNozzles", row.id, "minThk", e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white" /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      addTableRow("mutNozzles", {
                        nozzleTag: "",
                        dia: "",
                        nominal: "",
                        actual: "",
                        minThk: "",
                      })
                    }
                    className="mt-3 text-xs font-bold uppercase tracking-widest text-orange-500 hover:text-orange-400"
                  >
                    + Add MUT Row
                  </button>
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

export default DetailedReport;




