import React, { useEffect, useState } from "react";
import AdminNavbar from "../../AdminNavbar";
import {
  PlusCircle,
  Edit2,
  Trash2,
  Clock,
  ChevronRight,
  FileSearch,
  Database,
  Tag,
  MapPin,
  Search,
  User,
  ExternalLink,
  ArrowLeft,
  Cog,
  AlertTriangle,
  Zap,
  X,
  Package,
  Ruler,
  Layers,
} from "lucide-react";
import AdminSidebar from "../../AdminSidebar";
import { db } from "../../../Auth/firebase";
import {
  collection,
  onSnapshot,
  doc,
  deleteDoc,
  query,
  orderBy,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

// --- CONFIGURATION DATA ---
const REFINERY_ASSET_TYPES = [
  { label: "Pressure Vessel (V)", prefix: "V-", category: "Static" },
  { label: "Heat Exchanger (E)", prefix: "E-", category: "Static" },
  { label: "Storage Tank (T)", prefix: "T-", category: "Static" },
  { label: "Distillation Column (C)", prefix: "C-", category: "Static" },
  { label: "Centrifugal Pump (P)", prefix: "P-", category: "Rotating" },
  { label: "Centrifugal Compressor (K)", prefix: "K-", category: "Rotating" },
  { label: "Piping Circuit (PI)", prefix: "PI-", category: "Piping" },
  { label: "Separator (S)", prefix: "S-", category: "Static" },
];

const ASSET_STATUSES = [
  "In-Service",
  "Out-of-Service",
  "Mothballed",
  "Decommissioned",
];

const InspectionLogs = () => {
  const [inspections, setInspections] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [masterInspectionTypes, setMasterInspectionTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    tagNumber: "",
    assetType: "",
    nominalThickness: "",
    materialSpec: "",
    status: "In-Service",
  });

  // Drill-down State
  const [phase, setPhase] = useState(1);
  const [selectedEquip, setSelectedEquip] = useState(null);
  const [selectedTechnique, setSelectedTechnique] = useState(null);

  useEffect(() => {
    // Sync Logs
    const qLogs = query(
      collection(db, "inspections"),
      orderBy("timestamp", "desc"),
    );
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      setInspections(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );
      setLoading(false);
    });

    // Sync Master Equipment Registry
    const qEquip = query(
      collection(db, "equipment"),
      orderBy("tagNumber", "asc"),
    );
    const unsubEquip = onSnapshot(qEquip, (snapshot) => {
      setEquipment(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    // Sync Master Techniques
    const qTypes = query(
      collection(db, "inspection_types"),
      orderBy("title", "asc"),
    );
    const unsubTypes = onSnapshot(qTypes, (snapshot) => {
      setMasterInspectionTypes(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );
    });

    return () => {
      unsubLogs();
      unsubEquip();
      unsubTypes();
    };
  }, []);

  // --- CRUD HANDLERS ---
  const handleTypeChange = (typeName) => {
    const selected = REFINERY_ASSET_TYPES.find((t) => t.label === typeName);
    if (selected) {
      setFormData({
        ...formData,
        assetType: selected.label,
        tagNumber: editingId ? formData.tagNumber : selected.prefix,
      });
    }
  };

  const handleOpenEdit = (e, asset) => {
    e.stopPropagation();
    setEditingId(asset.id);
    setFormData(asset);
    setIsModalOpen(true);
  };

  const handleDeleteAsset = async (e, id, tag) => {
    e.stopPropagation();
    if (window.confirm(`Purge asset ${tag} from master registry?`)) {
      try {
        await deleteDoc(doc(db, "equipment", id));
        toast.error("Asset removed from directory");
      } catch (err) {
        toast.error("Deletion failed");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "equipment", editingId), {
          ...formData,
          updatedAt: serverTimestamp(),
        });
        toast.success("Asset Updated");
      } else {
        await addDoc(collection(db, "equipment"), {
          ...formData,
          createdAt: serverTimestamp(),
        });
        toast.success("New Asset Registered");
      }
      closeModal();
    } catch (err) {
      toast.error("Sync failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      tagNumber: "",
      assetType: "",
      nominalThickness: "",
      materialSpec: "",
      status: "In-Service",
    });
  };

  // --- FILTER LOGIC ---
  const filteredEquipment = equipment.filter(
    (asset) =>
      asset.tagNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.assetType.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const availableTechniques = Array.from(
    new Set(
      masterInspectionTypes.flatMap((type) => type.requiredTechniques || []),
    ),
  ).filter((tech) => tech.toLowerCase().includes(searchTerm.toLowerCase()));

  const finalFilteredData = inspections.filter((batch) => {
    const matchesEquip = batch.items?.some(
      (item) => item.reference === selectedEquip,
    );
    const matchesTech = batch.items?.some(
      (item) => item.type === selectedTechnique,
    );
    const matchesSearch = batch.items?.[0]?.Client?.toLowerCase().includes(
      searchTerm.toLowerCase(),
    );
    return matchesEquip && matchesTech && matchesSearch;
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <AdminNavbar />
      <div className="flex flex-1 relative">
        <AdminSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-4 lg:p-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-8 gap-6">
              <div className="flex items-center gap-4">
                {phase > 1 && (
                  <button
                    onClick={() => {
                      setPhase(phase - 1);
                      setSearchTerm("");
                    }}
                    className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-orange-500 hover:bg-orange-600 hover:text-white transition-all"
                  >
                    <ArrowLeft size={18} />
                  </button>
                )}
                <h1 className="text-3xl font-bold text-white tracking-tighter uppercase">
                  {phase === 1 && "Asset Integrity Directory"}
                  {phase === 2 && `NDE Selection: ${selectedEquip}`}
                  {phase === 3 && `Archives: ${selectedEquip}`}
                </h1>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative group w-64">
                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-500"
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-3 pl-12 text-xs focus:border-orange-500 outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                {phase === 1 && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-3 rounded-2xl font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 transition-all"
                  >
                    <PlusCircle size={16} /> Register Asset
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="py-40 flex justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-orange-500"></div>
              </div>
            ) : (
              <>
                {/* PHASE 1: TABULAR EQUIPMENT REGISTER */}
                {phase === 1 && (
                  <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/50">
                          <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            Asset Tag
                          </th>
                          <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            Specifications
                          </th>
                          <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            Status
                          </th>
                          <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">
                            Administrative
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {filteredEquipment.map((asset) => (
                          <tr
                            key={asset.id}
                            onClick={() => {
                              setSelectedEquip(asset.tagNumber);
                              setPhase(2);
                              setSearchTerm("");
                            }}
                            className="group hover:bg-white/5 transition-colors cursor-pointer"
                          >
                            <td className="p-6">
                              <div className="flex items-center gap-4">
                                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-orange-500">
                                  <Cog size={18} />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-white uppercase">
                                    {asset.assetType}
                                  </p>
                                  <p className="text-[9px] text-slate-500 font-bold uppercase">
                                    {asset.tagNumber}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="p-6">
                              <div className="flex gap-4 text-[10px] font-mono">
                                <span className="flex items-center gap-1 text-slate-300">
                                  <Ruler
                                    size={12}
                                    className="text-orange-500"
                                  />{" "}
                                  {asset.nominalThickness}mm
                                </span>
                                <span className="flex items-center gap-1 text-slate-500 uppercase">
                                  <Layers size={12} /> {asset.materialSpec}
                                </span>
                              </div>
                            </td>
                            <td className="p-6">
                              <span
                                className={`px-2 py-1 rounded text-[8px] font-black uppercase border ${asset.status === "In-Service" ? "border-emerald-500/30 text-emerald-500" : "border-red-500/30 text-red-500"}`}
                              >
                                {asset.status}
                              </span>
                            </td>
                            <td
                              className="p-6 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => handleOpenEdit(e, asset)}
                                  className="p-2 bg-slate-950 border border-slate-800 text-blue-400 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  onClick={(e) =>
                                    handleDeleteAsset(
                                      e,
                                      asset.id,
                                      asset.tagNumber,
                                    )
                                  }
                                  className="p-2 bg-slate-950 border border-slate-800 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition-all"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {/* PHASE 2 & 3 - Remain as Technique/Table logic based on your previous code */}
                {phase === 2 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {availableTechniques.map((tech) => (
                      <div
                        key={tech}
                        onClick={() => {
                          // 1. Set state for tracking
                          setSelectedTechnique(tech);

                          // 2. Dynamic Routing Logic
                          // We convert the technique name to lowercase to match your route paths
                          const routePath = tech
                            .toLowerCase()
                            .replace(/\s+/g, "-");

                          navigate(`/admin/reports/${routePath}`, {
                            state: {
                              preFill: {
                                tag: selectedEquip,
                                equipment: equipment.find(
                                  (e) => e.tagNumber === selectedEquip,
                                )?.description,
                                client: inspections.find((i) =>
                                  i.items?.some(
                                    (item) => item.reference === selectedEquip,
                                  ),
                                )?.items?.[0]?.Client,
                                location: inspections.find((i) =>
                                  i.items?.some(
                                    (item) => item.reference === selectedEquip,
                                  ),
                                )?.items?.[0]?.Location,
                                reportNo: `REP-${Math.floor(1000 + Math.random() * 9000)}`,
                              },
                            },
                          });
                        }}
                        className="group bg-slate-950 border border-slate-800 p-8 rounded-3xl hover:bg-orange-600 transition-all cursor-pointer flex flex-col items-start gap-4 shadow-xl"
                      >
                        <Zap
                          size={24}
                          className="text-orange-500 group-hover:text-white"
                        />
                        <div>
                          <span className="text-xl font-black text-white uppercase tracking-tighter">
                            {tech}
                          </span>
                          <p className="text-[10px] text-slate-500 uppercase font-bold group-hover:text-white/70">
                            Open Specialized Template
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {phase === 3 && (
                  <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-950/50">
                            <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                              Client Manifest
                            </th>
                            <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                              Facility
                            </th>
                            <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {finalFilteredData.map((batch) => {
                            const main =
                              batch.items?.find(
                                (i) => i.reference === selectedEquip,
                              ) || batch.items[0];
                            return (
                              <tr
                                key={batch.id}
                                className="group hover:bg-white/5 transition-colors"
                              >
                                <td className="p-6">
                                  <p className="text-sm font-bold text-white uppercase">
                                    {main.Client}
                                  </p>
                                  <p className="text-[9px] font-mono text-slate-500 mt-0.5">
                                    {main.Report_No}
                                  </p>
                                </td>
                                <td className="p-6 text-xs text-slate-400 uppercase tracking-widest">
                                  {main.Location}
                                </td>
                                <td className="p-6 text-right">
                                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() =>
                                        navigate(
                                          `/admin/edit-inspection/${batch.id}`,
                                        )
                                      }
                                      className="p-2 bg-slate-950 border border-slate-800 text-slate-400 hover:text-blue-500 rounded-xl transition-all shadow-inner"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button
                                      onClick={() =>
                                        navigate(
                                          `/admin/inspection-details/${batch.id}`,
                                        )
                                      }
                                      className="p-2 bg-orange-600/10 text-orange-500 rounded-xl transition-all shadow-inner"
                                    >
                                      <ExternalLink size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* REGISTRATION MODAL WITH DROPDOWNS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-[2.5rem] p-10 shadow-2xl relative animate-in zoom-in duration-300">
            <button
              onClick={closeModal}
              className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="text-2xl font-bold text-white uppercase tracking-tighter mb-8 flex items-center gap-3">
              <Package className="text-orange-500" />{" "}
              {editingId ? "Modify Asset" : "Register Master Asset"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    Equipment Type
                  </label>
                  <select
                    required
                    className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white focus:border-orange-500 outline-none cursor-pointer"
                    value={formData.assetType}
                    onChange={(e) => handleTypeChange(e.target.value)}
                  >
                    <option value="">Select Category...</option>
                    {REFINERY_ASSET_TYPES.map((t) => (
                      <option key={t.label} value={t.label}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    Tag Number
                  </label>
                  <input
                    required
                    className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white focus:border-orange-500 outline-none"
                    value={formData.tagNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, tagNumber: e.target.value })
                    }
                    placeholder="e.g. V-101"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    Nominal Thk (mm)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white focus:border-orange-500 outline-none"
                    value={formData.nominalThickness}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        nominalThickness: e.target.value,
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    Material Spec
                  </label>
                  <input
                    required
                    className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white focus:border-orange-500 outline-none"
                    value={formData.materialSpec}
                    onChange={(e) =>
                      setFormData({ ...formData, materialSpec: e.target.value })
                    }
                    placeholder="ASTM A516"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                  Operational Status
                </label>
                <select
                  required
                  className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white focus:border-orange-500 outline-none cursor-pointer"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                >
                  {ASSET_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-4 text-[10px] font-bold uppercase text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-orange-600 py-4 rounded-2xl text-[10px] font-bold uppercase text-white shadow-lg transition-all"
                >
                  {isSubmitting
                    ? "Syncing..."
                    : editingId
                      ? "Update Asset"
                      : "Authorize Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InspectionLogs;
