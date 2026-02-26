import React, { useState } from "react";
import Rig from "../../assets/Rig.jpg";
import { useNavigate } from "react-router-dom";
import { ArrowBigLeftIcon } from "lucide-react";
import { auth, db } from "../Auth/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { toast, ToastContainer } from "react-toastify";

const Register = () => {
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
      navigate("/admin-dashboard");
    } catch (error) {
      console.error(error.message);
      toast.error(error.message);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-slate-950 text-slate-100 selection:bg-orange-500 selection:text-white">
      {/* Background Image / Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={Rig}
          alt="Oil rig at sunset"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-950/80"></div>
      </div>

      {/* Decorative background elements */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 opacity-30">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-900/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative z-10 w-full max-w-md p-8 sm:p-10 space-y-8 glass-effect rounded-sm">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <div className="w-10 h-5 bg-gradient-to-br from-orange-500 to-orange-700 rounded-sm flex items-center justify-center transform rotate-45">
              <div className="w-4 h-4 bg-white rounded-full -rotate-45"></div>
            </div>

            <span className="text-2xl font-syncopate font-bold tracking-tighter text-white capitalize">
              InspectPro <span className="text-orange-500">.</span>
            </span>
          </div>
          <h2 className="text-l text-slate-300">Secure Corporate Portal</h2>
        </div>

        <form className="space-y-2" onSubmit={handleRegister}>
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
              Register
            </button>
          </div>
        </form>
{/*
        <p className="text-center text-sm text-slate-400">
          Need access?{" "}
          <a
            href="#"
            className="font-medium text-orange-500 hover:text-orange-400"
          >
            Request an account
          </a>
        </p>*/}
        <div>
          <button
            onClick={() => navigate("/login")}
            className="w-full px-10 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold uppercase tracking-widest transition-all hover:shadow-[0_0_20px_rgba(234,88,12,0.4)] rounded-sm"
          >
            <ArrowBigLeftIcon className="inline-block mr-2" size={20} />
            Back to User Management
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register;
