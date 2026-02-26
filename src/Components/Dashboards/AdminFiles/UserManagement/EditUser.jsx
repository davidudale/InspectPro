import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../../Auth/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { ArrowLeft, Save, User } from "lucide-react";
import AdminNavbar from "../../AdminNavbar";
import AdminSidebar from "../../AdminSidebar";

const EditUser = () => {
  const { userId } = useParams(); // Grabs the ID from /admin/edit-user/:userId
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: "",
    role: "Inspector",
    email: ""
  });
  const [loading, setLoading] = useState(true);

  // 1. Fetch the existing user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          setFormData(userDoc.data());
        } else {
          toast.error("User not found");
          navigate("/admin/users");
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId, navigate]);

  // 2. Handle the update
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        name: formData.name,
        role: formData.role,
        email: formData.email
      });
      toast.success("Profile Updated Successfully");
      navigate("/admin/users");
    } catch (error) {
      toast.error("Failed to update: " + error.message);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Initializing Assistant...</div>;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <AdminNavbar />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-4 lg:p-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-2xl mx-auto">
            {/* Back Button */}
            <button 
              onClick={() => navigate("/admin/users")}
              className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors group"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              Back to User Management
            </button>

            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 backdrop-blur-sm">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-full bg-orange-600/20 flex items-center justify-center text-orange-500 border border-orange-500/20">
                  <User size={32} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Edit User Profile</h1>
                  <p className="text-sm text-slate-500">{formData.email}</p>
                </div>
              </div>

              <form onSubmit={handleUpdate} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Full Name</label>
                  <input 
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-orange-500 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Assign Access Role</label>
                  <select 
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-orange-500 outline-none transition-colors"
                  >
                    <option value="Inspector">Inspector</option>
                    <option value="Lead Inspector">Lead Inspector</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <button 
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-orange-900/20"
                >
                  <Save size={18} />
                  Save Changes
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EditUser;
