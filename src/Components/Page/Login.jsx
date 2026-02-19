import React, { useState } from "react";
import Rig from "../../assets/Rig.jpg";
import { useNavigate } from "react-router-dom";
import { ArrowBigLeftIcon, Loader2 } from "lucide-react"; // Added Loader2 icon
import { auth, db } from "../Auth/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "react-toastify";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false); // New loading state
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true); // Start loading
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const role = docSnap.data().role;
        if (role === "Admin") navigate("/admin-dashboard");
        else if (role === "Manager") navigate("/ManagerDashboard");
        else if (role === "Supervisor") navigate("/SupervisorDashboard");
        else navigate("/inspectionDashboard");
      }
    } catch (error) {
      toast.error("Login failed: " + error.message);
    } finally {
      setIsLoading(false); // Stop loading regardless of outcome
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-slate-950 text-slate-100 selection:bg-orange-500 selection:text-white rounded-md">
      {/* Background Image / Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={Rig}
          alt="Oil rig at sunset"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-950/80"></div>
      </div>

      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 opacity-30">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-900/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative z-10 w-full max-w-md p-8 sm:p-10 space-y-8 glass-effect rounded-md">
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

        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <label htmlFor="email" className="text-sm font-bold text-slate-400 uppercase tracking-widest block mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full bg-slate-900/50 border border-slate-700 px-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500 rounded-sm transition-colors disabled:opacity-50"
              placeholder="user@InspectPro.energy"
            />
          </div>

          <div>
            <label htmlFor="password" className="text-sm font-bold text-slate-400 uppercase tracking-widest block mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="w-full bg-slate-900/50 border border-slate-700 px-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500 rounded-sm transition-colors disabled:opacity-50"
              placeholder="********"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center px-10 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold uppercase tracking-widest transition-all hover:shadow-[0_0_20px_rgba(234,88,12,0.4)] rounded-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  
                </>
              ) : (
                "Login"
              )}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-slate-400">
          Need access?{" "}
          <a href="#" className="font-medium text-orange-500 hover:text-orange-400">
            Request an account
          </a>
        </p>

        <div>
          <button
            onClick={() => navigate("/")}
            disabled={isLoading}
            className="w-full px-10 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold uppercase tracking-widest transition-all rounded-sm flex items-center justify-center disabled:opacity-50"
          >
            <ArrowBigLeftIcon className="mr-2" size={20} />
            Back to HomePage
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;