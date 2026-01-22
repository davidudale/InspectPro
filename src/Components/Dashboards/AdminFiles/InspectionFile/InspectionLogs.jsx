import React, { useEffect, useState } from "react";
import AdminNavbar from "../../AdminNavbar";
import {
  PlusCircle,
  Edit2,
  Trash2,
  Folder,
  Clock,
  ChevronRight,
  FileSearch,
  Database,
  Layers
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
    // Real-time listener for the batch inspections collection
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

  const handleDelete = async (id, refName) => {
    if (window.confirm(`Permanently remove inspection?`)) {
      try {
        await deleteDoc(doc(db, "inspections", id));
        toast.success("Inspection removed successfully");
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
                  Report Archives
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                  Manage Report and Report templates.
                </p>
              </div>
              <button
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-orange-900/20 active:scale-95"
                onClick={() => navigate("/admin/addInspectionTemp")}
              >
                <PlusCircle size={18} />
                New Report Template
              </button>
            </div>

            {loading ? (
              <div className="p-20 flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-orange-500"></div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">
                  Loading Report...
                </p>
              </div>
            ) : inspections.length === 0 ? (
              <div className="p-20 text-center text-slate-500 bg-slate-900/20 border border-dashed border-slate-800 rounded-3xl">
                <FileSearch className="mx-auto mb-4 opacity-10" size={64} />
                <p>No Report found...</p>
              </div>
            ) : (
              /* Folder Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {inspections.map((batch) => (
                  <div
                    key={batch.id}
                    className="group relative bg-slate-900/40 border border-slate-800 p-5 rounded-2xl hover:bg-slate-900/60 transition-all border-t-4 border-t-orange-600/50 shadow-xl"
                  >
                    {/* Folder Icon & Count Badge */}
                    <div className="flex justify-between items-start mb-6">
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-orange-500 group-hover:scale-110 transition-transform">
                        <Folder
                          size={24}
                          fill="currentColor"
                          fillOpacity={0.1}
                        />
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-500 border border-orange-500/20">
                        <Layers size={12} />
                        {batch.items?.length || 0} Items
                      </div>
                    </div>

                    {/* Metadata - Showing info from the first item in the batch */}
                    <div className="mb-6">
                      <h3 className="text-white font-bold text-lg truncate mb-1">
                        {batch.items?.[0]?.Client || "Unknown Client"}
                      </h3>
                      <p className="text-slate-500 text-[10px] font-mono uppercase tracking-tighter truncate">
                         LOC: {batch.items?.[0]?.Location || "Not Set"}
                      </p>
                      <p className="text-orange-500/80 text-[10px] font-bold uppercase mt-2">
                        Ref: {batch.items?.[0]?.reference || "No Ref"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400 text-[11px] mb-6 border-y border-slate-800/50 py-3">
                      <Clock size={14} />
                      <span className="flex-1">
                        {batch.timestamp?.toDate().toLocaleDateString() || "Draft"}
                      </span>
                      <span className="text-slate-600">|</span>
                      <span className="truncate max-w-[80px]">{batch.inspectorName.split(' ')[0]}</span>
                    </div>

                    {/* Actions Footer */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => navigate(`/admin/edit-inspection/${batch.id}`)}
                          className="p-2 text-slate-500 hover:text-white transition-colors hover:bg-slate-800 rounded-lg"
                          title="Edit Manifest"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(batch.id)}
                          className="p-2 text-slate-500 hover:text-red-500 transition-colors hover:bg-slate-800 rounded-lg"
                          title="Delete Batch"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <button
                        className="text-orange-500 flex items-center gap-1 text-xs font-bold uppercase tracking-widest hover:gap-2 transition-all"
                        onClick={() => navigate(`/admin/inspection-details/${batch.id}`)}
                      >
                        View <ChevronRight size={14} />
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