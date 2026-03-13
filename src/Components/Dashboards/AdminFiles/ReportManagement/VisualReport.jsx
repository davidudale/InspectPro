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
import { useAuth } from "../../../Auth/AuthContext";
import html2pdf from "html2pdf.js";

const VisualReport = ({
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
    type: "Visual",
    status: user?.role === "Inspector" ? "New" : "Draft",
    general: {
      client: "",
      platform: "",
      tag: "",
      reportNum: createReportNumber(),
      date: "",
      equipment: "",
      diagramImage: "",
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
      signoff: { ...prev.signoff, ...(reportDataProp.signoff || {}) },
      customSections:
        reportDataProp.customSections || prev.customSections || [],
      utm: reportDataProp.utm || prev.utm || [],
    }));
  }, [reportDataProp]);
  const [tocSelection, setTocSelection] = useState("");
  const tocOptions = [
    { label: "1.0 Introduction", target: "toc-introduction" },
    { label: "3.0 Summary of Findings", target: "toc-summary" },
    {
      label: "4.0 Visual Inspection Observations Checklist",
      target: "toc-overview",
    },
    { label: "5.0 Photographic Detail", target: "toc-photos" },
    { label: "6.0 Signature", target: "toc-signature" },
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
          toast.info("Previous Visual report loaded for correction.");
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
  }, [location.state]);

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
      toast.error(`Upload failed: ${error.message}`);
    }
  };

  const handleObservationPhotoUpload = async (obsId, file) => {
    try {
      const url = await uploadImageToCloudinary(file, "observation photo");
      updateObservation(obsId, "photo", url);
      toast.success("Observation photo uploaded.");
    } catch (error) {
      toast.error(`Upload failed: ${error.message}`);
    }
  };

  const handleChecklistPhotoUpload = async (itemId, file) => {
    try {
      const url = await uploadImageToCloudinary(file, "checklist photo");
      updateChecklistItem(itemId, "photo", url);
      toast.success("Checklist photo uploaded.");
    } catch (error) {
      toast.error(`Upload failed: ${error.message}`);
    }
  };

  const handleSignoffUpload = async (field, file, label) => {
    try {
      const url = await uploadImageToCloudinary(file, label);
      handleChange("signoff", field, url);
      toast.success(`${label} uploaded.`);
    } catch (error) {
      toast.error(`Upload failed: ${error.message}`);
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
        diagramImage: asText(g.diagramImage),
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
      },
      observations,
      checklist,
      utm,
      signoff: {
        inspector: asText(s.inspector || user?.displayName || ""),
        reviewer: asText(s.reviewer),
        manager: asText(s.manager),
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
      toast.success("Visual report saved.");
    } catch (error) {
      toast.error(`Error saving report: ${error.message}`);
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
      toast.error(`Error sending for confirmation: ${error.message}`);
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
      <VisualWebView
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
                  <ShieldCheck className="text-orange-500" /> Full Visual Inspection
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

                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Table of Contents (Quick View)
                  </label>
                  <select
                    className="mt-3 w-full bg-slate-950 border border-slate-800 p-3 rounded-sm text-xs text-white focus:border-orange-500 outline-none transition-all"
                    value={tocSelection}
                    onChange={(e) => {
                      const target = e.target.value;
                      setTocSelection(target);
                      if (!target) return;
                      const el = document.getElementById(target);
                      if (el) {
                        el.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      }
                    }}
                  >
                    <option value="" disabled>
                      Select a section...
                    </option>
                    {tocOptions.map((section) => (
                      <option key={section.target} value={section.target}>
                        {section.label}
                      </option>
                    ))}
                  </select>
                </div>

              </section>
              {/*SUMMARY OF INSPECTION FINDINGS */}
              <section className="space-y-4" id="toc-summary">
                <div id="toc-photos" className="scroll-mt-24" />

                <h2 className="text-xs font-bold uppercase tracking-[0.3em] bg-slate-900">
                  SUMMARY OF INSPECTION FINDINGS
                </h2>
                <div className="rounded-sm border border-slate-800 bg-slate-950/60 p-4 space-y-4">
                  <p className="text-sm font-bold uppercase underline text-white">
                    1. Summary of Findings
                  </p>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    FVI was carried out on a total of{" "}
                    <span className="font-bold text-white">
                      {reportData.observations.length || 0}
                    </span>{" "}
                    item(s). Details of the anomalies with photographic details are
                    tabulated below.
                  </p>
                </div>
                <div className="space-y-4">
                  {reportData.observations.map((obs, idx) => (
                    <div
                      key={obs.id}
                      className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          Summary {idx + 1}
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
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        <InlineField
                          placeholder="Ref. S/N"
                          value={obs.refSn || ""}
                          onChange={(v) =>
                            updateObservation(obs.id, "refSn", v)
                          }
                        />
                        <InlineField
                          placeholder="Equipment ID"
                          value={obs.equipmentId || ""}
                          onChange={(v) =>
                            updateObservation(obs.id, "equipmentId", v)
                          }
                        />
                        <InlineField
                          placeholder="Equipment Description"
                          value={obs.equipmentDescription || ""}
                          onChange={(v) =>
                            updateObservation(
                              obs.id,
                              "equipmentDescription",
                              v,
                            )
                          }
                        />
                        <InlineField
                          placeholder="Page No."
                          value={obs.pageNo || ""}
                          onChange={(v) =>
                            updateObservation(obs.id, "pageNo", v)
                          }
                        />
                        <InlineField
                          placeholder="Title"
                          value={obs.title}
                          onChange={(v) => updateObservation(obs.id, "title", v)}
                        />
                      </div>
                      <TextArea
                        label="Anomaly Description"
                        value={obs.description}
                        onChange={(v) =>
                          updateObservation(obs.id, "description", v)
                        }
                        required
                      />
                      <div className="flex items-center gap-3">
                        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-slate-900 border border-slate-800 text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white hover:border-orange-500 transition-colors cursor-pointer">
                          <Camera size={14} /> Attach related Image
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              handleObservationPhotoUpload(obs.id, file);
                            }}
                          />
                        </label>
                        <input
                          type="text"
                          value={obs.photoNote || ""}
                          onChange={(e) =>
                            updateObservation(
                              obs.id,
                              "photoNote",
                              e.target.value,
                            )
                          }
                          placeholder="Photo note"
                          className="flex-1 bg-slate-950 border border-slate-800 p-2 rounded-sm text-[10px] text-white focus:border-orange-500 outline-none transition-all uppercase tracking-widest"
                        />
                        {obs.photo && (
                          <>
                            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                              Photo attached
                            </span>
                            <div className="flex flex-col gap-2">
                              <div className="h-20 w-28 border border-slate-800 bg-slate-950 rounded-sm flex items-center justify-center overflow-hidden">
                                <img
                                  src={obs.photo}
                                  alt={obs.title || "Observation photo"}
                                  className="max-h-full max-w-full object-contain"
                                />
                              </div>
                              {obs.photoNote && (
                                <textarea
                                  value={obs.photoNote}
                                  onChange={(e) =>
                                    updateObservation(
                                      obs.id,
                                      "photoNote",
                                      e.target.value,
                                    )
                                  }
                                  rows={3}
                                  className="w-full bg-slate-950 border border-slate-800 p-2 rounded-sm text-[9px] text-slate-300 focus:border-orange-500 outline-none transition-all resize-none"
                                />
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                updateObservation(obs.id, "photo", "")
                              }
                              className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300"
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addObservation}
                  className="px-4 py-2 rounded-sm bg-slate-900 border border-slate-800 text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white hover:border-orange-500 transition-colors"
                >
                  + Add More Summary
                </button>

                <section className="space-y-4" id="toc-overview">
                  <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500 mt-12">
                    Visual Inspection Observations Checklist
                  </h2>
                  <div className="overflow-x-auto rounded-sm border border-slate-800">
                    <table className="w-full border-collapse text-[11px] text-white">
                      <thead className="bg-slate-900">
                        <tr>
                          <th className="border border-slate-700 p-2 w-14">S/N</th>
                          <th className="border border-slate-700 p-2">
                            Equipment ID
                          </th>
                          <th className="border border-slate-700 p-2">
                            Equipment Description
                          </th>
                          <th className="border border-slate-700 p-2">
                            Anomaly (No/Yes)
                          </th>
                          <th className="border border-slate-700 p-2 w-24">
                            Page No.
                          </th>
                          <th className="border border-slate-700 p-2 w-28">
                            Upload
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(reportData.checklist || []).map((item, idx) => (
                          <tr key={item.id} className="bg-slate-950/60 align-top">
                            <td className="border border-slate-800 p-2 text-center">
                              {idx + 1}
                            </td>
                            <td className="border border-slate-800 p-2">
                              <InlineField
                                placeholder="Equipment ID"
                                value={item.equipmentId || ""}
                                onChange={(v) =>
                                  updateChecklistItem(item.id, "equipmentId", v)
                                }
                              />
                            </td>
                            <td className="border border-slate-800 p-2">
                              <InlineField
                                placeholder="Equipment Description"
                                value={item.equipmentDescription || ""}
                                onChange={(v) =>
                                  updateChecklistItem(
                                    item.id,
                                    "equipmentDescription",
                                    v,
                                  )
                                }
                              />
                            </td>
                            <td className="border border-slate-800 p-2">
                              <select
                                value={item.anomaly || "No"}
                                onChange={(e) =>
                                  updateChecklistItem(
                                    item.id,
                                    "anomaly",
                                    e.target.value,
                                  )
                                }
                                className="w-full bg-slate-950 border border-slate-800 p-2 rounded-sm text-[10px] text-white focus:border-orange-500 outline-none transition-all"
                              >
                                <option value="No">No</option>
                                <option value="Yes">Yes</option>
                              </select>
                            </td>
                            <td className="border border-slate-800 p-2">
                              <InlineField
                                placeholder="Page No."
                                value={item.pageNo || ""}
                                onChange={(v) =>
                                  updateChecklistItem(item.id, "pageNo", v)
                                }
                              />
                            </td>
                            <td className="border border-slate-800 p-2 space-y-2">
                              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-sm bg-slate-900 border border-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-300 hover:text-white hover:border-orange-500 transition-colors cursor-pointer">
                                <Camera size={12} /> Upload
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    handleChecklistPhotoUpload(item.id, file);
                                  }}
                                />
                              </label>
                              <input
                                type="text"
                                value={item.photoNote || ""}
                                onChange={(e) =>
                                  updateChecklistItem(
                                    item.id,
                                    "photoNote",
                                    e.target.value,
                                  )
                                }
                                placeholder="Photo note"
                                className="w-full bg-slate-950 border border-slate-800 p-2 rounded-sm text-[10px] text-white focus:border-orange-500 outline-none transition-all uppercase tracking-widest"
                              />
                              {item.photo && (
                                <div className="space-y-2">
                                  <div className="h-20 w-full border border-slate-800 bg-slate-950 rounded-sm flex items-center justify-center overflow-hidden">
                                    <img
                                      src={item.photo}
                                      alt={item.equipmentId || "Checklist photo"}
                                      className="max-h-full max-w-full object-contain"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateChecklistItem(item.id, "photo", "")
                                    }
                                    className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300"
                                  >
                                    Remove
                                  </button>
                                </div>
                              )}
                              {(reportData.checklist || []).length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeChecklistItem(item.id)}
                                  className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300"
                                >
                                  Remove Row
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    type="button"
                    onClick={addChecklistItem}
                    className="px-4 py-2 rounded-sm bg-slate-900 border border-slate-800 text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white hover:border-orange-500 transition-colors"
                  >
                    + Add Checklist Row
                  </button>
                </section>
              </section>

              <section className="space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500 mt-12 bg-slate-900">
                  Additional Sections
                </h2>
                <div className="space-y-4">
                  {(reportData.customSections || []).map((section, idx) => (
                    <div
                      key={section.id}
                      id={`toc-custom-${section.id}`}
                      className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400"></p>
                        <button
                          type="button"
                          onClick={() => removeCustomSection(section.id)}
                          className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                      <InputField
                        label="Section Title"
                        value={section.title}
                        onChange={(v) =>
                          updateCustomSection(section.id, "title", v)
                        }
                        required
                      />
                      <TextArea
                        label="Section Content"
                        value={section.content}
                        onChange={(v) =>
                          updateCustomSection(section.id, "content", v)
                        }
                        required
                      />
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addCustomSection}
                  className="px-4 py-2 rounded-sm bg-slate-900 border border-slate-800 text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white hover:border-orange-500 transition-colors"
                >
                  + Add New Section
                </button>
              </section>
              <section className="space-y-4" id="toc-signature">
                <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500 mt-12 bg-slate-900">
                  Signature
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {canViewInspectorField && (
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
                  )}
                  {canViewLeadField && (
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
                  )}
                  {canViewManagerField && (
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
              <div className="mt-8 flex justify-end">
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

export const VisualWebView = ({
  reportData,
  companyLogo = "",
  onBack,
  hideControls = false,
}) => {
  const reportRootRef = useRef(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
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
      const fileBase =
        reportData?.general?.projectId ||
        reportData?.general?.reportNum ||
        reportData?.general?.projectName ||
        "inspection-report";
      const safeFileBase = String(fileBase)
        .trim()
        .replace(/[^\w\-]+/g, "_")
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
          pagebreak: { mode: ["css", "legacy"] },
        })
        .from(reportRootRef.current)
        .save();
    } catch (error) {
      console.error("PDF export failed:", error);
      toast.error("Failed to download PDF.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };
  const companyMark = (
    <div className="flex items-center gap-3">
      {resolvedCompanyLogo ? (
        <img
          src={resolvedCompanyLogo}
          alt="Company logo"
          className="h-10 w-auto object-contain"
        />
      ) : (
        <>
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/30" />
          <div className="text-blue-900 font-black text-xl tracking-wide">
            INSPECTPRO
          </div>
        </>
      )}
    </div>
  );
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
  const allPhotos = [
    ...populatedObservations
      .filter((o) => o.photo)
      .map((o) => ({
        ...o,
        galleryTitle: o.equipmentId || o.title || "Observation",
      })),
    ...populatedChecklist
      .filter((item) => item.photo)
      .map((item) => ({
        ...item,
        galleryTitle:
          item.equipmentId || item.equipmentDescription || "Checklist Item",
        title: item.equipmentId || item.equipmentDescription || "Checklist Item",
      })),
  ];
  const findingLines = (reportData?.inspection?.findings || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
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
  const photosPerPage = 6;
  const summaryChunks = chunkArray(populatedObservations, 6);
  const checklistChunks = chunkArray(populatedChecklist, 9);
  const customSectionPages = (reportData.customSections || []).flatMap(
    (section, idx) =>
      splitTextIntoPageChunks(section.content || "").map((content, pageIdx) => ({
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
  const summaryPage = 5;
  const summaryPageCount = Math.max(1, summaryChunks.length);
  const checklistPage = summaryPage + summaryPageCount;
  const checklistPageCount = Math.max(1, checklistChunks.length);
  const customStartPage = checklistPage + checklistPageCount;
  const customSections = reportData.customSections || [];
  const customPageCount = Math.max(0, customSectionPages.length);
  const basePagesBeforePhotos =
    customStartPage + customPageCount - 1;
  const photoPageStart = basePagesBeforePhotos + 1;
  const photoPageCount = Math.max(1, photoChunks.length);
  const photoPageEnd = photoPageStart + photoPageCount - 1;
  const signaturePage = photoPageEnd + 1;
  const totalPages = signaturePage;
  const tocRows = [
    { desc: "Summary Of Findings", page: `${summaryPage}` },
    {
      desc: "Visual Inspection Observations Checklist",
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
    <div className="min-h-screen bg-slate-900 p-4 md:p-8 pb-20 print:p-0 print:bg-white">
      <style>{`
        @media print {
          .report-page {
            break-after: page;
            page-break-after: always;
            border: 2px solid #94a3b8;
            outline: 1px solid #cbd5f5;
            outline-offset: -6px;
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
        .report-page {
          border: 2px solid #94a3b8;
          outline: 1px solid #cbd5f5;
          outline-offset: -6px;
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
          <div className="absolute inset-0">
            <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-blue-100/70 blur-2xl" />
            <div className="absolute top-20 -right-20 h-64 w-64 rounded-full bg-cyan-100/70 blur-2xl" />
            <div className="absolute bottom-16 left-1/3 h-72 w-72 rounded-full bg-indigo-100/60 blur-2xl" />
          </div>

          <div className="relative flex items-center justify-between px-12 py-6 border-b border-slate-200/80 backdrop-blur-md">
            {reportData.general.clientLogo ? (
              <img
                src={reportData.general.clientLogo}
                alt="Client"
                className="h-12 w-auto object-contain"
              />
            ) : (
              <div className="h-10 w-24 rounded-lg bg-slate-200/70" />
            )}
            {companyMark}
          </div>

          <div className="relative flex-1 flex flex-col items-center justify-center text-center px-10">
            <div className="mb-6 text-[11px] font-black uppercase tracking-[0.4em] text-slate-500">
              Technical Inspection Report
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-blue-700 tracking-tight drop-shadow-sm">
              Full Visual Inspection
            </h1>
            <h2 className="mt-3 text-4xl md:text-5xl font-extrabold text-blue-600 tracking-tight">
              Report
            </h2>
            <div className="mt-8 h-1 w-40 rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-indigo-500" />
            <div className="mt-10 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600">
              {reportData?.general?.equipment || "Equipment Name"}
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
            {reportData.general.clientLogo ? (
              <img
                src={reportData.general.clientLogo}
                alt="Client"
                className="h-12 w-auto object-contain"
              />
            ) : (
              <div className="h-10 w-24 rounded-lg bg-slate-200/70" />
            )}
            {companyMark}
          </div>

          <div className="relative flex-1 flex flex-col items-center text-center px-12 pt-42 gap-12">
            <div className="space-y-4">
              <p className="text-3xl md:text-4xl font-extrabold text-red-600 mb-12 underline uppercase tracking-wide">
                {reportData?.general?.equipment || "Equipment Name"}
              </p>
              <div className="text-xl font-bold uppercase tracking-[0.28em] text-slate-800 leading-loose">
                {reportData?.general?.inspectionTypeName ||
                  reportData?.general?.inspectionTypeCode ||
                  reportData?.general?.inspectionType ||
                  "Visuals for Existing Piping and Structural Tie-In Locations"}
              </div>
              <div className="text-[11px] font-semibold italic text-slate-600">
                ({reportData?.general?.reportNum || "Report Number"})
              </div>
            </div>

            <div className="space-y-6 text-slate-900">
              <div className="text-base font-extrabold uppercase tracking-wide">
                Inspection Report
              </div>
              <div className="text-sm font-bold uppercase tracking-widest text-slate-500">
                On
              </div>
              <div className="text-base font-extrabold uppercase tracking-[0.18em] leading-loose">
                {reportData?.general?.projectName ||
                  reportData?.general?.inspectionTypeName ||
                  "inspectionTypeName"}
              </div>
            </div>

            <div className="text-sm font-semibold uppercase tracking-wide text-black">
              {formattedMonthYear || "Inspection Date"}
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

        <div className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute -top-20 -right-16 h-64 w-64 rounded-full bg-cyan-100/60 blur-2xl" />
            <div className="absolute bottom-16 -left-20 h-72 w-72 rounded-full bg-blue-100/60 blur-2xl" />
          </div>

          {reportHeader}

          <div className="relative flex-1 flex flex-col px-12 pt-10 gap-8">
            <div className="rounded-sm border border-slate-200 bg-white/80 backdrop-blur-sm shadow-xl shadow-blue-200/40 overflow-hidden">
              <div className="grid grid-cols-2 border-b border-slate-200 text-[10px]">
                <div className="border-r border-slate-200 p-3">
                  <div className="font-bold uppercase text-[13px] text-black ">
                    Client
                  </div>
                  <div className="font-bold text-blue-900 text-[12px]">
                    {reportData?.general?.client || "N/A"}
                  </div>
                </div>
                <div className="p-3 space-y-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="font-bold uppercase text-[13px] text-black">
                      Report Number
                    </div>
                    <div className="font-bold text-blue-900 text-[12px]">
                      {reportData?.general?.reportNum || "N/A"}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="font-bold uppercase text-[13px] text-black">
                      Contract Number
                    </div>
                    <div className="font-bold text-blue-900 text-[12px]">
                      {reportData?.general?.contract || "N/A"}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="font-bold uppercase text-[13px] text-black">
                      Date of Inspection
                    </div>
                    <div className="font-bold text-blue-900 text-[12px]">
                      {reportData?.general?.date || "N/A"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 border-b border-slate-200 text-[10px]">
                <div className="border-r border-slate-200 p-3">
                  <div className="font-bold uppercase text-[13px] text-black">
                    Location
                  </div>
                  <div className="font-bold text-blue-900 text-[12px]">
                    {reportData?.general?.platform || "N/A"}
                  </div>
                </div>
                <div className="p-3">
                  <div className="font-bold uppercase text-[13px] text-black">
                    Inspection Coordinator
                  </div>
                  <div className="font-bold text-blue-900 text-[12px]">
                    {reportData?.general?.coordinator || "N/A"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 border-b border-slate-200 text-[10px]">
                <div className="border-r border-slate-200 p-3">
                  <div className="font-bold uppercase text-[13px] text-black">
                    P & ID Number / DWG No.
                  </div>
                  <div className="font-bold text-blue-900 text-[12px]">
                    {reportData?.general?.pidNumber || "N/A"}
                  </div>
                </div>
                <div className="p-3">
                  <div className="font-bold uppercase text-[13px] text-black">
                    Operating Procedure
                  </div>
                  <div className="font-bold text-blue-900 text-[12px]">
                    {reportData?.general?.procedure || "N/A"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 text-[10px]">
                <div className="border-r border-slate-200 p-3">
                  <div className="font-bold uppercase text-[13px] text-black">
                    Test Code
                  </div>
                  <div className="font-bold text-blue-900 text-[12px]">
                    {reportData?.general?.testCode || "N/A"}
                  </div>
                </div>
                <div className="p-3">
                  <div className="font-bold uppercase text-[13px] text-black">
                    Acceptance Criteria
                  </div>
                  <div className="font-bold text-blue-900 text-[12px]">
                    {reportData?.general?.criteria || "N/A"}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-sm font-black uppercase tracking-wide text-blue-900">
              1.0 Introduction
            </div>
            <p className="text-[13px] text-black  leading-relaxed">
              As requested by{" "}
              <span className="text-md font-bold text-blue-900">
                {reportData?.general?.client || "the Client"}
              </span>
              , Full Visual Inspection was carried out on Module P4 of .
             &nbsp;
              <span className="text-xs font-bold text-blue-900">
                {reportData?.general?.projectName ||
                  reportData?.general?.inspectionTypeName ||
                  "inspectionTypeName"}
              </span>
            </p>

            <div className="mt-[40px] px-2">
              <p className="mb-4 text-center text-[16px] font-bold uppercase text-black underline">
                Contents
              </p>
              <table className="w-full text-[10px] border-collapse bg-blue-200">
                <thead>
                  <tr className="border-b border-slate-200 text-black ">
                    <th className="border-r border-slate-200 p-2 w-12 text-[12px]">
                      S/N
                    </th>
                    <th className="border-r border-slate-200 p-2 w-12 text-[12px]">
                      Description
                    </th>
                    <th className="border-r border-slate-200 p-2 w-12 text-[12px]">
                      Page No.
                    </th>
                  </tr>
                </thead>
                <tbody className="text-slate-800">
                  {tocRows.map((row, idx) => (
                    <tr
                      key={`${row.desc}-${idx}`}
                      className={idx % 2 === 0 ? "bg-slate-50/70" : "bg-white"}
                    >
                      <td className="border-r border-slate-200 p-2 text-center font-bold">
                        {idx + 1}
                      </td>
                      <td className="border-r border-slate-200 p-2 font-bold uppercase text-center">
                        {row.desc}
                      </td>
                      <td className="p-2 text-center font-bold">
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
                Original Document
              </p>
            </div>
            <div className="pt-4 text-[10px] font-bold uppercase tracking-widest text-black text-right">
              Page 3 of {totalPages}
            </div>
          </div>
        </div>

        

        {summaryChunks.map((chunk, pageIdx) => (
          <div
            key={`summary-page-${pageIdx}`}
            className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-hidden"
          >
            <div className="absolute inset-0">
              <div className="absolute -top-24 -right-16 h-64 w-64 rounded-full bg-cyan-100/60 blur-2xl" />
              <div className="absolute bottom-12 -left-20 h-72 w-72 rounded-full bg-blue-100/60 blur-2xl" />
            </div>

            {reportHeader}

            <div className="relative flex-1 flex flex-col px-12 pt-8 gap-8">
              <div className="rounded-sm border w-full border-slate-800 bg-white p-4 space-y-4">
                <p className="text-[20px] font-bold uppercase underline text-blue-900">
                  1. Summary of Findings
                </p>
                {pageIdx === 0 && (
                  <p className="text-[13px] leading-relaxed text-black">
                    Full Visual Inspection was carried out on a total of {reportData.observations.length || 0}{" "}
                    item(s). Details of the anomalies with photographic details are
                    also given.
                  </p>
                )}

                {chunk.length ? (
                  <table className="w-full table-fixed text-[10px] border-collapse bg-blue-200">
                    <thead>
                      <tr className="border-b border-slate-200 text-black">
                        <th className="border-r border-slate-200 p-2 w-[52px] text-center font-bold">S/N</th>
                        <th className="border-r border-slate-200 p-2 w-[70px] text-center font-bold">Ref. S/N</th>
                        <th className="border-r border-slate-200 p-2 w-[120px] text-center font-bold">Equipment ID</th>
                        <th className="border-r border-slate-200 p-2 w-[150px] text-center font-bold leading-tight">Equipment Description</th>
                        <th className="border-r border-slate-200 p-2 text-center font-bold">Anomaly Description</th>
                        <th className="p-2 w-[64px] text-center font-bold">Page No</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-800">
                      {chunk.map((item, idx) => {
                        const serial = pageIdx * 6 + idx + 1;
                        return (
                          <tr
                            key={item.id || `${pageIdx}-${idx}`}
                            className={serial % 2 === 0 ? "bg-white" : "bg-slate-50/70"}
                          >
                            <td className="border-r border-slate-200 p-2 text-center align-middle font-bold">{serial}</td>
                            <td className="border-r border-slate-200 p-2 text-center align-middle font-bold">{item.refSn || item.title || ""}</td>
                            <td className="border-r border-slate-200 p-2 text-center align-middle font-bold">{item.equipmentId || ""}</td>
                            <td className="border-r border-slate-200 p-2 align-middle font-bold break-all">{item.equipmentDescription || ""}</td>
                            <td className="border-r border-slate-200 p-2 align-top whitespace-pre-wrap break-words font-bold">{item.description || ""}</td>
                            <td className="p-2 text-center align-middle font-bold">{item.pageNo || ""}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-[0.3em] text-center">
                    No observations added
                  </div>
                )}
              </div>
            </div>

            <div className="relative mt-auto px-12 pb-8">
              <div className="pt-6 border-t-2 border-slate-900/80 text-center">
                <p className="text-[10px] font-black text-red-600 tracking-[0.4em]">Original Document</p>
              </div>
              <div className="pt-4 text-[10px] font-bold uppercase tracking-widest text-black text-right">
                Page {summaryPage + pageIdx} of {totalPages}
              </div>
            </div>
          </div>
        ))}

        {checklistChunks.map((chunk, pageIdx) => (
          <div
            key={`checklist-page-${pageIdx}`}
            className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-hidden"
          >
            <div className="absolute inset-0">
              <div className="absolute -top-24 -right-16 h-64 w-64 rounded-full bg-cyan-100/60 blur-2xl" />
              <div className="absolute bottom-12 -left-20 h-72 w-72 rounded-full bg-blue-100/60 blur-2xl" />
            </div>

            {reportHeader}

            <div className="relative flex-1 flex flex-col px-12 pt-10 gap-6">
              <div className="text-center">
                <div className="text-sm font-black uppercase tracking-wide text-blue-900">
                  4.0 Visual Inspection Observations Checklist
                </div>
              </div>

              <div className="flex-1 border-2 border-slate-800 p-4 text-[11px] leading-relaxed text-slate-800">
                {chunk.length ? (
                  <table className="w-full table-fixed text-[10px] border-collapse bg-blue-200">
                    <thead>
                      <tr className="border-b border-slate-200 text-black">
                        <th className="border-r border-slate-200 p-2 w-[52px] text-center font-bold">S/N</th>
                        <th className="border-r border-slate-200 p-2 text-center font-bold">Equipment ID</th>
                        <th className="border-r border-slate-200 p-2 text-center font-bold">Equipment Description</th>
                        <th className="border-r border-slate-200 p-2 text-center font-bold leading-tight">
                          Anomaly
                          <br />
                          (No/ Yes)
                        </th>
                        <th className="p-2 w-[70px] text-center font-bold">Page No.</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-800">
                      {chunk.map((item, idx) => {
                        const serial = pageIdx * 9 + idx + 1;
                        return (
                          <tr
                            key={item.id || `${pageIdx}-${idx}`}
                            className={serial % 2 === 0 ? "bg-white" : "bg-slate-50/70"}
                          >
                            <td className="border-r border-slate-200 p-2 text-center font-bold">{serial}.</td>
                            <td className="border-r border-slate-200 p-2 text-center font-bold">{item.equipmentId || ""}</td>
                            <td className="border-r border-slate-200 p-2 font-bold break-all">{item.equipmentDescription || ""}</td>
                            <td
                              className={`border-r border-slate-200 p-2 text-center font-semibold ${
                                String(item.anomaly || "").toLowerCase() === "yes" ? "text-red-600" : "text-black"
                              }`}
                            >
                              {item.anomaly || "No"}
                            </td>
                            <td className="p-2 text-center font-bold">{item.pageNo || "--"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-slate-500 text-xs font-semibold uppercase tracking-[0.2em] text-center">
                    No checklist items added
                  </div>
                )}
              </div>
            </div>

            <div className="relative mt-auto px-12 pb-8">
              <div className="pt-6 border-t-2 border-slate-900/80 text-center">
                <p className="text-[10px] font-black text-red-600 tracking-[0.4em]">Original Document</p>
              </div>
              <div className="pt-4 text-[10px] font-bold uppercase tracking-widest text-black text-right">
                Page {checklistPage + pageIdx} of {totalPages}
              </div>
            </div>
          </div>
        ))}

        {customSectionPages.map((section, idx) => (
          <div
            key={`${section.id || section.sourceIndex}-${section.chunkIndex}`}
            className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-hidden"
          >
            <div className="absolute inset-0">
              <div className="absolute -top-24 -left-16 h-64 w-64 rounded-full bg-blue-100/60 blur-2xl" />
              <div className="absolute bottom-12 -right-20 h-72 w-72 rounded-full bg-cyan-100/60 blur-2xl" />
            </div>

            {reportHeader}

            <div className="relative flex-1 flex flex-col px-12 pt-10 gap-6">
              <div className="text-center space-y-2">
                <div className="text-sm font-black uppercase tracking-wide text-black"></div>
                <p className="text-sm font-black uppercase tracking-wide text-blue-900">
                  {section.title || "Additional Notes"}
                </p>
              </div>
              <div className="rounded-sm border border-slate-200 bg-white/80 backdrop-blur-sm shadow-xl shadow-blue-200/40 p-6 text-[11px] leading-relaxed text-black whitespace-pre-wrap break-words">
                {section.pageContent || "No content provided."}
              </div>
            </div>

            <div className="relative mt-auto px-12 pb-8">
              <div className="pt-6 border-t-2 border-slate-900/80 text-center">
                <p className="text-[10px] font-black text-red-600 tracking-[0.4em]">
                  Original Document
                </p>
              </div>
              <div className="pt-4 text-[10px] font-bold uppercase tracking-widest text-black text-right">
                Page {customStartPage + idx} of {totalPages}
              </div>
            </div>
          </div>
        ))}

        <div className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute -top-24 -left-16 h-64 w-64 rounded-full bg-blue-100/60 blur-2xl" />
            <div className="absolute bottom-12 -right-20 h-72 w-72 rounded-full bg-cyan-100/60 blur-2xl" />
          </div>

          {reportHeader}

          <div className="relative flex-1 flex flex-col px-12 pt-10 gap-8">
            <div className="text-center space-y-2">
              <div className="text-sm font-black uppercase tracking-wide text-blue-900">
                5.0 Photographic Details
              </div>
              <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em]">
                Evidence Gallery
              </p>
            </div>

            <div className="rounded-sm border border-slate-200 bg-white/80 backdrop-blur-sm shadow-xl shadow-blue-200/40 p-6">
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
                      <div className="text-[10px] text-black text-center font-semibold">
                        {/*  {o.title || `Evidence ${idx + 1}`} */}
                      </div>
                      {o.photoNote && (
                        <div className="text-[9px] text-black text-center uppercase tracking-[0.2em] break-all whitespace-pre-wrap">
                          {o.photoNote}
                        </div>
                      )}
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
            <div className="pt-4 text-[10px] font-bold uppercase tracking-widest text-black text-right">
              Page {photoPageStart} of {totalPages}
            </div>
          </div>
        </div>

        {remainingPhotoChunks.map((chunk, pageIdx) => {
          return (
            <div
              key={`photo-page-extra-${pageIdx}`}
              className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-hidden"
            >
              <div className="absolute inset-0">
                <div className="absolute -top-24 -left-16 h-64 w-64 rounded-full bg-blue-100/60 blur-2xl" />
                <div className="absolute bottom-12 -right-20 h-72 w-72 rounded-full bg-cyan-100/60 blur-2xl" />
              </div>

              {reportHeader}

              <div className="relative flex-1 flex flex-col px-12 pt-10 gap-8">
                <div className="text-center space-y-2">
                  <div className="text-sm font-black uppercase tracking-wide text-blue-900">
                    5.0 Photographic Details
                  </div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em]">
                    Evidence Gallery
                  </p>
                </div>

                <div className="rounded-sm border border-slate-200 bg-white/80 backdrop-blur-sm shadow-xl shadow-blue-200/40 p-6">
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
                          <div className="text-[10px] text-black text-center font-semibold">
                            {o.title || `Evidence ${idx + 1}`}
                          </div>
                          {o.photoNote && (
                            <div className="text-[9px] text-slate-500 text-center uppercase tracking-[0.2em] break-all whitespace-pre-wrap">
                              {o.photoNote}
                            </div>
                          )}
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
                <div className="pt-4 text-[10px] font-bold uppercase tracking-widest text-black text-right">
                  Page {photoPageStart + pageIdx + 1} of {totalPages}
                </div>
              </div>
            </div>
          );
        })}

        <div className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute -top-24 -left-16 h-64 w-64 rounded-full bg-blue-100/60 blur-2xl" />
            <div className="absolute bottom-12 -right-20 h-72 w-72 rounded-full bg-cyan-100/60 blur-2xl" />
          </div>

          {reportHeader}

          <div className="relative flex-1 flex flex-col px-12 pt-10 gap-8">
            <div className="rounded-sm border border-slate-800 bg-white overflow-hidden">
              <table className="w-full border-collapse table-fixed"> <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold text-black leading-tight uppercase">
                    <th className="w-1/3 border-r border-slate-200 p-2 text-left">
                      Prepared By
                      <div className="mt-1 text-[10px] font-semibold normal-case">
                        Inspector
                      </div>
                    </th>
                    <th className="w-1/3 border-r border-slate-200 p-2 text-left">
                      Reviewed by
                      <div className="mt-1 text-[10px] font-semibold normal-case">
                        Lead Inspector
                      </div>
                    </th>
                    <th className="w-1/3 p-2 text-left">
                      Verified By
                      <div className="mt-1 text-[10px] font-semibold normal-case">
                        NDE Advisor
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="text-slate-800">
                  <tr className="bg-slate-50/70 text-[10px]">
                    <td className="h-[220px] border-r border-slate-200 p-3 align-bottom">
                      <div className="flex h-full flex-col justify-end">
                        {reportData.signoff.inspectorSignature ? (
                          <img
                            src={reportData.signoff.inspectorSignature}
                            alt="Prepared by signature"
                            className="h-14 w-auto object-contain mb-2"
                          />
                        ) : null}
                        <div className="h-6 border-b border-slate-400 mb-2" />
                        <div className="font-semibold uppercase text-black text-[9px]">
                          {reportData.signoff.inspector ||
                            reportData.general?.inspectorName ||
                            "Inspector"}
                        </div>
                      </div>
                    </td>
                    <td className="h-[220px] border-r border-slate-200 p-3 align-bottom">
                      <div className="flex h-full flex-col justify-end">
                        {reportData.signoff.reviewerSignature ? (
                          <img
                            src={reportData.signoff.reviewerSignature}
                            alt="Lead inspector signature"
                            className="h-14 w-auto object-contain mb-2"
                          />
                        ) : null}
                        <div className="h-6 border-b border-slate-400 mb-2" />
                        <div className="font-semibold uppercase text-black text-[9px]">
                          {reportData.signoff.reviewer ||
                            reportData.general?.assignedSupervisorName ||
                            reportData.general?.supervisorName ||
                            reportData?.assignedSupervisorName ||
                            reportData?.supervisorName ||
                            "Lead Inspector"}
                        </div>
                      </div>
                    </td>
                    <td className="h-[220px] p-3 align-bottom">
                      <div className="flex h-full flex-col justify-end">
                        {reportData.signoff.managerSignature ? (
                          <img
                            src={reportData.signoff.managerSignature}
                            alt="NDE advisor signature"
                            className="h-14 w-auto object-contain mb-2"
                          />
                        ) : null}
                        <div className="h-6 border-b border-slate-400 mb-2" />
                        <div className="font-semibold uppercase text-black text-[9px]">
                          {reportData.signoff.manager ||
                            reportData.general?.managerName ||
                            "NDT Advisor"}
                        </div>
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
                Original Document
              </p>
            </div>
            <div className="pt-4 text-[10px] font-bold uppercase tracking-widest text-black text-right">
              Page {signaturePage} of {totalPages}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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

export default VisualReport;
