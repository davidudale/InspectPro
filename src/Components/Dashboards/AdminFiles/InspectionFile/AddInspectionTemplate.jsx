import React, { useState } from "react";
import AdminNavbar from "../../AdminNavbar";
import AdminSidebar from "../../AdminSidebar";
import { db } from "../../../Auth/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../Auth/AuthContext";
import { toast } from "react-toastify";
import {
  ClipboardCheck,
  ArrowLeft,
  Save,
  AlertTriangle,
  Activity,
  Tag,
} from "lucide-react";

const AddInspectionTemplate = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    inspectionType: "",
    department: "",
    inspectionRef: "",
    status: "Functional",
    
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Log the inspection to Firestore
      await addDoc(collection(db, "inspections"), {
        ...formData,
        inspectorName: user?.name || "Unknown Admin",
        inspectorId: user?.uid,
        timestamp: serverTimestamp(),
      });

      toast.success("Inspection Archive Created");
      navigate("/admin/inspections");
    } catch (error) {
      console.error(error);
      toast.error("System Error: Could not save log.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <AdminNavbar />
      <div className="flex flex-1 relative">
        <AdminSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-4 lg:p-8 min-h-[calc(100vh-65px)] overflow-y-auto bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-3xl mx-auto">
            {/* Navigation Header */}
            <button
              onClick={() => navigate("/admin/inspections")}
              className="flex items-center gap-2 text-slate-500 hover:text-orange-500 mb-6 transition-colors group"
            >
              <ArrowLeft
                size={18}
                className="group-hover:-translate-x-1 transition-transform"
              />
              Back to Inspection Template View
            </button>

            <div className="flex items-center gap-4 mb-10">
              <div className="p-3 bg-orange-600/20 rounded-2xl border border-orange-500/20">
                <ClipboardCheck className="text-orange-500" size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight uppercase">
                  New Inspection Template View
                </h1>
                <p className="text-slate-500 text-sm">
                  Add New Inspection Template.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Primary Info Card */}
              <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl backdrop-blur-sm space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                      <Activity size={14} /> Inspection Type
                    </label>
                    <select
                     
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          inspectionType: e.target.value,
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-orange-500 outline-none transition-all placeholder:text-slate-700"
                    >
                      <option value="AUT">AUT</option>
                      <option value="DRT">DRT</option>
                      <option value="Sump Tank">Sump Tank</option>
                     
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                      <Tag size={14} /> Inspection Reference
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g., INSPECTION-01"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-orange-500 outline-none transition-all placeholder:text-slate-700"
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          inspectionRef: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

               
              </div>

              {/* Technical Details Card */}
             {/* <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl backdrop-blur-sm space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 text-center">
                    Technical Reading (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 85% Efficiency / 400V / 22°C"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-orange-500 outline-none transition-all placeholder:text-slate-700 text-center font-mono"
                    onChange={(e) =>
                      setFormData({ ...formData, reading: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                    Assistant Observations
                  </label>
                  <textarea
                    rows="4"
                    placeholder="Enter detailed notes regarding equipment performance..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-orange-500 outline-none transition-all resize-none placeholder:text-slate-700"
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                  />
                </div>
              </div>*/}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-800 text-white font-bold uppercase tracking-[0.2em] py-4 rounded-2xl shadow-xl shadow-orange-900/20 transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Save size={18} />
                    Add Template 
                  </>
                )}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AddInspectionTemplate;
