import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../Auth/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";
import { Activity } from "lucide-react";
import IntegrityCheck, { IntegrityWebView } from "../AdminFiles/ReportManagement/IntegrityCheck";
import VisualReport from "../AdminFiles/ReportManagement/VisualReport";
import Aut from "../AdminFiles/ReportManagement/Aut";
import DetailedReport from "../AdminFiles/ReportManagement/DetailedReport";
import MutReport from "../AdminFiles/ReportManagement/MutReport";

const ReportDownloadView = ({
  projectId: projectIdProp = "",
  hideControls = false,
  embedded = false,
  hideSaveReportButton = false,
  showCloseButton = false,
  onClose,
} = {}) => {
  const { id: routeId } = useParams();
  const id = projectIdProp || routeId;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [report, setReport] = useState(null);
  const [companyLogo, setCompanyLogo] = useState("");
  const [projectDocId, setProjectDocId] = useState("");

  const getTechniqueType = () => {
    const hasVisualSpecificContent =
      Array.isArray(report?.checklist) ||
      (report?.observations || []).some(
        (obs) => obs?.refSn || obs?.equipmentId || obs?.equipmentDescription,
      );
    const explicitType = String(
      report?.type || project?.report?.type || "",
    ).toLowerCase();

    if (hasVisualSpecificContent) return "visual";
    if (explicitType.includes("visual")) return "visual";
    if (explicitType.includes("integrity")) return "integrity";
    if (explicitType.includes("detailed")) return "detailed";
    if (explicitType.includes("aut")) return "aut";
    if (explicitType.includes("mut")) return "mut";

    const candidates = [
      report?.general?.selectedTechnique,
      report?.technique,
      project?.reportTemplate,
      project?.selectedTechnique,
      report?.general?.inspectionTypeName,
      report?.general?.inspectionType,
      project?.inspectionTypeName,
      project?.inspectionTypeCode,
    ]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());

    if (
      candidates.some(
        (value) =>
          value.includes("visual") ||
          value.includes("radiography") ||
          value.includes("rt") ||
          value.includes("x-ray"),
      )
    ) {
      return "visual";
    }
    if (candidates.some((value) => value.includes("integrity"))) return "integrity";
    if (candidates.some((value) => value.includes("detailed"))) return "detailed";
    if (candidates.some((value) => value.includes("aut"))) return "aut";
    if (candidates.some((value) => value.includes("mut"))) return "mut";
    return "visual";
  };

  const techniqueType = getTechniqueType();
  const techniqueTitle =
    techniqueType === "integrity"
      ? "Integrity Check Report"
      : techniqueType === "detailed"
        ? "Detailed Inspection Report"
        : techniqueType === "aut"
          ? "AUT Technical Report"
          : techniqueType === "mut"
            ? "MUT Technical Report"
            : "Visual Testing (VT) Technical Report";

  useEffect(() => {
    const fetchFullData = async () => {
      try {
        setLoading(true);
        let resolvedProjectData = null;
        let resolvedProjectDocId = "";

        const projectDoc = await getDoc(doc(db, "projects", id));
        if (projectDoc.exists()) {
          resolvedProjectData = projectDoc.data();
          resolvedProjectDocId = projectDoc.id;
        } else {
          const projectByBusinessIdQ = query(
            collection(db, "projects"),
            where("projectId", "==", id),
            limit(1),
          );
          const projectByBusinessIdSnap = await getDocs(projectByBusinessIdQ);
          if (!projectByBusinessIdSnap.empty) {
            resolvedProjectData = projectByBusinessIdSnap.docs[0].data();
            resolvedProjectDocId = projectByBusinessIdSnap.docs[0].id;
          }
        }

        if (resolvedProjectData) setProject(resolvedProjectData);
        setProjectDocId(resolvedProjectDocId);
        setReport(resolvedProjectData?.report || null);
      } catch (error) {
        console.error("PDF Fetch Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFullData();
  }, [id]);

  useEffect(() => {
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
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <Activity className="animate-spin text-orange-500" />
      </div>
    );
  }

  const normalizedReportData = (() => {
    const base = report || {};
    const baseGeneral = base.general || {};
    const resolvedTechnique =
      baseGeneral.inspectionTypeName ||
      baseGeneral.inspectionType ||
      baseGeneral.selectedTechnique ||
      base.technique ||
      project?.reportTemplate ||
      project?.selectedTechnique ||
      "";
    const inspectionTypeName =
      baseGeneral.inspectionTypeName ||
      baseGeneral.inspectionType ||
      techniqueTitle ||
      resolvedTechnique ||
      "Inspection Report";

    const observations = (base.observations || []).map((obs) => ({
      ...obs,
      photo: obs.photo || obs.photoRef || obs.image || "",
    }));

    return {
      type: base.type || techniqueTitle || "Inspection Report",
      general: {
        client: baseGeneral.client || project?.clientName || "",
        platform: baseGeneral.platform || project?.locationName || "",
        tag: baseGeneral.tag || project?.equipmentTag || "",
        reportNum: baseGeneral.reportNum || project?.reportNum || "",
        date: baseGeneral.date || project?.startDate || "",
        equipment: baseGeneral.equipment || project?.equipmentCategory || "",
        diagramImage:
          baseGeneral.diagramImage ||
          base.diagramImage ||
          project?.report?.general?.diagramImage ||
          "",
        pidImage:
          baseGeneral.pidImage ||
          base.pidImage ||
          project?.report?.general?.pidImage ||
          "",
        clientLogo:
          baseGeneral.clientLogo ||
          project?.clientLogo ||
          project?.client?.logo ||
          "",
        projectId: baseGeneral.projectId || project?.projectId || "",
        projectDocId: baseGeneral.projectDocId || projectDocId || "",
        inspectionTypeName,
        inspectionTypeCode: baseGeneral.inspectionTypeCode || "",
        projectName: baseGeneral.projectName || project?.projectName || "",
      },
      inspection: base.inspection || {},
      observations,
      checklist: Array.isArray(base.checklist) ? base.checklist : [],
      utm: base.utm || [],
      signoff: base.signoff || {},
    };
  })();

  const reportPayload = {
    ...normalizedReportData,
    ...(report || {}),
    general: {
      ...normalizedReportData.general,
      ...(report?.general || {}),
      projectDocId:
        report?.general?.projectDocId ||
        projectDocId ||
        normalizedReportData.general.projectDocId ||
        "",
      projectId:
        report?.general?.projectId ||
        normalizedReportData.general.projectId ||
        "",
    },
  };

  if (techniqueType === "visual") {
    return (
      <VisualReport
        reportData={reportPayload}
        onBack={() => (onClose ? onClose() : navigate(-1))}
        hideControls={hideControls}
        companyLogo={companyLogo}
      />
    );
  }

  if (techniqueType === "integrity") {
    return (
      <IntegrityCheck
        reportData={reportPayload}
        companyLogo={companyLogo}
        onBack={() => (onClose ? onClose() : navigate(-1))}
        hideControls={hideControls}
        hideSaveReportButton={hideSaveReportButton}
      />
    );
  }
  if (techniqueType === "aut") {
    return (
      <Aut
        previewData={reportPayload}
        onBack={() => (onClose ? onClose() : navigate(-1))}
        hideControls={hideControls}
        companyLogo={companyLogo}
      />
    );
  }

  if (techniqueType === "mut") {
    return (
      <MutReport
        previewData={reportPayload}
        onBack={() => (onClose ? onClose() : navigate(-1))}
        hideControls={hideControls}
        companyLogo={companyLogo}
      />
    );
  }

  if (techniqueType === "detailed") {
    return (
      <DetailedReport
        previewData={reportPayload}
        onBack={() => (onClose ? onClose() : navigate(-1))}
        hideControls={hideControls}
        companyLogo={companyLogo}
      />
    );
  }

  return (
    <IntegrityWebView
      reportData={normalizedReportData}
      companyLogo={companyLogo}
      onBack={() => (onClose ? onClose() : navigate(-1))}
      hideControls={hideControls}
    />
  );
};

export default ReportDownloadView;
