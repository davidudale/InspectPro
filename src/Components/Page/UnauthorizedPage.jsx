import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-red-500/10 flex items-center justify-center rounded-full mb-6 border border-red-500/50">
        <ShieldAlert size={40} className="text-red-500" />
      </div>
      
      <h1 className="text-4xl font-bold text-white mb-2">Access Denied</h1>
      <p className="text-slate-400 max-w-md mb-8">
        Your current account credentials do not have the required clearance level to access this sector of the <strong>InspectProEdge</strong> portal.
      </p>

      <div className="flex gap-4">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-sm transition-all"
        >
          <ArrowLeft size={18} className="mr-2" /> Go Back
        </button>
        
        <button 
          onClick={() => navigate("/inspections")} 
          className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-sm transition-all"
        >
          Return to Dashboard
        </button>
      </div>
      
      <p className="mt-12 text-xs text-slate-600 uppercase tracking-[0.2em]">
        Security Protocol: Error 403 - Forbidden
      </p>
    </div>
  );
};

export default Unauthorized;
