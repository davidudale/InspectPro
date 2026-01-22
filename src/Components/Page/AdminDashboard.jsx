import { useEffect, useState } from "react";
import React from "react";
import {
  Activity,
  ShieldCheck,
  AlertCircle,
  Terminal,
  PlusCircle,
  User,
} from "lucide-react";
import AdminNavbar from "../Dashboards/AdminNavbar";
import AdminSidebar from "../Dashboards/AdminSidebar";
import { db, auth } from "../Auth/firebase"; // Ensure auth is exported from your firebase config
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const AdminDashboard = () => {
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState(""); // State for logged-in user's name

  // 1. Fetch live user count
  useEffect(() => {
    const usersRef = collection(db, "users");
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      setUserCount(snapshot.size);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Fetch logged-in user's Full Name
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            // Assuming your Firestore field is called 'fullName'
            setFullName(docSnap.data().fullName || docSnap.data().name || "Admin");
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const stats = [
    {
      label: "Active Inspections",
      value: "12",
      icon: <Activity className="text-orange-500" />,
      trend: "+2 today",
      href: ""
    },
    {
      label: "Reports Under Management",
      value: "5",
      icon: <ShieldCheck className="text-emerald-500" />,
      trend: "Optimal",
      href: ""
    },
    {
      label: "System Users",
      value: loading ? "..." : userCount.toString(),
      icon: <User className="text-blue-500" />,
      trend: "Live Data",
      href: "/admin/users"
    },
    {
      label: "Projects",
      value: "3",
      icon: <AlertCircle className="text-red-500" />,
      trend: "Requires Action",
      href: ""
    },
    {
      label: "Equipments Under Management",
      value: "3",
      icon: <AlertCircle className="text-red-500" />,
      trend: "Requires Action",
      href: ""
    },
    {
      label: "Users",
      value: "3",
      icon: <AlertCircle className="text-red-500" />,
      trend: "Requires Action",
      href: "/admin/users"
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <AdminNavbar />
      <div className="flex flex-1 min-h-screen">
        <AdminSidebar />

        <main className="flex-1 ml-16 lg:ml-64 p-4 lg:p-8 min-h-[calc(100vh-65px)] overflow-y-auto bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-7xl mx-auto">
            <header className="flex justify-between items-end mb-8">
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  System Overview
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                  Welcome back, <span className="text-orange-500 font-semibold">{fullName || "Admin"}</span>.
                </p>
              </div>
              <button className="hidden md:flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-lg shadow-orange-900/20">
                <PlusCircle size={18} />
                New Inspection
              </button>
            </header>

            {/* Metric Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {stats.map((stat, idx) => (
                <div
                  key={idx}
                  className="group p-6 rounded-2xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 group-hover:border-orange-500/50 transition-colors">
                     <a href={stat.href}>{stat.icon}</a>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {stat.trend}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-tight">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Assistant Activity Log Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Terminal size={20} className="text-orange-500" />
                  <h2 className="font-bold text-white">
                    Assistant Activity Log
                  </h2>
                </div>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex gap-4 p-3 rounded-xl hover:bg-slate-800/30 transition-colors border-l-2 border-transparent hover:border-orange-500"
                    >
                      <div className="w-2 h-2 rounded-full bg-orange-600 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-sm text-slate-200">
                          System scan completed for{" "}
                          <span className="text-orange-400">Node_04</span>
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono mt-1">
                          2 mins ago • ID: #4492
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col justify-center items-center text-center">
                <div className="w-16 h-16 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center mb-4">
                  <Activity className="text-slate-600" size={32} />
                </div>
                <h3 className="text-white font-bold">Analytics Engine</h3>
                <p className="text-slate-500 text-sm mt-2 max-w-[250px]">
                  Connect your assistant to view real-time data visualization
                  charts.
                </p>
                <button className="mt-6 text-orange-500 text-xs font-bold uppercase tracking-widest hover:underline">
                  Configure Widget
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;