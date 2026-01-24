import React, { useEffect, useState } from "react";
import AdminNavbar from "../../AdminNavbar";
import {
  PlusCircle,
  Edit2,
  Trash2,
  Clock,
  ChevronRight,
  FileSearch,
  Database,
  Tag,
  MapPin,
  Search,
  Filter,
  User,
  ExternalLink
} from "lucide-react";
import AdminSidebar from "../../AdminSidebar";
import { db } from "../../../Auth/firebase";
import { collection, onSnapshot, doc, deleteDoc, query, orderBy } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const InspectionLogs = () => {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, "inspections"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setInspections(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm(`CRITICAL: Permanently purge this technical manifest from the archives?`)) {
      try {
        await deleteDoc(doc(db, "inspections", id));
        toast.error("Record purged successfully");
      } catch (error) {
        toast.error("Deletion failed: Check permissions.");
      }
    }
  };

  // ADVANCED SEARCH LOGIC
  const filteredData = inspections.filter((batch) => {
    const searchStr = searchTerm.toLowerCase();
    const firstItem = batch.items?.[0] || {};
    
    return (
      firstItem.Client?.toLowerCase().includes(searchStr) ||
      firstItem.reference?.toLowerCase().includes(searchStr) ||
      firstItem.Report_No?.toLowerCase().includes(searchStr) ||
      batch.inspectorName?.toLowerCase().includes(searchStr) ||
      firstItem.Location?.toLowerCase().includes(searchStr)
    );
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <AdminNavbar />
      <div className="flex flex-1 relative">
        <AdminSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-4 lg:p-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-7xl mx-auto">
            
            {/* Header Section */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-8 gap-6">
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tighter uppercase">
                  Technical Archives
                </h1>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-1">
                  Database Management / Field Inspection Logs
                </p>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                {/* SEARCH BAR */}
                <div className="relative group min-w-[320px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-500 transition-colors" size={16} />
                  <input 
                    type="text"
                    placeholder="Search by Client, Tag, Report #..."
                    className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-xs focus:border-orange-500 outline-none transition-all backdrop-blur-md"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button
                  className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3.5 rounded-2xl font-bold uppercase text-[10px] tracking-widest transition-all shadow-xl shadow-orange-900/20 active:scale-95"
                  onClick={() => navigate("/admin/addInspectionTemp")}
                >
                  <PlusCircle size={16} />
                  New Manifest
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-40 flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-orange-500 border-r-2 border-r-transparent"></div>
                <p className="text-slate-500 font-mono text-[10px] uppercase tracking-[0.3em]">Querying Archive Nodes...</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="py-32 text-center text-slate-500 bg-slate-900/20 border border-dashed border-slate-800 rounded-[3rem]">
                <FileSearch className="mx-auto mb-4 opacity-10" size={64} />
                <p className="uppercase text-xs font-bold tracking-widest">No matching records found</p>
              </div>
            ) : (
              /* TABULAR INTERFACE */
              <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] overflow-hidden backdrop-blur-md shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/50">
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Technical Manifest</th>
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Location</th>
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Asset Details</th>
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Deployment</th>
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {filteredData.map((batch) => {
                        const main = batch.items?.[0] || {};
                        return (
                          <tr key={batch.id} className="group hover:bg-white/5 transition-colors">
                            <td className="p-6">
                              <div className="flex items-center gap-4">
                                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-orange-500 group-hover:border-orange-500/50 transition-colors">
                                  <Database size={18} />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-white uppercase tracking-tight">{main.Client || "N/A"}</p>
                                  <p className="text-[9px] font-mono text-slate-500 mt-0.5">{main.Report_No || "NO-REF"}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-6">
                              <div className="flex items-center gap-2 text-slate-300">
                                <MapPin size={14} className="text-slate-600" />
                                <span className="text-xs font-medium">{main.Location || "Remote"}</span>
                              </div>
                            </td>
                            <td className="p-6">
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                  <Tag size={12} className="text-orange-500" />
                                  <span className="text-xs font-mono text-slate-400">{main.reference}</span>
                                </div>
                                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                                  {batch.items?.length} TOTAL UNITS
                                </p>
                              </div>
                            </td>
                            <td className="p-6">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2 text-xs text-slate-300">
                                  <Clock size={12} className="text-slate-600" />
                                  {batch.timestamp?.toDate().toLocaleDateString() || "DRAFT"}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-orange-500/70 font-bold uppercase mt-1">
                                  <User size={10} /> {batch.inspectorName?.split(' ')[0]}
                                </div>
                              </div>
                            </td>
                            <td className="p-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => navigate(`/admin/edit-inspection/${batch.id}`)}
                                  className="p-2.5 bg-slate-950 border border-slate-800 text-slate-500 hover:text-blue-500 hover:border-blue-500/50 transition-all rounded-xl"
                                  title="Edit"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDelete(batch.id)}
                                  className="p-2.5 bg-slate-950 border border-slate-800 text-slate-500 hover:text-red-500 hover:border-red-500/50 transition-all rounded-xl"
                                  title="Purge"
                                >
                                  <Trash2 size={14} />
                                </button>
                                <button
                                  onClick={() => navigate(`/admin/inspection-details/${batch.id}`)}
                                  className="ml-2 p-2.5 bg-orange-600/10 border border-orange-500/20 text-orange-500 hover:bg-orange-600 hover:text-white transition-all rounded-xl"
                                  title="View Details"
                                >
                                  <ExternalLink size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Table Footer / Summary */}
                <div className="p-4 bg-slate-950/30 border-t border-slate-800 flex justify-between items-center">
                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.2em]">
                    Showing {filteredData.length} technical manifests
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Real-time sync active</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default InspectionLogs;