import React, { useState, useEffect } from "react";
import { db } from "../../../Auth/firebase";
import {
  collection,
  onSnapshot,
  query,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import {
  MapPin,
  Navigation,
  Plus,
  Trash2,
  Edit2,
  Search,
  X,
  Building2,
} from "lucide-react";
import AdminNavbar from "../../AdminNavbar";
import AdminSidebar from "../../AdminSidebar";
import { toast } from "react-toastify";

const LocationManager = () => {
  const [locations, setLocations] = useState([]);
  const [clients, setClients] = useState([]); // Master Client Location
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [options, setOptions] = useState([
    "Offshore Platform",
    "Refinery",
    "Tank Farm",
    "Pipeline Section",
  ]);

  const [newLocation, setNewLocation] = useState({
    name: "",
    region: "",
    coordinates: "",
    description: "",
    type: "",
    clientId: "", // Foreign Key to Clients collection
    clientName: "", // Cached for display performance
  });

  useEffect(() => {
    // 1. Sync Facility Data
    const qLocs = query(collection(db, "locations"), orderBy("name", "asc"));
    const unsubLocs = onSnapshot(qLocs, (snapshot) => {
      setLocations(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    // 2. Sync Client Location for Linking
    const qClients = query(collection(db, "clients"), orderBy("name", "asc"));
    const unsubClients = onSnapshot(qClients, (snapshot) => {
      setClients(
        snapshot.docs.map((doc) => ({ id: doc.id, name: doc.data().name })),
      );
    });

    return () => {
      unsubLocs();
      unsubClients();
    };
  }, []);

  const handleEditOpen = (loc) => {
    setEditingId(loc.id);
    setNewLocation({ ...loc });
    setIsCustom(false);
    setCustomValue("");
    setIsModalOpen(true);
  };

  const handleDelete = async (locationId, name) => {
    if (window.confirm(`CRITICAL: Delete ${name} from Facility Location?`)) {
      try {
        await deleteDoc(doc(db, "locations", locationId));
        toast.success("Facility record deleted");
      } catch (err) {
        toast.error("Delete operation failed");
      }
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!newLocation.clientId)
      return toast.warn("Facility must be assigned to a Client.");

    setIsSubmitting(true);
    try {
      if (editingId) {
        const { id, createdAt, updatedAt, ...locationPayload } = newLocation;
        await updateDoc(doc(db, "locations", editingId), {
          ...locationPayload,
          updatedAt: serverTimestamp(),
        });
        toast.success("Facility Updated");
      } else {
        await addDoc(collection(db, "locations"), {
          ...newLocation,
          createdAt: serverTimestamp(),
        });
        toast.success("Facility Registered and Linked to Client");
      }
      closeModal();
    } catch (err) {
      toast.error("Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setIsCustom(false);
    setCustomValue("");
    setNewLocation({
      name: "",
      region: "",
      coordinates: "",
      description: "",
      type: "Offshore Platform",
      clientId: "",
      clientName: "",
    });
  };

  const filteredLocations = locations.filter((l) => {
    const name = (l.name || "").toLowerCase();
    const clientName = (l.clientName || "").toLowerCase();
    const region = (l.region || "").toLowerCase();
    const term = searchTerm.toLowerCase();
    return name.includes(term) || clientName.includes(term) || region.includes(term);
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <AdminNavbar />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-10 gap-6">
              <div>
                <h1 className="text-3xl font-bold uppercase tracking-tighter text-white">
                  Facility Location
                </h1>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">
                  Clients Infrastructure
                </p>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="relative group w-full md:w-80">
                  <Search
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-500 transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="Search by Facility, Client or Region..."
                    className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-xs focus:border-orange-500 outline-none transition-all backdrop-blur-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  title="Add Facility"
                  aria-label="Add Facility"
                  className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3.5 rounded-2xl font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95"
                >
                  <Plus size={16} /> Register Clients Facility
                </button>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] overflow-hidden backdrop-blur-md shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/50">
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Facility Identity
                      </th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Clients
                      </th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Region
                      </th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Coordinates
                      </th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredLocations.map((loc) => (
                      <tr
                        key={loc.id}
                        className="group hover:bg-white/5 transition-colors"
                      >
                        <td className="p-6">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-orange-500 shadow-inner">
                              <MapPin size={18} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white uppercase tracking-tight">
                                {loc.name}
                              </p>
                              <p className="text-[9px] text-slate-500 font-bold uppercase">
                                {loc.type}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-2">
                            <Building2 size={12} className="text-slate-600" />
                            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">
                              {loc.clientName || "Unassigned"}
                            </span>
                          </div>
                        </td>
                        <td className="p-6">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-orange-500/5 px-2 py-1 rounded border border-orange-500/10">
                            {loc.region}
                          </span>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px]">
                            <Navigation size={12} className="text-slate-600" />
                            {loc.coordinates || "No GPS Link"}
                          </div>
                        </td>
                        <td className="p-6 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditOpen(loc)}
                              title="Edit Facility"
                              aria-label={`Edit ${loc.name}`}
                              className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-blue-500 transition-all shadow-inner"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(loc.id, loc.name)}
                              title="Delete Facility"
                              aria-label={`Delete ${loc.name}`}
                              className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-red-500 transition-all shadow-inner"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Linked Registration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-[2.5rem] p-10 shadow-2xl relative animate-in zoom-in duration-300">
            <button
              onClick={closeModal}
              className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="text-2xl font-bold text-white uppercase tracking-tighter mb-8">
              Facility Mapping
            </h2>
            <form onSubmit={handleFormSubmit} className="space-y-6">
              {/* CLIENT SELECTOR (THE LINK) */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Building2 size={12} className="text-orange-500" /> Assign to
                  Client
                </label>
                <select
                  required
                  className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white focus:border-orange-500 outline-none appearance-none cursor-pointer"
                  value={newLocation.clientId}
                  onChange={(e) => {
                    const selected = clients.find(
                      (c) => c.id === e.target.value,
                    );
                    if (!selected) {
                      setNewLocation({
                        ...newLocation,
                        clientId: "",
                        clientName: "",
                      });
                      return;
                    }
                    setNewLocation({
                      ...newLocation,
                      clientId: selected.id,
                      clientName: selected.name,
                    });
                  }}
                >
                  <option value="">Select Client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    Facility Name
                  </label>
                  <input
                    required
                    className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white focus:border-orange-500 outline-none"
                    value={newLocation.name}
                    onChange={(e) =>
                      setNewLocation({ ...newLocation, name: e.target.value })
                    }
                    placeholder="e.g. Platform Alpha"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    Facility Type
                  </label>

                  {!isCustom ? (
                    /* Standard Dropdown View */
                    <select
                      className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white focus:border-orange-500 outline-none transition-all"
                      value={newLocation.type}
                      onChange={(e) => {
                        if (e.target.value === "+ Add More") {
                          setIsCustom(true);
                        } else {
                          setNewLocation({
                            ...newLocation,
                            type: e.target.value,
                          });
                        }
                      }}
                    >
                      <option value="" disabled>
                        Select Facility Type...
                      </option>
                      {options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                      <option className="text-orange-500 font-bold">
                        + Add More
                      </option>
                    </select>
                  ) : (
                    /* Inline Add More View */
                    <div className="flex gap-2 animate-in slide-in-from-top-1 duration-200">
                      <input
                        autoFocus
                        type="text"
                        className="flex-1 bg-slate-950 border border-orange-500/50 p-4 rounded-2xl text-sm text-white outline-none"
                        placeholder="Type new facility type..."
                        value={customValue}
                        onChange={(e) => setCustomValue(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const normalizedValue = customValue.trim();
                          if (normalizedValue) {
                            const exists = options.some(
                              (opt) => opt.toLowerCase() === normalizedValue.toLowerCase(),
                            );
                            if (!exists) {
                              setOptions((prev) => [...prev, normalizedValue]);
                            }
                            setNewLocation({
                              ...newLocation,
                              type: normalizedValue,
                            });
                            setCustomValue("");
                            setIsCustom(false);
                          } else {
                            setIsCustom(false);
                          }
                        }}
                        className="bg-orange-600 px-1 rounded-2xl text-white font-black text-[8px] capitalize tracking-widest hover:bg-orange-500 transition-colors shadow-lg shadow-orange-900/20"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    Region
                  </label>
                  <input
                    required
                    className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white focus:border-orange-500 outline-none"
                    value={newLocation.region}
                    onChange={(e) =>
                      setNewLocation({ ...newLocation, region: e.target.value })
                    }
                    placeholder="e.g. Niger Delta"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    GPS Coordinates
                  </label>
                  <input
                    className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white focus:border-orange-500 outline-none"
                    value={newLocation.coordinates}
                    onChange={(e) =>
                      setNewLocation({
                        ...newLocation,
                        coordinates: e.target.value,
                      })
                    }
                    placeholder="4.8156° N, 7.0498° E"
                  />
                </div>
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
                  className="flex-1 bg-orange-600 py-4 rounded-2xl text-[10px] font-bold uppercase text-white shadow-lg shadow-orange-900/20 transition-all"
                >
                  {isSubmitting
                    ? "Linking..."
                    : editingId
                      ? "Update Data"
                      : "Authorize Facility Mapping"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationManager;
