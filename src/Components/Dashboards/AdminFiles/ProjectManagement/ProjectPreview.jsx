import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../../Auth/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";
import { Activity, Mail, Send, X } from "lucide-react";
import { toast } from "react-toastify";
import { IntegrityWebView } from "../../AdminFiles/ReportManagement/IntegrityCheck";
import { VisualWebView } from "../../AdminFiles/ReportManagement/VisualReport";
import { UTWebView } from "../../AdminFiles/ReportManagement/UTReport";

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
  const [isMailComposerOpen, setIsMailComposerOpen] = useState(false);
  const [mailDraft, setMailDraft] = useState({
    to: "",
    subject: "",
    message: "",
  });

  const getTechniqueType = () => {
    const explicitType = String(
      report?.type || project?.report?.type || "",
    ).toLowerCase();
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
    const hasVisualSpecificContent =
      Array.isArray(report?.checklist) ||
      (report?.observations || []).some(
        (obs) => obs?.refSn || obs?.equipmentId || obs?.equipmentDescription,
      );

    if (
      explicitType.includes("utreport") ||
      explicitType.includes("ut report") ||
      explicitType.includes("ultrasonic test")
    ) return "ut";
    if (explicitType.includes("integrity")) return "integrity";
    if (explicitType.includes("detailed")) return "detailed";
    if (explicitType.includes("aut")) return "aut";
    if (explicitType.includes("mut")) return "mut";

    if (
      candidates.some(
        (value) =>
          value.includes("utreport") ||
          value.includes("ut report") ||
          value.includes("manual ut") ||
          value.includes("ultrasonic test"),
      )
    ) {
      return "ut";
    }
    if (candidates.some((value) => value.includes("integrity"))) return "integrity";
    if (candidates.some((value) => value.includes("detailed"))) return "detailed";
    if (candidates.some((value) => value.includes("aut"))) return "aut";
    if (candidates.some((value) => value.includes("mut"))) return "mut";
    if (explicitType.includes("visual")) return "visual";
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
    if (hasVisualSpecificContent) return "visual";
    return "visual";
  };

  const techniqueType = getTechniqueType();
  const inspectionCodeLabel =
    report?.general?.inspectionTypeCode ||
    project?.inspectionTypeCode ||
    report?.general?.inspectionTypeName ||
    project?.inspectionTypeName ||
    "";
  const techniqueTitle =
    inspectionCodeLabel ||
    (techniqueType === "integrity"
      ? "Integrity Check Report"
      : techniqueType === "detailed"
        ? "Detailed Inspection Report"
        : techniqueType === "Ultrasonic Test"
          ? "Ultrasonic Test"
        : techniqueType === "aut"
          ? "AUT Technical Report"
          : techniqueType === "mut"
            ? "MUT Technical Report"
            : "Visual Testing (VT) Technical Report");

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

  useEffect(() => {
    const fallbackProjectId = project?.projectId || id || "this report";
    const fallbackProjectName = project?.projectName || "Inspection Report";
    const reportLink =
      typeof window !== "undefined"
        ? `${window.location.origin}/report/download/${id}`
        : `/report/download/${id}`;

    setMailDraft((prev) => ({
      to:
        prev.to ||
        project?.clientEmail ||
        project?.client?.email ||
        project?.managerEmail ||
        "",
      subject:
        prev.subject || `Inspection Report: ${fallbackProjectName} (${fallbackProjectId})`,
      message:
        prev.message ||
        [
          "Hello,",
          "",
          `Please find the inspection report for ${fallbackProjectName}.`,
          `Project ID: ${fallbackProjectId}`,
          "",
          `Report link: ${reportLink}`,
          "",
          "Best regards,",
        ].join("\n"),
    }));
  }, [id, project]);

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
        contract:
          baseGeneral.contract ||
          baseGeneral.contractNumber ||
          project?.contractNumber ||
          "",
        pidNumber: baseGeneral.pidNumber || project?.pidNumber || "",
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
        inspectedEquipmentImage:
          baseGeneral.inspectedEquipmentImage ||
          base.inspectedEquipmentImage ||
          project?.report?.general?.inspectedEquipmentImage ||
          "",
        inspectedEquipmentImageNote:
          baseGeneral.inspectedEquipmentImageNote ||
          base.inspectedEquipmentImageNote ||
          project?.report?.general?.inspectedEquipmentImageNote ||
          "",
        utCalibrationCert:
          baseGeneral.utCalibrationCert ||
          base.utCalibrationCert ||
          project?.report?.general?.utCalibrationCert ||
          "",
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
      checklist: Array.isArray(base.checklist) ? base.checklist : [],
      utm: base.utm || [],
      signoff: base.signoff || {},
    };
  })();

  const reportLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/report/download/${id}`
      : `/report/download/${id}`;

  const openMailComposer = () => {
    setIsMailComposerOpen(true);
  };

  const closeMailComposer = () => {
    setIsMailComposerOpen(false);
  };

  const handleMailDraftChange = (field, value) => {
    setMailDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSendMail = () => {
    const to = String(mailDraft.to || "").trim();
    const subject = String(mailDraft.subject || "").trim();
    const message = String(mailDraft.message || "").trim();

    if (!to) {
      toast.error("Enter at least one recipient email.");
      return;
    }

    const mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(message)}`;

    window.location.href = mailtoUrl;
    toast.success("Email draft opened in your mail app.");
    closeMailComposer();
  };

  if (techniqueType === "visual") {
    return (
      <>
        {!hideControls && (
          <>
            <div className="fixed bottom-6 right-6 z-40 print:hidden">
              <button
                type="button"
                onClick={openMailComposer}
                className="inline-flex items-center gap-2 rounded-2xl border border-orange-500/30 bg-orange-600 px-5 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white shadow-lg shadow-orange-950/30 transition hover:bg-orange-700"
              >
                <Mail size={16} />
                Send Report by Email
              </button>
            </div>
            {isMailComposerOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm print:hidden">
                <div className="w-full max-w-2xl rounded-[2rem] border border-slate-800 bg-slate-900 p-6 shadow-2xl">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-400">
                        Report Mailer
                      </p>
                      <h2 className="mt-3 text-2xl font-bold text-white">
                        Send Report Link
                      </h2>
                      <p className="mt-2 text-sm text-slate-400">
                        This opens your default mail app with the report link prefilled.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={closeMailComposer}
                      className="rounded-xl border border-slate-800 p-2 text-slate-400 transition hover:text-white"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="mt-6 grid gap-4">
                    <div className="grid gap-2">
                      <label className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
                        Recipient Email
                      </label>
                      <input
                        type="text"
                        value={mailDraft.to}
                        onChange={(e) => handleMailDraftChange("to", e.target.value)}
                        placeholder="client@example.com"
                        className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500"
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={mailDraft.subject}
                        onChange={(e) => handleMailDraftChange("subject", e.target.value)}
                        className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500"
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
                        Message
                      </label>
                      <textarea
                        rows={8}
                        value={mailDraft.message}
                        onChange={(e) => handleMailDraftChange("message", e.target.value)}
                        className="w-full resize-none rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500"
                      />
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-xs text-slate-400">
                      <span className="font-bold uppercase tracking-[0.18em] text-slate-500">
                        Report Link
                      </span>
                      <p className="mt-2 break-all text-slate-300">{reportLink}</p>
                    </div>

                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={closeMailComposer}
                        className="rounded-2xl border border-slate-700 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-300 transition hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSendMail}
                        className="inline-flex items-center gap-2 rounded-2xl bg-orange-600 px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-orange-700"
                      >
                        <Send size={14} />
                        Open Mail Draft
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <VisualWebView
          reportData={normalizedReportData}
          companyLogo={companyLogo}
          onBack={() => (onClose ? onClose() : navigate(-1))}
          hideControls={hideControls}
        />
      </>
    );
  }

  if (techniqueType === "ut") {
    return (
      <UTWebView
        reportData={normalizedReportData}
        onBack={() => (onClose ? onClose() : navigate(-1))}
        hideControls={hideControls}
        companyLogo={companyLogo}
      />
    );
  }

  return (
    <>
      {!hideControls && (
        <>
          <div className="fixed bottom-6 right-6 z-40 print:hidden">
            <button
              type="button"
              onClick={openMailComposer}
              className="inline-flex items-center gap-2 rounded-2xl border border-orange-500/30 bg-orange-600 px-5 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white shadow-lg shadow-orange-950/30 transition hover:bg-orange-700"
            >
              <Mail size={16} />
              Send Report by Email
            </button>
          </div>
          {isMailComposerOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm print:hidden">
              <div className="w-full max-w-2xl rounded-[2rem] border border-slate-800 bg-slate-900 p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-400">
                      Report Mailer
                    </p>
                    <h2 className="mt-3 text-2xl font-bold text-white">
                      Send Report Link
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">
                      This opens your default mail app with the report link prefilled.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeMailComposer}
                    className="rounded-xl border border-slate-800 p-2 text-slate-400 transition hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="mt-6 grid gap-4">
                  <div className="grid gap-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
                      Recipient Email
                    </label>
                    <input
                      type="text"
                      value={mailDraft.to}
                      onChange={(e) => handleMailDraftChange("to", e.target.value)}
                      placeholder="client@example.com"
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={mailDraft.subject}
                      onChange={(e) => handleMailDraftChange("subject", e.target.value)}
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
                      Message
                    </label>
                    <textarea
                      rows={8}
                      value={mailDraft.message}
                      onChange={(e) => handleMailDraftChange("message", e.target.value)}
                      className="w-full resize-none rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500"
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-xs text-slate-400">
                    <span className="font-bold uppercase tracking-[0.18em] text-slate-500">
                      Report Link
                    </span>
                    <p className="mt-2 break-all text-slate-300">{reportLink}</p>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={closeMailComposer}
                      className="rounded-2xl border border-slate-700 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-300 transition hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSendMail}
                      className="inline-flex items-center gap-2 rounded-2xl bg-orange-600 px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-orange-700"
                    >
                      <Send size={14} />
                      Open Mail Draft
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      <IntegrityWebView
        reportData={normalizedReportData}
        companyLogo={companyLogo}
        onBack={() => (onClose ? onClose() : navigate(-1))}
        hideControls={hideControls}
      />
    </>
  );
};

export default ReportDownloadView;
