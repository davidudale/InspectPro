/* eslint-disable no-unused-vars */
import React, { useEffect, useRef, useState } from "react";
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
import { getToastErrorMessage } from "../../../../utils/toast";
import { useAuth } from "../../../Auth/AuthContext";
import html2pdf from "html2pdf.js";

const PIPE_COMPONENT_OPTIONS = [
  "Straight Pipe Runs, Expansion Joints, including where Pipe Rests on Supports",
  "Branch Connections, Including Reinforcement Pads",
  "Elbows, Reducer & Tees",
  "Small Piping Takeoffs (Valves and Piping) Including Gussets",
  "In-line Valves (Block, Check, Control) etc.",
  "Dead Leg(s)",
  "Filter, Strainer, etc",
  "Thermowells & Temperature Indicating Instruments",
  "Orifice Taps",
  "Insulation/Weatherproofing/Jacketing",
  "Temporary Repair Clamps/Enclosures",
];
const ADD_PIPE_COMPONENT_OPTION = "+ Add Pipe Component";
const PIPE_SUPPORT_OPTIONS = [
  "Base Supports / Tee Slides / 'H' Slides",
  "Spring hangers / Support Rods Including Pipe Clamps",
  "Dummy Legs",
  "Anchors/Restraints/Guides",
];
const ADD_PIPE_SUPPORT_OPTION = "+ Add Pipe Support";
const SPECIAL_CONSIDERATION_OPTIONS = [
  "Injection Points",
  "Safety Valve and Associated piping",
];
const ADD_SPECIAL_CONSIDERATION_OPTION = "+ Add Special Consideration";
const normalizePhotoEntries = (item) => {
  const list = Array.isArray(item?.photos) ? item.photos : [];
  const normalizedList = list
    .map((entry, idx) => ({
      id: String(entry?.id || `${Date.now()}-${idx}`),
      url: String(entry?.url || entry?.photo || "").trim(),
      note: String(entry?.note || "").trim(),
    }))
    .filter((entry) => entry.url);

  if (normalizedList.length) return normalizedList;
  if (item?.photo) {
    return [
      {
        id: `${Date.now()}-legacy`,
        url: String(item.photo || "").trim(),
        note: String(item.photoNote || "").trim(),
      },
    ].filter((entry) => entry.url);
  }
  return [];
};

const UTReport = ({
  reportData: reportDataProp,
  companyLogo: companyLogoProp,
  onBack,
  hideControls = false,
  hideSaveReportButton = false,
}) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [projectDocId, setProjectDocId] = useState("");
  const [reportMode, setReportMode] = useState(false);
  const [companyLogo, setCompanyLogo] = useState(companyLogoProp || "");
  const createReportNumber = () => {
    const year = String(new Date().getFullYear()).slice(-2);
    const sequence = String(Math.floor(1 + Math.random() * 999)).padStart(
      3,
      "0",
    );
    return `PEL-WPQ/${year}/${sequence}`;
  };
  const [reportData, setReportData] = useState({
    type: "Ultrasonic Test",
    status: user?.role === "Inspector" ? "New" : "Draft",
    general: {
      client: "",
      platform: "",
      tag: "",
      reportNum: createReportNumber(),
      date: "",
      equipment: "",
      customPipeComponents: [],
      customPipeSupports: [],
      customSpecialConsiderations: [],
      diagramImage: "",
      diagramImageNote: "",
      pidImage: "",
      pidImageNote: "",
      inspectedEquipmentImage: "",
      inspectedEquipmentImageNote: "",
      projectId: "",
      inspectionType: "",
    },
    inspection: {
      scope: "",
      method: "",
      findings: "",
      corrosion: "",
      defects: "",
      recommendations: "",
      conclusion: "",
      schematicTitle: "",
      schematicSubtitle: "",
      schematicNotes: "",
      pidTitle: "",
      pipeSupportNotes:
        "Inspected for mechanical damage, sagging, distortion, coating failure, corrosion, pitting, cracks in welds, vibration, corrosion under pipe supports, etc. as applicable.",
      specialConsiderationNotes:
        "Inspected for signs of leakage, mechanical damage, coating failure, corrosion, pitting, cracks in welds, vibration, etc. as applicable.",
    },
    observations: [
      {
        id: Date.now(),
        title: "",
        refSn: "",
        equipmentId: "",
        equipmentDescription: "",
        pageNo: "",
        description: "",
        photo: "",
        photoNote: "",
      },
    ],
    checklist: [
      {
        id: `${Date.now()}-checklist`,
        equipmentId: "",
        equipmentDescription: "",
        anomaly: "No",
        pageNo: "",
        photo: "",
        photoNote: "",
        photos: [],
      },
    ],
    pipeSupports: [
      {
        id: `${Date.now()}-support`,
        equipmentDescription: "",
        anomaly: "N/A.",
        pageNo: "",
        photo: "",
        photoNote: "",
        photos: [],
      },
    ],
    specialConsiderations: [
      {
        id: `${Date.now()}-special`,
        equipmentDescription: "",
        anomaly: "N/A.",
        pageNo: "NA",
        photo: "",
        photoNote: "",
        photos: [],
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
      supervisor: "",
      manager: "",
      inspectorQualification: "",
      reviewerQualification: "",
      managerQualification: "",
      inspectorSignature: "",
      reviewerSignature: "",
      managerSignature: "",
    },
    customSections: [],
  });
  useEffect(() => {
    if (!reportDataProp) return;
    setReportData((prev) => ({
      ...prev,
      ...reportDataProp,
      general: { ...prev.general, ...(reportDataProp.general || {}) },
      inspection: { ...prev.inspection, ...(reportDataProp.inspection || {}) },
      observations:
        reportDataProp.observations && reportDataProp.observations.length
          ? reportDataProp.observations
          : prev.observations,
      checklist:
        reportDataProp.checklist && reportDataProp.checklist.length
          ? reportDataProp.checklist
          : prev.checklist,
      pipeSupports:
        reportDataProp.pipeSupports && reportDataProp.pipeSupports.length
          ? reportDataProp.pipeSupports
          : prev.pipeSupports,
      specialConsiderations:
        reportDataProp.specialConsiderations &&
        reportDataProp.specialConsiderations.length
          ? reportDataProp.specialConsiderations
          : prev.specialConsiderations,
      signoff: { ...prev.signoff, ...(reportDataProp.signoff || {}) },
      customSections:
        reportDataProp.customSections || prev.customSections || [],
      utm: reportDataProp.utm || prev.utm || [],
    }));
  }, [reportDataProp]);
  const [tocSelection, setTocSelection] = useState("");
  const tocOptions = [
    { label: "1.0 Introduction", target: "toc-introduction" },
    { label: "2.0 Executive Summary", target: "toc-summary" },
    {
      label: "3.0 Inspection Findings",
      target: "toc-overview",
    },
    { label: "4.0 UTM Readings", target: "toc-pipe-supports" },
    {
      label: "5.0 Schematics of Anomaly",
      target: "toc-schematics",
    },
    { label: "6.0 P & ID of Anomaly", target: "toc-pid-anomaly" },
    {
      label: "7.0 Schematic of Inspected Equipment/Piping/Structure",
      target: "toc-inspected-equipment",
    },
    { label: "8.0 Photographic Details", target: "toc-photos" },
    ...(reportData.customSections || []).map((section, idx) => ({
      label: `C${idx + 1}. ${section.title || "Custom Section"}`,
      target: `toc-custom-${section.id}`,
    })),
  ];
  const isSupervisorRole =
    user?.role === "External_Reviewer" || user?.role === "Lead Inspector";
  const canSaveReport =
    user?.role === "Inspector" ||
    user?.role === "Lead Inspector" ||
    user?.role === "External_Reviewer" ||
    user?.role === "Manager";
  const canSendForConfirmation = canSaveReport;
  const canViewInspectorSignature = [
    "Inspector",
    "Lead Inspector",
    "External_Reviewer",
    "Manager",
    "Admin",
  ].includes(user?.role);
  const canEditInspectorSignature =
    user?.role === "Inspector" || user?.role === "Admin";
  const canViewLeadSignature = [
    "Lead Inspector",
    "External_Reviewer",
    "Manager",
    "Admin",
  ].includes(user?.role);
  const canEditLeadSignature =
    user?.role === "Lead Inspector" ||
    user?.role === "External_Reviewer" ||
    user?.role === "Admin";
  const canViewManagerSignature =
    user?.role === "Manager" || user?.role === "Admin";
  const canEditManagerSignature =
    user?.role === "Manager" || user?.role === "Admin";
  // Role-aware visibility for signoff name fields.
  const canViewInspectorField = canViewInspectorSignature;
  const canViewLeadField = canViewLeadSignature;
  const canViewManagerField = canViewManagerSignature;
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
      const prefillInspectorName =
        p.inspectorName || p.assignedInspectorName || "";
      const prefillSupervisorName =
        p.supervisorName || p.assignedSupervisorName || "";
      const prefillManagerName =
        p.managerName || p.assignedManagerName || "";

      setReportData((prev) => ({
        ...prev,
        general: {
          ...prev.general,
          tag: p.equipmentTag || p.tag || "",
          equipment: p.equipmentCategory || p.assetType || p.equipment || "",
          platform: p.locationName || p.location || "",
          client: p.clientName || p.client || "",
          contract: p.contractNumber || p.contract || prev.general.contract || "",
          projectName: p.projectName || p.project || "",
          inspectionTypeName: p.inspectionTypeName || "",
          inspectionTypeCode: p.inspectionTypeCode || "",
          clientLogo: p.clientLogo || p.logo || prev.general.clientLogo || "",
          reportNum: p.reportNum || p.reportNo || prev.general.reportNum,
          date: new Date().toISOString().split("T")[0],
          projectId: projectKey,
          supervisorName: p.supervisorName || p.assignedSupervisorName || "",
          assignedSupervisorName:
            p.assignedSupervisorName || p.supervisorName || "",
        },
        signoff: {
          ...prev.signoff,
          inspector: prev.signoff.inspector || prefillInspectorName,
          reviewer: prev.signoff.reviewer || prefillSupervisorName,
          manager: prev.signoff.manager || prefillManagerName,
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
            general: {
              ...existingData.general,
              clientLogo:
                existingData?.general?.clientLogo ||
                projectData?.clientLogo ||
                projectData?.client?.logo ||
                "",
              projectName:
                existingData?.general?.projectName ||
                projectData?.projectName ||
                "",
              inspectionTypeName:
                existingData?.general?.inspectionTypeName ||
                projectData?.inspectionTypeName ||
                "",
              inspectionTypeCode:
                existingData?.general?.inspectionTypeCode ||
                projectData?.inspectionTypeCode ||
                "",
            },
            signoff: {
              ...(existingData.signoff || {}),
              inspector:
                existingData?.signoff?.inspector ||
                projectData?.inspectorName ||
                prefillInspectorName ||
                "",
              reviewer:
                existingData?.signoff?.reviewer ||
                projectData?.supervisorName ||
                prefillSupervisorName ||
                "",
              manager:
                existingData?.signoff?.manager ||
                projectData?.managerName ||
                prefillManagerName ||
                "",
            },
          });
          toast.info("Previous ultrasonic Thickness report loaded for correction.");
        } else if (projectData?.status) {
          setReportData((prev) => ({
            ...prev,
            status: projectData.status,
            general: {
              ...prev.general,
              clientLogo:
                prev.general.clientLogo ||
                projectData?.clientLogo ||
                projectData?.client?.logo ||
                "",
              projectName:
                prev.general.projectName || projectData?.projectName || "",
              inspectionTypeName:
                prev.general.inspectionTypeName ||
                projectData?.inspectionTypeName ||
                "",
              inspectionTypeCode:
                prev.general.inspectionTypeCode ||
                projectData?.inspectionTypeCode ||
                "",
            },
            signoff: {
              ...prev.signoff,
              inspector:
                prev.signoff.inspector ||
                projectData?.inspectorName ||
                prefillInspectorName ||
                "",
              reviewer:
                prev.signoff.reviewer ||
                projectData?.supervisorName ||
                prefillSupervisorName ||
                "",
              manager:
                prev.signoff.manager ||
                projectData?.managerName ||
                prefillManagerName ||
                "",
            },
          }));
        }
      } else if (projectKey) {
        setProjectDocId(projectKey);
      }
    };

    initializeFromPrefill();
  }, [location.state, user?.role]);

  useEffect(() => {
    if (companyLogoProp) {
      setCompanyLogo(companyLogoProp);
      return;
    }
    const loadCompanyProfile = async () => {
      try {
        const snap = await getDoc(doc(db, "companyprofile", "default"));
        if (snap.exists()) {
          const data = snap.data() || {};
          setCompanyLogo(
            data.logo ||
              data.companyLogo ||
              data.companyLogoUrl ||
              data.image ||
              "",
          );
        }
      } catch (error) {
        console.error("Failed to load company profile:", error);
      }
    };

    loadCompanyProfile();
  }, [companyLogoProp]);

  const handleChange = (section, field, value) => {
    setReportData((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  const uploadImageToCloudinary = async (file, label = "image") => {
    const cloudName = "dsgzpl0xt";
    const uploadPreset = "inspectpro";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    toast.info(`Uploading ${label}...`);
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      },
    );
    const data = await res.json();
    if (!res.ok || !data?.secure_url) {
      throw new Error(data?.error?.message || "Cloudinary upload failed.");
    }
    return data.secure_url;
  };

  const handleGeneralImageUpload = async (field, file, label) => {
    try {
      const url = await uploadImageToCloudinary(file, label);
      handleChange("general", field, url);
      toast.success(`${label} uploaded.`);
    } catch (error) {
      toast.error(getToastErrorMessage(error, `Unable to upload ${label.toLowerCase()}.`));
    }
  };

  const handleObservationPhotoUpload = async (obsId, file) => {
    try {
      const url = await uploadImageToCloudinary(file, "observation photo");
      updateObservation(obsId, "photo", url);
      toast.success("Observation photo uploaded.");
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Unable to upload the observation photo."));
    }
  };

  const appendPhotosToChecklistItem = (itemId, urls) => {
    setReportData((prev) => ({
      ...prev,
      checklist: (prev.checklist || []).map((item) => {
        if (item.id !== itemId) return item;
        const existing = normalizePhotoEntries(item);
        const additions = urls.map((url, idx) => ({
          id: `${Date.now()}-checklist-photo-${idx}`,
          url,
          note: "",
        }));
        return {
          ...item,
          photos: [...existing, ...additions],
          photo: existing[0]?.url || additions[0]?.url || "",
          photoNote: existing[0]?.note || additions[0]?.note || "",
        };
      }),
    }));
  };

  const updateChecklistPhotoEntry = (itemId, photoId, field, value) => {
    setReportData((prev) => ({
      ...prev,
      checklist: (prev.checklist || []).map((item) => {
        if (item.id !== itemId) return item;
        const nextPhotos = normalizePhotoEntries(item).map((entry) =>
          entry.id === photoId ? { ...entry, [field]: value } : entry,
        );
        return {
          ...item,
          photos: nextPhotos,
          photo: nextPhotos[0]?.url || "",
          photoNote: nextPhotos[0]?.note || "",
        };
      }),
    }));
  };

  const removeChecklistPhotoEntry = (itemId, photoId) => {
    setReportData((prev) => ({
      ...prev,
      checklist: (prev.checklist || []).map((item) => {
        if (item.id !== itemId) return item;
        const nextPhotos = normalizePhotoEntries(item).filter(
          (entry) => entry.id !== photoId,
        );
        return {
          ...item,
          photos: nextPhotos,
          photo: nextPhotos[0]?.url || "",
          photoNote: nextPhotos[0]?.note || "",
        };
      }),
    }));
  };

  const appendPhotosToPipeSupportItem = (itemId, urls) => {
    setReportData((prev) => ({
      ...prev,
      pipeSupports: (prev.pipeSupports || []).map((item) => {
        if (item.id !== itemId) return item;
        const existing = normalizePhotoEntries(item);
        const additions = urls.map((url, idx) => ({
          id: `${Date.now()}-support-photo-${idx}`,
          url,
          note: "",
        }));
        return {
          ...item,
          photos: [...existing, ...additions],
          photo: existing[0]?.url || additions[0]?.url || "",
          photoNote: existing[0]?.note || additions[0]?.note || "",
        };
      }),
    }));
  };

  const updatePipeSupportPhotoEntry = (itemId, photoId, field, value) => {
    setReportData((prev) => ({
      ...prev,
      pipeSupports: (prev.pipeSupports || []).map((item) => {
        if (item.id !== itemId) return item;
        const nextPhotos = normalizePhotoEntries(item).map((entry) =>
          entry.id === photoId ? { ...entry, [field]: value } : entry,
        );
        return {
          ...item,
          photos: nextPhotos,
          photo: nextPhotos[0]?.url || "",
          photoNote: nextPhotos[0]?.note || "",
        };
      }),
    }));
  };

  const removePipeSupportPhotoEntry = (itemId, photoId) => {
    setReportData((prev) => ({
      ...prev,
      pipeSupports: (prev.pipeSupports || []).map((item) => {
        if (item.id !== itemId) return item;
        const nextPhotos = normalizePhotoEntries(item).filter(
          (entry) => entry.id !== photoId,
        );
        return {
          ...item,
          photos: nextPhotos,
          photo: nextPhotos[0]?.url || "",
          photoNote: nextPhotos[0]?.note || "",
        };
      }),
    }));
  };

  const appendPhotosToSpecialConsiderationItem = (itemId, urls) => {
    setReportData((prev) => ({
      ...prev,
      specialConsiderations: (prev.specialConsiderations || []).map((item) => {
        if (item.id !== itemId) return item;
        const existing = normalizePhotoEntries(item);
        const additions = urls.map((url, idx) => ({
          id: `${Date.now()}-special-photo-${idx}`,
          url,
          note: "",
        }));
        return {
          ...item,
          photos: [...existing, ...additions],
          photo: existing[0]?.url || additions[0]?.url || "",
          photoNote: existing[0]?.note || additions[0]?.note || "",
        };
      }),
    }));
  };

  const updateSpecialConsiderationPhotoEntry = (
    itemId,
    photoId,
    field,
    value,
  ) => {
    setReportData((prev) => ({
      ...prev,
      specialConsiderations: (prev.specialConsiderations || []).map((item) => {
        if (item.id !== itemId) return item;
        const nextPhotos = normalizePhotoEntries(item).map((entry) =>
          entry.id === photoId ? { ...entry, [field]: value } : entry,
        );
        return {
          ...item,
          photos: nextPhotos,
          photo: nextPhotos[0]?.url || "",
          photoNote: nextPhotos[0]?.note || "",
        };
      }),
    }));
  };

  const removeSpecialConsiderationPhotoEntry = (itemId, photoId) => {
    setReportData((prev) => ({
      ...prev,
      specialConsiderations: (prev.specialConsiderations || []).map((item) => {
        if (item.id !== itemId) return item;
        const nextPhotos = normalizePhotoEntries(item).filter(
          (entry) => entry.id !== photoId,
        );
        return {
          ...item,
          photos: nextPhotos,
          photo: nextPhotos[0]?.url || "",
          photoNote: nextPhotos[0]?.note || "",
        };
      }),
    }));
  };

  const handleChecklistPhotoUpload = async (itemId, file) => {
    try {
      const url = await uploadImageToCloudinary(file, "checklist photo");
      appendPhotosToChecklistItem(itemId, [url]);
      toast.success("Checklist photo uploaded.");
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Unable to upload the checklist photo."));
    }
  };

  const handleChecklistPhotosUpload = async (itemId, files) => {
    try {
      const urls = await Promise.all(
        Array.from(files || []).map((file) =>
          uploadImageToCloudinary(file, "checklist photo"),
        ),
      );
      appendPhotosToChecklistItem(itemId, urls);
      toast.success("Checklist photos uploaded.");
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Unable to upload the checklist photos."));
    }
  };

  const handlePipeSupportPhotoUpload = async (itemId, file) => {
    try {
      const url = await uploadImageToCloudinary(file, "pipe support photo");
      appendPhotosToPipeSupportItem(itemId, [url]);
      toast.success("Pipe support photo uploaded.");
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Unable to upload the pipe support photo."));
    }
  };

  const handlePipeSupportPhotosUpload = async (itemId, files) => {
    try {
      const urls = await Promise.all(
        Array.from(files || []).map((file) =>
          uploadImageToCloudinary(file, "pipe support photo"),
        ),
      );
      appendPhotosToPipeSupportItem(itemId, urls);
      toast.success("Pipe support photos uploaded.");
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Unable to upload the pipe support photos."));
    }
  };

  const handleSpecialConsiderationPhotoUpload = async (itemId, file) => {
    try {
      const url = await uploadImageToCloudinary(
        file,
        "special consideration photo",
      );
      appendPhotosToSpecialConsiderationItem(itemId, [url]);
      toast.success("Special consideration photo uploaded.");
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Unable to upload the special consideration photo."));
    }
  };

  const handleSpecialConsiderationPhotosUpload = async (itemId, files) => {
    try {
      const urls = await Promise.all(
        Array.from(files || []).map((file) =>
          uploadImageToCloudinary(file, "special consideration photo"),
        ),
      );
      appendPhotosToSpecialConsiderationItem(itemId, urls);
      toast.success("Special consideration photos uploaded.");
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Unable to upload the special consideration photos."));
    }
  };

  const handleSignoffUpload = async (field, file, label) => {
    try {
      const url = await uploadImageToCloudinary(file, label);
      handleChange("signoff", field, url);
      toast.success(`${label} uploaded.`);
    } catch (error) {
      toast.error(getToastErrorMessage(error, `Unable to upload ${label.toLowerCase()}.`));
    }
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
        {
          id: Date.now(),
          title: "",
          refSn: "",
          equipmentId: "",
          equipmentDescription: "",
          pageNo: "",
          description: "",
          photo: "",
          photoNote: "",
        },
      ],
    }));
  };

  const updateChecklistItem = (id, field, value) => {
    setReportData((prev) => ({
      ...prev,
      checklist: (prev.checklist || []).map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const addChecklistItem = () => {
    setReportData((prev) => ({
      ...prev,
      checklist: [
        ...(prev.checklist || []),
        {
          id: `${Date.now()}-checklist`,
          equipmentId: "",
          equipmentDescription: "",
          anomaly: "No",
          pageNo: "",
          photo: "",
          photoNote: "",
          photos: [],
        },
      ],
    }));
  };

  const removeChecklistItem = (id) => {
    setReportData((prev) => ({
      ...prev,
      checklist: (prev.checklist || []).filter((item) => item.id !== id),
    }));
  };
  const addCustomPipeComponent = (itemId) => {
    const customLabel = window.prompt("Enter the new pipe component");
    const normalized = String(customLabel || "").trim();
    if (!normalized) return;

    setReportData((prev) => {
      const existingCustom = Array.isArray(prev.general?.customPipeComponents)
        ? prev.general.customPipeComponents
        : [];
      const nextCustom = existingCustom.includes(normalized)
        ? existingCustom
        : [...existingCustom, normalized];

      return {
        ...prev,
        general: {
          ...prev.general,
          customPipeComponents: nextCustom,
        },
        checklist: (prev.checklist || []).map((item) =>
          item.id === itemId
            ? { ...item, equipmentDescription: normalized }
            : item,
        ),
      };
    });
  };
  const updatePipeSupportItem = (id, field, value) => {
    setReportData((prev) => ({
      ...prev,
      pipeSupports: (prev.pipeSupports || []).map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    }));
  };
  const addPipeSupportItem = () => {
    setReportData((prev) => ({
      ...prev,
      pipeSupports: [
        ...(prev.pipeSupports || []),
        {
          id: `${Date.now()}-support`,
          equipmentDescription: "",
          anomaly: "N/A.",
          pageNo: "",
          photo: "",
          photoNote: "",
          photos: [],
        },
      ],
    }));
  };
  const removePipeSupportItem = (id) => {
    setReportData((prev) => ({
      ...prev,
      pipeSupports: (prev.pipeSupports || []).filter((item) => item.id !== id),
    }));
  };
  const addCustomPipeSupport = (itemId) => {
    const customLabel = window.prompt("Enter the new pipe support");
    const normalized = String(customLabel || "").trim();
    if (!normalized) return;

    setReportData((prev) => {
      const existingCustom = Array.isArray(prev.general?.customPipeSupports)
        ? prev.general.customPipeSupports
        : [];
      const nextCustom = existingCustom.includes(normalized)
        ? existingCustom
        : [...existingCustom, normalized];

      return {
        ...prev,
        general: {
          ...prev.general,
          customPipeSupports: nextCustom,
        },
        pipeSupports: (prev.pipeSupports || []).map((item) =>
          item.id === itemId
            ? { ...item, equipmentDescription: normalized }
            : item,
        ),
      };
    });
  };
  const updateSpecialConsiderationItem = (id, field, value) => {
    setReportData((prev) => ({
      ...prev,
      specialConsiderations: (prev.specialConsiderations || []).map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    }));
  };
  const addSpecialConsiderationItem = () => {
    setReportData((prev) => ({
      ...prev,
      specialConsiderations: [
        ...(prev.specialConsiderations || []),
        {
          id: `${Date.now()}-special`,
          equipmentDescription: "",
          anomaly: "N/A.",
          pageNo: "NA",
          photo: "",
          photoNote: "",
          photos: [],
        },
      ],
    }));
  };
  const removeSpecialConsiderationItem = (id) => {
    setReportData((prev) => ({
      ...prev,
      specialConsiderations: (prev.specialConsiderations || []).filter(
        (item) => item.id !== id,
      ),
    }));
  };
  const addCustomSpecialConsideration = (itemId) => {
    const customLabel = window.prompt("Enter the new special consideration");
    const normalized = String(customLabel || "").trim();
    if (!normalized) return;

    setReportData((prev) => {
      const existingCustom = Array.isArray(
        prev.general?.customSpecialConsiderations,
      )
        ? prev.general.customSpecialConsiderations
        : [];
      const nextCustom = existingCustom.includes(normalized)
        ? existingCustom
        : [...existingCustom, normalized];

      return {
        ...prev,
        general: {
          ...prev.general,
          customSpecialConsiderations: nextCustom,
        },
        specialConsiderations: (prev.specialConsiderations || []).map((item) =>
          item.id === itemId
            ? { ...item, equipmentDescription: normalized }
            : item,
        ),
      };
    });
  };
  const pipeComponentOptions = [
    ...PIPE_COMPONENT_OPTIONS,
    ...((Array.isArray(reportData?.general?.customPipeComponents)
      ? reportData.general.customPipeComponents
      : []
    ).filter((option) => option && !PIPE_COMPONENT_OPTIONS.includes(option))),
    ADD_PIPE_COMPONENT_OPTION,
  ];
  const pipeSupportOptions = [
    ...PIPE_SUPPORT_OPTIONS,
    ...((Array.isArray(reportData?.general?.customPipeSupports)
      ? reportData.general.customPipeSupports
      : []
    ).filter((option) => option && !PIPE_SUPPORT_OPTIONS.includes(option))),
    ADD_PIPE_SUPPORT_OPTION,
  ];
  const specialConsiderationOptions = [
    ...SPECIAL_CONSIDERATION_OPTIONS,
    ...((Array.isArray(reportData?.general?.customSpecialConsiderations)
      ? reportData.general.customSpecialConsiderations
      : []
    ).filter(
      (option) => option && !SPECIAL_CONSIDERATION_OPTIONS.includes(option),
    )),
    ADD_SPECIAL_CONSIDERATION_OPTION,
  ];

  const removeObservation = (id) => {
    setReportData((prev) => ({
      ...prev,
      observations: prev.observations.filter((obs) => obs.id !== id),
    }));
  };

  const addCustomSection = () => {
    const newSection = {
      id: `${Date.now()}`,
      title: "",
      content: "",
    };
    setReportData((prev) => ({
      ...prev,
      customSections: [...(prev.customSections || []), newSection],
    }));
  };

  const updateCustomSection = (id, field, value) => {
    setReportData((prev) => ({
      ...prev,
      customSections: (prev.customSections || []).map((section) =>
        section.id === id ? { ...section, [field]: value } : section,
      ),
    }));
  };

  const removeCustomSection = (id) => {
    setReportData((prev) => ({
      ...prev,
      customSections: (prev.customSections || []).filter(
        (section) => section.id !== id,
      ),
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

  const asText = (value) => {
    if (value === null || value === undefined) return "";
    return typeof value === "string" ? value : String(value);
  };

  const buildFirestoreReportPayload = (statusOverride) => {
    const g = reportData?.general || {};
    const i = reportData?.inspection || {};
    const s = reportData?.signoff || {};
    const observations = Array.isArray(reportData?.observations)
      ? reportData.observations.map((obs, idx) => ({
          id: asText(obs?.id || `${Date.now()}-${idx}`),
          title: asText(obs?.title),
          refSn: asText(obs?.refSn),
          equipmentId: asText(obs?.equipmentId),
          equipmentDescription: asText(obs?.equipmentDescription),
          pageNo: asText(obs?.pageNo),
          description: asText(obs?.description),
          photo: asText(obs?.photo),
          photoNote: asText(obs?.photoNote),
        }))
      : [];
    const checklist = Array.isArray(reportData?.checklist)
      ? reportData.checklist.map((item, idx) => ({
          id: asText(item?.id || `${Date.now()}-checklist-${idx}`),
          equipmentId: asText(item?.equipmentId),
          equipmentDescription: asText(item?.equipmentDescription),
          anomaly: asText(item?.anomaly || "No"),
          pageNo: asText(item?.pageNo),
          photo: asText(item?.photo),
          photoNote: asText(item?.photoNote),
          photos: Array.isArray(item?.photos)
            ? item.photos.map((entry, photoIdx) => ({
                id: asText(entry?.id || `${Date.now()}-checklist-photo-${photoIdx}`),
                url: asText(entry?.url || entry?.photo),
                note: asText(entry?.note),
              }))
            : [],
        }))
      : [];
    const pipeSupports = Array.isArray(reportData?.pipeSupports)
      ? reportData.pipeSupports.map((item, idx) => ({
          id: asText(item?.id || `${Date.now()}-support-${idx}`),
          equipmentDescription: asText(item?.equipmentDescription),
          anomaly: asText(item?.anomaly || "N/A."),
          pageNo: asText(item?.pageNo),
          photo: asText(item?.photo),
          photoNote: asText(item?.photoNote),
          photos: Array.isArray(item?.photos)
            ? item.photos.map((entry, photoIdx) => ({
                id: asText(entry?.id || `${Date.now()}-support-photo-${photoIdx}`),
                url: asText(entry?.url || entry?.photo),
                note: asText(entry?.note),
              }))
            : [],
        }))
      : [];
    const specialConsiderations = Array.isArray(reportData?.specialConsiderations)
      ? reportData.specialConsiderations.map((item, idx) => ({
          id: asText(item?.id || `${Date.now()}-special-${idx}`),
          equipmentDescription: asText(item?.equipmentDescription),
          anomaly: asText(item?.anomaly || "N/A."),
          pageNo: asText(item?.pageNo || "NA"),
          photo: asText(item?.photo),
          photoNote: asText(item?.photoNote),
          photos: Array.isArray(item?.photos)
            ? item.photos.map((entry, photoIdx) => ({
                id: asText(entry?.id || `${Date.now()}-special-photo-${photoIdx}`),
                url: asText(entry?.url || entry?.photo),
                note: asText(entry?.note),
              }))
            : [],
        }))
      : [];
    const utm = Array.isArray(reportData?.utm)
      ? reportData.utm.map((group, gIdx) => ({
          id: asText(group?.id || `G-${gIdx + 1}`),
          tieIn: asText(group?.tieIn || `G-${gIdx + 1}`),
          points: Array.isArray(group?.points)
            ? group.points.map((p, pIdx) => ({
                id: asText(p?.id || `${Date.now()}-${gIdx}-${pIdx}`),
                point:
                  typeof p?.point === "number" && Number.isFinite(p.point)
                    ? p.point
                    : pIdx + 1,
                nominal: asText(p?.nominal),
                add: asText(p?.add),
                min: asText(p?.min),
                observation: asText(p?.observation),
              }))
            : [],
        }))
      : [];
    const customSections = Array.isArray(reportData?.customSections)
      ? reportData.customSections.map((section, idx) => ({
          id: asText(section?.id || `${Date.now()}-${idx}`),
          title: asText(section?.title),
          content: asText(section?.content),
        }))
      : [];

    return {
      type: asText(reportData?.type || "Visual"),
      reportId: asText(projectDocId || g.projectId || ""),
      status: asText(statusOverride || reportData?.status || "Draft"),
      general: {
        client: asText(g.client),
        platform: asText(g.platform),
        tag: asText(g.tag),
        reportNum: asText(g.reportNum),
        date: asText(g.date),
        equipment: asText(g.equipment),
        customPipeComponents: Array.isArray(g.customPipeComponents)
          ? g.customPipeComponents
              .map((item) => asText(item))
              .filter(Boolean)
          : [],
        customPipeSupports: Array.isArray(g.customPipeSupports)
          ? g.customPipeSupports
              .map((item) => asText(item))
              .filter(Boolean)
          : [],
        customSpecialConsiderations: Array.isArray(
          g.customSpecialConsiderations,
        )
          ? g.customSpecialConsiderations
              .map((item) => asText(item))
              .filter(Boolean)
          : [],
        diagramImage: asText(g.diagramImage),
        diagramImageNote: asText(g.diagramImageNote),
        pidImage: asText(g.pidImage),
        pidImageNote: asText(g.pidImageNote),
        inspectedEquipmentImage: asText(g.inspectedEquipmentImage),
        inspectedEquipmentImageNote: asText(g.inspectedEquipmentImageNote),
        projectId: asText(projectDocId || g.projectId || ""),
        projectDocId: asText(g.projectDocId || projectDocId || ""),
        inspectionType: asText(g.inspectionType),
        inspectionTypeName: asText(g.inspectionTypeName),
        inspectionTypeCode: asText(g.inspectionTypeCode),
        projectName: asText(g.projectName),
        clientLogo: asText(g.clientLogo),
        supervisorName: asText(g.supervisorName || g.assignedSupervisorName),
        assignedSupervisorName: asText(
          g.assignedSupervisorName || g.supervisorName,
        ),
        material: asText(g.material),
        utEquipment: asText(g.utEquipment),
        utSerial: asText(g.utSerial),
        utProbe: asText(g.utProbe),
        testTemp: asText(g.testTemp),
        materialSize: asText(g.materialSize),
        calibrationDate: asText(g.calibrationDate),
        couplant: asText(g.couplant),
        inspectBy: asText(g.inspectBy),
        contract: asText(g.contract),
        coordinator: asText(g.coordinator),
        pidNumber: asText(g.pidNumber),
        procedure: asText(g.procedure),
        testCode: asText(g.testCode),
        criteria: asText(g.criteria),
      },
      inspection: {
        scope: asText(i.scope),
        method: asText(i.method),
        findings: asText(i.findings),
        corrosion: asText(i.corrosion),
        defects: asText(i.defects),
        recommendations: asText(i.recommendations),
        conclusion: asText(i.conclusion),
        schematicTitle: asText(i.schematicTitle),
        schematicSubtitle: asText(i.schematicSubtitle),
        schematicNotes: asText(i.schematicNotes),
        pidTitle: asText(i.pidTitle),
        pipeSupportNotes:
          asText(i.pipeSupportNotes || i.finalNotes) ||
          "Inspected for mechanical damage, sagging, distortion, coating failure, corrosion, pitting, cracks in welds, vibration, corrosion under pipe supports, etc. as applicable.",
        specialConsiderationNotes:
          asText(i.specialConsiderationNotes) ||
          "Inspected for signs of leakage, mechanical damage, coating failure, corrosion, pitting, cracks in welds, vibration, etc. as applicable.",
      },
      observations,
      checklist,
      pipeSupports,
      specialConsiderations,
      utm,
      signoff: {
        inspector: asText(s.inspector || user?.displayName || ""),
        reviewer: asText(s.reviewer),
        manager: asText(s.manager),
        inspectorQualification: asText(s.inspectorQualification),
        reviewerQualification: asText(s.reviewerQualification),
        managerQualification: asText(s.managerQualification),
        inspectorSignature: asText(s.inspectorSignature),
        reviewerSignature: asText(s.reviewerSignature),
        managerSignature: asText(s.managerSignature),
      },
      customSections,
      timestamp: new Date().toISOString(),
    };
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let resolvedProjectId =
        projectDocId ||
        reportData?.general?.projectDocId ||
        location.state?.preFill?.id ||
        "";
      if (!resolvedProjectId && reportData?.general?.projectId) {
        const projectLookup = query(
          collection(db, "projects"),
          where("projectId", "==", reportData.general.projectId),
          limit(1),
        );
        const projectSnapshot = await getDocs(projectLookup);
        if (!projectSnapshot.empty) {
          resolvedProjectId = projectSnapshot.docs[0].id;
          setProjectDocId(resolvedProjectId);
        }
      }
      if (!resolvedProjectId) {
        throw new Error("Project reference missing.");
      }

      const assignedInspectorName =
        reportData?.general?.inspectorName ||
        reportData?.signoff?.inspector ||
        location.state?.preFill?.inspectorName ||
        user?.displayName ||
        "Inspector";
      const currentStatus = String(reportData?.status || "").trim();
      const prefillStatus = String(location.state?.preFill?.status || "").trim();
      const shouldPreserveForwardedStatus =
        Boolean(location.state?.preFill?.preserveForwardedStatusOnSave) ||
        currentStatus
          .toLowerCase()
          .startsWith("passed and forwarded") ||
        prefillStatus
          .toLowerCase()
          .startsWith("passed and forwarded");
      const saveStatus = shouldPreserveForwardedStatus
        ? currentStatus || prefillStatus
        : `In Progress - Report With ${assignedInspectorName}`;
      const payload = buildFirestoreReportPayload(saveStatus);
      await setDoc(
        doc(db, "projects", resolvedProjectId),
        {
          report: payload,
          status: payload.status,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      setReportData((prev) => ({ ...prev, status: saveStatus }));
      toast.success("Ultrasonic Thickness report saved.");
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Unable to save the ultrasonic thickness report."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendForConfirmation = async () => {
    setIsSaving(true);
    try {
      let resolvedProjectId =
        projectDocId ||
        reportData?.general?.projectDocId ||
        location.state?.preFill?.id ||
        "";
      if (!resolvedProjectId && reportData?.general?.projectId) {
        const projectLookup = query(
          collection(db, "projects"),
          where("projectId", "==", reportData.general.projectId),
          limit(1),
        );
        const projectSnapshot = await getDocs(projectLookup);
        if (!projectSnapshot.empty) {
          resolvedProjectId = projectSnapshot.docs[0].id;
          setProjectDocId(resolvedProjectId);
        }
      }
      if (!resolvedProjectId) {
        throw new Error("Project reference missing.");
      }

      const assignedSupervisorName =
        reportData?.general?.supervisorName ||
        location.state?.preFill?.supervisorName ||
        "Lead Inspector";
      const currentStatus = String(reportData?.status || "").trim();
      const prefillStatus = String(location.state?.preFill?.status || "").trim();
      const shouldPreserveForwardedStatus =
        Boolean(location.state?.preFill?.preserveForwardedStatusOnSave) ||
        currentStatus
          .toLowerCase()
          .startsWith("passed and forwarded") ||
        prefillStatus
          .toLowerCase()
          .startsWith("passed and forwarded");
      const pendingConfirmationStatus = shouldPreserveForwardedStatus
        ? currentStatus || prefillStatus
        : `Pending Confirmation- Report With ${assignedSupervisorName}`;
      const payload = buildFirestoreReportPayload(pendingConfirmationStatus);
      await setDoc(
        doc(db, "projects", resolvedProjectId),
        {
          report: payload,
          status: payload.status,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      setReportData((prev) => ({ ...prev, status: pendingConfirmationStatus }));
      toast.success("Report sent for confirmation.");
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Unable to send the report for confirmation."));
    } finally {
      setIsSaving(false);
    }
  };

  const populatedObservations = (reportData?.observations || []).filter((obs) =>
    [
      obs.title,
      obs.refSn,
      obs.equipmentId,
      obs.equipmentDescription,
      obs.pageNo,
      obs.description,
      obs.photo,
      obs.photoNote,
    ].some((value) => String(value || "").trim()),
  );

  if (reportMode) {
    return (
      <UTWebView
        reportData={reportData}
        companyLogo={companyLogo}
        onBack={() => setReportMode(false)}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      {!hideControls && <Navbar />}
      <div className="flex flex-1">
        {!hideControls && <Sidebar />}
        <main
          className={`flex-1 p-4 sm:p-6 lg:p-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950 ${
            hideControls ? "" : "ml-16 lg:ml-64"
          }`}
        >
          <div className="max-w-5xl mx-auto">
            <header className="flex justify-between items-center mb-8 bg-slate-900/40 p-6 rounded-sm border border-slate-800">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 bg-slate-950 border border-slate-800 rounded-lg hover:text-orange-500 transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <h1 className="text-2xl font-bold uppercase tracking-tighter flex items-center gap-2">
                  <ShieldCheck className="text-orange-500" /> Ultrasonic Thickness Inspection
                </h1>
              </div>
              <div className="flex items-center gap-3">
                {canSendForConfirmation &&
                  !hideSaveReportButton &&
                  !String(reportData.status || "").startsWith(
                    "Pending Confirmation",
                  ) && (
                    <button
                      onClick={handleSendForConfirmation}
                      disabled={isSaving}
                      className="bg-orange-600 px-5 py-2 rounded-sm text-xs font-bold uppercase tracking-widest text-white hover:bg-orange-700 transition-colors disabled:opacity-60"
                    >
                      {String(reportData.status || "").startsWith(
                        "Returned for correction",
                      )
                        ? "Resend"
                        : user?.role === "Inspector"
                          ? "Send For Confirmation"
                          : "SAVE REPORT"}
                    </button>
                  )}
                <button
                  onClick={() => setReportMode(true)}
                  className="bg-slate-800 px-5 py-2 rounded-sm text-xs font-bold uppercase tracking-widest text-white hover:bg-slate-700 transition-colors"
                >
                  Preview Web Report
                </button>
              </div>
            </header>

            <div className="bg-slate-900/40 p-8 rounded-sm border border-slate-800 backdrop-blur-md space-y-8">
              <section className="space-y-4" id="toc-introduction">
                <h2 className="text-xs font-bold uppercase tracking-[0.3em] bg-slate-900">
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
              </section>

              <section className="space-y-4" id="toc-summary">
                <h2 className="text-xs font-bold uppercase tracking-[0.3em] bg-slate-900">
                  Report Narrative
                </h2>
                <div className="grid grid-cols-1 gap-6">
                  <TextArea
                    label="1.0 Introduction"
                    value={reportData.inspection.scope}
                    onChange={(v) => handleChange("inspection", "scope", v)}
                    required
                  />
                  <TextArea
                    label="2.0 Executive Summary"
                    value={reportData.inspection.findings}
                    onChange={(v) => handleChange("inspection", "findings", v)}
                    required
                  />
                  
                </div>
              </section>

              <section className="space-y-4" id="toc-checklist">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xs font-bold uppercase tracking-[0.3em] bg-slate-900">
                    3.0 Inspection Findings
                  </h2>
                  <button
                    type="button"
                    onClick={addChecklistItem}
                    className="rounded-sm border border-orange-500 bg-orange-600 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-orange-700"
                  >
                    Add More
                  </button>
                </div>
                <div className="space-y-4">
                  {(reportData.checklist || []).map((item, idx) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          Component {idx + 1}
                        </p>
                        {(reportData.checklist || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeChecklistItem(item.id)}
                            className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300"
                          >
                            Remove
                          </button>
                        )}
                        
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Component
                          </label>
                          <select
                            value={item.equipmentDescription || ""}
                            onChange={(e) => {
                              if (e.target.value === ADD_PIPE_COMPONENT_OPTION) {
                                addCustomPipeComponent(item.id);
                                return;
                              }
                              updateChecklistItem(
                                item.id,
                                "equipmentDescription",
                                e.target.value,
                              );
                            }}
                            className="bg-slate-950 border border-slate-800 p-3 rounded-sm text-sm text-white focus:border-orange-500 outline-none transition-all"
                          >
                            <option value="">Select component</option>
                            {pipeComponentOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                        <InputField
                          label="Photos #"
                          value={item.pageNo || ""}
                          onChange={(v) => updateChecklistItem(item.id, "pageNo", v)}
                        />
                      </div>
                      <TextArea
                        label="Observations"
                        value={item.anomaly || ""}
                        onChange={(v) => updateChecklistItem(item.id, "anomaly", v)}
                        required
                      />
                      <div className="grid grid-cols-1 gap-4">
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Photos
                          </label>
                          <div className="flex flex-wrap items-center gap-3">
                            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-slate-900 border border-slate-800 text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white hover:border-orange-500 transition-colors cursor-pointer">
                              <Camera size={14} /> Upload Photos
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                  const files = e.target.files;
                                  if (!files?.length) return;
                                  handleChecklistPhotosUpload(item.id, files);
                                }}
                              />
                            </label>
                            {normalizePhotoEntries(item).length ? (
                              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                                {normalizePhotoEntries(item).length} photo(s) attached
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 uppercase tracking-widest">
                                No photo uploaded
                              </span>
                            )}
                          </div>
                          {normalizePhotoEntries(item).length ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {normalizePhotoEntries(item).map((entry, photoIdx) => (
                                <div
                                  key={entry.id}
                                  className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-3"
                                >
                                  <img
                                    src={entry.url}
                                    alt={`Checklist ${photoIdx + 1}`}
                                    className="h-40 w-full rounded-lg object-cover bg-white"
                                  />
                                  <TextArea
                                    label={`Photo Note ${photoIdx + 1}`}
                                    value={entry.note || ""}
                                    onChange={(v) =>
                                      updateChecklistPhotoEntry(
                                        item.id,
                                        entry.id,
                                        "note",
                                        v,
                                      )
                                    }
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeChecklistPhotoEntry(item.id, entry.id)
                                    }
                                    className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300"
                                  >
                                    Remove Photo
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-4" id="toc-pipe-supports">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xs font-bold uppercase tracking-[0.3em] bg-slate-900">
                    4.0 UTM Readings
                  </h2>
                  <button
                    type="button"
                    onClick={addTieInGroup}
                    className="rounded-sm border border-orange-500 bg-orange-600 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-orange-700"
                  >
                    Add TML
                  </button>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField
                      label="Location"
                      value={reportData.general.platform || ""}
                      onChange={(v) => handleChange("general", "platform", v)}
                    />
                    <InputField
                      label="Date Inspected"
                      type="date"
                      value={reportData.general.date || ""}
                      onChange={(v) => handleChange("general", "date", v)}
                    />
                    <InputField
                      label="UT Equipment"
                      value={reportData.general.utEquipment || ""}
                      onChange={(v) => handleChange("general", "utEquipment", v)}
                    />
                    <InputField
                      label="Calibration Date"
                      type="date"
                      value={reportData.general.calibrationDate || ""}
                      onChange={(v) =>
                        handleChange("general", "calibrationDate", v)
                      }
                    />
                    <InputField
                      label="Equipment Serial No."
                      value={reportData.general.utSerial || ""}
                      onChange={(v) => handleChange("general", "utSerial", v)}
                    />
                    <InputField
                      label="Couplant Used"
                      value={reportData.general.couplant || ""}
                      onChange={(v) => handleChange("general", "couplant", v)}
                    />
                    <InputField
                      label="UT Probe: Dia/MHz/Type"
                      value={reportData.general.utProbe || ""}
                      onChange={(v) => handleChange("general", "utProbe", v)}
                    />
                    <InputField
                      label="Name of Inspectors"
                      value={reportData.general.inspectBy || ""}
                      onChange={(v) => handleChange("general", "inspectBy", v)}
                    />
                    <InputField
                      label="Test Temperature"
                      value={reportData.general.testTemp || ""}
                      onChange={(v) => handleChange("general", "testTemp", v)}
                    />
                    <InputField
                      label="Inspector Qualification"
                      value={reportData.signoff.inspectorQualification || ""}
                      onChange={(v) =>
                        handleChange("signoff", "inspectorQualification", v)
                      }
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  {(reportData.utm || []).map((group, idx) => (
                    <div
                      key={group.id}
                      className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          TML Group {idx + 1}
                        </p>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => addUTPoint(group.id)}
                            className="text-[10px] font-bold uppercase tracking-widest text-orange-400 hover:text-orange-300"
                          >
                            Add Row
                          </button>
                          {(reportData.utm || []).length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTieInGroup(group.id)}
                              className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                      <InputField
                        label="TML"
                        value={group.tieIn || ""}
                        onChange={(v) =>
                          setReportData((prev) => ({
                            ...prev,
                            utm: prev.utm.map((entry) =>
                              entry.id === group.id
                                ? { ...entry, tieIn: v }
                                : entry,
                            ),
                          }))
                        }
                      />
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr>
                              <th className="border border-slate-700 bg-slate-900 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-widest text-white">
                                UT Probe Position
                              </th>
                              <th className="border border-slate-700 bg-slate-900 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-widest text-white">
                                Max Thickness (MM)
                              </th>
                              <th className="border border-slate-700 bg-slate-900 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-widest text-white">
                                Min Thickness (MM)
                              </th>
                              <th className="border border-slate-700 bg-slate-900 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-widest text-white">
                                Nominal Thickness (From Pipe Table)
                              </th>
                              <th className="border border-slate-700 bg-slate-900 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-widest text-white">
                                Observation
                              </th>
                              <th className="border border-slate-700 bg-slate-900 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-widest text-white">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {(group.points || []).map((point) => (
                              <tr key={point.id}>
                                <td className="border border-slate-800 p-2">
                                  <InlineField
                                    value={point.point}
                                    onChange={(v) =>
                                      updateUTPoint(group.id, point.id, "point", v)
                                    }
                                    placeholder="Position"
                                  />
                                </td>
                                <td className="border border-slate-800 p-2">
                                  <InlineField
                                    value={point.add || ""}
                                    onChange={(v) =>
                                      updateUTPoint(group.id, point.id, "add", v)
                                    }
                                    placeholder="Max"
                                  />
                                </td>
                                <td className="border border-slate-800 p-2">
                                  <InlineField
                                    value={point.min || ""}
                                    onChange={(v) =>
                                      updateUTPoint(group.id, point.id, "min", v)
                                    }
                                    placeholder="Min"
                                  />
                                </td>
                                <td className="border border-slate-800 p-2">
                                  <InlineField
                                    value={point.nominal || ""}
                                    onChange={(v) =>
                                      updateUTPoint(group.id, point.id, "nominal", v)
                                    }
                                    placeholder="Nominal"
                                  />
                                </td>
                                <td className="border border-slate-800 p-2">
                                  <InlineField
                                    value={point.observation || ""}
                                    onChange={(v) =>
                                      updateUTPoint(
                                        group.id,
                                        point.id,
                                        "observation",
                                        v,
                                      )
                                    }
                                    placeholder="Observation"
                                  />
                                </td>
                                <td className="border border-slate-800 p-2 text-center">
                                  {(group.points || []).length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeUTPoint(group.id, point.id)}
                                      className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-4" id="toc-schematics">
                <h2 className="text-xs font-bold uppercase tracking-[0.3em] bg-slate-900">
                  5.0 Schematics of Anomaly
                </h2>
                <div className="grid grid-cols-1 gap-6">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Schematic of Anomaly
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-slate-900 border border-slate-800 text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white hover:border-orange-500 transition-colors cursor-pointer">
                        <Camera size={14} /> Upload Photo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            handleGeneralImageUpload(
                              "diagramImage",
                              file,
                              "schematic anomaly photo",
                            );
                          }}
                        />
                      </label>
                      {reportData.general.diagramImage ? (
                        <>
                          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                            Photo attached
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleChange("general", "diagramImage", "")
                            }
                            className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300"
                          >
                            Remove
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest">
                          No photo uploaded
                        </span>
                      )}
                    </div>
                  </div>
                  {reportData.general.diagramImage ? (
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Schematic Preview
                      </p>
                      <img
                        src={reportData.general.diagramImage}
                        alt="Schematic preview"
                        className="mt-3 max-h-80 w-full rounded-xl border border-slate-800 object-contain bg-white p-3"
                      />
                      <div className="mt-4">
                        <TextArea
                          label="Photo Note"
                          value={reportData.general.diagramImageNote || ""}
                          onChange={(v) =>
                            handleChange("general", "diagramImageNote", v)
                          }
                          placeholder="Add note for uploaded schematic anomaly image"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="space-y-4" id="toc-pid-anomaly">
                <h2 className="text-xs font-bold uppercase tracking-[0.3em] bg-slate-900">
                  6.0 P&amp; ID of Anomaly
                </h2>
                <div className="grid grid-cols-1 gap-6">
                  <InputField
                    label="P& ID Heading"
                    value={reportData.inspection.pidTitle || ""}
                    onChange={(v) => handleChange("inspection", "pidTitle", v)}
                    placeholder="P& ID of Anomaly"
                  />
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      P&amp; ID Anomaly Photo
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-slate-900 border border-slate-800 text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white hover:border-orange-500 transition-colors cursor-pointer">
                        <Camera size={14} /> Upload Photo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            handleGeneralImageUpload(
                              "pidImage",
                              file,
                              "p&id anomaly photo",
                            );
                          }}
                        />
                      </label>
                      {reportData.general.pidImage ? (
                        <>
                          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                            Photo attached
                          </span>
                          <button
                            type="button"
                            onClick={() => handleChange("general", "pidImage", "")}
                            className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300"
                          >
                            Remove
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest">
                          No photo uploaded
                        </span>
                      )}
                    </div>
                    {reportData.general.pidImage ? (
                      <>
                        <img
                          src={reportData.general.pidImage}
                          alt="P&ID preview"
                          className="max-h-96 w-full rounded-xl border border-slate-800 object-contain bg-white p-3"
                        />
                        <TextArea
                          label="Photo Note"
                          value={reportData.general.pidImageNote || ""}
                          onChange={(v) =>
                            handleChange("general", "pidImageNote", v)
                          }
                          placeholder="Add note for uploaded P&ID anomaly image"
                        />
                      </>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="space-y-4" id="toc-inspected-equipment">
                <h2 className="text-xs font-bold uppercase tracking-[0.3em] bg-slate-900">
                  7.0 Schematic of Inspected Equipment/Piping/Structure
                </h2>
                <div className="grid grid-cols-1 gap-6">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Inspected Equipment/Piping/Structure Schematic
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-slate-900 border border-slate-800 text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white hover:border-orange-500 transition-colors cursor-pointer">
                        <Camera size={14} /> Upload Photo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            handleGeneralImageUpload(
                              "inspectedEquipmentImage",
                              file,
                              "inspected equipment schematic",
                            );
                          }}
                        />
                      </label>
                      {reportData.general.inspectedEquipmentImage ? (
                        <>
                          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                            Photo attached
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleChange("general", "inspectedEquipmentImage", "")
                            }
                            className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300"
                          >
                            Remove
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest">
                          No photo uploaded
                        </span>
                      )}
                    </div>
                    {reportData.general.inspectedEquipmentImage ? (
                      <>
                        <img
                          src={reportData.general.inspectedEquipmentImage}
                          alt="Inspected equipment schematic preview"
                          className="max-h-96 w-full rounded-xl border border-slate-800 object-contain bg-white p-3"
                        />
                        <TextArea
                          label="Photo Note"
                          value={reportData.general.inspectedEquipmentImageNote || ""}
                          onChange={(v) =>
                            handleChange(
                              "general",
                              "inspectedEquipmentImageNote",
                              v,
                            )
                          }
                          placeholder="Add note for uploaded inspected equipment image"
                        />
                      </>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="space-y-4" id="toc-signature">
                <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500 mt-12 bg-slate-900">
                  Signature
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {canViewInspectorField && (
                    <div className="space-y-4">
                      <InputField
                        label="Inspector"
                        value={
                          reportData.signoff.inspector ||
                          reportData.general.inspectorName ||
                          location.state?.preFill?.inspectorName ||
                          ""
                        }
                        onChange={(v) => handleChange("signoff", "inspector", v)}
                        required
                      />
                      <InputField
                        label="Inspector Qualification"
                        value={reportData.signoff.inspectorQualification || ""}
                        onChange={(v) =>
                          handleChange("signoff", "inspectorQualification", v)
                        }
                        placeholder="e.g. ASNT Level II"
                      />
                    </div>
                  )}
                  {canViewLeadField && (
                    <div className="space-y-4">
                      <InputField
                        label="Lead Inspector"
                        value={
                          reportData.signoff.reviewer ||
                          reportData.general.supervisorName ||
                          location.state?.preFill?.supervisorName ||
                          ""
                        }
                        onChange={(v) => handleChange("signoff", "reviewer", v)}
                        required
                      />
                      <InputField
                        label="Lead Inspector Qualification"
                        value={reportData.signoff.reviewerQualification || ""}
                        onChange={(v) =>
                          handleChange("signoff", "reviewerQualification", v)
                        }
                        placeholder="e.g. ASNT Level III"
                      />
                    </div>
                  )}
                  {canViewManagerField && (
                    <div className="space-y-4">
                      <InputField
                        label="NDT Manager"
                        value={
                          reportData.signoff.manager ||
                          reportData.general.managerName ||
                          location.state?.preFill?.managerName ||
                          ""
                        }
                        onChange={(v) => handleChange("signoff", "manager", v)}
                        required
                      />
                      <InputField
                        label="NDT Manager Qualification"
                        value={reportData.signoff.managerQualification || ""}
                        onChange={(v) =>
                          handleChange("signoff", "managerQualification", v)
                        }
                        placeholder="e.g. NDT Level III"
                      />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {canViewInspectorSignature && (
                    <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Inspector Signature
                      </label>
                      <div className="flex items-center gap-3">
                        {canEditInspectorSignature && (
                          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-slate-900 border border-slate-800 text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white hover:border-orange-500 transition-colors cursor-pointer">
                            <Camera size={14} /> Upload
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                handleSignoffUpload(
                                  "inspectorSignature",
                                  file,
                                  "inspector signature",
                                );
                              }}
                            />
                          </label>
                        )}
                        {reportData.signoff.inspectorSignature && (
                          <>
                            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                              Signature attached
                            </span>
                            {canEditInspectorSignature && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleChange(
                                    "signoff",
                                    "inspectorSignature",
                                    "",
                                  )
                                }
                                className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300"
                              >
                                Remove
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  {canViewLeadSignature && (
                    <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Lead Inspector Signature
                      </label>
                      <div className="flex items-center gap-3">
                        {canEditLeadSignature && (
                          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-slate-900 border border-slate-800 text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white hover:border-orange-500 transition-colors cursor-pointer">
                            <Camera size={14} /> Upload
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                handleSignoffUpload(
                                  "reviewerSignature",
                                  file,
                                  "reviewer signature",
                                );
                              }}
                            />
                          </label>
                        )}
                        {reportData.signoff.reviewerSignature && (
                          <>
                            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                              Signature attached
                            </span>
                            {canEditLeadSignature && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleChange(
                                    "signoff",
                                    "reviewerSignature",
                                    "",
                                  )
                                }
                                className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300"
                              >
                                Remove
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  {canViewManagerSignature && (
                    <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        NDT Manager Signature
                      </label>
                      <div className="flex items-center gap-3">
                        {canEditManagerSignature && (
                          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-slate-900 border border-slate-800 text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white hover:border-orange-500 transition-colors cursor-pointer">
                            <Camera size={14} /> Upload
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                handleSignoffUpload(
                                  "managerSignature",
                                  file,
                                  "manager signature",
                                );
                              }}
                            />
                          </label>
                        )}
                        {reportData.signoff.managerSignature && (
                          <>
                            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                              Signature attached
                            </span>
                            {canEditManagerSignature && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleChange(
                                    "signoff",
                                    "managerSignature",
                                    "",
                                  )
                                }
                                className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300"
                              >
                                Remove
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </section>

            </div>
            {user?.role === "Inspector" && !hideSaveReportButton && (
              <div className="mt-8 flex justify-start">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-orange-600 px-6 py-3 rounded-sm text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-orange-700 shadow-lg disabled:opacity-50"
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
  placeholder = "",
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
      placeholder={placeholder}
      className="bg-slate-950 border border-slate-800 p-3 rounded-sm text-sm text-white focus:border-orange-500 outline-none transition-all"
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
    className="bg-slate-950 border border-slate-800 p-3 rounded-sm text-xs text-white focus:border-orange-500 outline-none transition-all"
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
      className="bg-slate-950 border border-slate-800 p-3 rounded-sm text-sm text-white focus:border-orange-500 outline-none transition-all resize-none"
    />
  </div>
);

export const UTWebView = ({
  reportData,
  companyLogo = "",
  onBack,
  hideControls = false,
}) => {
  const reportRootRef = useRef(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isPdfExportMode, setIsPdfExportMode] = useState(false);
  const resolvedCompanyLogo =
    companyLogo ||
    reportData?.general?.companyLogo ||
    reportData?.general?.companyLogoUrl ||
    "";
  const handleDownloadPdf = async () => {
    if (!reportRootRef.current) {
      toast.error("Report content is not ready for PDF export.");
      return;
    }

    setIsDownloadingPdf(true);
    try {
      setIsPdfExportMode(true);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => setTimeout(resolve, 80));

      const fileBase =
        reportData?.general?.projectId ||
        reportData?.general?.reportNum ||
        reportData?.general?.projectName ||
        "inspection-report";
      const safeFileBase = String(fileBase)
        .trim()
        .replace(/[^\w-]+/g, "_")
        .replace(/^_+|_+$/g, "");

      await html2pdf()
        .set({
          margin: 0,
          filename: `${safeFileBase || "inspection-report"}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            scrollX: 0,
            scrollY: 0,
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: {
            mode: ["avoid-all", "css", "legacy"],
            avoid: [
              ".report-page",
              ".split-block",
              ".pdf-avoid-break",
              "table",
              "tr",
              "img",
            ],
          },
        })
        .from(reportRootRef.current)
        .save();
    } catch (error) {
      console.error("PDF export failed:", error);
      toast.error("Unable to download the PDF.");
    } finally {
      setIsPdfExportMode(false);
      setIsDownloadingPdf(false);
    }
  };
  const reportHeader = (
    <div className="relative px-10 py-4 border-b border-slate-200/80 backdrop-blur-md">
      <div className="border border-slate-400 bg-white/90 p-[2px]">
        <div className="border border-slate-300">
          <div className="grid grid-cols-[140px_1fr_140px] items-center">
            <div className="h-16 border-r border-slate-300 flex items-center justify-center">
              {reportData.general.clientLogo ? (
                <img
                  src={reportData.general.clientLogo}
                  alt="Client"
                  className="h-12 w-auto object-contain"
                />
              ) : (
                <div className="h-8 w-20 border border-slate-300 bg-slate-100" />
              )}
            </div>
            <div className="h-16 flex items-center justify-center px-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-black text-center leading-tight">
              {reportData?.general?.inspectionTypeName ||
                reportData?.general?.inspectionTypeCode ||
                reportData?.general?.inspectionType ||
                "Visuals for Existing Piping and Structural Tie-In Locations"}
            </div>
            <div className="h-16 border-l border-slate-300 flex items-center justify-center">
              {resolvedCompanyLogo ? (
                <img
                  src={resolvedCompanyLogo}
                  alt="Company logo"
                  className="h-12 w-auto object-contain p-2"
                />
              ) : (
                <div className="h-8 w-20 border border-slate-300 bg-slate-100" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  const formattedMonthYear = (() => {
    const dateValue = reportData?.general?.date;
    if (!dateValue) return "";
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleString("en-US", { month: "long", year: "numeric" });
  })();
  const formattedPageTwoDate = formattedMonthYear
    ? formattedMonthYear.toUpperCase()
    : "";
  const pageTwoRevision = reportData?.general?.revision || "";
  const pageTwoContractNumber = reportData?.general?.contract || "";
  const pageTwoTestCode = reportData?.general?.testCode || "";
  const pageTwoInspectors =
    reportData?.general?.inspectorName ||
    reportData?.signoff?.inspector ||
    "";
  const pageTwoAcceptanceCriteria =
    reportData?.general?.acceptanceCriteria || "";
  const pageTwoProcedure =
    reportData?.general?.procedure ||
    reportData?.general?.inspectionProcedure ||
    "";
  const reportNumber = reportData?.general?.reportNum || "N/A";
  const populatedObservations = (reportData?.observations || []).filter((obs) =>
    [
      obs.title,
      obs.refSn,
      obs.equipmentId,
      obs.equipmentDescription,
      obs.pageNo,
      obs.description,
      obs.photo,
      obs.photoNote,
    ].some((value) => String(value || "").trim()),
  );
  const populatedChecklist = (reportData?.checklist || []).filter((item) =>
    [
      item.equipmentId,
      item.equipmentDescription,
      item.anomaly,
      item.pageNo,
      item.photo,
      item.photoNote,
    ].some((value) => String(value || "").trim()),
  );
  const populatedPipeSupportPhotos = (reportData?.pipeSupports || []).filter((item) =>
    [
      item.equipmentDescription,
      item.anomaly,
      item.pageNo,
      item.photo,
      item.photoNote,
    ].some((value) => String(value || "").trim()),
  );
  const populatedSpecialConsiderationPhotos = (
    reportData?.specialConsiderations || []
  ).filter((item) =>
    [
      item.equipmentDescription,
      item.anomaly,
      item.pageNo,
      item.photo,
      item.photoNote,
    ].some((value) => String(value || "").trim()),
  );
  const allPhotos = [
    ...populatedChecklist
      .flatMap((item) =>
        normalizePhotoEntries(item).map((entry) => ({
          ...item,
          photo: entry.url,
          galleryTitle:
            item.equipmentId || item.equipmentDescription || "Checklist Item",
          title:
            item.equipmentId || item.equipmentDescription || "Checklist Item",
          galleryNote: entry.note || item.photoNote || item.anomaly || "",
        })),
      ),
    ...populatedPipeSupportPhotos
      .flatMap((item) =>
        normalizePhotoEntries(item).map((entry) => ({
          ...item,
          photo: entry.url,
          galleryTitle: item.equipmentDescription || "Pipe Support",
          title: item.equipmentDescription || "Pipe Support",
          galleryNote: entry.note || item.photoNote || item.anomaly || "",
        })),
      ),
    ...populatedSpecialConsiderationPhotos
      .flatMap((item) =>
        normalizePhotoEntries(item).map((entry) => ({
          ...item,
          photo: entry.url,
          galleryTitle: item.equipmentDescription || "Special Consideration",
          title: item.equipmentDescription || "Special Consideration",
          galleryNote: entry.note || item.photoNote || item.anomaly || "",
        })),
      ),
  ];
  const findingLines = (reportData?.inspection?.findings || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const introductionParagraphs = (reportData?.inspection?.scope || "")
    .split(/\r?\n\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const checklistDisplayItems = populatedChecklist.length
    ? populatedChecklist
    : [
        {
          equipmentDescription:
            "Straight Pipe Runs, Expansion Joints, including where Pipe Rests on Supports",
          anomaly:
            "1. Light corrosion observed on 2nd flange weld and adjacent horizontal line.",
          pageNo: "06",
        },
      ];
  const utmDisplayRows = (reportData?.utm || []).flatMap((group, groupIdx) =>
    (group?.points || []).map((point, pointIdx) => ({
      id: point.id || `${group.id || groupIdx}-${pointIdx}`,
      tml: String(group?.tieIn || "").trim() || `TML-${groupIdx + 1}`,
      position: String(point?.point ?? pointIdx + 1).trim(),
      maxThickness: String(point?.add || "").trim(),
      minThickness: String(point?.min || "").trim(),
      nominalThickness: String(point?.nominal || "").trim(),
      observation: String(point?.observation || "").trim(),
    })),
  );
  const utmDisplayItems = utmDisplayRows.length
    ? utmDisplayRows
    : [
        {
          id: "utm-default-1",
          tml: "A1",
          position: "1",
          maxThickness: "",
          minThickness: "",
          nominalThickness: "",
          observation: "",
        },
      ];
  const populatedSpecialConsiderations = (
    reportData?.specialConsiderations || []
  ).filter((item) =>
    [item.equipmentDescription, item.anomaly, item.pageNo].some((value) =>
      String(value || "").trim(),
    ),
  );
  const specialConsiderationDisplayItems = populatedSpecialConsiderations.length
    ? populatedSpecialConsiderations
    : [
        {
          equipmentDescription: "Injection Points",
          anomaly: "N/A.",
          pageNo: "NA",
        },
        {
          equipmentDescription: "Safety Valve and Associated piping",
          anomaly: "N/A.",
          pageNo: "NA",
        },
      ];
  const checklistPages = Array.from(
    { length: Math.max(1, Math.ceil(checklistDisplayItems.length / 8)) },
    (_, idx) => checklistDisplayItems.slice(idx * 8, (idx + 1) * 8),
  );
  const pipeSupportPages = Array.from(
    {
      length: Math.max(1, Math.ceil(utmDisplayItems.length / 18)),
    },
    (_, idx) => utmDisplayItems.slice(idx * 18, (idx + 1) * 18),
  );
  const specialConsiderationPages = Array.from(
    {
      length: Math.max(
        1,
        Math.ceil(specialConsiderationDisplayItems.length / 8),
      ),
    },
    (_, idx) =>
      specialConsiderationDisplayItems.slice(idx * 8, (idx + 1) * 8),
  );
  const toRoman = (value) => {
    const map = [
      [10, "X"],
      [9, "IX"],
      [5, "V"],
      [4, "IV"],
      [1, "I"],
    ];
    let num = value;
    let out = "";
    map.forEach(([n, sym]) => {
      while (num >= n) {
        out += sym;
        num -= n;
      }
    });
    return out || String(value);
  };
  const chunkArray = (items, size) => {
    if (!items.length) return [[]];
    return Array.from({ length: Math.ceil(items.length / size) }, (_, idx) =>
      items.slice(idx * size, (idx + 1) * size),
    );
  };
  function paginateTableRowsByContent(
    items,
    {
      pageCapacity = 34,
      baseUnits = 2.6,
      noteReserve = 0,
      descriptionDivisor = 42,
      observationDivisor = 120,
      pageRefDivisor = 18,
    } = {},
  ) {
    if (!items.length) return [[]];

    const estimateUnits = (item) => {
      const descriptionLength = String(
        item?.equipmentDescription || "",
      ).trim().length;
      const observationLength = String(item?.anomaly || "").trim().length;
      const photoRefLength = String(item?.pageNo || "").trim().length;
      return (
        baseUnits +
        Math.ceil(descriptionLength / descriptionDivisor) +
        Math.ceil(observationLength / observationDivisor) +
        Math.ceil(photoRefLength / pageRefDivisor)
      );
    };

    const pages = [];
    let currentPage = [];
    let currentUnits = 0;

    items.forEach((item) => {
      const itemUnits = estimateUnits(item);
      if (currentPage.length && currentUnits + itemUnits > pageCapacity) {
        pages.push(currentPage);
        currentPage = [];
        currentUnits = 0;
      }
      currentPage.push(item);
      currentUnits += itemUnits;
    });

    if (currentPage.length) pages.push(currentPage);
    if (!pages.length) return [[]];

    if (noteReserve > 0) {
      const lastPage = pages[pages.length - 1];
      let lastPageUnits = lastPage.reduce(
        (sum, item) => sum + estimateUnits(item),
        0,
      );

      while (lastPage.length > 1 && lastPageUnits + noteReserve > pageCapacity) {
        const movedItem = lastPage.pop();
        lastPageUnits = lastPage.reduce(
          (sum, item) => sum + estimateUnits(item),
          0,
        );
        pages.push([movedItem]);
      }
    }

    return pages;
  }
  const splitTextIntoPageChunks = (text, maxChars = 2600) => {
    const source = String(text || "").trim();
    if (!source) return [""];
    const paragraphs = source.split(/\n\s*\n/).filter(Boolean);
    const chunks = [];
    let current = "";

    paragraphs.forEach((paragraph) => {
      const normalized = paragraph.trim();
      const next = current ? `${current}\n\n${normalized}` : normalized;
      if (next.length <= maxChars) {
        current = next;
        return;
      }

      if (current) {
        chunks.push(current);
        current = "";
      }

      if (normalized.length <= maxChars) {
        current = normalized;
        return;
      }

      const words = normalized.split(/\s+/);
      let wordChunk = "";
      words.forEach((word) => {
        const candidate = wordChunk ? `${wordChunk} ${word}` : word;
        if (candidate.length > maxChars) {
          if (wordChunk) chunks.push(wordChunk);
          wordChunk = word;
        } else {
          wordChunk = candidate;
        }
      });
      if (wordChunk) current = wordChunk;
    });

    if (current) chunks.push(current);
    return chunks.length ? chunks : [source];
  };
  const splitTextIntoLines = (text, fallbackLines = []) => {
    const lines = String(text || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    return lines.length ? lines : fallbackLines;
  };
  const defaultIntroductionParagraphs = [
    "We conducted rigorous Ultrasonic Thickness Testing on the 2inch piping at the starboard process area at Module P4 of Usan FPSO.",
  ];
  const defaultExecutiveSummaryLines = [
    "1.0 Heavy corrosion with scale build up was observed on 4th support weld attached to platform structure.",
    "2.0 Moderate corrosion noticed on 2nd pipe support.",
  ];
  const narrativeSections = [
    {
      key: "introduction",
      title: "1. Introduction",
      items: introductionParagraphs.length
        ? introductionParagraphs
        : defaultIntroductionParagraphs,
      separator: "\n\n",
      chunkSize: 1700,
      spacingClass: "",
      underline: false,
    },
    {
      key: "executive-summary",
      title: "2. Executive Summary",
      items: findingLines.length ? findingLines : defaultExecutiveSummaryLines,
      separator: "\n",
      chunkSize: 1400,
      spacingClass: "mt-12",
      underline: false,
    },
  ];
  const narrativeBlocks = narrativeSections.flatMap((section) =>
    splitTextIntoPageChunks(
      section.items.join(section.separator),
      section.chunkSize,
    ).map((chunk, idx) => ({
      ...section,
      chunk,
      isContinuation: idx > 0,
    })),
  );
  const buildNarrativePages = (blocks, maxCharsPerPage = 3000) => {
    if (!blocks.length) return [[]];
    const pages = [];
    let currentPage = [];
    let currentSize = 0;

    blocks.forEach((block) => {
      // Tune the estimate so long intro text can use more of the page
      // before we force a continuation page.
      const estimatedSize = block.chunk.length + 140;
      if (
        currentPage.length > 0 &&
        currentSize + estimatedSize > maxCharsPerPage
      ) {
        pages.push(currentPage);
        currentPage = [];
        currentSize = 0;
      }
      currentPage.push(block);
      currentSize += estimatedSize;
    });

    if (currentPage.length) pages.push(currentPage);
    return pages.length ? pages : [[]];
  };
  const narrativePages = buildNarrativePages(narrativeBlocks);
  const narrativePageCount = Math.max(1, narrativePages.length);
  const narrativeExtraPages = narrativePageCount - 1;
  const sectionStartPages = narrativePages.reduce((acc, pageBlocks, pageIdx) => {
    pageBlocks.forEach((block) => {
      if (!acc[block.key]) acc[block.key] = pageIdx + 3;
    });
    return acc;
  }, {});
  const photosPerPage = 9;
  const summaryChunks = chunkArray(populatedObservations, 6);
  const checklistChunks = checklistPages;
  const schematicNoteLines = splitTextIntoLines(
    reportData?.inspection?.schematicNotes,
    ["1. Add the anomaly notes from the form view to display them here."],
  );
  const schematicNotePages = splitTextIntoPageChunks(
    schematicNoteLines.join("\n"),
    900,
  );
  const customSectionPages = (reportData.customSections || []).flatMap(
    (section, idx) =>
      splitTextIntoPageChunks(section.content || "", 2200).map((content, pageIdx) => ({
        ...section,
        pageContent: content,
        sourceIndex: idx,
        chunkIndex: pageIdx,
      })),
  );
  const photoPages = Math.max(1, Math.ceil(allPhotos.length / photosPerPage));
  const photoChunks = Array.from({ length: photoPages }, (_, idx) =>
    allPhotos.slice(idx * photosPerPage, (idx + 1) * photosPerPage),
  );
  const firstPhotoChunk = photoChunks[0] || [];
  const remainingPhotoChunks = photoChunks.slice(1);
  const summaryPage = 5 + narrativeExtraPages;
  const summaryPageCount = Math.max(1, summaryChunks.length);
  const checklistPage = 3 + narrativePageCount;
  const checklistPageCount = Math.max(1, checklistPages.length);
  const pipeSupportPage = checklistPage + checklistPageCount;
  const pipeSupportPageCount = Math.max(1, pipeSupportPages.length);
  const schematicPage = pipeSupportPage + pipeSupportPageCount;
  const schematicPageCount = 1;
  const pidPage = schematicPage + schematicPageCount;
  const inspectedEquipmentPage = pidPage + 1;
  const customStartPage = inspectedEquipmentPage + 1;
  const customSections = reportData.customSections || [];
  const customPageCount = Math.max(0, customSectionPages.length);
  const basePagesBeforePhotos =
    customStartPage + customPageCount - 1;
  const photoPageStart = basePagesBeforePhotos + 1;
  const photoPageCount = Math.max(1, photoChunks.length);
  const photoPageEnd = photoPageStart + photoPageCount - 1;
  const signaturePage = photoPageEnd + 1;
  const totalPages = signaturePage;
  const pageTwoTocRows = [
    {
      sn: "1.0",
      description: "INTRODUCTION",
      page: `${sectionStartPages["introduction"] || 3}`,
    },
    {
      sn: "2.0",
      description: "EXECUTIVE SUMMARY",
      page: `${sectionStartPages["executive-summary"] || 3}`,
    },
    { sn: "3.0", description: "INSPECTION FINDINGS", page: `${summaryPage}` },
    {
      sn: "4.0",
      description: "UTM READINGS",
      page: `${pipeSupportPage}`,
    },
    {
      sn: "5.0",
      description: "SCHEMATICS OF ANOMALY",
      page: `${schematicPage}`,
    },
    {
      sn: "6.0",
      description: "P & ID OF ANOMALY",
      page: `${pidPage}`,
    },
    {
      sn: "7.0",
      description: "SCHEMATIC OF INSPECTED EQUIPMENT/PIPING/STRUCTURE",
      page: `${inspectedEquipmentPage}`,
    },
    {
      sn: "8.0",
      description: "PHOTOGRAPHIC DETAILS",
      page:
        photoPageCount > 1
          ? `${photoPageStart}-${photoPageEnd}`
          : `${photoPageStart}`,
    },
  ];
  const tocRows = [
    { desc: "Summary Of Findings", page: `${summaryPage}` },
    {
        desc: "Inspection Findings",
        page: `${checklistPage}`,
    },
    ...customSections.map((section, idx) => {
      const sectionPages = customSectionPages.filter(
        (page) => page.sourceIndex === idx,
      );
      const firstSectionPageIndex = customSectionPages.findIndex(
        (page) => page.sourceIndex === idx,
      );
      if (!sectionPages.length || firstSectionPageIndex === -1) {
        return {
          desc: section.title || `Additional Section ${idx + 1}`,
          page: `${customStartPage}`,
        };
      }
      const sectionStart = customStartPage + firstSectionPageIndex;
      const sectionEnd = sectionStart + sectionPages.length - 1;
      return {
        desc: section.title || `Additional Section ${idx + 1}`,
        page:
          sectionPages.length > 1
            ? `${sectionStart}-${sectionEnd}`
            : `${sectionStart}`,
      };
    }),
    {
      desc: "Photographic Details",
      page:
        photoPageCount > 1
          ? `${photoPageStart}-${photoPageEnd}`
          : `${photoPageStart}`,
    },
    { desc: "Signature", page: `${signaturePage}` },
  ];
  return (
    <div
      className={`min-h-screen bg-slate-900 p-4 md:p-8 pb-20 print:p-0 print:bg-white ${
        isPdfExportMode ? "pdf-export" : ""
      }`}
    >
      <style>{`
        @media print {
          .report-page {
            break-after: page;
            page-break-after: always;
            border: none;
            outline: none;
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
          .pdf-placeholder {
            display: none !important;
          }
        }
        .repeat-footer {
          display: none;
        }
        .report-page {
          border: 2px solid #94a3b8;
          outline: 1px solid #cbd5f5;
          outline-offset: -6px;
          background-color: #ffffff;
        }
        .pdf-export .report-page {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
        }
        .pdf-export .pdf-placeholder {
          display: none !important;
        }
        .pdf-export table,
        .pdf-export tr,
        .pdf-export img,
        .pdf-export .split-block,
        .pdf-export .pdf-avoid-break {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
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
              className="bg-slate-800 text-white px-5 py-2 rounded-sm font-bold flex items-center gap-2 border border-slate-700"
            >
              <Printer size={16} /> Print
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2 rounded-sm font-bold flex items-center gap-2 shadow-lg shadow-orange-900/20"
            >
              <FileDown size={16} /> {isDownloadingPdf ? "Generating..." : "Save as PDF"}
            </button>
          </div>
        </div>
      )}

        <div ref={reportRootRef} className="max-w-[210mm] w-full mx-auto space-y-0 px-2 sm:px-0">
          <div className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-hidden">
            <div className="relative flex items-center justify-between px-12 py-6 border-b border-slate-200/80 backdrop-blur-md">
            {reportData.general.clientLogo ? (
              <img
                src={reportData.general.clientLogo}
                alt="Client"
                className="h-12 w-auto object-contain"
              />
            ) : (
              <div className="h-10 w-24 rounded-lg border border-slate-300" />
            )}
            {resolvedCompanyLogo ? (
              <img
                src={resolvedCompanyLogo}
                alt="Company logo"
                className="h-12 w-auto object-contain"
              />
            ) : (
              <div className="h-10 w-24 rounded-lg border border-slate-300" />
            )}
          </div>
<div className="space-y-4 ">
          <div className="relative flex-1 flex flex-col mt-12 mb-12 text-center px-10">
            <div className="mx-auto flex h-full max-w-[190mm] flex-col items-center text-center">
              <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.45em] text-slate-500">
                Technical Inspection Report
              </div>
              <div className="mt-16 text-[58px] font-extrabold leading-[1.08] tracking-tight text-blue-700">
                Ultrasonic Thickness Inspection 
              </div>
              <div className="mt-4 text-[50px] font-extrabold leading-none tracking-tight text-blue-600">
                Report
              </div>
              <div className="mt-8 h-[3px] w-32 rounded-full border-t border-slate-300" />
              <div className="mt-8 mb-20 3 font-semibold uppercase tracking-[0.35em] text-slate-600">
                {reportData?.general?.equipment || "Storage Tank (T)"}
              </div>

            
            </div>
          </div>
          <div className="mt-auto w-full px-6 items-center justify-center">
              <table className="w-full  table-fixed border-collapse text-[13px] text-black">
                <tbody>
                  <tr className="bg-white">
                    <td className="w-[15%] border border-slate-200 px-4 py-1  font-semibold">
                      Client:
                    </td>
                    <td className="w-[30%] border border-slate-200 px-4 py-1  text-blue-700">
                      {reportData?.general?.client || "ESSO"}
                    </td>
                    
                    <td className="border border-slate-200 px-4 py-1  font-semibold">
                      Revision:
                    </td>
                    <td className="border border-slate-200 px-4 py-1  text-blue-700">
                      {pageTwoRevision || "XXXX"}
                    </td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 px-4 py-1  font-semibold">
                      Contract Number:<br /> &nbsp;
                    </td>
                    <td className="border border-slate-200 px-2 py-1  text-blue-700">
                      {reportData?.general?.contract || "XXXXXX"}
                    </td>
                    <td className="border border-slate-200 px-4 py-1  font-semibold">
                      Location:
                    </td>
                    <td className="border border-slate-200 px-4 py-1  text-blue-700">
                      {reportData?.general?.platform || "USAN FPSO"}
                    </td>
                    
                  </tr>
                  <tr className="bg-white">
                    <td className="border border-slate-200 px-4 py-1 align-top  font-semibold">
                      P &amp; ID Number<br/>/DWG No.:
                    </td>
                    <td className="border border-slate-200 px-4 py-1  text-blue-700">
                      {reportData?.general?.pidNumber || "XXXXXXX"}
                    </td>
                    <td className="border border-slate-200 px-4 py-1  font-semibold">
                      Date of Inspection:
                    </td>
                    <td className="border border-slate-200 px-4 py-1  text-blue-700">
                      {formattedPageTwoDate || "XXXXXX"}
                    </td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 px-4 py-1  font-semibold">
                      Test Code:
                    </td>
                    <td className="border border-slate-200 px-4 py-1  text-blue-700">
                      {pageTwoTestCode || "XXXXX"}
                    </td>
                    <td className="border border-slate-200 px-4 py-1  font-semibold">
                      Name of Inspectors:
                    </td>
                    <td className="border border-slate-200 px-4 py-1  text-blue-700">
                      {pageTwoInspectors || "XXXXXX"}
                    </td>
                  </tr>
                  <tr className="bg-white">
                    <td className="border  border-slate-200 px-4 py-1  font-semibold">
                      Equipment Description:
                    </td>
                    <td className="border border-slate-200 px-4 py-1  text-blue-700">
                      {reportData?.general?.equipment || "Storage Tank (T)"}
                    </td>
                    <td className="border border-slate-200 px-4 py-1  font-semibold">
                      Operating Procedures:
                    </td>
                    <td className="border border-slate-200 px-4 py-1  text-blue-700">
                      {pageTwoProcedure || "XXXX"}
                    </td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="w-[21%] border border-slate-200 px-4 py-1  font-semibold">
                      Report Number
                    </td>
                    <td className="w-[19%] border border-slate-200 px-4 py-1  text-blue-700">
                      {reportData?.general?.reportNum || "XXXXXX"}
                    </td>
                    <td className="border border-slate-200 px-4 py-1 font-semibold align-top whitespace-normal break-words">
                      Acceptance Criteria:
                    </td>
                    <td className="border border-slate-200 px-4 py-1 text-blue-700 whitespace-normal break-words">
                      {pageTwoAcceptanceCriteria || "XXXXXXX"}
                    </td>
                  </tr>
                </tbody>
              </table>

            </div>
            </div>
        </div>

        <div className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-hidden">
          {reportHeader}

          

          <div className="relative flex-1 px-12 pt-12">
            
            <div className="mx-auto w-full mt-4">
              <h2 className="text-center text-[18px] font-black uppercase underline text-blue-900">
                Table of Contents
              </h2>
                <table className="pdf-avoid-break mt-6 w-full text-[14px] border-collapse">
                <thead className="border-b border-slate-200 bg-blue-900 text-white">
                  <tr className="border-b border-slate-200 bg-blue-900 text-white">
                    <th className="border-r border-slate-200 bg-blue-900 p-2 w-12 text-[12px] text-white">
                      S/N
                    </th>
                    <th className="border-r border-slate-200 bg-blue-900 p-2 w-12 text-[12px] text-white">  Description
                    </th>
                    <th className="border-r border-slate-200 bg-blue-900 p-2 w-12 text-[12px] text-white">  Page No.
                    </th>
                  </tr>
                </thead>
                <tbody className="text-slate-800">
                  {pageTwoTocRows.map((row, idx) => (
                    <tr
                      key={row.sn}
                      className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}
                    >
                      <td className="border-r border-slate-200 p-2 text-center font-bold">
                        {row.sn}
                      </td>
                      <td className="border-r border-slate-200 p-2 text-center font-bold"> {row.description}
                      </td>
                      <td className="border-r border-slate-200 p-2 text-center font-bold">
                        {row.page}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="relative mt-auto px-12 pb-8">
            <div className="pt-6 border-t-2 border-slate-900/80 text-center">
              <p className="text-[10px] font-black text-red-600 tracking-[0.4em]">
                ORIGINAL
              </p>
            </div>
            <div className="pt-4 text-[10px] font-bold uppercase tracking-widest text-black text-right">
              Page 2 of {totalPages}
            </div>
          </div>
        </div>

        {narrativePages.map((pageBlocks, pageIdx) => (
          <div
            key={`narrative-page-${pageIdx}`}
            className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-hidden"
          >
            {reportHeader}

            <div className="relative flex-1 px-10 pt-14 pb-10">
              <div className="mx-auto flex h-full max-w-[185mm] flex-col text-[#0a58b5]">
                {pageBlocks.map((block, blockIdx) => {
                  const blockLines = block.chunk
                    .split(/\r?\n/)
                    .map((line) => line.trim())
                    .filter(Boolean);
                  const nextBlock = pageBlocks[blockIdx + 1];
                  const mergesWithNext =
                    nextBlock &&
                    nextBlock.key === block.key &&
                    nextBlock.isContinuation;

                  return (
                    <section
                      key={`${block.key}-${pageIdx}-${blockIdx}`}
                      className={
                        block.isContinuation
                          ? ""
                          : blockIdx === 0
                            ? ""
                            : block.spacingClass
                      }
                    >
                      {["introduction", "executive-summary"].includes(
                        block.key,
                      ) ? (
                        <table
                          className={`w-full border-collapse ${
                            block.isContinuation
                              ? mergesWithNext
                                ? "mt-0"
                                : "mt-0"
                              : mergesWithNext
                                ? "mt-2"
                                : "mt-2"
                          }`}
                        >
                          <tbody>
                            {!block.isContinuation && (
                              <tr>
                                <th className="bg-blue-900 px-4 py-3 text-center text-[18px] font-bold uppercase text-white">
                                  {block.title}
                                </th>
                              </tr>
                            )}
                            <tr className="bg-slate-50">
                              <td className="px-4 py-3 align-top">
                                <div
                                  className={`text-[14px] leading-7 text-blue-900 ${
                                    block.key === "introduction"
                                      ? "space-y-6"
                                      : "space-y-2 pl-5"
                                  }`}
                                >
                                  {blockLines.map((line, idx) => (
                                    <p
                                      key={`${block.key}-line-${pageIdx}-${idx}`}
                                      className="text-left text-black"
                                    >
                                      {line}
                                    </p>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      ) : (
                        <>
                          <div
                            className={`text-[14px] leading-7 text-blue-900 ${
                              block.isContinuation ? "" : "mt-4"
                            } ${
                              block.key === "introduction"
                                ? "space-y-6 text-blue-900"
                                : "space-y-2 pl-5"
                            }`}
                          >
                            {blockLines.map((line, idx) => (
                              <p
                                key={`${block.key}-line-${pageIdx}-${idx}`}
                                className="text-left text-black"
                              >
                                {line}
                              </p>
                            ))}
                          </div>
                        </>
                      )}
                    </section>
                  );
                })}
              </div>
            </div>

            <div className="relative mt-auto px-12 pb-8">
              <div className="pt-6 border-t-2 border-slate-900/80 text-center">
                <p className="text-[10px] font-black text-red-600 tracking-[0.4em]">
                  ORIGINAL
                </p>
              </div>
              <div className="pt-4 text-[10px] font-bold uppercase tracking-widest text-black text-right">
                Page {pageIdx + 3} of {totalPages}
              </div>
            </div>
          </div>
        ))}

        {checklistPages.map((pageItems, pageIdx) => (
          <div
            key={`checklist-page-${pageIdx}`}
            className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-hidden"
          >
            {reportHeader}

            <div className="relative flex-1 px-8 pt-10 pb-8">
              <div className="mx-auto max-w-[190mm]">
                <h2 className="text-center text-[18px] font-bold uppercase underline text-blue-900">
                  3. Inspection Findings
                </h2>

                <table className="pdf-avoid-break mt-6 w-full text-[14px] border-collapse">
                  <thead>
                    <tr>
                      <th className="w-[7%] border border-black bg-blue-900 px-2 py-2 text-center font-bold text-white">
                        S/N
                      </th>
                      <th className="w-[31%] border border-black bg-blue-900 px-2 py-2 text-center font-bold text-white">
                        Component
                      </th>
                      <th className="w-[53%] border border-black bg-blue-900 px-2 py-2 text-center font-bold text-white">
                        Observations
                      </th>
                      <th className="w-[9%] border border-black bg-blue-900 px-2 py-2 text-center font-bold text-white">
                        Photos #
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((item, idx) => {
                      const globalIdx = pageIdx * 8 + idx;
                      const observationLines = String(item.anomaly || "")
                        .split(/\r?\n/)
                        .map((line) => line.trim())
                        .filter(Boolean);
                      const photoRefs = String(item.pageNo || "")
                        .split(/[\n,]+/)
                        .map((line) => line.trim())
                        .filter(Boolean);

                      return (
                        <tr
                          key={item.id || `checklist-row-${globalIdx}`}
                          className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}
                        >
                          <td className="align-top border border-black px-1 py-2 text-center text-[13px] font-bold">
                            {globalIdx + 1}
                          </td>
                          <td className="align-top border border-black px-2 py-2 text-[13px] font-bold leading-4">
                            {item.equipmentDescription || "Component"}
                          </td>
                          <td className="align-top border border-black px-2 py-2 text-[13px] leading-4 text-[#0a58b5]">
                            {(observationLines.length
                              ? observationLines
                              : ["No observation added."]
                            ).map((line, lineIdx) => (
                              <p
                                key={`obs-${globalIdx}-${lineIdx}`}
                                className={lineIdx ? "mt-1" : ""}
                              >
                                {line}
                              </p>
                            ))}
                          </td>
                          <td className="align-top border border-black px-1 py-2 text-center text-[13px] text-[#0a58b5]">
                            {(photoRefs.length ? photoRefs : ["-"]).map((ref, refIdx) => (
                              <p
                                key={`photo-${globalIdx}-${refIdx}`}
                                className={refIdx ? "mt-1" : ""}
                              >
                                {ref}
                              </p>
                            ))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="relative mt-auto px-12 pb-8">
              <div className="pt-6 border-t-2 border-slate-900/80 text-center">
                <p className="text-[10px] font-black text-red-600 tracking-[0.4em]">
                  ORIGINAL
                </p>
              </div>
              <div className="pt-4 text-[10px] font-bold uppercase tracking-widest text-black text-right">
                Page {narrativePageCount + 3 + pageIdx} of {totalPages}
              </div>
            </div>
          </div>
        ))}

        {pipeSupportPages.map((pageItems, pageIdx) => (
          <div
            key={`pipe-support-page-${pageIdx}`}
            className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-hidden"
          >
            {reportHeader}

            <div className="relative flex-1 px-8 pt-10 pb-8">
              <div className="mx-auto max-w-[190mm]">
                <h2 className="text-[18px] font-bold uppercase text-blue-900">
                  4.0 UTM Readings
                </h2>

                <table className="pdf-avoid-break mt-4 w-full text-[13px] border-collapse">
                  <tbody>
                    <tr>
                      <td className="w-[23%] border border-black px-2 py-1 font-bold">Location</td>
                      <td className="w-[30%] border border-black px-2 py-1">
                        {reportData?.general?.platform || "N/A"}
                      </td>
                      <td className="w-[21%] border border-black px-2 py-1 font-bold">Date Inspected</td>
                      <td className="w-[26%] border border-black px-2 py-1">
                        {reportData?.general?.date || "N/A"}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-1 font-bold">UT Equipment</td>
                      <td className="border border-black px-2 py-1">
                        {reportData?.general?.utEquipment || "N/A"}
                      </td>
                      <td className="border border-black px-2 py-1 font-bold">Calibration Date</td>
                      <td className="border border-black px-2 py-1">
                        {reportData?.general?.calibrationDate || "N/A"}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-1 font-bold">Equipment Serial No.</td>
                      <td className="border border-black px-2 py-1">
                        {reportData?.general?.utSerial || "N/A"}
                      </td>
                      <td className="border border-black px-2 py-1 font-bold">Couplant Used</td>
                      <td className="border border-black px-2 py-1">
                        {reportData?.general?.couplant || "N/A"}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-1 font-bold">UT Probe: Dia/MHz/Type</td>
                      <td className="border border-black px-2 py-1">
                        {reportData?.general?.utProbe || "N/A"}
                      </td>
                      <td className="border border-black px-2 py-1 font-bold">Name of Inspectors</td>
                      <td className="border border-black px-2 py-1">
                        {reportData?.general?.inspectBy ||
                          reportData?.signoff?.inspector ||
                          reportData?.general?.inspectorName ||
                          "N/A"}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-1 font-bold">Test Temperature</td>
                      <td className="border border-black px-2 py-1">
                        {reportData?.general?.testTemp || "N/A"}
                      </td>
                      <td className="border border-black px-2 py-1 font-bold">Inspector Qualification</td>
                      <td className="border border-black px-2 py-1">
                        {reportData?.signoff?.inspectorQualification || "N/A"}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <table className="pdf-avoid-break mt-6 w-full text-[14px] border-collapse">
                  <thead>
                    <tr>
                      <th className="w-[11%] border border-black bg-blue-900 px-2 py-2 text-center text-[13px] font-bold text-white">
                        TML
                      </th>
                      <th className="w-[11%] border border-black bg-blue-900 px-2 py-2 text-center text-[13px] font-bold text-white">
                        UT Probe Position
                      </th>
                      <th className="w-[10%] border border-black bg-blue-900 px-2 py-2 text-center text-[13px] font-bold text-white">
                        Max Thickness (MM)
                      </th>
                      <th className="w-[10%] border border-black bg-blue-900 px-2 py-2 text-center text-[13px] font-bold text-white">
                        Min Thickness (MM)
                      </th>
                      <th className="w-[10%] border border-black bg-blue-900 px-2 py-2 text-center text-[13px] font-bold text-white">
                        Nominal Thickness (From Pipe Table)
                      </th>
                      <th className="w-[48%] border border-black bg-blue-900 px-2 py-2 text-center text-[13px] font-bold text-white">
                        Observation
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((item, idx) => {
                      const globalIdx = pageIdx * 18 + idx;
                      const observationLines = String(item.observation || "")
                        .split(/\r?\n/)
                        .map((line) => line.trim())
                        .filter(Boolean);

                      return (
                        <tr
                          key={item.id || `support-row-${globalIdx}`}
                          className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}
                        >
                          <td className="align-top border border-black px-1 py-2 text-center text-[10px] font-bold">
                            {item.tml || "N/A"}
                          </td>
                          <td className="align-top border border-black px-1 py-2 text-center text-[10px] font-bold">
                            {item.position || "-"}
                          </td>
                          <td className="align-top border border-black px-1 py-2 text-center text-[10px] font-bold">
                            {item.maxThickness || "-"}
                          </td>
                          <td className="align-top border border-black px-1 py-2 text-center text-[10px] font-bold">
                            {item.minThickness || "-"}
                          </td>
                          <td className="align-top border border-black px-1 py-2 text-center text-[10px] font-bold">
                            {item.nominalThickness || "-"}
                          </td>
                          <td className="align-top border border-black px-1 py-2 text-center text-[10px] font-bold">
                            {(observationLines.length ? observationLines : [" "]).map((line, lineIdx) => (
                              <p
                                key={`support-obs-${globalIdx}-${lineIdx}`}
                                className={lineIdx ? "mt-1" : ""}
                              >
                                {line}
                              </p>
                            ))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="relative mt-auto px-12 pb-8">
              <div className="pt-6 border-t-2 border-slate-900/80 text-center">
                <p className="text-[10px] font-black text-red-600 tracking-[0.4em]">
                  ORIGINAL
                </p>
              </div>
              <div className="pt-4 text-[10px] font-bold uppercase tracking-widest text-black text-right">
                Page {narrativePageCount + checklistPageCount + 3 + pageIdx} of {totalPages}
              </div>
            </div>
          </div>
        ))}

        <div className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-hidden">
          {reportHeader}

          <div className="relative flex-1 px-8 pt-8 pb-8">
            <div className="mx-auto flex h-full max-w-[190mm] flex-col">
              <h2 className="text-[18px] font-bold text-blue-900 uppercase underline text-black">
                5.0 Schematics of Anomaly
              </h2>

              <div className="mt-6 flex-1 rounded-sm border border-slate-300 bg-white p-4">
                {reportData?.general?.diagramImage ? (
                  <div className="flex h-full flex-col">
                    <img
                      src={reportData.general.diagramImage}
                      alt="Schematic of anomaly"
                      className="h-full max-h-[160mm] w-full object-contain"
                    />
                    {String(reportData?.general?.diagramImageNote || "").trim() ? (
                      <div className="mt-4 border border-slate-300 px-4 py-3 text-[11px] leading-5 text-black">
                        {reportData.general.diagramImageNote}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="pdf-placeholder flex h-full min-h-[180mm] items-center justify-center rounded-sm border border-dashed border-slate-400 bg-slate-50 px-8 text-center text-[12px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                    Upload schematic anomaly photo in the form view
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="relative mt-auto px-12 pb-8">
            <div className="pt-6 border-t-2 border-slate-900/80 text-center">
              <p className="text-[10px] font-black text-red-600 tracking-[0.4em]">
                ORIGINAL
              </p>
            </div>
            <div className="pt-4 text-[10px] font-bold uppercase tracking-widest text-black text-right">
              Page {schematicPage} of {totalPages}
            </div>
          </div>
        </div>

        {Boolean(reportData?.general?.showSchematicNotes) &&
          schematicNotePages.map((noteChunk, pageIdx) => (
          <div
            key={`schematic-page-${pageIdx}`}
            className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-hidden"
          >
            {reportHeader}

            <div className="relative flex-1 px-8 pt-8 pb-8">
              <div className="mx-auto flex h-full max-w-[190mm] flex-col">
                <h2 className="text-[18px] font-bold text-blue-900 uppercase underline text-black">
                  5.0 Schematics of Anomaly Showing TMLs
                </h2>

                {pageIdx === 0 && (
                  <>
                    <div className="mt-6 px-8 text-center text-black">
                      <p className="text-[17px] font-semibold italic leading-6">
                        {reportData?.inspection?.schematicTitle ||
                          '2" x 3" Fuel Gas Line from 4" Fuel Gas Line to AGC'}
                      </p>
                      <p className="mt-1 text-[15px] font-semibold italic leading-6">
                        {reportData?.inspection?.schematicSubtitle ||
                          "Corrosion Details"}
                      </p>
                      <div className="mx-auto mt-3 h-[3px] w-36 border-t border-slate-300" />
                    </div>

                    <div className="mt-6 flex-1 rounded-sm border border-slate-300 bg-white p-4">
                      {reportData?.general?.diagramImage ? (
                        <img
                          src={reportData.general.diagramImage}
                          alt="Schematic of anomaly"
                          className="h-full max-h-[100mm] w-full object-contain"
                        />
                      ) : (
                        <div className="pdf-placeholder flex h-full min-h-[120mm] items-center justify-center rounded-sm border border-dashed border-slate-400 bg-slate-50 px-8 text-center text-[12px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                          Upload schematic anomaly photo in the form view
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="pdf-avoid-break mt-6 border border-dashed border-slate-500 px-3 py-3 text-[#0a58b5]">
                  <p className="text-[13px] font-bold italic underline text-red-700">
                    Notes:
                  </p>
                  <div className="mt-2 space-y-1 text-[13px] leading-5">
                    {noteChunk
                      .split(/\r?\n/)
                      .map((line) => line.trim())
                      .filter(Boolean)
                      .map((line, idx) => (
                        <p key={`schematic-note-${pageIdx}-${idx}`}>{line}</p>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative mt-auto px-12 pb-8">
              <div className="pt-6 border-t-2 border-slate-900/80 text-center">
                <p className="text-[10px] font-black text-red-600 tracking-[0.4em]">
                  ORIGINAL
                </p>
              </div>
              <div className="pt-4 text-[10px] font-bold uppercase tracking-widest text-black text-right">
                Page {schematicPage + pageIdx} of {totalPages}
              </div>
            </div>
          </div>
          ))}

        <div className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-hidden">
          {reportHeader}

            <div className="relative flex-1 px-8 pt-8 pb-8">
              <div className="mx-auto flex h-full max-w-[190mm] flex-col">
                <h2 className="text-center text-[18px] font-bold text-blue-900 uppercase underline text-black">
                  {reportData?.inspection?.pidTitle || "6.0 P & ID of Anomaly"}
                </h2>

              <div className="mt-6 flex-1 rounded-sm border border-slate-300 bg-white p-5">
                {reportData?.general?.pidImage ? (
                  <div className="flex h-full flex-col">
                    <img
                      src={reportData.general.pidImage}
                      alt="P&ID of anomaly"
                      className="h-full max-h-[135mm] w-full object-contain"
                    />
                    {String(reportData?.general?.pidImageNote || "").trim() ? (
                      <div className="mt-4 border border-slate-300 px-4 py-3 text-[11px] leading-5 text-black">
                        {reportData.general.pidImageNote}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="pdf-placeholder flex h-full min-h-[150mm] items-center justify-center rounded-sm border border-dashed border-slate-400 bg-slate-50 px-8 text-center text-[12px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                    Upload P&amp; ID anomaly photo in the form view
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="relative mt-auto px-12 pb-8">
            <div className="pt-6 border-t-2 border-slate-900/80 text-center">
              <p className="text-[10px] font-black text-red-600 tracking-[0.4em]">
                ORIGINAL
              </p>
            </div>
            <div className="pt-4 text-[10px] font-bold uppercase tracking-widest text-black text-right">
              Page {pidPage} of {totalPages}
            </div>
          </div>
        </div>

        <div className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-hidden">
          {reportHeader}

          <div className="relative flex-1 px-8 pt-8 pb-8">
            <div className="mx-auto flex h-full max-w-[190mm] flex-col">
              <h2 className="text-center text-[18px] font-bold text-blue-900 uppercase underline text-black">
                7.0 Schematics of Inspected Equipment/Piping/Structure
              </h2>

              <div className="mt-6 flex-1 rounded-sm border border-slate-300 bg-white p-5">
                {reportData?.general?.inspectedEquipmentImage ? (
                  <div className="flex h-full flex-col">
                    <img
                      src={reportData.general.inspectedEquipmentImage}
                      alt="Schematic of inspected equipment"
                      className="h-full max-h-[160mm] w-full object-contain"
                    />
                    {String(
                      reportData?.general?.inspectedEquipmentImageNote || "",
                    ).trim() ? (
                      <div className="mt-4 border border-slate-300 px-4 py-3 text-[11px] leading-5 text-black">
                        {reportData.general.inspectedEquipmentImageNote}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="pdf-placeholder flex h-full min-h-[180mm] items-center justify-center rounded-sm border border-dashed border-slate-400 bg-slate-50 px-8 text-center text-[12px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                    Upload inspected equipment/piping/structure schematic in the form view
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="relative mt-auto px-12 pb-8">
            <div className="pt-6 border-t-2 border-slate-900/80 text-center">
              <p className="text-[10px] font-black text-red-600 tracking-[0.4em]">
                ORIGINAL
              </p>
            </div>
            <div className="pt-4 text-[10px] font-bold uppercase tracking-widest text-black text-right">
              Page {inspectedEquipmentPage} of {totalPages}
            </div>
          </div>
        </div>

        {customSectionPages.map((sectionPage, idx) => {
          const sectionLines = sectionPage.pageContent
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);

          return (
            <div
              key={`custom-section-page-${sectionPage.sourceIndex}-${sectionPage.chunkIndex}`}
              className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-hidden"
            >
              {reportHeader}

              <div className="relative flex-1 px-10 pt-10 pb-10">
                <div className="mx-auto flex h-full max-w-[185mm] flex-col">
                  <table className="w-full border-collapse border border-black">
                    <tbody>
                      {!sectionPage.chunkIndex && (
                        <tr>
                          <th className="border border-black bg-blue-900 px-4 py-3 text-center text-[18px] font-bold uppercase text-white">
                            {sectionPage.title || `Additional Section ${sectionPage.sourceIndex + 1}`}
                          </th>
                        </tr>
                      )}
                      <tr className="bg-slate-50">
                        <td className="px-4 py-4 align-top">
                          <div className="space-y-3 text-[14px] leading-7 text-black">
                            {(sectionLines.length ? sectionLines : ["N/A"]).map((line, lineIdx) => (
                              <p
                                key={`custom-section-line-${sectionPage.sourceIndex}-${sectionPage.chunkIndex}-${lineIdx}`}
                              >
                                {line}
                              </p>
                            ))}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="relative mt-auto px-12 pb-8">
                <div className="pt-6 border-t-2 border-slate-900/80 text-center">
                  <p className="text-[10px] font-black text-red-600 tracking-[0.4em]">
                    ORIGINAL
                  </p>
                </div>
                <div className="pt-4 text-[10px] font-bold uppercase tracking-widest text-black text-right">
                  Page {customStartPage + idx} of {totalPages}
                </div>
              </div>
            </div>
          );
        })}

        {photoChunks.map((pageItems, pageIdx) => (
          <div
            key={`photo-page-${pageIdx}`}
            className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-hidden"
          >
            {reportHeader}

            <div className="relative flex-1 px-6 pt-8 pb-8">
              <div className="mx-auto max-w-[196mm]">
                <h2 className="text-center text-[18px] font-bold text-blue-900 uppercase underline text-black">
                  8.0 Photographic Details
                </h2>

                {pageItems.length ? (
                  <div className="mt-6 grid grid-cols-3 gap-3">
                    {pageItems.map((item, idx) => {
                      const globalIdx = pageIdx * photosPerPage + idx;
                      return (
                        <div
                          key={item.id || `photo-card-${globalIdx}`}
                          className="pdf-avoid-break border border-black bg-white"
                        >
                          <div className="flex h-[40mm] items-center justify-center border-b border-black bg-slate-50 p-1">
                            <img
                              src={item.photo}
                              alt={item.galleryTitle || `Photo ${globalIdx + 1}`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="space-y-1 px-2 py-2 text-center">
                            <p className="min-h-[28px] text-[9px] leading-4 text-black">
                              {item.galleryNote ||
                                item.galleryTitle ||
                                "Uploaded inspection photo"}
                            </p>
                            <p className="text-[9px] font-black text-blue-700">
                              {`(Photo # ${String(globalIdx + 1).padStart(2, "0")})`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="pdf-placeholder mt-8 flex min-h-[210mm] items-center justify-center rounded-sm border border-dashed border-slate-400 bg-slate-50 px-8 text-center text-[12px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                    Upload photos from inspection findings, pipe supports, or
                    special considerations to populate this page
                  </div>
                )}
              </div>
            </div>

            <div className="relative mt-auto px-12 pb-8">
              <div className="pt-6 border-t-2 border-slate-900/80 text-center">
                <p className="text-[10px] font-black text-red-600 tracking-[0.4em]">
                  ORIGINAL
                </p>
              </div>
              <div className="pt-4 text-[10px] font-bold uppercase tracking-widest text-black text-right">
                Page {photoPageStart + pageIdx} of {totalPages}
              </div>
            </div>
          </div>
        ))}

        <div className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[290mm] flex flex-col relative overflow-hidden">
          {reportHeader}

          <div className="relative flex-1 flex flex-col px-12 pt-10 gap-8">
            <div className="rounded-sm border border-slate-800 overflow-hidden">
              <table className="w-full border-collapse table-fixed">
                <thead>
                  <tr className="border-b border-slate-200 bg-blue-900 text-[13px] font-bold leading-tight uppercase text-white">
                    <th className="w-1/3 border-r border-slate-200 bg-blue-900 p-2 text-left text-white">
                      Prepared By
                      <div className="mt-1 text-[13px] font-semibold normal-case text-white">
                        Inspector
                      </div>
                    </th>
                    <th className="w-1/3 border-r border-slate-200 bg-blue-900 p-2 text-left text-white">
                      Reviewed by
                      <div className="mt-1 text-[13px] font-semibold normal-case text-white">
                        Lead Inspector
                      </div>
                    </th>
                    <th className="w-1/3 bg-blue-900 p-2 text-left text-white">
                      Verified By
                      <div className="mt-1 text-[13px] font-semibold normal-case text-white">
                        NDE Advisor
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="text-slate-800">
                  <tr className="bg-slate-50 text-[10px]">
                    <td className="h-[220px] border-r border-slate-200 p-3 align-bottom">
                      <div className="flex h-full flex-col justify-end">
                        {reportData.signoff.inspectorSignature ? (
                          <img
                            src={reportData.signoff.inspectorSignature}
                            alt="Prepared by signature"
                            className="mb-2 h-14 w-auto object-contain"
                          />
                        ) : null}
                        <div className="mb-2 h-6 border-b border-slate-400" />
                        <div className="text-[9px] font-semibold uppercase text-black">
                          {reportData.signoff.inspector ||
                            reportData.general?.inspectorName ||
                            "Inspector"}
                        </div>
                        <div className="mt-1 text-[9px] text-slate-700">
                          {reportData.signoff.inspectorQualification || " "}
                        </div>
                      </div>
                    </td>
                    <td className="h-[220px] border-r border-slate-200 p-3 align-bottom">
                      <div className="flex h-full flex-col justify-end">
                        {reportData.signoff.reviewerSignature ? (
                          <img
                            src={reportData.signoff.reviewerSignature}
                            alt="Lead inspector signature"
                            className="mb-2 h-14 w-auto object-contain"
                          />
                        ) : null}
                        <div className="mb-2 h-6 border-b border-slate-400" />
                        <div className="text-[9px] font-semibold uppercase text-black">
                          {reportData.signoff.reviewer ||
                            reportData.general?.assignedSupervisorName ||
                            reportData.general?.supervisorName ||
                            reportData?.assignedSupervisorName ||
                            reportData?.supervisorName ||
                            "Lead Inspector"}
                        </div>
                        <div className="mt-1 text-[9px] text-slate-700">
                          {reportData.signoff.reviewerQualification || " "}
                        </div>
                      </div>
                    </td>
                    <td className="h-[220px] p-3 align-bottom">
                      <div className="flex h-full flex-col justify-end">
                        {reportData.signoff.managerSignature ? (
                          <img
                            src={reportData.signoff.managerSignature}
                            alt="NDE advisor signature"
                            className="mb-2 h-14 w-auto object-contain"
                          />
                        ) : null}
                        <div className="mb-2 h-6 border-b border-slate-400" />
                        <div className="text-[9px] font-semibold uppercase text-black">
                          {reportData.signoff.manager ||
                            reportData.general?.managerName ||
                            "NDT Advisor"}
                        </div>
                        <div className="mt-1 text-[9px] text-slate-700">
                          {reportData.signoff.managerQualification || " "}
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="relative mt-auto px-12 pb-8">
            <div className="border-t-2 border-slate-900/80 pt-6 text-center">
              <p className="text-[10px] font-black tracking-[0.4em] text-red-600">
                Original Document
              </p>
            </div>
            <div className="pt-4 text-right text-[10px] font-bold uppercase tracking-widest text-black">
              Page {signaturePage} of {totalPages}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export const VisualWebView = UTWebView;

const SectionBlock = ({ title, value }) => (
  <div className="bg-slate-50 border border-slate-200 rounded-sm p-4 split-block">
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
    <div className="border-b-2 border-slate-950 pb-1 font-serif italic text-lg text-black">
      {name || " "}
    </div>
  </div>
);

export default UTReport;
