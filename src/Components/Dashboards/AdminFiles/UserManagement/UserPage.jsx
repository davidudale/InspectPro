import { React, useEffect, useState } from "react";
import AdminNavbar from "../../AdminNavbar";
import { PlusCircle, Edit2, Trash2, User, X, Save } from "lucide-react";
import AdminSidebar from "../../AdminSidebar";
import { db } from "../../../Auth/firebase";
import { 
  collection, onSnapshot, doc, deleteDoc, 
  updateDoc, addDoc, serverTimestamp 
} from "firebase/firestore";
import { toast } from "react-toastify";

const UserPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // --- Modal & Form State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null means "Add Mode", object means "Edit Mode"
  const [formData, setFormData] = useState({ name: "", email: "", role: "Inspector" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const usersCollection = collection(db, "users");
    const unsubscribe = onSnapshot(usersCollection, (snapshot) => {
      const allUsers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(allUsers);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- FUNCTIONAL HANDLERS ---

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({ name: user.name, email: user.email, role: user.role || "Inspector" });
    } else {
      setEditingUser(null);
      setFormData({ name: "", email: "", role: "Inspector" });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({ name: "", email: "", role: "Inspector" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingUser) {
        // --- EDIT LOGIC ---
        const userRef = doc(db, "users", editingUser.id);
        await updateDoc(userRef, {
          ...formData,
          updatedAt: serverTimestamp()
        });
        toast.success("User updated successfully");
      } else {
        // --- ADD LOGIC ---
        await addDoc(collection(db, "users"), {
          ...formData,
          createdAt: serverTimestamp()
        });
        toast.success("New user added successfully");
      }
      handleCloseModal();
    } catch (error) {
      console.error("Error saving user:", error);
      toast.error("Failed to save user data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await deleteDoc(doc(db, "users", id));
        toast.success("User removed from database");
      } catch (error) {
        toast.error("Deletion failed. Check permissions.");
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <AdminNavbar />
      <div className="flex flex-1 relative">
        <AdminSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-4 lg:p-8 min-h-[calc(100vh-65px)] overflow-y-auto bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-white tracking-tight uppercase">
                User Management
              </h1>
              <button 
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-lg shadow-orange-900/20 active:scale-95" 
                onClick={() => handleOpenModal()} 
              >
                <PlusCircle size={16} />
                Add User
              </button>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm shadow-2xl">
              {loading ? (
                <div className="p-20 flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-orange-500"></div>
                  <p className="text-slate-500 text-sm animate-pulse uppercase tracking-widest">Querying Records...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900/60 border-b border-slate-800">
                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500">Full Name</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500">Email</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500">Authorization</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-800/20 transition-colors group">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-orange-600/20 flex items-center justify-center text-orange-500 font-bold border border-orange-500/20 shadow-inner">
                                {u.name?.charAt(0).toUpperCase() || "U"}
                              </div>
                              <span className="text-sm font-medium text-white">{u.name}</span>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-slate-400 font-mono">{u.email}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter ${u.role === 'Admin' ? 'bg-orange-600/20 text-orange-400 border border-orange-500/20' : 'bg-slate-800 text-slate-400'}`}>
                              {u.role || 'Inspector'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => handleOpenModal(u)} className="p-2 text-slate-500 hover:text-orange-500 transition-colors bg-slate-900/50 border border-slate-800 rounded-lg shadow-sm">
                                <Edit2 size={14} />
                              </button>
                              <button onClick={() => handleDelete(u.id, u.name)} className="p-2 text-slate-500 hover:text-red-500 transition-colors bg-slate-900/50 border border-slate-800 rounded-lg shadow-sm">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* --- MODAL UI --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={handleCloseModal}
              className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-tight flex items-center gap-2">
              <User size={20} className="text-orange-500" />
              {editingUser ? "Edit Profile" : "Create New Profile"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                <input 
                  required
                  type="text"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-orange-500 transition-all shadow-inner"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. John Doe"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                <input 
                  required
                  type="email"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-orange-500 transition-all shadow-inner"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="name@company.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Access Role</label>
                <select 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-orange-500 transition-all appearance-none cursor-pointer"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  <option value="Inspector">Inspector</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Administrator</option>
                </select>
              </div>

              <div className="pt-4">
                <button 
                  disabled={isSubmitting}
                  type="submit"
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3.5 rounded-xl font-bold uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-900/40 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Save size={16} />
                      {editingUser ? "Update Profile" : "Authorize User"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPage;