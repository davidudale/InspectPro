import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { db } from "../../../Auth/firebase";
import {
  collection,
  serverTimestamp,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  setDoc,
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
import ManagerNavbar from "../../ManagerFile/ManagerNavbar";
import ManagerSidebar from "../../ManagerFile/ManagerSidebar";
import SupervisorNavbar from "../../SupervisorFiles/SupervisorNavbar";
import SupervisorSidebar from "../../SupervisorFiles/SupervisorSidebar";

// --- TECHNICAL SCHEMAS (Internal mapping updated with photoRef) ---
const INSPECTION_SCHEMAS = {
  "Pressure Vessel (V)": [
    {
      sn: "3.1.1",
      component:
        "Shell Courses and Longitudinal/Circumferential Weld Seams (corrosion, deformation, coating breakdown)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.1.2",
      component:
        "Upper and Lower Heads (distortion, pitting, weld toe cracking, paint condition)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.1.3",
      component:
        "Nozzles, Reinforcement Pads and Manways (leak signs, gasket staining, weld integrity)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.1.4",
      component:
        "Flanged Joints, Stud Bolts and Nuts (corrosion, missing bolts, misalignment, leakage)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.1.5",
      component:
        "Branch Connections and Small Bore Piping (vibration damage, fatigue cracks, support adequacy)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.1.6",
      component:
        "Relief Valve Body, Inlet/Outlet Piping and Discharge Route (damage, blockage, leak traces)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.1.7",
      component:
        "Skirt/Saddle/Leg Supports and Attachments (section loss, distortion, weld cracking)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.1.8",
      component:
        "Anchor Bolts, Base Plate and Grout (looseness, corrosion, grout cracking, settlement signs)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.1.9",
      component:
        "Platforms, Ladders and Handrails (structural condition, loose members, corrosion)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.1.10",
      component:
        "Insulation and Weather Cladding (damage, CUI indicators, wet spots, open seams)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.1.11",
      component:
        "Nameplate, Tagging and Design Data Markings (legibility and attachment)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.1.12",
      component:
        "Earthing/Bonding Points and External Attachments (continuity points, corrosion, fastening)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
  ],

  "Heat Exchanger (E)": [
    {
      sn: "3.2.1",
      component:
        "Shell and Channel Bodies (external corrosion, coating, mechanical damage)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.2.2",
      component:
        "Channel Covers, Bonnet and Flange Faces (gasket leakage stains, bolting condition)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.2.3",
      component:
        "Tube Sheet-to-Channel/Shell Junctions (leak indications, cracks, distortion)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.2.4",
      component:
        "Inlet/Outlet Nozzles and Reinforcement Areas (erosion-corrosion signs, weld condition)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.2.5",
      component:
        "Expansion Joint/Bellows (if fitted) (tears, bulging, misalignment)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.2.6",
      component:
        "Saddles, Support Brackets and Hold-downs (cracking, settlement, bolt integrity)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.2.7",
      component:
        "Lifting Lugs and Temporary Rigging Points (deformation, cracks, certification marks)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.2.8",
      component:
        "Insulation and Cladding Condition (damage, wet insulation, CUI risk)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.2.9",
      component:
        "External Leakage at Flanges/Drains/Vents (hydrocarbon staining, active drips)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.2.10",
      component:
        "Identification Plates, Flow Direction Arrows and Tags (visibility and correctness)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
  ],

  "Atmospheric Storage Tank (T)": [
    {
      sn: "3.3.1",
      component:
        "Shell Courses and Vertical/Horizontal Welds (corrosion, buckling, coating condition)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.3.2",
      component:
        "Bottom Annular Region and Chime Area (settlement signs, corrosion, leakage traces)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.3.3",
      component:
        "Roof Plates and Roof-to-Shell Joint (corrosion, ponding, seam defects)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.3.4",
      component:
        "Floating Roof/Pontoon and Seal System (if applicable) (seal integrity, damage, product marks)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.3.5",
      component:
        "Roof Drains, Vents and Gauge Hatches (blockage, corrosion, mechanical damage)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.3.6",
      component:
        "Nozzles, Manways and Reinforcement Pads (gasket leaks, deformation, weld condition)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.3.7",
      component:
        "Shell-to-Bottom Weld Region (cracks, seepage, localized corrosion)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.3.8",
      component:
        "Stairways, Platforms and Handrails (structural stability, corrosion, loose fasteners)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.3.9",
      component:
        "Foundation Ring Wall and Settlement Indicators (tilt, cracks, erosion)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.3.10",
      component:
        "External Coating and Corrosion Protection System (holidays, peeling, rust bloom)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.3.11",
      component:
        "Earthing/Lightning Protection Attachments (continuity points, corrosion, damage)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
  ],

  "Distillation Column (C)": [
    {
      sn: "3.4.1",
      component:
        "Column Shell and Longitudinal/Circumferential Welds (corrosion, bulging, coating)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.4.2",
      component:
        "Top Head/Bottom Head and Transition Zones (distortion, weld condition, leakage)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.4.3",
      component:
        "Process Nozzles, Draw-off and Return Connections (leakage signs, support condition)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.4.4",
      component:
        "Manways and Flanged Openings (gasket staining, bolting integrity)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.4.5",
      component:
        "Tray/Internals Access Openings and Covers (external indications, distortion)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.4.6",
      component:
        "Reboiler/Condenser Tie-in Lines and Branches (leaks, vibration wear, supports)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.4.7",
      component:
        "Column Skirt, Base Ring and Anchor Bolts (corrosion, grout cracking, settlement)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.4.8",
      component:
        "Platforms, Ladders and Access Cage (integrity, corrosion, loose members)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.4.9",
      component:
        "Insulation/Cladding and CUI-Prone Areas (wet spots, cladding damage, corrosion bleed)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.4.10",
      component:
        "Nameplate and Process Identification/Tagging (legibility and correctness)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
  ],

  "Piping System (P)": [
    {
      sn: "3.5.1",
      component:
        "Main Pipe Runs and Routing (external corrosion, coating, alignment)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.5.2",
      component:
        "Welded Joints and HAZ Regions (surface cracking, corrosion at weld toes)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.5.3",
      component:
        "Flanged Joints, Gaskets and Bolting (leak marks, missing bolts, misalignment)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.5.4",
      component:
        "Valves, Valve Bodies and Actuators (packing leaks, damage, support)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.5.5",
      component:
        "Small Bore Connections and Instrument Tappings (fatigue cracks, vibration damage)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.5.6",
      component:
        "Pipe Supports, Shoes, Guides and Springs (load transfer, corrosion, displacement)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.5.7",
      component:
        "Expansion Loops/Bellows/Flexible Elements (distortion, tears, restraint condition)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.5.8",
      component:
        "Insulation and Weatherproofing (damage, CUI indications, open seams)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.5.9",
      component:
        "Pipe Rack Steelwork and Clamp Interfaces (corrosion, clamp wear, movement)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.5.10",
      component:
        "Leakage, Drips, Staining and Housekeeping Around Line (containment signs)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
  ],

  "Boiler (B)": [
    {
      sn: "3.6.1",
      component:
        "Boiler Drum/Shell and External Surface (corrosion, hot spots, coating damage)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.6.2",
      component:
        "Headers and External Tube Connections (leaks, distortion, corrosion)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.6.3",
      component:
        "Burner Front/Access Doors and Seals (warping, leakage, refractory distress)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.6.4",
      component:
        "Refractory Casing/Insulation Cladding (cracks, bulging, missing sections)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.6.5",
      component:
        "Steam/Feedwater Nozzles and Flanges (leak signs, gasket condition, bolting)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.6.6",
      component:
        "Safety Valves and Discharge Lines (damage, obstruction, leakage)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.6.7",
      component:
        "Economizer/Superheater External Surfaces (fouling, corrosion, leakage marks)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.6.8",
      component:
        "Boiler Supports, Frames and Anchor Points (corrosion, distortion, bolt integrity)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.6.9",
      component:
        "Access Platforms, Stairs and Handrails (mechanical condition, corrosion)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.6.10",
      component:
        "Nameplate/Tags and Warning Labels (legibility and attachment)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
  ],

  "Centrifugal Pump (P)": [
    {
      sn: "3.7.1",
      component:
        "Pump Casing and Cover Flanges (leakage, corrosion, impact damage)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.7.2",
      component: "Suction and Discharge Nozzles (strain, leaks, misalignment)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.7.3",
      component:
        "Mechanical Seal/Seal Pot Area (drips, flush line integrity, overheating signs)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.7.4",
      component:
        "Bearing Housings and Lubrication Points (leaks, discoloration, contamination)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.7.5",
      component:
        "Coupling, Guard and Alignment Indicators (damage, guard security)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.7.6",
      component:
        "Baseplate, Hold-down Bolts and Grout (looseness, cracks, soft foot indicators)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.7.7",
      component:
        "Auxiliary Piping and Instrument Connections (leaks, vibration, support)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.7.8",
      component: "External Vibration/Noise Indicators and Overall Condition",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
  ],

  "Centrifugal Compressor (K)": [
    {
      sn: "3.8.1",
      component:
        "Compressor Casing and Split Line (leaks, cracking, fastener condition)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.8.2",
      component:
        "Suction/Discharge Nozzles and Piping Interfaces (movement, leaks, stress)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.8.3",
      component:
        "Seal System (dry gas/oil seals) and Seal Piping (leakage, contamination)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.8.4",
      component:
        "Bearing Housing and Lube Oil Console Interfaces (leaks, temperature discoloration)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.8.5",
      component: "Coupling and Guard (condition, security, evidence of rub)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.8.6",
      component:
        "Driver-Compressor Skid, Hold-downs and Grout (integrity and settlement signs)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.8.7",
      component:
        "Anti-surge/Recycle Valves and Related Piping (leaks, support, accessibility)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.8.8",
      component: "General Vibration/Noise and External Mechanical Condition",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
  ],

  "Reciprocating Compressor (RK)": [
    {
      sn: "3.9.1",
      component:
        "Frame/Crankcase and Distance Piece (oil leaks, cracks, foundation bolts)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.9.2",
      component:
        "Cylinder Bodies, Heads and Valve Covers (leaks, hot spots, fastener condition)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.9.3",
      component:
        "Suction and Discharge Pulsation Bottles/Nozzles (supports, vibration, corrosion)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.9.4",
      component: "Packing Cases and Rod Seals (vent leakage, wear indicators)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.9.5",
      component:
        "Crosshead Guides and Lubrication Lines (leaks, looseness, contamination)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.9.6",
      component:
        "Intercooler/Aftercooler External Condition and Connections (leaks, corrosion)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.9.7",
      component:
        "Coupling/Belt Guard and Driver Interface (guard integrity, alignment indicators)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.9.8",
      component:
        "Skid Structure, Anchor Bolts and Grout (cracks, movement, corrosion)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.9.9",
      component: "General Vibration/Noise and Housekeeping Around Unit",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
  ],

  Default: [
    {
      sn: "3.0.1",
      component:
        "General External Condition (corrosion, coating, impact and deformation)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.0.2",
      component: "Welds/Joints/Connections (visible cracks, leaks, looseness)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.0.3",
      component:
        "Supports, Structures and Anchorage (integrity, alignment, settlement)",
      condition: "Satisfactory",
      notes: "",
      photoRef: "",
    },
    {
      sn: "3.0.4",
      component:
        "Tagging, Nameplate and Safety Markings (legibility and attachment)",
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
  const isViewOnly = user?.role === "Admin";
  const canSubmitInspection =
    user?.role === "Inspector" ||
    user?.role === "Lead Inspector" ||
    user?.role === "Supervisor" ||
    user?.role === "Manager";

  const [reportData, setReportData] = useState({
    general: {
      platform: " ",
      equipment: "",
      tag: "",
      reportNum: "",
      date: new Date().toISOString().split("T")[0],
      client: "",
      clientLogo: "",
      diagramImage: "",
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
    images: [],
  });
  const isSupervisorRole =
    user?.role === "Supervisor" || user?.role === "Lead Inspector";
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
    const initializeManifest = async () => {
      if (location.state?.preFill) {
        const p = location.state.preFill;
        const assignedInspectorName =
          p.inspectorName ||
          p.inspect_by ||
          p.inspector ||
          "";
        const selectedOperatingProcedure =
          p.selectedTechnique ||
          p.vesselOperatingProcedure ||
          "";
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
            inspect_by: assignedInspectorName,
            vesselOperatingProcedure: selectedOperatingProcedure,
            // Use projectId as the canonical correction key.
            projectId: projectBusinessId || projectDocId || "",
            // Keep the Firestore project document id for status sync updates.
            projectDocId,
          },
          observations: schema.map((item) => ({ ...item, photoRef: "" })),
        }));

        let resolvedProjectDocId = projectDocId;
        let resolvedProjectData = null;
        let existingReport = null;

        if (projectDocId) {
          const projectSnap = await getDoc(doc(db, "projects", projectDocId));
          if (projectSnap.exists()) {
            resolvedProjectData = projectSnap.data();
            resolvedProjectDocId = projectSnap.id;
          }
        }

        if (!resolvedProjectData && projectBusinessId) {
          const projectByBusinessIdQ = query(
            collection(db, "projects"),
            where("projectId", "==", projectBusinessId),
            limit(1),
          );
          const projectByBusinessIdSnap = await getDocs(projectByBusinessIdQ);
          if (!projectByBusinessIdSnap.empty) {
            const pDoc = projectByBusinessIdSnap.docs[0];
            resolvedProjectData = pDoc.data();
            resolvedProjectDocId = pDoc.id;
          }
        }

        if (resolvedProjectData?.report) {
          existingReport = resolvedProjectData.report;
        }

        if (existingReport) {
          const fetchedObservations = Array.isArray(existingReport?.observations)
            ? existingReport.observations
            : [];
          const mergedObservations =
            fetchedObservations.length > 0
              ? fetchedObservations.map((obs) => ({
                  ...obs,
                  photoRef: obs?.photoRef || "",
                }))
              : schema.map((item) => ({ ...item, photoRef: "" }));

          setReportData({
            ...existingReport,
            observations: mergedObservations,
            general: {
              ...existingReport.general,
              ...p,
              client: p.clientName || p.client || existingReport?.general?.client || "",
              platform: p.locationName || p.location || existingReport?.general?.platform || "",
              tag: p.equipmentTag || p.tag || existingReport?.general?.tag || "",
              projectId:
                projectBusinessId ||
                existingReport?.general?.projectId ||
                resolvedProjectDocId ||
                "",
              projectDocId:
                resolvedProjectDocId || existingReport?.general?.projectDocId || "",
              inspect_by:
                assignedInspectorName ||
                existingReport?.general?.inspect_by ||
                "",
              vesselOperatingProcedure:
                selectedOperatingProcedure ||
                existingReport?.general?.vesselOperatingProcedure ||
                "",
            },
          });
          toast.info("Previous inspection details loaded for correction.");
        } else {
          setReportData((prev) => ({
            ...prev,
            observations: schema.map((item) => ({ ...item, photoRef: "" })),
            general: {
              ...prev.general,
              ...p,
              client: p.clientName || p.client || "",
              platform: p.locationName || p.location || "",
              tag: p.equipmentTag || p.tag || "",
              inspect_by: assignedInspectorName,
              vesselOperatingProcedure: selectedOperatingProcedure,
              projectId: projectBusinessId || resolvedProjectDocId || "",
              projectDocId: resolvedProjectDocId || "",
            },
          }));
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
    if (!canSubmitInspection) {
      toast.error(
        "You do not have permission to submit or save this inspection.",
      );
      return;
    }

    setIsSaving(true);

    // 1. DYNAMIC WORKFLOW LOGIC
    let workflowStatus = "Forwarded to Inspector"; // Default for "Save Draft"

    if (isFinalizing) {
      // When Inspector submits, it skips "Review" and goes straight to "Pending Confirmation"
      if (isFinalizing && user?.role === "Inspector") {
        workflowStatus = "Pending Confirmation";
      }
      // When Lead Inspector submits, it moves to "Authorized"
      else if (user?.role === "Lead Inspector") {
        workflowStatus = "Completed";
      }
    } else {
      // If NOT finalizing (just saving draft), keep current status
      workflowStatus = reportData.status || "Forwarded to Inspector";
    }

    const currentUserIdentifier =
      user?.displayName || user?.name || user?.email || "Technical User";

    try {
      const targetProjectDocId =
        reportData.general.projectDocId || location.state?.preFill?.id || "";
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

      if (!projectRef) {
        toast.error("Project reference not found. Please reload and try again.");
        return;
      }

      const reportPayload = {
        ...reportData,
        technique: "Visual (VT)",
        inspector: currentUserIdentifier,
        inspectorUid: user.uid,
        status: workflowStatus,
        roleAtSubmission: user?.role || "Inspector",
        updatedAt: serverTimestamp(),
      };

      // Final mapping for the Project collection
      let projectFinalStatus = workflowStatus;
      if (workflowStatus === "Authorized") {
        projectFinalStatus = "Completed";
      }

      await setDoc(
        projectRef,
        {
          report: reportPayload,
          status: projectFinalStatus,
          lastModifiedBy: currentUserIdentifier,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      toast.success(
        isFinalizing
          ? `Manifest sent for Confirmation ${user.role}`
          : "Technical draft synced",
      );

      if (isFinalizing) setReportMode(true);
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
    const actionRequiredCount = Math.max(
      observations.length - satisfactoryCount,
      0,
    );
    const refineryHeroSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900'><defs><linearGradient id='bg' x1='0' y1='0' x2='0' y2='1'><stop offset='0%' stop-color='#cbd5e1'/><stop offset='100%' stop-color='#e2e8f0'/></linearGradient><linearGradient id='ground' x1='0' y1='0' x2='0' y2='1'><stop offset='0%' stop-color='#64748b'/><stop offset='100%' stop-color='#334155'/></linearGradient></defs><rect width='1600' height='900' fill='url(#bg)'/><rect y='680' width='1600' height='220' fill='url(#ground)'/><rect x='150' y='380' width='140' height='300' fill='#475569'/><rect x='170' y='320' width='100' height='70' fill='#64748b'/><rect x='400' y='270' width='120' height='410' fill='#334155'/><rect x='430' y='210' width='60' height='60' fill='#64748b'/><rect x='620' y='430' width='220' height='250' fill='#475569'/><rect x='900' y='340' width='100' height='340' fill='#334155'/><rect x='1030' y='410' width='170' height='270' fill='#475569'/><rect x='1240' y='300' width='80' height='380' fill='#334155'/><rect x='1340' y='450' width='120' height='230' fill='#475569'/><rect x='280' y='520' width='1100' height='18' fill='#94a3b8'/><circle cx='220' cy='300' r='22' fill='#f59e0b' opacity='0.9'/><text x='800' y='120' text-anchor='middle' font-family='Arial' font-size='54' fill='#1e293b' font-weight='700'>REFINERY EQUIPMENT</text></svg>",
    )}`;

    const standardsUsed = [
      reportData.general.defaultStandard,
      reportData.general.designCode,
      reportData.general.assetType,
      "API 510 / API 570 / API 653 (as applicable)",
    ].filter(Boolean);

    const classifyFinding = (condition) => {
      const normalized = (condition || "").toLowerCase();
      if (normalized === "satisfactory") return "Acceptable";
      if (normalized.includes("minor") || normalized.includes("monitor"))
        return "Monitor";
      return "Action Required";
    };

    const findingClassName = (classification) => {
      if (classification === "Acceptable") return "text-emerald-700";
      if (classification === "Monitor") return "text-amber-700";
      return "text-red-700";
    };

    const SignatureBlock = ({ label, name }) => (
      <div className="space-y-4 ">
        <p className="text-[9px] font-black uppercase text-slate-400">
          {label}
        </p>
        <div className="border-b-2 border-slate-950 pb-1 font-serif italic text-lg text-slate-900">
          {name || "____________________"}
        </div>
        <p className="text-[8px] text-slate-500 uppercase">
          Electronic Verification Signature
        </p>
      </div>
    );

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
          }
        `}</style>
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
          <div className="report-page bg-white text-slate-950 p-4 sm:p-8 print:p-[20mm] min-h-[297mm] flex flex-col page-break">
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
              <div className="text-center mb-10">
                <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-slate-900">
                  Visual Inspection Report
                </h1>
                <p className="mt-3 text-[11px] md:text-sm text-slate-600 uppercase tracking-[0.24em] font-bold">
                  Visual Testing (VT) | Condition and Integrity Screening
                </p>
                <div className="mt-4 mx-auto h-1 w-28 rounded-full bg-gradient-to-r from-blue-700 via-slate-500 to-orange-500" />
              </div>

              <div className="mb-8 rounded-2xl border border-slate-300 overflow-hidden bg-slate-50">
                <div className="bg-slate-100 px-5 py-2 border-b border-slate-300">
                  
                </div>
                <img
                  src={refineryHeroSvg}
                  alt="Visual inspection"
                  className="w-full h-[340px] object-cover"
                />
              </div>

            </div>

            <div className="mt-auto rounded-2xl border border-slate-300 overflow-hidden">
              <div className="bg-slate-100 px-5 py-2 border-b border-slate-300">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-600 text-center">
                  Findings Statistics
                </h4>
              </div>
              <table className="w-full border-collapse">
                <tbody>
                  <tr>
                    <td className="py-3 px-4 text-[11px] font-black uppercase text-slate-500 border-r border-slate-200">
                      Total Findings
                    </td>
                    <td className="py-3 px-4 text-xl font-black text-slate-900 border-r border-slate-200">
                      {observations.length}
                    </td>
                    <td className="py-3 px-4 text-[11px] font-black uppercase text-emerald-700 border-r border-slate-200">
                      Acceptable
                    </td>
                    <td className="py-3 px-4 text-xl font-black text-emerald-700 border-r border-slate-200">
                      {satisfactoryCount}
                    </td>
                    <td className="py-3 px-4 text-[11px] font-black uppercase text-red-700 border-r border-slate-200">
                      Action Required
                    </td>
                    <td className="py-3 px-4 text-xl font-black text-red-700">
                      {actionRequiredCount}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="report-page bg-white text-slate-950 p-4 sm:p-8 print:p-[20mm] min-h-[297mm] flex flex-col page-break">
            <h3 className="text-sm font-black uppercase border-b-2 border-slate-900 pb-2 mb-8">
              Section 00: Inspection Overview
            </h3>
            
            <div className="mb-8 rounded-2xl border border-slate-300 overflow-hidden shadow-sm">
              <div className="bg-slate-100 px-5 py-3 border-b border-slate-300">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-700 text-center">
                  Inspection Information Summary
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-300">
                      <th className="text-left py-2 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Project Information
                      </th>
                      <th className="text-left py-2 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Value
                      </th>
                      <th className="text-left py-2 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Asset Information
                      </th>
                      <th className="text-left py-2 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px]">
                    <tr className="border-b border-slate-200">
                      <td className="py-3 px-4 font-bold text-slate-700">
                        Client
                      </td>
                      <td className="py-3 px-4 text-slate-900">
                        {reportData.general.client || "N/A"}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-700">
                        Asset Tag
                      </td>
                      <td className="py-3 px-4 text-slate-900">
                        {reportData.general.tag || "N/A"}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200 bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-700">
                        Facility / Location
                      </td>
                      <td className="py-3 px-4 text-slate-900">
                        {reportData.general.platform || "N/A"}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-700">
                        Asset Type
                      </td>
                      <td className="py-3 px-4 text-slate-900">
                        {reportData.general.assetType || "N/A"}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-3 px-4 font-bold text-slate-700">
                        Report Number
                      </td>
                      <td className="py-3 px-4 text-slate-900">
                        {reportData.general.reportNum || "N/A"}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-700">
                        Equipment Class
                      </td>
                      <td className="py-3 px-4 text-slate-900">
                        {reportData.general.equipment || "N/A"}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200 bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-700">
                        Inspection Date
                      </td>
                      <td className="py-3 px-4 text-slate-900">
                        {reportData.general.date || "N/A"}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-700">
                        Ambient Temp
                      </td>
                      <td className="py-3 px-4 text-slate-900">{`${reportData.environmental.temp || "N/A"} C`}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-8">
              <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3">
                Scope & Reference Standards
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed mb-3">
                This report presents visual inspection findings for externally
                accessible components. Scope includes visible corrosion, coating
                condition, leaks, deformation, mechanical damage, and general
                asset integrity indicators.
              </p>
              <ul className="text-xs text-slate-700 list-disc pl-4 space-y-1">
                {standardsUsed.map((standard, idx) => (
                  <li key={`${standard}-${idx}`}>{standard}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="report-page bg-white text-slate-950 p-4 sm:p-8 print:p-[20mm] min-h-[297mm] flex flex-col page-break">
            <h3 className="text-sm font-black uppercase border-b-2 border-slate-900 pb-2 mb-8 flex items-center gap-2">
              <ShieldCheck size={16} className="text-orange-600" /> Section 01:
              Findings Register
            </h3>


            <table className="w-full text-left border-collapse mb-10">
              <thead>
                <tr className="bg-slate-100 border-y border-slate-300">
                  <th className="py-3 px-3 text-[10px] font-black uppercase">
                    Ref
                  </th>
                  <th className="py-3 px-3 text-[10px] font-black uppercase">
                    Component
                  </th>
                  <th className="py-3 px-3 text-[10px] font-black uppercase">
                    Observed Condition
                  </th>
                  <th className="py-3 px-3 text-[10px] font-black uppercase">
                    Classification
                  </th>
                  <th className="py-3 px-3 text-[10px] font-black uppercase">
                    Remarks / Evidence
                  </th>
                </tr>
              </thead>
              <tbody className="text-[11px] divide-y divide-slate-200">
                {observations.map((obs) => {
                  const classification = classifyFinding(obs.condition);
                  return (
                    <tr key={obs.sn}>
                      <td className="p-4 font-mono font-bold">{obs.sn}</td>
                      <td className="p-4 font-bold uppercase">
                        {obs.component}
                      </td>
                      <td className="p-4">
                        <span
                          className={`font-black uppercase ${
                            obs.condition === "Satisfactory"
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {obs.condition}
                        </span>
                      </td>
                      <td
                        className={`p-4 font-black uppercase ${findingClassName(classification)}`}
                      >
                        {classification}
                      </td>
                      <td className="p-4 italic text-slate-600">
                        {obs.notes ||
                          "No adverse condition observed during VT."}
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
                  Address all items classified as{" "}
                  <span className="font-black">Action Required</span> before the
                  next operational cycle.
                </li>
                <li>
                  Items classified as{" "}
                  <span className="font-black">Monitor</span> should be trended
                  and reassessed at the next planned inspection interval.
                </li>
                <li>
                  Re-inspection interval should align with asset criticality and
                  the site integrity management plan.
                </li>
              </ul>
            </div>

            {evidencePhotos.length === 0 && (
              <div className="mt-auto grid grid-cols-3 gap-10">
                <SignatureBlock
                  label="Field Inspector"
                  name={reportData.inspector}
                />
                <SignatureBlock
                  label="Lead Inspector"
                  name={reportData.LeadInspector}
                />
                <SignatureBlock
                  label="Authorized By"
                  name={user?.displayName || user?.name || user?.email}
                />
              </div>
            )}

            {evidencePhotos.length === 0 && (
              <div className="mt-auto pt-10 border-t-4 border-slate-900 text-center">
                <p className="text-[10px] font-black text-red-600 tracking-[0.4em]">
                  CONTROLLED ENGINEERING DOCUMENT - CONFIDENTIAL
                </p>
              </div>
            )}
          </div>

          {evidencePhotos.length > 0 && (
            <div className="report-page bg-white text-slate-950 p-4 sm:p-8 print:p-[20mm] min-h-[297mm] page-break flex flex-col">
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
                      <span className="text-[10px] font-black uppercase">
                        Ref {obs.sn}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase truncate">
                        {obs.component?.split("(")[0] || "Component"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-auto">
                <div className="grid grid-cols-3 gap-10 pt-10">
                  <SignatureBlock
                    label="Field Inspector"
                    name={reportData.inspector}
                  />
                  <SignatureBlock
                    label="Lead Inspector"
                    name={reportData.LeadInspector}
                  />
                  <SignatureBlock
                    label="Authorized By"
                    name={user?.displayName || user?.name || user?.email}
                  />
                </div>
                <div className="pt-10 border-t-4 border-slate-900 text-center">
                  <p className="text-[10px] font-black text-red-600 tracking-[0.4em]">
                    CONTROLLED ENGINEERING DOCUMENT - CONFIDENTIAL
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  const IntegrityStyleWebView = () => {
    const observations = reportData.observations || [];
    const photoItems = observations.filter((obs) => obs.photoRef);
    const photosPerPage = 6;
    const photoPages = Math.max(1, Math.ceil(photoItems.length / photosPerPage));
    const totalPages = 4 + photoPages;
    const photoChunks = Array.from({ length: photoPages }, (_, idx) =>
      photoItems.slice(idx * photosPerPage, (idx + 1) * photosPerPage),
    );

    const Header = () => (
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
    );

    const Footer = ({ page }) => (
      <div className="relative mt-auto px-12 pb-8">
        <div className="pt-6 border-t-2 border-slate-900/80 text-center">
          <p className="text-[10px] font-black text-red-600 tracking-[0.4em]">
            Original Document
          </p>
        </div>
        <div className="pt-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">
          Page {page} of {totalPages}
        </div>
      </div>
    );

    const PageShell = ({ children }) => (
      <div className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute -top-24 -left-20 h-64 w-64 rounded-full bg-blue-100/70 blur-2xl" />
          <div className="absolute top-24 -right-20 h-72 w-72 rounded-full bg-cyan-100/70 blur-2xl" />
          <div className="absolute bottom-16 left-1/3 h-64 w-64 rounded-full bg-indigo-100/60 blur-2xl" />
        </div>
        {children}
      </div>
    );

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
          }
        `}</style>
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
          <PageShell>
            <Header />
            <div className="relative flex-1 flex flex-col items-center justify-center text-center px-10">
              <div className="mb-6 text-[11px] font-black uppercase tracking-[0.4em] text-slate-500">
                Technical Inspection Report
              </div>
              <h1 className="text-5xl md:text-6xl font-extrabold text-blue-700 tracking-tight drop-shadow-sm">
                Visual Inspection
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
          </PageShell>

          <PageShell>
            <Header />
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
                    <div className="font-bold uppercase text-slate-500">Client</div>
                    <div className="font-bold text-slate-800">{reportData?.general?.client || "N/A"}</div>
                  </div>
                  <div className="p-3 space-y-1">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="font-bold uppercase text-slate-500">Report Number</div>
                      <div className="font-bold">{reportData?.general?.reportNum || "N/A"}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="font-bold uppercase text-slate-500">Contract Number</div>
                      <div className="font-bold">{reportData?.general?.contractNum || "N/A"}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="font-bold uppercase text-slate-500">Date of Inspection</div>
                      <div className="font-bold">{reportData?.general?.date || "N/A"}</div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 border-b border-slate-200 text-[10px]">
                  <div className="border-r border-slate-200 p-3">
                    <div className="font-bold uppercase text-slate-500">Location</div>
                    <div className="font-bold text-slate-800">{reportData?.general?.platform || "N/A"}</div>
                  </div>
                  <div className="p-3">
                    <div className="font-bold uppercase text-slate-500">Inspected By</div>
                    <div className="font-bold">{reportData?.general?.inspect_by || "N/A"}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 border-b border-slate-200 text-[10px]">
                  <div className="border-r border-slate-200 p-3">
                    <div className="font-bold uppercase text-slate-500">Asset Tag</div>
                    <div className="font-bold">{reportData?.general?.tag || "N/A"}</div>
                  </div>
                  <div className="p-3">
                    <div className="font-bold uppercase text-slate-500">Asset Type</div>
                    <div className="font-bold">{reportData?.general?.assetType || reportData?.general?.equipment || "N/A"}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 text-[10px]">
                  <div className="border-r border-slate-200 p-3">
                    <div className="font-bold uppercase text-slate-500">Test Code</div>
                    <div className="text-red-600 font-black">{reportData?.general?.testCode || "N/A"}</div>
                  </div>
                  <div className="p-3">
                    <div className="font-bold uppercase text-slate-500">Ambient Temp</div>
                    <div className="font-bold">{reportData?.environmental?.temp || "N/A"} C</div>
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
                      <th className="border-r border-slate-200 p-2">Description</th>
                      <th className="p-2 w-20">Page No.</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-800">
                    {[
                      { sn: "1.0", desc: "Overview", page: "2" },
                      { sn: "2.0", desc: "Schematic Diagram for Item Identification", page: "3" },
                      { sn: "3.0", desc: "Summary of Inspection Findings", page: "4" },
                      { sn: "4.0", desc: "Photographic Details", page: "5+" },
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
            <Footer page={2} />
          </PageShell>

          <PageShell>
            <Header />
            <div className="relative flex-1 flex flex-col px-12 pt-10 gap-8">
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
            <Footer page={3} />
          </PageShell>

          <PageShell>
            <Header />
            <div className="relative flex-1 flex flex-col px-12 pt-10 gap-8">
              <div className="text-center space-y-2">
                <div className="text-sm font-black uppercase tracking-wide text-slate-900">
                  3.0 Summary of Inspection Findings
                </div>
                <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em]">
                  Visual Observations
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-xl shadow-blue-200/40 p-6">
                {observations.length ? (
                  <ol className="space-y-5 text-[11px] leading-relaxed text-slate-700">
                    {observations.map((item, idx) => (
                      <li
                        key={item.sn || item.id || idx}
                        className="rounded-2xl border border-slate-200 bg-white/70 p-4"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4 items-start">
                          <div className="flex items-start gap-3 min-w-0">
                            <span className="text-red-600 font-black">
                              {idx + 1}.
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-red-600 uppercase">
                                {item.component || item.title || "Observation"}
                              </div>
                              <p className="mt-1 text-slate-700 break-words">
                                {item.notes ||
                                  item.description ||
                                  "No adverse condition observed."}
                              </p>
                            </div>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white p-3 flex items-center justify-center min-h-[180px]">
                            {item.photoRef ? (
                              <img
                                src={item.photoRef}
                                alt={item.component || "Observation"}
                                className="max-h-[200px] w-auto object-contain"
                              />
                            ) : (
                              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] text-center">
                                No Image
                              </div>
                            )}
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
            <Footer page={4} />
          </PageShell>

          {photoChunks.map((chunk, pageIdx) => {
            const pageNumber = 5 + pageIdx;
            return (
              <PageShell key={`photo-page-${pageIdx}`}>
                <Header />
                <div className="relative flex-1 flex flex-col px-12 pt-10 gap-8">
                  <div className="text-center space-y-2">
                    <div className="text-sm font-black uppercase tracking-wide text-slate-900">
                      4.0 Photographic Details
                    </div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em]">
                      Evidence Gallery
                    </p>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-xl shadow-blue-200/40 p-6">
                    {chunk.length ? (
                      <div className="grid grid-cols-2 gap-4">
                        {chunk.map((o, idx) => (
                          <div key={o.sn || o.id || idx} className="space-y-2">
                            <div className="border border-slate-200 rounded-2xl bg-white p-2 flex items-center justify-center">
                              <img
                                src={o.photoRef}
                                alt={o.component || `Evidence ${idx + 1}`}
                                className="h-[180px] w-auto object-contain"
                              />
                            </div>
                            <div className="text-[10px] text-slate-700 text-center font-semibold">
                              {o.component?.split("(")[0] || `Evidence ${idx + 1}`}
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
                <Footer page={pageNumber} />
              </PageShell>
            );
          })}
        </div>
      </div>
    );
  };

  if (reportMode) return <IntegrityStyleWebView />;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <Navbar />
      <div className="flex">
        <Sidebar />
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
                  <Eye className="text-orange-500" /> Visual Inspection
                </h1>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setReportMode(true)}
                  className="bg-blue-800 uppercase px-6 py-2 rounded-xl text-xs font-bold border border-slate-700 hover:bg-slate-700 transition-all"
                >
                  Preview report
                </button>
                {canSubmitInspection && (
                  <button
                    onClick={handleSaveToFirebase}
                    disabled={isSaving}
                    className="bg-orange-600 px-6 py-2 rounded-xl text-xs font-bold uppercase shadow-lg shadow-orange-900/20 active:scale-95 transition-all"
                  >
                    {isSaving
                      ? "Syncing..."
                      : user?.role === "Inspector"
                        ? "Send for confirmation"
                        : "ADD CHANGES"}
                  </button>
                )}
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
                  readOnly={isViewOnly}
                />
                <InputField
                  label="Contract Number"
                  value={reportData.general.contractNum}
                  onChange={(v) => setGeneralField("contractNum", v)}
                  readOnly={isViewOnly}
                />
                <InputField
                  label="Date of Inspection"
                  type="date"
                  value={reportData.general.date}
                  onChange={(v) => setGeneralField("date", v)}
                  readOnly={isViewOnly}
                />
                <InputField
                  label="Inspected By"
                  value={reportData.general.inspect_by}
                  onChange={(v) => setGeneralField("inspect_by", v)}
                  readOnly={isViewOnly}
                />
                <InputField
                  label="Test Code"
                  value={reportData.general.testCode}
                  onChange={(v) => setGeneralField("testCode", v)}
                  readOnly={isViewOnly}
                />
                <InputField
                  label="Operating Procedure"
                  value={reportData.general.vesselOperatingProcedure || ""}
                  onChange={(v) =>
                    setGeneralField("vesselOperatingProcedure", v)
                  }
                  readOnly={isViewOnly}
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
                  readOnly={isViewOnly}
                />
                <InputField
                  label="Report Number"
                  value={reportData.general.reportNum}
                  onChange={(v) => setGeneralField("reportNum", v)}
                  readOnly={isViewOnly}
                />

                <InputField
                  label="Ambient Temp (C)"
                  value={reportData.environmental.temp}
                  onChange={(v) => setEnvironmentalField("temp", v)}
                  readOnly={isViewOnly}
                />
              </div>

              <div className="mt-6 bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Upload SCHEMATIC DIAGRAM FOR ITEM IDENTIFICATION
                </label>
                <div className="mt-3 flex items-center gap-3">
                  <label
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold uppercase tracking-widest text-slate-300 transition-colors ${
                      isViewOnly
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:text-white hover:border-orange-500 cursor-pointer"
                    }`}
                  >
                    <Camera size={14} /> Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isViewOnly}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          setGeneralField("diagramImage", reader.result);
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
                        disabled={isViewOnly}
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
                        readOnly={isViewOnly}
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
                    <div className="col-span-2 flex items-center justify-center gap-2">
                      <label
                        className={`p-3 bg-slate-950 rounded-full border border-slate-800 transition-all text-slate-500 shadow-inner group ${
                          isViewOnly
                            ? "opacity-50 cursor-not-allowed"
                            : "cursor-pointer hover:border-orange-500 hover:text-orange-500"
                        }`}
                      >
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
                          disabled={isViewOnly}
                          onChange={(e) => handlePhotoUpload(e, idx)}
                        />
                      </label>
                      {item.photoRef ? (
                        <img
                          src={item.photoRef}
                          alt={`Evidence ${item.sn}`}
                          className="w-12 h-12 rounded-lg object-cover border border-slate-700"
                        />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              {user?.role === "Inspector" && (
                <div className="mt-8 flex justify-end">
                  <button
                    onClick={handleSaveToFirebase}
                    disabled={isSaving}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 px-6 py-2 rounded-xl text-xs font-bold uppercase shadow-lg shadow-emerald-900/20 active:scale-95 transition-all"
                  >
                    {isSaving ? "Saving..." : "Save Inspection"}
                  </button>
                </div>
              )}
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

