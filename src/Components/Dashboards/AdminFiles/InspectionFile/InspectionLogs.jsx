import React, { useEffect, useState } from "react";
import AdminNavbar from "../../AdminNavbar";
import { 
  PlusCircle, 
  Edit2, 
  Trash2, 
  Folder, 
  Clock, 
  ChevronRight, 
  FileSearch 
} from "lucide-react";
import AdminSidebar from "../../AdminSidebar";
import { db } from "../../../Auth/firebase"; 
import { collection, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const InspectionLogs = () => {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Real-time listener for inspections
    const insCollection = collection(db, "inspections");
    const unsubscribe = onSnapshot(insCollection, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setInspections(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (id, name) => {
    if (window.confirm(`Permanently remove inspection log for ${name}?`)) {
      try {
        await deleteDoc(doc(db, "inspections", id));
        toast.success("Record purged successfully");
      } catch (error) {
        toast.error("Access denied: Could not delete record.");
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <AdminNavbar />
      <div className="flex flex-1 relative">
        <AdminSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-4 lg:p-8 min-h-[calc(100vh-65px)] overflow-y-auto bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-7xl mx-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-10">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight uppercase">
                  Inspection Templates
                </h1>
                <p className="text-slate-500 text-sm mt-1">Folders containing all system inspection Template metrics.</p>
              </div>
              <button 
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-orange-900/20 active:scale-95" 
                onClick={() => navigate("/admin/new-inspection")} 
              >
                <PlusCircle size={18} />
                New Inspection Template
              </button>
            </div>

            {loading ? (
              <div className="p-20 flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-orange-500"></div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">Loading Inspection Templates...</p>
              </div>
            ) : inspections.length === 0 ? (
              <div className="p-20 text-center text-slate-500 bg-slate-900/20 border border-dashed border-slate-800 rounded-3xl">
                <FileSearch className="mx-auto mb-4 opacity-10" size={64} />
                <p>No archived inspections found.</p>
              </div>
            ) : (
              /* Folder Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {inspections.map((item) => (
                  <div 
                    key={item.id} 
                    className="group relative bg-slate-900/40 border border-slate-800 p-5 rounded-2xl hover:bg-slate-900/60 transition-all border-t-4 border-t-orange-600/50"
                  >
                    {/* Folder Icon & Status Dot */}
                    <div className="flex justify-between items-start mb-6">
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-orange-500 group-hover:scale-110 transition-transform">
                        <Folder size={24} fill="currentColor" fillOpacity={0.1} />
                      </div>
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        item.status === 'Critical' ? 'text-red-500 bg-red-500/10' : 'text-emerald-500 bg-emerald-500/10'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'Critical' ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                        {item.status}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="mb-6">
                      <h3 className="text-white font-bold text-lg truncate mb-1">{item.inspectionRef}</h3>
                      <p className="text-slate-500 text-xs font-mono uppercase">{item.projectTag}</p>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400 text-[11px] mb-6">
                      <Clock size={14} />
                      <span>{item.timestamp?.toDate().toLocaleDateString() || 'Recent'}</span>
                    </div>

                    {/* Actions Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
                      <div className="flex gap-1">
                        <button 
                          onClick={() => navigate(`/admin/edit-inspection/${item.id}`)}
                          className="p-2 text-slate-500 hover:text-white transition-colors hover:bg-slate-800 rounded-lg"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id, item.equipmentName)}
                          className="p-2 text-slate-500 hover:text-red-500 transition-colors hover:bg-slate-800 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <button 
                        className="text-orange-500 flex items-center gap-1 text-xs font-bold uppercase tracking-widest hover:gap-2 transition-all"
                      >
                        Details <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default InspectionLogs;