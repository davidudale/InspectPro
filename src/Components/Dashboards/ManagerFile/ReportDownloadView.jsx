import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../Auth/firebase";
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { Printer, ChevronLeft, Activity, Shield, FileDown } from "lucide-react";
import html2pdf from "html2pdf.js"; // Import the library

const ReportDownloadView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const reportRef = useRef(); // Create a reference for the PDF generator
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
          limit(1)
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

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-8 pb-20 print:p-0 print:bg-white">
      {/* UI Controls */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <ChevronLeft size={18} /> Back
        </button>
        <div className="flex gap-4">
          <button onClick={() => window.print()} className="bg-slate-800 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 border border-slate-700">
            <Printer size={18} /> Print
          </button>
          <button onClick={downloadPDF} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-900/20">
            <FileDown size={18} /> Save as PDF
          </button>
        </div>
      </div>

      {/* TARGET CONTAINER FOR PDF GENERATION */}
      <div ref={reportRef} className="max-w-[210mm] mx-auto space-y-0">
        
        {/* --- PAGE 1: COVER PAGE --- */}
        <div className="bg-white text-slate-950 p-[20mm] min-h-[297mm] flex flex-col page-break">
          <div className="flex justify-between items-start border-b-2 border-slate-950 pb-6 mb-20">
             <div className="text-blue-800 font-black text-xl">INSPECTPRO™</div>
             {project?.clientLogo && <img src={project.clientLogo} alt="Client" className="h-16 w-auto" />}
          </div>

          <div className="flex-1 flex flex-col justify-center text-center">
            <h1 className="text-5xl font-serif font-bold underline mb-6 uppercase tracking-tight">
              {project?.locationName}
            </h1>
            <h2 className="text-2xl font-bold mb-16 uppercase tracking-[0.2em] text-slate-700 border-y py-4 border-slate-200">
              Visual Testing (VT) Technical Report
            </h2>
            
            <div className="space-y-6 text-left inline-block mx-auto min-w-[300px] bg-slate-50 p-8 rounded-2xl border border-slate-100">
              <ReportRow label="Report ID" value={project?.projectId} />
              <ReportRow label="Asset Reference" value={project?.equipmentTag} />
              <ReportRow label="Inspection Date" value={project?.startDate} />
              <ReportRow label="Regulatory Code" value={report?.general?.assetType} />
            </div>
          </div>

          <div className="mt-auto pt-10 border-t-4 border-slate-900 text-center">
             <p className="text-[10px] font-black text-red-600 tracking-[0.4em]">CONFIDENTIAL ENGINEERING DOCUMENT</p>
          </div>
        </div>

        {/* --- PAGE 2: TECHNICAL FINDINGS --- */}
        <div className="bg-white text-slate-950 p-[20mm] min-h-[297mm] flex flex-col page-break">
          <h3 className="text-sm font-black uppercase border-b-2 border-slate-900 pb-2 mb-8 flex items-center gap-2">
            <Shield size={16} className="text-orange-600" /> Section 01: Technical Observations
          </h3>
          
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
              {report?.observations?.map((obs) => (
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

          <div className="mt-auto grid grid-cols-2 gap-10">
            <SignatureBlock label="Field Inspector" name={report?.inspector} />
            <SignatureBlock label="Authorized By" name={project?.authorizedBy || "System Admin"} />
          </div>
        </div>

        {/* --- PAGE 3: PHOTOGRAPHIC APPENDIX --- */}
        {report?.observations?.some(o => o.photoRef) && (
          <div className="bg-white text-slate-950 p-[20mm] min-h-[297mm] page-break">
            <h3 className="text-sm font-black uppercase border-b-2 border-slate-900 pb-2 mb-8">
              Section 02: Photographic Appendix
            </h3>
            <div className="grid grid-cols-2 gap-8">
              {report?.observations?.filter((o) => o.photoRef).map((img, idx) => (
                <div key={idx} className="space-y-2 break-inside-avoid">
                  <div className="border-2 border-slate-100 p-1 rounded-lg">
                    <img src={img.photoRef} crossOrigin="anonymous" className="w-full aspect-[4/3] object-cover rounded" alt="Evidence" />
                  </div>
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-black uppercase">Ref {img.sn}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase truncate">{img.component}</span>
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

const SignatureBlock = ({ label, name }) => (
  <div className="space-y-4">
    <p className="text-[9px] font-black uppercase text-slate-400">{label}</p>
    <div className="border-b-2 border-slate-950 pb-1 font-serif italic text-lg text-slate-900">
      {name || "____________________"}
    </div>
    <p className="text-[8px] text-slate-500 uppercase">Electronic Verification Signature</p>
  </div>
);

export default ReportDownloadView;