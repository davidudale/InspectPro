import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../../Auth/firebase";
import { 
  collection, addDoc, onSnapshot, query, orderBy, serverTimestamp 
} from "firebase/firestore";
import { 
  Shield, Building2, MapPin, Zap, Cog, Calendar, Briefcase, ArrowRight, Package, FileText
} from "lucide-react";
import AdminNavbar from "../../AdminNavbar";
import AdminSidebar from "../../AdminSidebar";
import { toast } from "react-toastify";
import { useAuth } from "../../../Auth/AuthContext";

const ProjectSetup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // --- Master Data State ---
  const [clients, setClients] = useState([]);
  const [locations, setLocations] = useState([]);
  const [inspectionTypes, setInspectionTypes] = useState([]);
  const [masterEquipment, setMasterEquipment] = useState([]);

  // --- Form State ---
  const [setupData, setSetupData] = useState({
    projectId: `PRJ-${Math.floor(1000 + Math.random() * 9000)}`,
    projectName: "",
    clientId: "",
    clientName: "",
    locationId: "",
    locationName: "",
    inspectionTypeId: "",
    inspectionTypeCode: "", // e.g. API 510
    selectedTechnique: "",   // Fetched from inspectionType.requiredTechniques
    equipmentId: "",
    equipmentTag: "",
    startDate: "",
    status: "Planned"
  });

  // --- 1. Real-time Multi-Directory Synchronization ---
  useEffect(() => {
    const unsubClients = onSnapshot(query(collection(db, "clients"), orderBy("name", "asc")), 
      (snap) => setClients(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const unsubLocs = onSnapshot(query(collection(db, "locations"), orderBy("name", "asc")), 
      (snap) => setLocations(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const unsubTypes = onSnapshot(query(collection(db, "inspection_types"), orderBy("title", "asc")), 
      (snap) => setInspectionTypes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const unsubEquip = onSnapshot(query(collection(db, "equipment"), orderBy("tagNumber", "asc")), 
      (snap) => setMasterEquipment(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubClients(); unsubLocs(); unsubTypes(); unsubEquip(); };
  }, []);

  // --- 2. Filter Logic ---
  // Only show locations belonging to the selected client
  const availableLocations = locations.filter(loc => loc.clientId === setupData.clientId);
  
  // Fetch techniques from the selected Inspection Protocol
  const selectedProtocol = inspectionTypes.find(t => t.id === setupData.inspectionTypeId);
  const authorizedTechniques = selectedProtocol?.requiredTechniques || [];

  // --- 3. Submission Logic ---
  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!setupData.projectName || !setupData.clientId || !setupData.selectedTechnique) {
      return toast.warn("Project setup requires a Name, Client, and Technical Technique.");
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "projects"), {
        ...setupData,
        createdBy: user?.uid,
        createdAt: serverTimestamp(),
      });
      toast.success("Operational Manifest Deployed");
      navigate("/admin/projects");
    } catch (error) {
      toast.error("Deployment Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <AdminNavbar />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-6xl mx-auto">
            
            <header className="mb-10 flex justify-between items-end border-b border-slate-900 pb-8">
              <div>
                <h1 className="text-3xl font-bold uppercase tracking-tighter flex items-center gap-3 text-white">
                  <Shield className="text-orange-500" /> Project Setup
                </h1>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">
                   Reference ID: {setupData.projectId}
                </p>
              </div>
            </header>

            <form onSubmit={handleCreateProject} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                
                {/* 1. IDENTITY & CLIENT */}
                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] backdrop-blur-md">
                  <h2 className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                    <Building2 size={14}/> 1. Client & Project Identity
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Registered Client</label>
                      <select 
                        required 
                        className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm outline-none focus:border-orange-500 text-white cursor-pointer"
                        value={setupData.clientId}
                        onChange={(e) => {
                          const selected = clients.find(c => c.id === e.target.value);
                          setSetupData({...setupData, clientId: e.target.value, clientName: selected?.name || "", locationId: ""});
                        }}
                      >
                        <option value="">Choose Client...</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Project Manifest Name</label>
                      <input required className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white focus:border-orange-500 outline-none"
                        value={setupData.projectName}
                        onChange={(e) => setSetupData({...setupData, projectName: e.target.value})}
                        placeholder="e.g. Tank 01 Annual NDT"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. TECHNIQUE SELECTION (FETCHED FROM INSPECTION_TYPES) */}
                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem]">
                   <h2 className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                     <FileText size={14}/> 2. Technical Report Technique
                   </h2>
                   <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Select NDE Technique</label>
                      <select 
                        required 
                        disabled={!setupData.inspectionTypeId}
                        className={`w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm outline-none focus:border-orange-500 text-white cursor-pointer ${!setupData.inspectionTypeId && 'opacity-30'}`}
                        value={setupData.selectedTechnique}
                        onChange={(e) => setSetupData({...setupData, selectedTechnique: e.target.value})}
                      >
                        <option value="">{setupData.inspectionTypeId ? "Select Authorized Technique..." : "Select Protocol in Sidebar First"}</option>
                        {authorizedTechniques.map((tech, index) => (
                          <option key={index} value={tech}>{tech}</option>
                        ))}
                      </select>
                      {!setupData.inspectionTypeId && (
                         <p className="text-[8px] text-slate-600 mt-2 italic">* Available techniques populate after selecting an Inspection Protocol (sidebar).</p>
                      )}
                   </div>
                </div>

                {/* 3. ASSET INTEGRITY */}
                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem]">
                   <h2 className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                     <Package size={14}/> 3. Asset Integrity Selection
                   </h2>
                   <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Select Target Asset</label>
                      <select 
                        required 
                        className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm outline-none focus:border-orange-500 text-white cursor-pointer"
                        value={setupData.equipmentId}
                        onChange={(e) => {
                          const selected = masterEquipment.find(eq => eq.id === e.target.value);
                          setSetupData({...setupData, equipmentId: e.target.value, equipmentTag: selected?.tagNumber || ""});
                        }}
                      >
                        <option value="">Choose Asset Tag...</option>
                        {masterEquipment.map(eq => (
                          <option key={eq.id} value={eq.id}>{eq.tagNumber} — {eq.assetType}</option>
                        ))}
                      </select>
                   </div>
                </div>
              </div>

              {/* SIDEBAR LOGISTICS */}
              <div className="space-y-6">
                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] space-y-6 shadow-xl">
                   <h2 className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Zap size={14}/> 4. Standards & Date
                   </h2>
                   
                   <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Inspection Protocol</label>
                      <select required className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm outline-none focus:border-orange-500 text-white" 
                        value={setupData.inspectionTypeId}
                        onChange={(e) => {
                          const selected = inspectionTypes.find(t => t.id === e.target.value);
                          setSetupData({
                            ...setupData, 
                            inspectionTypeId: e.target.value, 
                            inspectionTypeCode: selected?.title || "",
                            selectedTechnique: "" // Reset technique if protocol changes
                          });
                        }}>
                        <option value="">Select Code...</option>
                        {inspectionTypes.map(t => <option key={t.id} value={t.id}>{t.title} — {t.fullName}</option>)}
                      </select>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Linked Facility</label>
                      <select 
                        required 
                        disabled={!setupData.clientId}
                        className={`w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm outline-none focus:border-orange-500 text-white ${!setupData.clientId && 'opacity-30'}`}
                        value={setupData.locationId}
                        onChange={(e) => {
                          const selected = locations.find(l => l.id === e.target.value);
                          setSetupData({...setupData, locationId: e.target.value, locationName: selected?.name || ""});
                        }}
                      >
                        <option value="">Select Facility...</option>
                        {availableLocations.map(l => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </select>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Commencement Date</label>
                      <input type="date" required className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white focus:border-orange-500 outline-none shadow-inner"
                        value={setupData.startDate}
                        onChange={(e) => setSetupData({...setupData, startDate: e.target.value})}
                      />
                   </div>
                </div>

                <button disabled={isSubmitting} type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white py-5 rounded-[2rem] font-bold uppercase text-[10px] tracking-[0.3em] flex items-center justify-center gap-3 transition-all shadow-2xl active:scale-95 disabled:opacity-50">
                  {isSubmitting ? "Syncing Directories..." : "Deploy Project"} <ArrowRight size={16}/>
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProjectSetup;