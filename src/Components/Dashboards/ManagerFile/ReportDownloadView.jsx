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
import { IntegrityWebView } from "../AdminFiles/ReportManagement/IntegrityCheck";

const ReportDownloadView = ({
  projectId: projectIdProp = "",
  hideControls = false,
  embedded = false,
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

  const getTechniqueType = () => {
    const raw = (
      report?.general?.selectedTechnique ||
      report?.technique ||
      project?.reportTemplate ||
      project?.selectedTechnique ||
      report?.general?.inspectionTypeName ||
      report?.general?.inspectionType ||
      ""
    ).toLowerCase();

    if (raw.includes("pressure vessel") || raw.includes("integrity"))
      return "integrity";
    if (raw.includes("detailed")) return "detailed";
    if (raw.includes("aut") || raw.includes("corrosion mapping")) return "aut";
    if (raw.includes("mut") || raw.includes("manual ut")) return "mut";
    if (raw.includes("visual") || raw.includes("vt") || raw.includes("visual testing"))
      return "visual";
    if (raw.includes("radiography") || raw.includes("rt") || raw.includes("x-ray"))
      return "visual";
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

        const projectDoc = await getDoc(doc(db, "projects", id));
        if (projectDoc.exists()) {
          resolvedProjectData = projectDoc.data();
        } else {
          const projectByBusinessIdQ = query(
            collection(db, "projects"),
            where("projectId", "==", id),
            limit(1),
          );
          const projectByBusinessIdSnap = await getDocs(projectByBusinessIdQ);
          if (!projectByBusinessIdSnap.empty) {
            resolvedProjectData = projectByBusinessIdSnap.docs[0].data();
          }
        }

        if (resolvedProjectData) setProject(resolvedProjectData);
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
          setCompanyLogo(snap.data()?.logo || "");
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
        clientLogo:
          baseGeneral.clientLogo ||
          project?.clientLogo ||
          project?.client?.logo ||
          "",
        projectId: baseGeneral.projectId || project?.projectId || "",
        inspectionTypeName,
        inspectionTypeCode: baseGeneral.inspectionTypeCode || "",
        projectName: baseGeneral.projectName || project?.projectName || "",
      },
      inspection: base.inspection || {},
      observations,
      utm: base.utm || [],
      signoff: base.signoff || {},
    };
  })();

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
