import { useEffect, useRef, useState } from "react";
import React from "react";
import {
  Activity,
  ShieldCheck,
  AlertCircle,
  Terminal,
  PlusCircle,
  User,
  Clock
} from "lucide-react";
import { db, auth } from "../Auth/firebase"; // Ensure auth is exported from your firebase config
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  limit,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { formatDistanceToNow } from "date-fns"; // Recommended for "2 mins ago" formatting
import ManagerNavbar from "../Dashboards/ManagerFile/ManagerNavbar";
import ManagerSidebar from "../Dashboards/ManagerFile/ManagerSidebar";
import { useAuth } from "../Auth/AuthContext";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userCount, setUserCount] = useState(0);
  const [inspectionCount, setInspectionCount] = useState(0);
  const [equipmentCount, setEquipmentCount] = useState(0);
  const [reportCount, setReportCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [fullName, setFullName] = useState(""); // State for logged-in user's name
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [notificationQueue, setNotificationQueue] = useState([]);
  const [activeNotification, setActiveNotification] = useState(null);
  const seenInSessionRef = useRef({ forwarded: [], returned: [] });

  const getMarker = (value) => {
    if (!value) return "";
    if (typeof value?.toMillis === "function") return String(value.toMillis());
    if (typeof value === "number") return String(value);
    if (typeof value === "string") return value;
    if (value instanceof Date) return String(value.getTime());
    return "";
  };

  // 1. Fetch live user count
  useEffect(() => {
    const usersRef = collection(db, "users");
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      setUserCount(snapshot.size);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUserEmail(user?.email || "");
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUserEmail) {
      setLogs([]);
      return undefined;
    }

    const q = query(
      collection(db, "activity_logs"),
      where("userEmail", "==", currentUserEmail),
      limit(20),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const nextLogs = snapshot.docs
        .map((docItem) => ({ id: docItem.id, ...docItem.data() }))
        .sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0))
        .slice(0, 10);
      setLogs(nextLogs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUserEmail]);

  // 1. Fetch live Active Inspection count
  useEffect(() => {
    const inspectionRef = collection(db, "projects");
    const unsubscribe = onSnapshot(inspectionRef, (snapshot) => {
      setInspectionCount(snapshot.size);  
      setLoading(false);
    });

     return () => unsubscribe();
  }, []);

    // 1. Fetch live equipment count
  useEffect(() => {
    const equipmentRef = collection(db, "equipment");
    const unsubscribe = onSnapshot(equipmentRef, (snapshot) => {
      setEquipmentCount(snapshot.size);  
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  // 1. Fetch live Reports count
  useEffect(() => {
    const reportRef = collection(db, "inspection_type");
    const unsubscribe = onSnapshot(reportRef, (snapshot) => {
      setReportCount(snapshot.size);  
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

  // Login-time manager notifications: forwarded approvals and returned items.
  useEffect(() => {
    if (!user?.uid) {
      setNotificationQueue([]);
      setActiveNotification(null);
      seenInSessionRef.current = { forwarded: [], returned: [] };
      return undefined;
    }

    seenInSessionRef.current = { forwarded: [], returned: [] };

    const projectNotificationsRef = query(
      collection(db, "projects"),
      where("managerId", "==", user.uid),
      limit(100),
    );

    const unsubscribe = onSnapshot(projectNotificationsRef, (snapshot) => {
      const seen = seenInSessionRef.current;
      const nextNotifications = [];

      snapshot.docs.forEach((docItem) => {
        const project = docItem.data();
        const projectDocId = docItem.id;
        const projectLabel = project.projectName || project.projectId || projectDocId;
        const status = String(project.status || "").toLowerCase();
        const updatedMarker =
          getMarker(project.updatedAt) ||
          getMarker(project.confirmedAt) ||
          getMarker(project.lastUpdated) ||
          "na";
        const isForwardedToManager = status.startsWith("passed and forwarded to ");
        const isReturnedToLead = status.startsWith("pending confirmation");
        const forwardedSignature = `${projectDocId}|${status}|${updatedMarker}`;
        const returnedSignature = `${projectDocId}|${status}|${updatedMarker}|${project.returnNote || ""}`;

        if (isReturnedToLead && !seen.returned.includes(returnedSignature)) {
          nextNotifications.push({
            key: `returned-${projectDocId}`,
            title: "Returned To Lead Review",
            message: `Project ${projectLabel} was returned and is no longer in manager approval queue.`,
            tone: "returned",
          });
          seen.returned.push(returnedSignature);
          return;
        }

        if (isForwardedToManager && !seen.forwarded.includes(forwardedSignature)) {
          nextNotifications.push({
            key: `forwarded-${projectDocId}`,
            title: "New Approval Request",
            message: `Project ${projectLabel} has been passed and forwarded for your approval.`,
            tone: "new",
          });
          seen.forwarded.push(forwardedSignature);
        }
      });

      if (nextNotifications.length > 0) {
        const returnedFirst = [
          ...nextNotifications.filter((item) => item.tone === "returned"),
          ...nextNotifications.filter((item) => item.tone !== "returned"),
        ];

        setNotificationQueue((prev) => {
          const existingKeys = new Set(prev.map((item) => item.key));
          const dedupedIncoming = returnedFirst.filter((item) => !existingKeys.has(item.key));
          return [...prev, ...dedupedIncoming];
        });
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (activeNotification || notificationQueue.length === 0) return;
    setActiveNotification(notificationQueue[0]);
    setNotificationQueue((prev) => prev.slice(1));
  }, [activeNotification, notificationQueue]);

  const stats = [
    {
      label: "Active Inspections",
      value: loading ? "..." : inspectionCount.toString(),
      icon: <Activity className="text-orange-500" />,
      trend: "+2 today",
      href: ""
    },
    {
      label: "Reports Under Management",
      value: loading ? "..." : reportCount.toString(),
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
      value: loading ? "..." : inspectionCount.toString(),
      icon: <AlertCircle className="text-red-500" />,
      trend: "Requires Action",
      href: ""
    },
    {
      label: "Equipments Under Management",
      value: loading ? "..." : equipmentCount.toString(),
      icon: <AlertCircle className="text-red-500" />,
      trend: "Requires Action",
      href: ""
    },
    
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <ManagerNavbar />
      <div className="flex flex-1 min-h-screen">
        <ManagerSidebar />

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
              <button title="Add Inspection" aria-label="Add Inspection" className="hidden md:flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-lg shadow-orange-900/20">
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
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Terminal size={20} className="text-orange-500" />
          <h2 className="font-bold text-white uppercase tracking-tight text-sm">
            InspectPro Activity Log
          </h2>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live Feed</span>
        </div>
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar">
        {loading ? (
          <div className="py-10 text-center text-slate-600 text-xs animate-pulse uppercase">Syncing Manifests...</div>
        ) : logs.length > 0 ? (
          logs.map((log) => (
            <div
              key={log.id}
              className="flex gap-4 p-4 rounded-xl hover:bg-slate-800/40 transition-all border border-transparent hover:border-slate-700 group"
            >
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${log.type === 'alert' ? 'bg-red-500' : 'bg-orange-600'}`} />
              <div className="flex-1">
                <p className="text-sm text-slate-200 leading-tight">
                  {log.message}{" "}
                  {log.target && <span className="text-orange-400 font-bold">[{log.target}]</span>}
                </p>
                <div className="flex items-center gap-2 mt-2 text-slate-500">
                  <Clock size={10} />
                  <p className="text-[10px] font-mono uppercase tracking-tighter">
                    {log.timestamp?.toDate() 
                      ? formatDistanceToNow(log.timestamp.toDate(), { addSuffix: true }) 
                      : "just now"} 
                    {" â€¢ "} 
                    BY: {log.userEmail?.split('@')[0] || "System"}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-10 text-center text-slate-700 text-xs uppercase italic">No recent activity detected</div>
        )}
      </div>
    </div>
  
          </div>
        </main>
      </div>
      {activeNotification && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/75 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <p
              className={`text-xs font-bold uppercase tracking-[0.2em] ${
                activeNotification.tone === "returned" ? "text-rose-400" : "text-orange-400"
              }`}
            >
              Notification
            </p>
            <h3 className="mt-2 text-xl font-bold text-white">{activeNotification.title}</h3>
            <p className="mt-3 text-sm text-slate-300">{activeNotification.message}</p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setActiveNotification(null);
                  navigate("/Pending_approval");
                }}
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
              >
                Open Approvals
              </button>
              <button
                onClick={() => setActiveNotification(null)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-slate-600 hover:text-white"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
