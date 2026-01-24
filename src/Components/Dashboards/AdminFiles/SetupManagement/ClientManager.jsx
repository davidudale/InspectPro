import React, { useState, useEffect } from "react";
import { db } from "../../../Auth/firebase";
import { 
  collection, onSnapshot, query, addDoc, 
  serverTimestamp, updateDoc, deleteDoc, doc 
} from "firebase/firestore";
import { 
  Building2, Mail, Globe, Phone, Plus, Camera,
  ExternalLink, Search, Edit2, Trash2, X, Briefcase
} from "lucide-react";
import AdminNavbar from "../../AdminNavbar";
import AdminSidebar from "../../AdminSidebar";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const ClientManager = () => {
  const navigate = useNavigate()
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState(null); 
  
  const [newClient, setNewClient] = useState({ 
    name: "", industry: "Oil & Gas", email: "", phone: "", website: "", logo: "" 
  });

  useEffect(() => {
    const q = query(collection(db, "clients"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "inspectpro");

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/dsgzpl0xt/image/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setNewClient({ ...newClient, logo: data.secure_url });
      toast.success("Identity Branding Synchronized");
    } catch (err) {
      toast.error("Cloudinary Link Failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditOpen = (client) => {
    setEditingId(client.id);
    setNewClient({ ...client });
    setIsModalOpen(true);
  };

  const handleDelete = async (clientId, name) => {
    if (window.confirm(`CRITICAL: Purge ${name} from Enterprise Portfolio?`)) {
      try {
        await deleteDoc(doc(db, "clients", clientId));
        toast.error("Client record purged");
      } catch (err) {
        toast.error("De-authorization failed");
      }
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, "clients", editingId), {
          ...newClient,
          updatedAt: serverTimestamp()
        });
        toast.success("Entity Profile Updated");
      } else {
        await addDoc(collection(db, "clients"), {
          ...newClient,
          createdAt: serverTimestamp(),
          activeProjects: 0
        });
        toast.success("Entity Authorized: Proceed to Location Mapping");
         
      }
      closeModal();
    } catch (err) {
      toast.error("Database Transaction Failed");
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setNewClient({ name: "", industry: "Oil & Gas", email: "", phone: "", website: "", logo: "" });
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <AdminNavbar />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-7xl mx-auto">
            
            {/* Header & Advanced Filter */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-10 gap-6">
              <div>
                <h1 className="text-3xl font-bold uppercase tracking-tighter text-white">Client Portfolio</h1>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">Enterprise Directory / Stakeholder Management</p>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="relative group w-full md:w-80">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-500 transition-colors" />
                  <input 
                    type="text"
                    placeholder="Filter by Name, Industry, or Email..."
                    className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-xs focus:border-orange-500 outline-none transition-all backdrop-blur-sm shadow-inner"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button onClick={() => setIsModalOpen(true)} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3.5 rounded-2xl font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-orange-900/20 transition-all active:scale-95">
                  <Plus size={16}/> Register New Entity
                </button>
              </div>
            </div>

            {/* TABULAR INTERFACE */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] overflow-hidden backdrop-blur-md shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/50">
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Entity Branding</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Industry Context</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Communication Channel</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Scale</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Operational Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredClients.map((client) => (
                      <tr key={client.id} className="group hover:bg-white/5 transition-colors">
                        <td className="p-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center overflow-hidden bg-white/5 shadow-inner">
                              {client.logo ? (
                                <img src={client.logo} className="w-full h-full object-contain p-1.5" alt="Logo" />
                              ) : (
                                <Building2 className="text-slate-700" size={20} />
                              )}
                            </div>
                            <p className="text-sm font-bold text-white uppercase tracking-tight group-hover:text-orange-500 transition-colors">{client.name}</p>
                          </div>
                        </td>
                        <td className="p-6">
                          <span className="text-[9px] font-bold text-orange-500 uppercase tracking-widest bg-orange-500/5 px-2 py-1 rounded border border-orange-500/10">
                            {client.industry}
                          </span>
                        </td>
                        <td className="p-6">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-slate-400">
                              <Mail size={12} className="text-slate-600" />
                              <span className="text-xs">{client.email || "---"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                              <Phone size={12} className="text-slate-600" />
                              <span className="text-[10px] font-mono">{client.phone || "---"}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-6">
                           <div className="flex items-center gap-2">
                             <Briefcase size={14} className="text-slate-700" />
                             <span className="text-xs font-bold text-white font-mono">{client.activeProjects || 0}</span>
                           </div>
                        </td>
                        <td className="p-6 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditOpen(client)} className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-blue-500 hover:border-blue-500/50 transition-all shadow-inner">
                              <Edit2 size={14}/>
                            </button>
                            <button onClick={() => handleDelete(client.id, client.name)} className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-red-500 hover:border-red-500/50 transition-all shadow-inner">
                              <Trash2 size={14}/>
                            </button>
                            <button className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-orange-500 hover:border-orange-500/50 transition-all shadow-inner">
                                <ExternalLink size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredClients.length === 0 && (
                <div className="py-20 text-center flex flex-col items-center">
                   <Building2 size={40} className="text-slate-800 mb-4" />
                   <p className="text-[10px] font-bold uppercase text-slate-600 tracking-widest">No stakeholders found matching query</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Unified Modal Logic Remains the Same */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-[2.5rem] p-10 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in duration-300">
            <button onClick={closeModal} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors">
                <X size={20}/>
            </button>
            <h2 className="text-2xl font-bold text-white uppercase tracking-tighter mb-8">{editingId ? "Update Data" : "Register Data"}</h2>
            <form onSubmit={handleFormSubmit} className="space-y-6">
               {/* Same form logic as before... */}
               <div className="flex flex-col items-center gap-4 p-6 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-950/50 mb-6">
                <label className="cursor-pointer group relative flex flex-col items-center">
                  <div className="w-24 h-24 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden transition-all group-hover:border-orange-500/50 shadow-inner">
                    {newClient.logo ? <img src={newClient.logo} className="w-full h-full object-contain p-2" alt="Preview" /> : <Camera className={`${isUploading ? 'animate-pulse text-orange-500' : 'text-slate-700'}`} size={32} />}
                  </div>
                  <input type="file" className="hidden" onChange={handleLogoUpload} accept="image/*" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase mt-2 tracking-widest group-hover:text-orange-500 transition-colors">Corporate Logo</span>
                </label>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Entity Name</label>
                <input required className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white focus:border-orange-500 outline-none" value={newClient.name} onChange={(e) => setNewClient({...newClient, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Industry</label>
                    <select className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white focus:border-orange-500 outline-none" value={newClient.industry} onChange={(e) => setNewClient({...newClient, industry: e.target.value})}>
                      <option>Oil & Gas</option><option>Renewables</option><option>Manufacturing</option><option>Marine</option><option>Infrastructure</option>
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Phone</label>
                    <input className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white focus:border-orange-500 outline-none" value={newClient.phone} onChange={(e) => setNewClient({...newClient, phone: e.target.value})} placeholder="+234..." />
                 </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={closeModal} className="flex-1 py-4 text-[10px] font-bold uppercase text-slate-500">Cancel</button>
                <button type="submit" disabled={isUploading} className="flex-1 bg-orange-600 py-4 rounded-2xl text-[10px] font-bold uppercase text-white shadow-lg">{isUploading ? "Uploading..." : "Authorize Client"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientManager;