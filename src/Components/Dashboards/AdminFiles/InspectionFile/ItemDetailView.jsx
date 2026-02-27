import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../../Auth/firebase";
import { doc, getDoc } from "firebase/firestore";
import AdminNavbar from "../../AdminNavbar";
import AdminSidebar from "../../AdminSidebar";
import { 
  ArrowLeft, 
  Activity, 
  Tag, 
  ShieldCheck, 
  FilePlus, 
  Database,
  Info
} from "lucide-react";

const ItemDetailView = () => {
  const { docId, itemId } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [parentData, setParentData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItemDetails = async () => {
      try {
        const docRef = doc(db, "inspections", docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setParentData(data);
          // Find the specific item in the array using its unique ID
          const foundItem = data.items.find(i => i.id.toString() === itemId);
          setItem(foundItem);
        }
      } catch (error) {
        console.error("Error fetching technical data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchItemDetails();
  }, [docId, itemId]);

  if (loading) return (
    <div className="flex h-screen bg-slate-950 items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-orange-500"></div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <AdminNavbar />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-4 sm:p-6 lg:p-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-4xl mx-auto">
            
            <button 
              onClick={() => navigate(`/admin/inspection-details/${docId}`)}
              className="flex items-center gap-2 text-slate-500 hover:text-orange-500 mb-8 transition-colors group"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              Back to Manifest
            </button>

            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-md">
              {/* Header Banner */}
              <div className="bg-gradient-to-r from-orange-600/20 to-transparent p-8 border-b border-slate-800">
                <div className="flex items-center gap-4 mb-2">
                  <ShieldCheck className="text-orange-500" size={24} />
                  <span className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.3em]">Technical Specification</span>
                </div>
                <h1 className="text-4xl font-bold text-white tracking-tighter uppercase">{item?.type}</h1>
              </div>

              <div className="p-8 space-y-10">
                {/* Data Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <Tag size={14} /> Reference Identity
                    </label>
                    <p className="text-xl font-mono text-white bg-slate-950 p-4 rounded-2xl border border-slate-800">
                      {item?.reference}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <Database size={14} /> Parent Archive ID
                    </label>
                    <p className="text-sm font-mono text-slate-400 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50">
                      {docId}
                    </p>
                  </div>
                </div>

                {/* Status Section */}
                <div className="bg-slate-950/50 border border-slate-800 p-6 rounded-2xl flex items-start gap-4">
                  <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                    <Info size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Pre-Inspection Ready</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      This template has been verified and synchronized with the central database. 
                      Proceeding will initialize the 16-page AUT Corrosion Mapping report sequence.
                    </p>
                  </div>
                </div>

                {/* Primary Action */}
                <button 
                  onClick={() => navigate("/admin/create-report", { 
                    state: { 
                      preFill: { 
                        tag: item?.reference, 
                        type: item?.type 
                      } 
                    } 
                  })}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold uppercase tracking-[0.2em] py-5 rounded-2xl shadow-2xl shadow-orange-900/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  <FilePlus size={20} />
                  Initialize Full Report
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ItemDetailView;
