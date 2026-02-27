import { React, useEffect, useState } from "react";
import AdminNavbar from "../../AdminNavbar";
import { PlusCircle, Edit2, Trash2, User, X, Save, Lock } from "lucide-react";
import AdminSidebar from "../../AdminSidebar";
import { db, auth, secondaryAuth } from "../../../Auth/firebase"; // NEW: Ensure 'auth' is exported from your firebase config
import { 
  collection, onSnapshot, doc, deleteDoc, 
  setDoc, updateDoc, serverTimestamp 
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth"; // NEW: Auth function
import { toast } from "react-toastify";

const UserPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); 
  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "Inspector" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
      setUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({ 
        name: user.name || "", 
        email: user.email || "", 
        password: "HIDDEN_PASSWORD", // Password should not be visible for existing users
        role: user.role || "Inspector" 
      });
    } else {
      setEditingUser(null);
      setFormData({ name: "", email: "", password: "", role: "Inspector" });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({ name: "", email: "", password: "", role: "Inspector" });
  };

  // --- RESTRUCTURED SUBMISSION LOGIC ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (editingUser) {
        // --- EDIT LOGIC (Updates profile, not the Auth password) ---
        const userRef = doc(db, "users", editingUser.id);
        const { password, ...profileData } = formData; // Exclude password from Firestore update
        await updateDoc(userRef, {
          ...profileData,
          updatedAt: serverTimestamp()
        });
        toast.success("User profile updated");
      } else {
        // --- NEW USER LOGIC (Auth + Firestore) ---
        
        // 1. Create credentials using the background instance
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth, // CRITICAL CHANGE
        formData.email, 
        formData.password
      );
        
        const newUserId = userCredential.user.uid;

        // 2. Create the profile in Firestore using the SAME UID
        const { password, ...dataToSave } = formData; // Remove plain-text password before saving
        await setDoc(doc(db, "users", newUserId), {
          ...dataToSave,
          createdAt: serverTimestamp(),
          authUid: newUserId
        });

        // 3. IMPORTANT: Sign out the secondary instance immediately
      // This prevents the secondary instance from holding onto the new user's state
      await secondaryAuth.signOut();
        toast.success("User Authenticated & Profile Created");
      }
      handleCloseModal();
    } catch (error) {
      console.error("Critical Auth/DB Error:", error);
      // Handle common Firebase errors
      if (error.code === 'auth/email-already-in-use') toast.error("Email is already registered.");
      else if (error.code === 'auth/weak-password') toast.error("Password must be at least 6 characters.");
      else toast.error("Deployment failure: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ... rest of the component (Delete handler and Return UI) remain same as previous version
  const handleDelete = async (id, name) => {
    if (window.confirm(`Permanently remove ${name} from the directory?`)) {
      try {
        await deleteDoc(doc(db, "users", id));
        toast.success("User credentials purged");
      } catch (error) {
        toast.error("Access denied: Deletion failed");
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
                title="Add User"
                aria-label="Add User"
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
                              <button onClick={() => handleOpenModal(u)} title="Edit User" aria-label={`Edit ${u.name}`} className="p-2 text-slate-500 hover:text-orange-500 transition-colors bg-slate-900/50 border border-slate-800 rounded-lg shadow-sm">
                                <Edit2 size={14} />
                              </button>
                              <button onClick={() => handleDelete(u.id, u.name)} title="Delete User" aria-label={`Delete ${u.name}`} className="p-2 text-slate-500 hover:text-red-500 transition-colors bg-slate-900/50 border border-slate-800 rounded-lg shadow-sm">
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
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Access Password</label>
                <div className="relative">
                  <input 
                    required
                    type="password"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 pl-10 text-sm text-white focus:outline-none focus:border-orange-500 transition-all shadow-inner"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  />
                  <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Access Role</label>
                <select 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-orange-500 transition-all appearance-none cursor-pointer"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  <option value="Inspector">Inspector</option>
                  <option value="Lead Inspector">Lead Inspector</option>
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
