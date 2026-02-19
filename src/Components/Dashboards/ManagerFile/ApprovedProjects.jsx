import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../Auth/firebase";
import {
  collection,
  onSnapshot,
  query,
  doc,
  where,
} from "firebase/firestore";
import {
  Briefcase,
  Search,
  MapPin,
  ShieldAlert,
  Activity,
  FileText, // Added for Download icon
  Download, // Added for Download icon
} from "lucide-react";

import { toast } from "react-toastify";
import { useAuth } from "../../Auth/AuthContext";
import ManagerNavbar from "../ManagerFile/ManagerNavbar";
import ManagerSidebar from "../ManagerFile/ManagerSidebar";

const ApprovedProjects = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    let q;

    if (user?.role === "Manager" || user?.role === "Admin") {
      q = query(collection(db, "projects"), where("status", "==", "Approved"));
    } else {
      q = query(
        collection(db, "projects"),
        where("supervisorId", "==", user.uid),
        where("status", "==", "Approved")
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProjects(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredProjects = projects.filter(
    (p) =>
      p.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.projectId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <ManagerNavbar />
      <div className="flex flex-1">
        <ManagerSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-8 bg-slate-950">
          <div className="max-w-7xl mx-auto">
            <header className="flex flex-col xl:flex-row xl:items-center justify-between mb-10 gap-6">
              <div>
                <h1 className="text-3xl font-bold uppercase tracking-tighter text-white flex items-center gap-3">
                  <Briefcase className="text-orange-500" /> Approved Reports
                </h1>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">
                  Archived & Finalized Technical Documents
                </p>
              </div>

              <div className="relative w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                <input
                  type="text"
                  placeholder="Search approved projects..."
                  className="w-full bg-slate-900/50 border border-slate-800 p-4 pl-12 rounded-2xl text-xs focus:border-orange-500 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </header>

            {loading ? (
              <div className="flex justify-center py-20"><Activity className="animate-spin text-orange-500" /></div>
            ) : filteredProjects.length > 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] overflow-hidden backdrop-blur-md shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/50">
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Project Identity</th>
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Client</th>
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Facility</th>
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {filteredProjects.map((project) => (
                        <tr key={project.id} className="group hover:bg-white/5 transition-colors">
                          <td className="p-6">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-emerald-500 shadow-inner">
                                <FileText size={18} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white uppercase">{project.projectName}</p>
                                <p className="text-[9px] font-mono text-slate-500 uppercase">{project.projectId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-6 text-xs text-slate-300 font-semibold uppercase">{project.clientName}</td>
                          <td className="p-6">
                            <div className="flex items-center gap-2 text-slate-400">
                              <MapPin size={14} className="text-orange-500/50" />
                              <span className="text-xs font-medium">{project.locationName}</span>
                            </div>
                          </td>
                          <td className="p-6 text-right">
                            {/* DOWNLOAD BUTTON */}
                            <button
                              onClick={() => navigate(`/report/download/${project.id}`)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex-inline items-center gap-2"
                            >
                              <Download size={14} className="inline mr-1" /> Download PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-slate-800 rounded-[3rem] bg-slate-900/10">
                <ShieldAlert size={48} className="text-slate-800 mb-4" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">No Approved Reports Found</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ApprovedProjects;