import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../../Auth/firebase";
import { 
  collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, where 
} from "firebase/firestore";
import { 
  Shield, Building2, MapPin, Zap, Cog, Calendar, Briefcase, ArrowRight, Package, FileText, UserCheck
} from "lucide-react";
import AdminNavbar from "../../AdminNavbar";
import AdminSidebar from "../../AdminSidebar";
import { toast } from "react-toastify";
import { useAuth } from "../../../Auth/AuthContext";

const ProjectSetup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // --- Master Directory State ---
  const [clients, setClients] = useState([]);
  const [locations, setLocations] = useState([]);
  const [inspectionTypes, setInspectionTypes] = useState([]);
  const [masterEquipment, setMasterEquipment] = useState([]);
  const [inspectors, setInspectors] = useState([]); 

  // --- Consolidated Project Manifest State ---
  const [setupData, setSetupData] = useState({
    projectId: `PRJ-${Math.floor(1000 + Math.random() * 9000)}`,
    projectName: "",
    clientId: "",
    clientName: "",
    locationId: "",
    locationName: "",
    inspectionTypeId: "",
    inspectionTypeCode: "", 
    selectedTechnique: "",   
    equipmentId: "",
    equipmentTag: "",
    equipmentCategory: "",
    inspectorId: "",        
    inspectorName: "",      
    startDate: "",
    status: "Forwarded to Inspector" // Status updated for workflow
  });

  // --- 1. Real-time Synchronization across all Management Modules ---
  useEffect(() => {
    const unsubClients = onSnapshot(query(collection(db, "clients"), orderBy("name", "asc")), 
      (snap) => setClients(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const unsubLocs = onSnapshot(query(collection(db, "locations"), orderBy("name", "asc")), 
      (snap) => setLocations(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const unsubTypes = onSnapshot(query(collection(db, "inspection_types"), orderBy("title", "asc")), 
      (snap) => setInspectionTypes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const unsubEquip = onSnapshot(query(collection(db, "equipment"), orderBy("tagNumber", "asc")), 
      (snap) => setMasterEquipment(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    // Sync qualified Inspectors from Users Management
    const unsubInspectors = onSnapshot(query(collection(db, "users")), 
      (snap) => setInspectors(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubClients(); unsubLocs(); unsubTypes(); unsubEquip(); unsubInspectors(); };
  }, []);

  // --- 2. Relationship Filter Logic ---
  const availableLocations = locations.filter(loc => loc.clientId === setupData.clientId);
  const selectedProtocol = inspectionTypes.find(t => t.id === setupData.inspectionTypeId);
  const authorizedTechniques = selectedProtocol?.requiredTechniques || [];

  // --- 3. Submission & Forwarding Logic ---
  const handleCreateProject = async (e) => {
    e.preventDefault();
    // DEBUGGING: Log to see what is missing
  console.log("Validation Check:", {
    name: setupData.projectName,
    client: setupData.clientId,
    inspector: setupData.inspectorId,
    equipment: setupData.equipmentId
  });

  if (!setupData.projectName || !setupData.clientId || !setupData.inspectorId || !setupData.equipmentId) {
     if(!setupData.projectName) toast.error("Project Name is missing");
     if(!setupData.clientId) toast.error("Client is missing");
     if(!setupData.inspectorId) toast.error("Inspector is missing");
     if(!setupData.equipmentId) toast.error("Asset is missing");
     return;
  }
    if (!setupData.projectName || !setupData.clientId || !setupData.inspectorId || !setupData.equipmentId) {
      return toast.warn("Incomplete Manifest: Please ensure Client, Asset, and Inspector are assigned.");
    }

    setIsSubmitting(true);
    try {
      // Save project to central repository for the inspector to pick up
      await addDoc(collection(db, "projects"), {
        ...setupData,
        adminId: user?.uid,
        adminName: user?.displayName || "System Admin",
        deploymentDate: serverTimestamp(),
      });
      
      toast.success(`Project Forwarded to ${setupData.inspectorName}`);
      navigate("/admin/projects");
    } catch (error) {
      toast.error("Forwarding Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <AdminNavbar />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-8 bg-slate-950">
          <div className="max-w-6xl mx-auto">
            
            <header className="mb-10 border-b border-slate-900 pb-8">
              <h1 className="text-3xl font-bold uppercase tracking-tighter flex items-center gap-3 text-white">
                <Shield className="text-orange-500" /> Project Deployment
              </h1>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">
                 Global Traceability ID: {setupData.projectId}
              </p>
            </header>

            <form onSubmit={handleCreateProject} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                
                {/* SECTION 1: CLIENT & FACILITY (LINKED) */}
                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] backdrop-blur-md">
                  <h2 className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                    <Building2 size={14}/> 1. Client & Facility Assignment
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Registered Client</label>
                      <select required className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white"
                        value={setupData.clientId}
                        onChange={(e) => {
                          const selected = clients.find(c => c.id === e.target.value);
                          setSetupData({...setupData, clientId: e.target.value, clientName: selected?.name || "", locationId: ""});
                        }}>
                        <option value="">Select Client...</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">
    Project Manifest Name
  </label>
  <input 
    required 
    className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white focus:border-orange-500 outline-none"
    placeholder="e.g. Tank 01 Annual NDT"
    // CRITICAL: Bind the value to state
    value={setupData.projectName} 
    // CRITICAL: Update state on every keystroke
    onChange={(e) => setSetupData({ ...setupData, projectName: e.target.value })} 
  />
</div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Linked Facility/Location</label>
                      <select required disabled={!setupData.clientId}
                        className={`w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white ${!setupData.clientId && 'opacity-30'}`}
                        value={setupData.locationId}
                        onChange={(e) => {
                          const selected = locations.find(l => l.id === e.target.value);
                          setSetupData({...setupData, locationId: e.target.value, locationName: selected?.name || ""});
                        }}>
                        <option value="">Select Facility...</option>
                        {availableLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: ASSET MANAGEMENT INTEGRATION */}
                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem]">
                   <h2 className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                     <Package size={14}/> 2. Target Asset Identification
                   </h2>
                   <select required className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white cursor-pointer"
                    value={setupData.equipmentId}
                    onChange={(e) => {
                      const selected = masterEquipment.find(eq => eq.id === e.target.value);
                      setSetupData({...setupData, equipmentId: e.target.value, equipmentTag: selected?.tagNumber || "", equipmentCategory: selected?.assetType || ""});
                    }}>
                    <option value="">Assign Asset Tag...</option>
                    {masterEquipment.map(eq => (
                      <option key={eq.id} value={eq.id}>{eq.tagNumber} — {eq.assetType}</option>
                    ))}
                  </select>
                </div>

                {/* SECTION 3: INSPECTOR ASSIGNMENT (USER MANAGEMENT) */}
                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] backdrop-blur-md">
                  <h2 className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                    <UserCheck size={14}/> 3. Field Inspector Assignment
                  </h2>
                  <select required className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white"
                    value={setupData.inspectorId}
                    onChange={(e) => {
                      const selected = inspectors.find(ins => ins.id === e.target.value);
                      setSetupData({...setupData, inspectorId: e.target.value, inspectorName: selected?.fullName || selected?.displayName || "Technical Resource"});
                    }}>
                    <option value="">Choose Assigned Inspector...</option>
                    {inspectors.map(ins => (
                      <option key={ins.id} value={ins.id}>{ins.name || ins.displayName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SIDEBAR: TECHNICAL STANDARDS & DEPLOYMENT */}
              <div className="space-y-6">
                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] space-y-6 shadow-xl">
                   <h2 className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Zap size={14}/> 4. Inspection Protocol
                   </h2>
                   
                   <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Inspection Code</label>
                      <select required className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white" 
                        value={setupData.inspectionTypeId}
                        onChange={(e) => {
                          const selected = inspectionTypes.find(t => t.id === e.target.value);
                          setSetupData({
                            ...setupData, 
                            inspectionTypeId: e.target.value, 
                            inspectionTypeCode: selected?.title || "",
                            selectedTechnique: "" 
                          });
                        }}>
                        <option value="">Select Code...</option>
                        {inspectionTypes.map(t => <option key={t.id} value={t.id}>{t.title} — {t.fullName}</option>)}
                      </select>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Specific Technique</label>
                      <select required disabled={!setupData.inspectionTypeId}
                        className={`w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white ${!setupData.inspectionTypeId && 'opacity-30'}`}
                        value={setupData.selectedTechnique}
                        onChange={(e) => setSetupData({...setupData, selectedTechnique: e.target.value})}>
                        <option value="">Select Technique...</option>
                        {authorizedTechniques.map((tech, index) => (
                          <option key={index} value={tech}>{tech}</option>
                        ))}
                      </select>
                   </div>

                   <div className="space-y-2 pt-4 border-t border-slate-800">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Schedule Start</label>
                      <input type="date" required className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white focus:border-orange-500 outline-none"
                        value={setupData.startDate}
                        onChange={(e) => setSetupData({...setupData, startDate: e.target.value})}
                      />
                   </div>
                </div>

                <button disabled={isSubmitting} type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white py-6 rounded-[2.5rem] font-bold uppercase text-[11px] tracking-[0.3em] flex items-center justify-center gap-3 transition-all shadow-2xl active:scale-95 disabled:opacity-50">
                  {isSubmitting ? "Syncing Modules..." : "Forward to Inspector"} <ArrowRight size={18}/>
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