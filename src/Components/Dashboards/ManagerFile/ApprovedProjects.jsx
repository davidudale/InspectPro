import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../Auth/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import {
  Activity,
  Briefcase,
  Download,
  FileText,
  MapPin,
  Search,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "../../Auth/AuthContext";
import ManagerNavbar from "../ManagerFile/ManagerNavbar";
import ManagerSidebar from "../ManagerFile/ManagerSidebar";

const ApprovedProjects = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const toMillis = (value) => {
    if (!value) return 0;
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    if (typeof value?.toMillis === "function") return value.toMillis();
    if (typeof value?.toDate === "function") return value.toDate().getTime();
    return 0;
  };

  const getRowTimestamp = (row) =>
    row?.approvedAt ||
    row?.updatedAt ||
    row?.lastUpdated ||
    row?.confirmedAt ||
    row?.confirmationDate ||
    row?.createdAt ||
    row?.timestamp ||
    row?.startDate ||
    0;

  const formatDateTime = (value) => {
    const millis = toMillis(value);
    if (!millis) return "Not available";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(millis));
  };

  const resolveTechnique = (project) =>
    project?.report?.general?.inspectionTypeCode ||
    project?.report?.general?.inspectionTypeName ||
    project?.inspectionTypeCode ||
    project?.inspectionTypeName ||
    project?.reportTemplate ||
    project?.selectedTechnique ||
    "Inspection Report";

  useEffect(() => {
    if (!user?.uid) return;

    const approvedQuery =
      user?.role === "Manager" || user?.role === "Admin"
        ? query(collection(db, "projects"), where("status", "==", "Approved"))
        : query(
            collection(db, "projects"),
            where("supervisorId", "==", user.uid),
            where("status", "==", "Approved"),
          );

    const unsubscribe = onSnapshot(approvedQuery, (snapshot) => {
      const nextProjects = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => toMillis(getRowTimestamp(b)) - toMillis(getRowTimestamp(a)));

      setProjects(nextProjects);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredProjects = projects
    .filter((project) => {
      const searchValue = searchTerm.toLowerCase();
      return (
        String(project.projectName || "").toLowerCase().includes(searchValue) ||
        String(project.clientName || "").toLowerCase().includes(searchValue) ||
        String(project.projectId || "").toLowerCase().includes(searchValue) ||
        String(resolveTechnique(project)).toLowerCase().includes(searchValue) ||
        String(project.locationName || "").toLowerCase().includes(searchValue)
      );
    })
    .sort((a, b) => toMillis(getRowTimestamp(b)) - toMillis(getRowTimestamp(a)));

  const approvedCount = filteredProjects.length;

  return (
    <div className="flex min-h-screen flex-col bg-[#050816] text-slate-200">
      <ManagerNavbar />
      <div className="flex flex-1">
        <ManagerSidebar />
        <main className="ml-16 flex-1 bg-[radial-gradient(circle_at_top_right,_rgba(249,115,22,0.12),_transparent_25%),linear-gradient(180deg,_#07101f_0%,_#050816_55%,_#040712_100%)] p-4 sm:p-6 lg:ml-64 lg:p-8">
          <div className="mx-auto max-w-[1500px]">
            <div className="overflow-hidden rounded-[2rem] border border-slate-800/80 bg-[#08101f]/95 shadow-[0_24px_80px_rgba(2,6,23,0.55)]">
              <header className="border-b border-slate-800/80 px-6 py-6 sm:px-8">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">
                      Control Center
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-3 text-orange-400">
                        <Briefcase size={18} />
                      </div>
                      <div>
                        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                          Approved Reports
                        </h1>
                        <p className="mt-1 text-sm text-slate-400">
                          Browse finalized inspection documents and download the approved report package.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-3 xl:max-w-[420px] xl:items-end">
                    <div className="relative w-full">
                      <Search
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"
                        size={16}
                      />
                      <input
                        type="text"
                        placeholder="Search by project, client, technique, or facility..."
                        className="w-full rounded-2xl border border-slate-700/80 bg-[#0a1224] py-4 pl-12 pr-4 text-sm text-slate-200 outline-none transition-colors placeholder:text-slate-500 focus:border-orange-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <p className="text-sm font-semibold text-slate-400">
                      {approvedCount} Approved Report{approvedCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
              </header>

              <section className="px-6 py-6 sm:px-8">
                {loading ? (
                  <div className="flex min-h-[360px] items-center justify-center">
                    <Activity className="animate-spin text-orange-500" />
                  </div>
                ) : filteredProjects.length > 0 ? (
                  <div className="rounded-[1.75rem] border border-slate-800/80 bg-[#070d1c] p-4 sm:p-6">
                    <div className="flex flex-col gap-4 border-b border-slate-800/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
                      

                      
                    </div>

                    <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-800/80 bg-[#060b17]">
                      <div className="table-scroll-region max-h-[68vh] overflow-auto">
                        <table className="min-w-[900px] w-full border-collapse text-left">
                          <thead className="sticky top-0 z-10 bg-[#0b1326]">
                            <tr className="border-b border-slate-800/80">
                              <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
                                Project Identity
                              </th>
                              <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
                                Last Updated
                              </th>
                              <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
                                Status
                              </th>
                              <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
                                Technique
                              </th>
                              <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
                                Client
                              </th>
                              <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
                                Facility
                              </th>
                              <th className="px-3 py-3 text-right text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
                                Action
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {filteredProjects.map((project) => (
                              <tr
                                key={project.id}
                                className="border-b border-slate-800/60 transition-colors hover:bg-white/[0.03]"
                              >
                                <td className="px-3 py-4 align-top">
                                  <div className="space-y-1">
                                    <p className="text-xs font-black uppercase text-white sm:text-sm">
                                      {project.projectName || "Untitled Project"}
                                    </p>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                      {project.projectId || "No Project ID"}
                                    </p>
                                  </div>
                                </td>

                                <td className="px-3 py-4 align-top">
                                  <p className="text-xs font-bold text-slate-200 sm:text-sm">
                                    {formatDateTime(getRowTimestamp(project))}
                                  </p>
                                  <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                                    Approved Record
                                  </p>
                                </td>

                                <td className="px-3 py-4 align-top">
                                  <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">
                                    {project.status || "Approved"}
                                  </span>
                                </td>

                                <td className="px-3 py-4 align-top">
                                  <p className="text-xs font-bold text-slate-200 sm:text-sm">
                                    {resolveTechnique(project)}
                                  </p>
                                  <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                                    Report Template
                                  </p>
                                </td>

                                <td className="px-3 py-4 align-top">
                                  <p className="text-xs font-bold uppercase text-slate-200 sm:text-sm">
                                    {project.clientName || "No Client"}
                                  </p>
                                </td>

                                <td className="px-3 py-4 align-top">
                                  <div className="flex items-center gap-2 text-slate-300">
                                    <MapPin size={14} className="shrink-0 text-orange-500/60" />
                                    <span className="text-xs font-medium sm:text-sm">
                                      {project.locationName || "No Facility"}
                                    </span>
                                  </div>
                                </td>

                                <td className="px-3 py-4 text-right align-top">
                                  <button
                                    onClick={() => navigate(`/report/download/${project.id}`)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500 px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-white transition-all hover:bg-orange-600"
                                  >
                                    <Download size={14} />
                                    Download PDF
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[1.75rem] border-2 border-dashed border-slate-800 bg-[#070d1c] px-6 py-16 text-center">
                    <ShieldAlert size={48} className="mb-4 text-slate-700" />
                    <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-500">
                      No Approved Reports Found
                    </p>
                    <p className="mt-3 max-w-md text-sm text-slate-400">
                      Once projects are approved, they will appear here with technique details and downloadable report packages.
                    </p>
                  </div>
                )}
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ApprovedProjects;
