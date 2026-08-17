import React, { useState } from "react";
import Rig from "../../assets/Rig.jpg";
import { useNavigate } from "react-router-dom";
import { ArrowBigLeftIcon } from "lucide-react";
import { auth, authPersistenceReady, db } from "../Auth/firebase";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { getToastErrorMessage } from "../../utils/toast";
import { useConfirmDialog } from "../Common/ConfirmDialog";
import { getVerificationActionCodeSettings } from "../../utils/emailVerification";

const Register = () => {
  const [fname, setFname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Inspector"); // Default role
  const [reviewerType, setReviewerType] = useState("");
  const navigate = useNavigate();
  const { openConfirm, ConfirmDialog } = useConfirmDialog();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await authPersistenceReady;
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
          reviewerType: role === "External_Reviewer" ? reviewerType : "",
          isOnline: false,
          presenceState: "offline",
          lastSeen: serverTimestamp(),
          lastActiveAt: serverTimestamp(),
          emailNotificationsEnabled: true,
          notificationChannels: {
            email: true,
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          authUid: user.uid,
        });

        if (role !== "Admin") {
          await sendEmailVerification(user, getVerificationActionCodeSettings());
          await auth.signOut();
        }
      }

      if (role === "Admin") {
        toast.success("Registration successful.");
        navigate("/admin-dashboard");
      } else {
        toast.success("Registration successful. Verification email sent.");
        await openConfirm({
          title: "Verify Your Email",
          message: "Registration successful. Please verify your email before signing in.",
          confirmLabel: "OK",
          showCancel: false,
          tone: "success",
        });
        navigate("/login");
      }
    } catch (error) {
      console.error(error.message);
      toast.error(getToastErrorMessage(error, "Unable to complete registration."));
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-slate-950 text-slate-100 selection:bg-orange-500 selection:text-white">
      {ConfirmDialog}
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

      <div className="relative z-10 w-full max-w-md p-8 sm:p-10 space-y-8 glass-effect rounded-2xl">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-700 rounded-sm flex items-center justify-center transform rotate-45">
              <div className="w-3 h-3 bg-white rounded-full -rotate-45"></div>
            </div>

            <span className="text-2xl font-syncopate font-bold tracking-tighter text-white">
              InspectProEdge<span className="text-orange-500">.</span>
            </span>
          </div>
          <h2 className="text-l text-slate-300">Secure Corporate Portal</h2>
        </div>

        <form className="space-y-4" onSubmit={handleRegister}>
          <div>
            <label className="text-sm font-bold text-slate-400 uppercase tracking-widest block mb-2">
              Assign Role
            </label>
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                if (e.target.value !== "External_Reviewer") {
                  setReviewerType("");
                }
              }}
              className="w-full bg-slate-900/50 border border-slate-700 px-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500 rounded-xl"
            >
              <option value="Admin">Admin</option>
              <option value="Lead Inspector">Lead Inspector</option>
              <option value="Inspector">Inspector</option>
              <option value="Manager">Manager</option>
              <option value="External_Reviewer">External_Reviewer</option>
              <option value="Internal_Reviewer">Internal_Reviewer</option>
            </select>
          </div>
          {role === "External_Reviewer" ? (
            <div>
              <label className="text-sm font-bold text-slate-400 uppercase tracking-widest block mb-2">
                Reviewer Type
              </label>
              <select
                value={reviewerType}
                onChange={(e) => setReviewerType(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 px-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500 rounded-xl"
              >
                <option value="">Select reviewer type</option>
                <option value="Verification Lead Officer">Verification Lead Officer</option>
                <option value="Verification officer_1">Verification officer_1</option>
                <option value="Verification officer_2">Verification officer_2</option>
                <option value="Verification officer_3">Verification officer_3</option>
                <option value="Verification officer_4">Verification officer_4</option>
                <option value="Verification officer_5">Verification officer_5</option>
                <option value="Verification officer_6">Verification officer_6</option>
                <option value="Verification officer_7">Verification officer_7</option>
              </select>
            </div>
          ) : null}
          <div>
            <label
              htmlFor="fname"
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
              className="w-full bg-slate-900/50 border border-slate-700 px-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500 rounded-xl transition-colors"
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
              className="w-full bg-slate-900/50 border border-slate-700 px-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500 rounded-xl transition-colors"
              placeholder="user@InspectProEdge.energy"
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
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 px-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500 rounded-xl transition-colors"
              placeholder="********"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full px-10 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold uppercase tracking-widest transition-all hover:shadow-[0_0_20px_rgba(234,88,12,0.4)] rounded-xl"
            >
              Register
            </button>
          </div>
        </form>

        <div>
          <button
            onClick={() => navigate("/login")}
            className="w-full px-10 py-3 bg-slate-900/80 border border-slate-800 hover:bg-slate-800 text-white font-bold uppercase tracking-widest transition-all rounded-xl flex items-center justify-center"
          >
            <ArrowBigLeftIcon className="inline-block mr-2" size={20} />
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register;
