import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../../Auth/firebase";
import { 
  collection, addDoc, getDocs, onSnapshot, 
  query, orderBy, where, serverTimestamp 
} from "firebase/firestore";
import { 
  Settings, Users, MapPin, Calendar, Briefcase, 
  ArrowRight, XCircle, Shield, Building2, Zap, Cog,
  Navigation, Globe, Package
} from "lucide-react";
import AdminNavbar from "../../AdminNavbar";
import AdminSidebar from "../../AdminSidebar";
import { toast } from "react-toastify";
import { useAuth } from "../../../Auth/AuthContext";

const ProjectSetup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // --- Master Data Directories ---
  const [availableUsers, setAvailableUsers] = useState([]);
  const [registeredClients, setRegisteredClients] = useState([]);
  const [registeredLocations, setRegisteredLocations] = useState([]);
  const [inspectionTypes, setInspectionTypes] = useState([]);
  const [availableEquipment, setAvailableEquipment] = useState([]);

  // --- Unified Manifest State ---
  const [setupData, setSetupData] = useState({
    projectId: `PROJ-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    projectName: "",
    inspectionType: "",
    inspectionTypeRef: null, // Full standard data
    client: "",
    clientLogo: "",
    clientData: null, // Full client metadata
    location: "",
    locationId: "",
    locationData: null, // Full location metadata (GPS, etc)
    assignedEquipment: [], 
    startDate: "",
    teamMembers: [],
    scope: { visual: true, aut: true, mut: false, shearWave: false }
  });

  // --- 1. Real-time Master Directory Sync ---
  useEffect(() => {
    const qClients = query(collection(db, "clients"), orderBy("name", "asc"));
    const unsubClients = onSnapshot(qClients, (snap) => setRegisteredClients(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const qLocs = query(collection(db, "locations"), orderBy("name", "asc"));
    const unsubLocs = onSnapshot(qLocs, (snap) => setRegisteredLocations(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const qTypes = query(collection(db, "inspection_types"), orderBy("title", "asc"));
    const unsubTypes = onSnapshot(qTypes, (snap) => setInspectionTypes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, "users"));
      setAvailableUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    fetchUsers();
    return () => { unsubClients(); unsubLocs(); unsubTypes(); };
  }, []);

  // --- 2. Equipment Filter Logic (Contextual to Facility) ---
  useEffect(() => {
    if (setupData.locationId) {
      const qEquip = query(collection(db, "equipment"), where("locationId", "==", setupData.locationId));
      const unsubEquip = onSnapshot(qEquip, (snap) => {
        setAvailableEquipment(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsubEquip();
    }
  }, [setupData.locationId]);

  // --- 3. Context Mapping Handlers ---
  const handleClientMapping = (id) => {
    const selected = registeredClients.find(c => c.id === id);
    if (selected) {
      setSetupData(prev => ({ 
        ...prev, 
        client: selected.name, 
        clientLogo: selected.logo,
        clientData: selected 
      }));
      toast.info(`Client Identity Sync: ${selected.name}`);
    }
  };

  const handleLocationMapping = (id) => {
    const selected = registeredLocations.find(l => l.id === id);
    if (selected) {
      setSetupData(prev => ({ 
        ...prev, 
        location: selected.name, 
        locationId: id, 
        locationData: selected,
        assignedEquipment: [] 
      }));
      toast.info(`Facility GPS Link: ${selected.region}`);
    }
  };

  const handleTypeMapping = (title) => {
    const selected = inspectionTypes.find(t => t.title === title);
    if (selected) {
      setSetupData(prev => ({ 
        ...prev, 
        inspectionType: selected.title,
        inspectionTypeRef: selected 
      }));
    }
  };

  const toggleEquipment = (asset) => {
    const exists = setupData.assignedEquipment.find(e => e.id === asset.id);
    const updated = exists 
      ? setupData.assignedEquipment.filter(e => e.id !== asset.id)
      : [...setupData.assignedEquipment, asset];
    setSetupData({ ...setupData, assignedEquipment: updated });
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!setupData.projectName || !setupData.client || !setupData.locationId || !setupData.inspectionType) {
      return toast.warn("Operational Manifest Incomplete.");
    }

    setIsSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, "projects"), {
        ...setupData,
        createdBy: user?.uid,
        createdAt: serverTimestamp(),
        status: "Planned"
      });
      toast.success("Operational Hub Deployed");
      
      navigate("/admin/inspections", { 
        state: { 
          projectContext: {
            ...setupData,
            docId: docRef.id,
            equipment: setupData.assignedEquipment 
          } 
        } 
      });
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
                  <Shield className="text-orange-500" /> Operational Deployment
                </h1>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">
                   Manifest Ref: {setupData.projectId}
                </p>
              </div>
            </header>

            <form onSubmit={handleCreateProject} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 space-y-8">
                
                {/* 1. CLIENT DATA CONTEXT */}
                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] backdrop-blur-md">
                  <h2 className="text-xs font-bold text-orange-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                    <Building2 size={14}/> 1. Corporate Identity Mapping
                  </h2>
                  <div className="flex flex-col md:flex-row gap-8 items-center">
                    <div className="w-40 h-40 border-2 border-slate-800 rounded-3xl bg-slate-950/50 flex items-center justify-center p-4 shadow-inner relative group">
                      {setupData.clientLogo ? <img src={setupData.clientLogo} className="max-h-full animate-in fade-in" alt="Logo" /> : <Building2 className="text-slate-800" size={40} />}
                      {setupData.clientData && (
                        <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center rounded-3xl">
                          <p className="text-[8px] font-bold text-orange-500 uppercase">{setupData.clientData.industry}</p>
                          <p className="text-[9px] text-white font-mono mt-1">{setupData.clientData.email}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 w-full space-y-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Registered Client Portfolio</label>
                        <select className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm outline-none focus:border-orange-500" onChange={(e) => handleClientMapping(e.target.value)}>
                          <option value="">Choose Corporate Entity...</option>
                          {registeredClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <SetupInput label="Project Manifest Name" icon={<Briefcase size={12}/>} value={setupData.projectName} onChange={(v) => setSetupData({...setupData, projectName: v})} />
                    </div>
                  </div>
                </div>

                {/* 2. EQUIPMENT DATA CONTEXT */}
                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem]">
                   <h2 className="text-xs font-bold text-orange-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                     <Package size={14}/> 2. Asset Integrity Selection
                   </h2>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {availableEquipment.map(asset => (
                       <div key={asset.id} 
                        onClick={() => toggleEquipment(asset)}
                        className={`p-4 border rounded-2xl cursor-pointer transition-all flex items-center justify-between ${setupData.assignedEquipment.find(e => e.id === asset.id) ? 'border-orange-500 bg-orange-500/10' : 'border-slate-800 bg-slate-950'}`}>
                         <div className="flex items-center gap-4">
                           <Cog className={setupData.assignedEquipment.find(e => e.id === asset.id) ? 'text-orange-500' : 'text-slate-700'} size={20}/>
                           <div>
                             <p className="text-xs font-bold uppercase">{asset.tagNumber}</p>
                             <p className="text-[8px] text-slate-500 uppercase">{asset.description}</p>
                           </div>
                         </div>
                         <div className="text-right">
                            <p className="text-[8px] font-bold text-slate-600 uppercase">Thk: {asset.nominalThickness}mm</p>
                            <p className="text-[8px] font-bold text-slate-600 uppercase">{asset.materialSpec}</p>
                         </div>
                       </div>
                     ))}
                   </div>
                   {availableEquipment.length === 0 && (
                     <div className="text-center py-10 border-2 border-dashed border-slate-800 rounded-3xl opacity-50">
                        <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">Select facility to load asset inventory</p>
                     </div>
                   )}
                </div>
              </div>

              {/* 3. LOGISTICS & STANDARDS DATA CONTEXT */}
              <div className="space-y-8">
                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] space-y-6">
                   <h2 className="text-xs font-bold text-orange-500 uppercase tracking-[0.2em]">3. Compliance & Geodata</h2>
                   
                   <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Regulatory Standard</label>
                      <select className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm outline-none" onChange={(e) => handleTypeMapping(e.target.value)}>
                        <option value="">Select Technical Code...</option>
                        {inspectionTypes.map(t => <option key={t.id} value={t.title}>{t.title} — {t.fullName}</option>)}
                      </select>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Geographical Infrastructure</label>
                      <select className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm outline-none" onChange={(e) => handleLocationMapping(e.target.value)}>
                        <option value="">Select Registered Facility...</option>
                        {registeredLocations.map(l => <option key={l.id} value={l.id}>{l.name} ({l.region})</option>)}
                      </select>
                      {setupData.locationData && (
                        <div className="mt-3 p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-3">
                           <Navigation size={12} className="text-orange-500" />
                           <span className="text-[10px] font-mono text-slate-500">{setupData.locationData.coordinates}</span>
                        </div>
                      )}
                   </div>

                   <SetupInput label="Commencement Date" type="date" icon={<Calendar size={12}/>} value={setupData.startDate} onChange={(v) => setSetupData({...setupData, startDate: v})} />
                </div>

                <div className="bg-orange-600 rounded-[3rem] p-8 text-white shadow-2xl shadow-orange-900/30 group overflow-hidden relative">
                   <Shield className="absolute -right-4 -top-4 text-white/10 group-hover:scale-110 transition-transform duration-500" size={120} />
                  <h3 className="font-bold uppercase text-xl mb-4 relative z-10">Deploy Hub</h3>
                  <button disabled={isSubmitting} className="w-full bg-white text-orange-600 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:shadow-xl transition-all relative z-10 active:scale-95">
                    {isSubmitting ? "Syncing Directories..." : "Initialize Operational Hub"} <ArrowRight size={14}/>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

const SetupInput = ({ label, icon, value, onChange, type = "text" }) => (
  <div className="space-y-2">
    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">{icon} {label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white focus:border-orange-500 outline-none transition-all shadow-inner" />
  </div>
);

export default ProjectSetup;