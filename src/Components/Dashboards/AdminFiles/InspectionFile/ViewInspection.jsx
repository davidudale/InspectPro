import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../../Auth/firebase";
import { doc, getDoc } from "firebase/firestore";
import AdminNavbar from "../../AdminNavbar";
import AdminSidebar from "../../AdminSidebar";
import {
  ArrowLeft,
  Clock,
  User,
  Activity,
  Hash,
  ShieldCheck,
  ChevronRight,
  Database,
  MapPin,
  Building2,
  Lock
} from "lucide-react";

const ViewInspection = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const docRef = doc(db, "inspections", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setData(docSnap.data());
        } else {
          console.log("Archive not found");
        }
      } catch (error) {
        console.error("Error fetching manifest:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-950 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <AdminNavbar />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-4 lg:p-8 min-h-[calc(100vh-65px)] bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-5xl mx-auto">
            
            {/* Navigation Header */}
            <button
              onClick={() => navigate("/admin/inspections")}
              className="flex items-center gap-2 text-slate-500 hover:text-orange-500 mb-8 transition-colors group"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              Return to Reports 
            </button>

            {/* Batch Manifest Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 bg-slate-900/20 p-6 rounded-3xl border border-slate-800">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-orange-600/10 rounded-2xl border border-orange-600/20 text-orange-500 shadow-lg shadow-orange-900/10">
                  <Database size={32} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white tracking-tight uppercase">
                    Reports ID: <span className="text-orange-500">{id.substring(0, 8)}</span>
                  </h1>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-xs font-mono text-slate-500 uppercase tracking-widest">
                    <span className="flex items-center gap-1.5"><Clock size={14} /> {data?.timestamp?.toDate().toLocaleString()}</span>
                    <span className="flex items-center gap-1.5"><User size={14} /> Created By: {data?.inspectorName}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Item List */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500 mb-4 px-2">
                Available Inspection Templates
              </h2>

              {data?.items?.map((item, index) => {
                // Condition: Check inspection method from manifest [cite: 18, 19]
                const isAUT = item.type.includes("AUT");
                const isManualUT = item.type.includes("Manual UT") || item.type.includes("MUT");
                const isSupported = isAUT || isManualUT;

                return (
                  <div
                    key={index}
                    className={`bg-slate-900/40 border border-slate-800 p-6 rounded-3xl backdrop-blur-sm flex flex-col lg:flex-row lg:items-center justify-between group transition-all relative overflow-hidden ${
                      isSupported ? "hover:border-orange-500/30 cursor-pointer" : "opacity-60 cursor-not-allowed"
                    }`}
                    onClick={() => {
                      if (isAUT) {
                        // 16-Page Comprehensive AUT Report 
                        navigate("/admin/aut-report", {
                          state: {
                            preFill: {
                              tag: item.reference,
                              type: item.type,
                              client: item.Client,
                              location: item.Location,
                              equipment: item.Equipment,
                              reportNo: item.Report_No,
                              testCode: item.Test_Code,
                              criteria: item.Acceptance_Criteria
                            },
                          },
                        });
                      } else if (isManualUT) {
                        // Simplified 1-Page Manual UT Report 
                        navigate("/admin/manual-ut-report", {
                          state: {
                            preFill: {
                              tag: item.reference,
                              type: item.type,
                              client: item.Client,
                              location: item.Location,
                              equipment: item.Equipment,
                              reportNo: item.Report_No,
                              testCode: item.Test_Code
                            },
                          },
                        });
                      }
                    }}
                  >
                    <div className="flex items-center gap-6 mb-4 lg:mb-0">
                      <div className={`flex flex-col items-center justify-center h-14 w-14 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-sm transition-colors ${
                        isSupported ? "text-slate-500 group-hover:border-orange-500/50 group-hover:text-orange-500" : "text-slate-700"
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          {isSupported ? <Activity size={18} className="text-orange-500" /> : <Lock size={18} className="text-slate-600" />}
                          <h3 className="text-white font-bold text-xl uppercase tracking-tight">
                            {item.type}
                          </h3>
                          <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[10px] font-bold text-slate-500">
                            {item.Test_Code || "API 510"}
                          </span>
                        </div>
                        
                        {/* Technical Detail Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 mt-2">
                          <p className="text-slate-400 flex items-center gap-2 text-xs">
                            <Building2 size={12} className="text-slate-600" />
                            Client: <span className="text-slate-200">{item.Client}</span>
                          </p>
                          <p className="text-slate-400 flex items-center gap-2 text-xs">
                            <MapPin size={12} className="text-slate-600" />
                            Location: <span className="text-slate-200">{item.Location}</span>
                          </p>
                          <p className="text-slate-400 flex items-center gap-2 text-xs">
                            <Hash size={12} className="text-slate-600" />
                            Tag: <span className="text-slate-200 font-mono">{item.reference}</span>
                          </p>
                          <p className="text-slate-400 flex items-center gap-2 text-xs">
                            <ShieldCheck size={12} className="text-slate-600" />
                            Equipment: <span className="text-slate-200">{item.Equipment}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end border-t border-slate-800 mt-4 pt-4 lg:border-none lg:mt-0 lg:pt-0">
                      <button
                        className={`px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${
                          isSupported 
                            ? "bg-orange-600/10 text-orange-500 hover:bg-orange-600 hover:text-white group-hover:shadow-lg group-hover:shadow-orange-900/20" 
                            : "bg-slate-800 text-slate-600 cursor-not-allowed"
                        }`}
                      >
                        {isSupported ? "Initialize Report" : "Method Locked"} 
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ViewInspection;