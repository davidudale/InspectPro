import { React, useEffect, useState } from "react";
import AdminNavbar from "../../AdminNavbar";
import {
  ArrowBigLeftIcon,
  PlusCircle,
  Edit2,
  Trash2,
  User,
} from "lucide-react"; // Added User icon for empty state
import AdminSidebar from "../../AdminSidebar";
import { auth, db } from "../../../Auth/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { toast, ToastContainer } from "react-toastify";
import { useNavigate } from "react-router-dom";

const Adduser = () => {
  const [fname, setFname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Inspector"); // Default role
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      console.log("Registered user:", user);
      if (user) {
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          name: fname,
          role: role,
          createdAt: new Date(),
        });
      }
      // Create a user document in Firestore with the role

      alert("Registration Successful!");
      toast.success("Registration Successful! Please log in.");
      navigate("/admin/users");
    } catch (error) {
      console.error(error.message);
      toast.error(error.message);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <AdminNavbar />
      <div className="flex flex-1 relative">
        <AdminSidebar />

        {/* FIXED: Removed the extra nested flex div that was wrapping <main> */}
        <main className="flex-1 ml-16 lg:ml-64 p-4 lg:p-8 min-h-[calc(100vh-65px)] overflow-y-auto bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Add Users
              </h1>
              <button
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-lg shadow-orange-900/20 active:scale-95"
                onClick={() => navigate("/admin/users")}
              >
                <ArrowBigLeftIcon className="inline-block mr-2" size={20} />
                User Management
              </button>
            </div>
            <div className="w-[50%] mx-auto">
              <form
                className="space-y-2 flex flex-col justify-center"
                onSubmit={handleRegister}
              >
                <div>
                  <label className="text-sm font-bold text-slate-400 uppercase tracking-widest block mb-2">
                    Assign Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 px-4 py-2 text-sm text-white focus:border-orange-500 rounded-sm"
                  >
                    <option value="Inspector">Inspector</option>
                    <option value="Lead Inspector">Lead Inspector</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="text-sm font-bold text-slate-400 uppercase tracking-widest block mb-2"
                  >
                    Full Name
                  </label>
                  <input
                    id="fname"
                    name="fname"
                    type="text"
                    autoComplete="fname"
                    required
                    value={fname}
                    onChange={(e) => setFname(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 px-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500 rounded-sm transition-colors"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="text-sm font-bold text-slate-400 uppercase tracking-widest block mb-2"
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 px-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500 rounded-sm transition-colors"
                    placeholder="user@InspectPro.energy"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="text-sm font-bold text-slate-400 uppercase tracking-widest block mb-2"
                    >
                      Password
                    </label>
                    {/*<div className="text-sm">
                <a
                  href="#"
                  className="font-medium text-orange-500 hover:text-orange-400"
                >
                  Forgot password?
                </a>
              </div>*/}
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 px-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500 rounded-sm transition-colors"
                    placeholder="********"
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    className="w-full px-10 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold uppercase tracking-widest transition-all hover:shadow-[0_0_20px_rgba(234,88,12,0.4)] rounded-sm"
                  >
                    <PlusCircle className="inline-block mr-2" size={20} />
                    Add
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Adduser;
