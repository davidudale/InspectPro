import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../../../Auth/firebase";
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { Activity, ChevronLeft, FileDown, Printer, Shield } from "lucide-react";
import html2pdf from "html2pdf.js";

const ProjectPreview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const reportRef = useRef();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [report, setReport] = useState(null);

  useEffect(() => {
    const fetchFullData = async () => {
      try {
        setLoading(true);

        const projectDoc = await getDoc(doc(db, "projects", id));
        if (projectDoc.exists()) setProject(projectDoc.data());

        const q = query(
          collection(db, "inspection_reports"),
          where("general.projectId", "==", id),
          limit(1),
        );
        const reportSnap = await getDocs(q);
        if (!reportSnap.empty) setReport(reportSnap.docs[0].data());
      } catch (error) {
        console.error("PDF Fetch Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFullData();
  }, [id]);

  const observations = report?.observations || [];
  const evidencePhotos = observations.filter((o) => o.photoRef);
  const satisfactoryCount = observations.filter(
    (o) => (o.condition || "").toLowerCase() === "satisfactory",
  ).length;
  const actionRequiredCount = Math.max(observations.length - satisfactoryCount, 0);

  const standardsUsed = [
    report?.general?.standard,
    report?.general?.designCode,
    project?.designCode,
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

  const downloadPDF = () => {
    const element = reportRef.current;
    const opt = {
      margin: 0,
      filename: `OIL_GAS_VT_REPORT_${project?.projectId || "EXPORT"}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    };

    html2pdf().set(opt).from(element).save();
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <Activity className="animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-8 pb-20 print:p-0 print:bg-white">
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <button
          onClick={() => navigate(-1)}
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
            onClick={downloadPDF}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-900/20"
          >
            <FileDown size={18} /> Save as PDF
          </button>
        </div>
      </div>

      <div ref={reportRef} className="max-w-[210mm] mx-auto space-y-0">
        <div className="bg-white text-slate-950 p-[20mm] min-h-[297mm] flex flex-col page-break">
          <div className="flex justify-between items-start border-b-2 border-slate-950 pb-6 mb-12">
            <div className="text-blue-800 font-black text-xl">INSPECTPRO</div>
            {project?.clientLogo && (
              <img src={project.clientLogo} alt="Client" className="h-16 w-auto object-contain" />
            )}
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
                <ReportRow label="Project Name" value={project?.projectName} />
                <ReportRow label="Project ID" value={project?.projectId} />
                <ReportRow label="Client" value={project?.clientName} />
                <ReportRow label="Facility/Location" value={project?.locationName} />
              </div>

              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3">
                  Asset Information
                </h3>
                <ReportRow label="Asset Tag" value={project?.equipmentTag || report?.general?.tag} />
                <ReportRow
                  label="Asset Type"
                  value={project?.equipmentCategory || report?.general?.assetType}
                />
                <ReportRow label="Inspection Date" value={project?.startDate || report?.general?.inspectionDate} />
                <ReportRow label="Report Number" value={report?.general?.reportNum} />
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
            <Shield size={16} className="text-orange-600" /> Section 01: Findings Register
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
                Address all items classified as <span className="font-black">Action Required</span>
                {" "}before the next operational cycle.
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
            <SignatureBlock label="Field Inspector" name={report?.inspector} />
            <SignatureBlock label="Authorized By" name={project?.authorizedBy || "System Admin"} />
          </div>
        </div>

        {evidencePhotos.length > 0 && (
          <div className="bg-white text-slate-950 p-[20mm] min-h-[297mm] page-break">
            <h3 className="text-sm font-black uppercase border-b-2 border-slate-900 pb-2 mb-8">
              Section 03: Photographic Evidence Appendix
            </h3>
            <div className="grid grid-cols-2 gap-8">
              {evidencePhotos.map((img, idx) => (
                <div key={idx} className="space-y-2 break-inside-avoid">
                  <div className="border-2 border-slate-100 p-1 rounded-lg">
                    <img
                      src={img.photoRef}
                      crossOrigin="anonymous"
                      className="w-full aspect-[4/3] object-cover rounded"
                      alt="Evidence"
                    />
                  </div>
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-black uppercase">Ref {img.sn}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase truncate">
                      {img.component}
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

export default ProjectPreview;
