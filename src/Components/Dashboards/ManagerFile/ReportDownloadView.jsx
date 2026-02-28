import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../Auth/firebase";
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { Printer, ChevronLeft, Activity, Shield, FileDown, XCircle } from "lucide-react";
import html2pdf from "html2pdf.js"; // Import the library
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
  const reportRef = useRef(); // Create a reference for the PDF generator
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [report, setReport] = useState(null);

  const getTechniqueType = () => {
    const raw = (
      report?.general?.selectedTechnique ||
      report?.technique ||
      project?.reportTemplate ||
      project?.selectedTechnique ||
      ""
    ).toLowerCase();

    // Normalize common inspection labels to techniques/templates.
    if (raw.includes("pressure vessel") || raw.includes("integrity")) return "integrity";
    if (raw.includes("detailed")) return "detailed";
    if (raw.includes("aut") || raw.includes("corrosion mapping")) return "aut";
    if (raw.includes("mut") || raw.includes("manual ut")) return "mut";
    if (raw.includes("visual") || raw.includes("vt") || raw.includes("visual testing")) return "visual";
    if (raw.includes("radiography") || raw.includes("rt") || raw.includes("x-ray")) return "visual";
    return "visual";
  };

  const techniqueType = getTechniqueType();
  const isIntegrity = techniqueType === "integrity";
  const isVisualFamily = techniqueType === "visual" || techniqueType === "detailed";
  const evidencePhotos =
    report?.observations?.filter((o) => o.photoRef || o.photo) || [];
  const hasPhotoAppendix =
    (isVisualFamily || isIntegrity) &&
    report?.observations?.some((o) => o.photoRef || o.photo);
  const satisfactoryCount = (report?.observations || []).filter(
    (obs) => (obs.condition || "").toLowerCase() === "satisfactory"
  ).length;
  const actionRequiredCount = Math.max((report?.observations || []).length - satisfactoryCount, 0);
  const standardsUsed = [
    report?.general?.defaultStandard,
    report?.general?.designCode,
    report?.general?.assetType,
    "API 510 / API 570 / API 653 (as applicable)",
  ].filter(Boolean);
  const refineryHeroSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900'><defs><linearGradient id='bg' x1='0' y1='0' x2='0' y2='1'><stop offset='0%' stop-color='#cbd5e1'/><stop offset='100%' stop-color='#e2e8f0'/></linearGradient><linearGradient id='ground' x1='0' y1='0' x2='0' y2='1'><stop offset='0%' stop-color='#64748b'/><stop offset='100%' stop-color='#334155'/></linearGradient></defs><rect width='1600' height='900' fill='url(#bg)'/><rect y='680' width='1600' height='220' fill='url(#ground)'/><rect x='150' y='380' width='140' height='300' fill='#475569'/><rect x='170' y='320' width='100' height='70' fill='#64748b'/><rect x='400' y='270' width='120' height='410' fill='#334155'/><rect x='430' y='210' width='60' height='60' fill='#64748b'/><rect x='620' y='430' width='220' height='250' fill='#475569'/><rect x='900' y='340' width='100' height='340' fill='#334155'/><rect x='1030' y='410' width='170' height='270' fill='#475569'/><rect x='1240' y='300' width='80' height='380' fill='#334155'/><rect x='1340' y='450' width='120' height='230' fill='#475569'/><rect x='280' y='520' width='1100' height='18' fill='#94a3b8'/><circle cx='220' cy='300' r='22' fill='#f59e0b' opacity='0.9'/><text x='800' y='120' text-anchor='middle' font-family='Arial' font-size='54' fill='#1e293b' font-weight='700'>REFINERY EQUIPMENT</text></svg>"
  )}`;
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
        let resolvedProjectDocId = id;
        let resolvedProjectBusinessId = "";
        let resolvedProjectData = null;

        // 1) Resolve project by doc id first; fallback to business projectId.
        const projectDoc = await getDoc(doc(db, "projects", id));
        if (projectDoc.exists()) {
          resolvedProjectData = projectDoc.data();
          resolvedProjectDocId = projectDoc.id;
          resolvedProjectBusinessId = projectDoc.data()?.projectId || "";
        } else {
          const projectByBusinessIdQ = query(
            collection(db, "projects"),
            where("projectId", "==", id),
            limit(1),
          );
          const projectByBusinessIdSnap = await getDocs(projectByBusinessIdQ);
          if (!projectByBusinessIdSnap.empty) {
            const pDoc = projectByBusinessIdSnap.docs[0];
            resolvedProjectData = pDoc.data();
            resolvedProjectDocId = pDoc.id;
            resolvedProjectBusinessId = pDoc.data()?.projectId || id;
          }
        }

        if (resolvedProjectData) setProject(resolvedProjectData);

        if (resolvedProjectData?.report) {
          setReport(resolvedProjectData.report);
        } else {
          setReport(null);
        }
      } catch (error) {
        console.error("PDF Fetch Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFullData();
  }, [id]);

  // --- PDF GENERATION LOGIC ---
  const downloadPDF = () => {
    const element = reportRef.current;
    const opt = {
      margin: 0,
      filename: `INSPECTPRO_REPORT_${project?.equipmentTag || "EXPORT"}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: true }, // scale: 2 for HD quality
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(element).save();
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-950">
      <Activity className="animate-spin text-orange-500" />
    </div>
  );

  const totalPages = 2 + (hasPhotoAppendix ? 1 : 0);

  if (isIntegrity) {
    const integrityReportData =
      report ||
      ({
        type: "Integrity Check",
        general: {
          client: project?.clientName || "",
          platform: project?.locationName || "",
          tag: project?.equipmentTag || "",
          reportNum: project?.reportNum || "",
          date: project?.startDate || "",
          equipment: project?.equipmentCategory || "",
          clientLogo: project?.clientLogo || "",
          projectId: project?.projectId || "",
        },
        observations: [],
        inspection: {},
        signoff: {},
        utm: [],
      });

      return (
        <IntegrityWebView
          reportData={integrityReportData}
          onBack={() => navigate(-1)}
          hideControls={hideControls}
        />
      );
  }

  return (
    <div className={`${embedded ? "bg-transparent p-0" : "min-h-screen bg-slate-900 p-4 md:p-8 pb-20"} print:p-0 print:bg-white`}>
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
      {/* UI Controls */}
      {!hideControls && (
        <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ChevronLeft size={18} /> Back
          </button>
          <div className="flex gap-4">
           {/* <button onClick={() => window.print()} className="bg-slate-800 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 border border-slate-700">
              <Printer size={18} /> Print
            </button>
            {showCloseButton && (
              <button
                onClick={() => (onClose ? onClose() : navigate(-1))}
                className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 border border-slate-600"
              >
                <XCircle size={18} /> Close Window
              </button>
            )}
            <button onClick={downloadPDF} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-900/20">
              <FileDown size={18} /> Save as PDF
            </button>*/}
          </div>
        </div>
      )}

      {/* TARGET CONTAINER FOR PDF GENERATION */}
        <div ref={reportRef} className="max-w-[210mm] w-full mx-auto space-y-0 px-2 sm:px-0">
         
          {/* --- PAGE 1: COVER PAGE --- */}
          <div className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-hidden">
            <ReportBackground />
            <ReportHeader clientLogo={project?.clientLogo} />

            <div className="relative flex-1 flex flex-col items-center justify-center text-center px-12">
              <div className="mb-6 text-[11px] font-black uppercase tracking-[0.4em] text-slate-500">
                Technical Inspection Report
              </div>
              <h1 className="text-5xl md:text-6xl font-extrabold text-blue-700 tracking-tight drop-shadow-sm">
                {isVisualFamily ? "Visual Inspection" : techniqueTitle}
              </h1>
              <h2 className="mt-3 text-4xl md:text-5xl font-extrabold text-blue-600 tracking-tight">
                Report
              </h2>
              <div className="mt-8 h-1 w-40 rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-indigo-500" />
              <div className="mt-10 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600">
                {project?.locationName || report?.general?.platform || "Facility Name"}
              </div>
            </div>

            <div className="relative px-12 pb-10 flex items-end justify-between text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              <div>{report?.general?.client || project?.clientName || "Client"}</div>
              <div>{report?.general?.reportNum || project?.reportNum || "Report No."}</div>
            </div>

            <ReportFooter pageNumber={1} totalPages={totalPages} />
          </div>

       {/* {isVisualFamily && (
          <div className="report-page bg-white text-slate-950 p-4 sm:p-8 print:p-[20mm] min-h-[297mm] flex flex-col page-break">
            <h3 className="text-sm font-black uppercase border-b-2 border-slate-900 pb-2 mb-8">
              Section 00: Inspection Overview
            </h3>
            <div className="flex-1 flex items-center justify-center border border-slate-200 rounded-xl bg-slate-50">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 text-center px-8">
                Overview Page
              </p>
            </div>
          </div>
        )} */}

        {/* --- PAGE 2: TECHNICAL FINDINGS --- */}
        <div className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-hidden">
          <ReportBackground />
          <ReportHeader clientLogo={project?.clientLogo} />
          <div className="relative flex-1 flex flex-col px-12 pt-10 gap-8">
            <div className="text-center space-y-2">
              <div className="text-sm font-black uppercase tracking-wide text-slate-900">
                {isVisualFamily ? "Section 01: Findings Register" : "Section 01: Technical Observations"}
              </div>
              <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em]">
                Inspection Summary
              </p>
            </div>

          {isVisualFamily && (
            <>
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
                        <th className="text-left py-2 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Project Information</th>
                        <th className="text-left py-2 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Value</th>
                        <th className="text-left py-2 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Asset Information</th>
                        <th className="text-left py-2 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Value</th>
                      </tr>
                    </thead>
                    <tbody className="text-[11px]">
                      <tr className="border-b border-slate-200">
                        <td className="py-3 px-4 font-bold text-slate-700">Client</td>
                        <td className="py-3 px-4 text-slate-900">{report?.general?.client || "N/A"}</td>
                        <td className="py-3 px-4 font-bold text-slate-700">Asset Tag</td>
                        <td className="py-3 px-4 text-slate-900">{report?.general?.tag || "N/A"}</td>
                      </tr>
                      <tr className="border-b border-slate-200 bg-slate-50/50">
                        <td className="py-3 px-4 font-bold text-slate-700">Facility / Location</td>
                        <td className="py-3 px-4 text-slate-900">{report?.general?.platform || "N/A"}</td>
                        <td className="py-3 px-4 font-bold text-slate-700">Asset Type</td>
                        <td className="py-3 px-4 text-slate-900">{report?.general?.assetType || "N/A"}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-3 px-4 font-bold text-slate-700">Report Number</td>
                        <td className="py-3 px-4 text-slate-900">{report?.general?.reportNum || "N/A"}</td>
                        <td className="py-3 px-4 font-bold text-slate-700">Equipment Class</td>
                        <td className="py-3 px-4 text-slate-900">{report?.general?.equipment || "N/A"}</td>
                      </tr>
                      <tr className="border-b border-slate-200 bg-slate-50/50">
                        <td className="py-3 px-4 font-bold text-slate-700">Inspection Date</td>
                        <td className="py-3 px-4 text-slate-900">{report?.general?.date || "N/A"}</td>
                        <td className="py-3 px-4 font-bold text-slate-700">Ambient Temp</td>
                        <td className="py-3 px-4 text-slate-900">{`${report?.environmental?.temp || "N/A"} C`}</td>
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
            </>
          )}

          {techniqueType === "detailed" ? (
            <div className="space-y-8 mb-10">
              <div>
                <h4 className="text-[11px] font-black uppercase text-slate-700 mb-3">Visual Findings</h4>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-y border-slate-300">
                      <th className="py-2 px-2 text-[10px] font-black uppercase">Ref</th>
                      <th className="py-2 px-2 text-[10px] font-black uppercase">Component</th>
                      <th className="py-2 px-2 text-[10px] font-black uppercase">Condition</th>
                      <th className="py-2 px-2 text-[10px] font-black uppercase">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px] divide-y divide-slate-200">
                    {(report?.observations || []).map((obs) => (
                      <tr key={obs.sn}>
                        <td className="p-3 font-mono font-bold">{obs.sn}</td>
                        <td className="p-3 font-bold uppercase">{obs.component}</td>
                        <td className="p-3">{obs.condition || "-"}</td>
                        <td className="p-3 italic text-slate-600">{obs.notes || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h4 className="text-[11px] font-black uppercase text-slate-700 mb-3">AUT Thickness Mapping</h4>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-y border-slate-300">
                      <th className="py-2 px-2 text-[10px] font-black uppercase">Axial X</th>
                      <th className="py-2 px-2 text-[10px] font-black uppercase">Axial Y</th>
                      <th className="py-2 px-2 text-[10px] font-black uppercase">Nominal</th>
                      <th className="py-2 px-2 text-[10px] font-black uppercase">Minimum</th>
                      <th className="py-2 px-2 text-[10px] font-black uppercase">Location</th>
                      <th className="py-2 px-2 text-[10px] font-black uppercase">Remark</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px] divide-y divide-slate-200">
                    {(report?.autMetrics || []).map((row, idx) => (
                      <tr key={row.id || idx}>
                        <td className="p-3">{row.axialX || "-"}</td>
                        <td className="p-3">{row.axialY || "-"}</td>
                        <td className="p-3">{row.nominal || "-"}</td>
                        <td className="p-3">{row.min || "-"}</td>
                        <td className="p-3">{row.location || "-"}</td>
                        <td className="p-3 italic text-slate-600">{row.remark || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h4 className="text-[11px] font-black uppercase text-slate-700 mb-3">MUT Nozzle Measurements</h4>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-y border-slate-300">
                      <th className="py-2 px-2 text-[10px] font-black uppercase">Nozzle Tag</th>
                      <th className="py-2 px-2 text-[10px] font-black uppercase">Diameter</th>
                      <th className="py-2 px-2 text-[10px] font-black uppercase">Nominal</th>
                      <th className="py-2 px-2 text-[10px] font-black uppercase">Actual</th>
                      <th className="py-2 px-2 text-[10px] font-black uppercase">Min Thk</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px] divide-y divide-slate-200">
                    {(report?.mutNozzles || []).map((row, idx) => (
                      <tr key={row.id || idx}>
                        <td className="p-3">{row.nozzleTag || "-"}</td>
                        <td className="p-3">{row.dia || "-"}</td>
                        <td className="p-3">{row.nominal || "-"}</td>
                        <td className="p-3">{row.actual || "-"}</td>
                        <td className="p-3">{row.minThk || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : techniqueType === "aut" ? (
            <table className="w-full text-left border-collapse mb-10">
              <thead>
                <tr className="bg-slate-100 border-y border-slate-300">
                  <th className="py-3 px-3 text-[10px] font-black uppercase">Axial X</th>
                  <th className="py-3 px-3 text-[10px] font-black uppercase">Axial Y</th>
                  <th className="py-3 px-3 text-[10px] font-black uppercase">Nominal</th>
                  <th className="py-3 px-3 text-[10px] font-black uppercase">Minimum</th>
                  <th className="py-3 px-3 text-[10px] font-black uppercase">Location</th>
                  <th className="py-3 px-3 text-[10px] font-black uppercase">Remark</th>
                </tr>
              </thead>
              <tbody className="text-[11px] divide-y divide-slate-200">
                {(report?.autMetrics || []).map((row, idx) => (
                  <tr key={row.id || idx}>
                    <td className="p-4">{row.axialX || "-"}</td>
                    <td className="p-4">{row.axialY || "-"}</td>
                    <td className="p-4">{row.nominal || "-"}</td>
                    <td className="p-4">{row.min || "-"}</td>
                    <td className="p-4">{row.location || "-"}</td>
                    <td className="p-4 italic text-slate-600">{row.remark || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : techniqueType === "mut" ? (
            <table className="w-full text-left border-collapse mb-10">
              <thead>
                <tr className="bg-slate-100 border-y border-slate-300">
                  <th className="py-3 px-3 text-[10px] font-black uppercase">Nozzle Tag</th>
                  <th className="py-3 px-3 text-[10px] font-black uppercase">Diameter</th>
                  <th className="py-3 px-3 text-[10px] font-black uppercase">Nominal</th>
                  <th className="py-3 px-3 text-[10px] font-black uppercase">Actual</th>
                  <th className="py-3 px-3 text-[10px] font-black uppercase">Min Thk</th>
                </tr>
              </thead>
              <tbody className="text-[11px] divide-y divide-slate-200">
                {(report?.mutNozzles || []).map((row, idx) => (
                  <tr key={row.id || idx}>
                    <td className="p-4">{row.nozzleTag || "-"}</td>
                    <td className="p-4">{row.dia || "-"}</td>
                    <td className="p-4">{row.nominal || "-"}</td>
                    <td className="p-4">{row.actual || "-"}</td>
                    <td className="p-4">{row.minThk || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse mb-10">
              <thead>
                <tr className="bg-slate-100 border-y border-slate-300">
                  <th className="py-3 px-3 text-[10px] font-black uppercase">Ref</th>
                  <th className="py-3 px-3 text-[10px] font-black uppercase">Component</th>
                  <th className="py-3 px-3 text-[10px] font-black uppercase">Condition</th>
                  <th className="py-3 px-3 text-[10px] font-black uppercase">Remarks</th>
                </tr>
              </thead>
              <tbody className="text-[11px] divide-y divide-slate-200">
                {(report?.observations || []).map((obs) => (
                  <tr key={obs.sn}>
                    <td className="p-4 font-mono font-bold">{obs.sn}</td>
                    <td className="p-4 font-bold uppercase">{obs.component}</td>
                    <td className="p-4">
                      <span className={`font-black uppercase ${obs.condition === "Satisfactory" ? "text-emerald-600" : "text-red-600"}`}>
                        {obs.condition}
                      </span>
                    </td>
                    <td className="p-4 italic text-slate-600">{obs.notes || "Standard spec maintained."}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

            {!hasPhotoAppendix && (
              <div className="mt-auto grid grid-cols-2 gap-10">
                <SignatureBlock label="Field Inspector" name={report?.inspector} />
                <SignatureBlock label="Authorized By" name={project?.authorizedBy || "System Admin"} />
              </div>
            )}
          </div>
          <ReportFooter pageNumber={2} totalPages={totalPages} />
        </div>

        {/* --- PAGE 3: PHOTOGRAPHIC APPENDIX --- */}
        {hasPhotoAppendix && (
          <div className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-hidden">
            <ReportBackground />
            <ReportHeader clientLogo={project?.clientLogo} />
            <div className="relative flex-1 flex flex-col px-12 pt-10 gap-8">
              <div className="text-center space-y-2">
                <div className="text-sm font-black uppercase tracking-wide text-slate-900">
                  Section 02: Photographic Appendix
                </div>
                <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em]">
                  Evidence Gallery
                </p>
              </div>
              <div className="grid grid-cols-2 gap-8">
                {evidencePhotos.map((img, idx) => (
                  <div key={idx} className="space-y-2 break-inside-avoid">
                    <div className="border-2 border-slate-100 p-1 rounded-lg">
                      <img
                        src={img.photoRef || img.photo}
                        crossOrigin="anonymous"
                        className="w-full aspect-[4/3] object-cover rounded"
                        alt="Evidence"
                      />
                    </div>
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[10px] font-black uppercase">
                        Ref {img.sn}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase truncate">
                        {img.component}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-auto grid grid-cols-2 gap-10 pt-10">
                <SignatureBlock label="Field Inspector" name={report?.inspector} />
                <SignatureBlock
                  label="Authorized By"
                  name={project?.authorizedBy || "System Admin"}
                />
              </div>
            </div>
            <ReportFooter pageNumber={3} totalPages={totalPages} />
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

const SignatureBlock = ({ label, name }) => (
  <div className="space-y-4">
    <p className="text-[9px] font-black uppercase text-slate-400">{label}</p>
    <div className="border-b-2 border-slate-950 pb-1 font-serif italic text-lg text-slate-900">
      {name || "____________________"}
    </div>
    <p className="text-[8px] text-slate-500 uppercase">Electronic Verification Signature</p>
  </div>
);

const ReportHeader = ({ clientLogo }) => (
  <div className="relative flex items-center justify-between px-12 py-6 border-b border-slate-200/80 backdrop-blur-md">
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/30" />
      <div className="text-blue-900 font-black text-xl tracking-wide">INSPECTPRO</div>
    </div>
    {clientLogo ? (
      <img src={clientLogo} alt="Client" className="h-12 w-auto object-contain" />
    ) : (
      <div className="h-10 w-24 rounded-lg bg-slate-200/70" />
    )}
  </div>
);

const ReportFooter = ({ pageNumber, totalPages }) => (
  <div className="relative mt-auto px-12 pb-8">
    <div className="pt-6 border-t-2 border-slate-900/80 text-center">
      <p className="text-[10px] font-black text-red-600 tracking-[0.4em]">
        Original Document
      </p>
    </div>
    <div className="pt-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">
      Page {pageNumber} of {totalPages}
    </div>
  </div>
);

const ReportBackground = () => (
  <div className="absolute inset-0">
    <div className="absolute -top-24 -left-20 h-64 w-64 rounded-full bg-blue-100/70 blur-2xl" />
    <div className="absolute top-24 -right-20 h-72 w-72 rounded-full bg-cyan-100/70 blur-2xl" />
    <div className="absolute bottom-16 left-1/3 h-64 w-64 rounded-full bg-indigo-100/60 blur-2xl" />
  </div>
);

export default ReportDownloadView;



