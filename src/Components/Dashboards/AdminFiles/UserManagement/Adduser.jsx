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
import { db, secondaryAuth } from "../../../Auth/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { getToastErrorMessage } from "../../../../utils/toast";
import { useConfirmDialog } from "../../../Common/ConfirmDialog";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../Auth/AuthContext";
import ExternalSideBar from "../../ExternalDashboard/ExternalSideBar";
import ExternalNavbar from "../../ExternalDashboard/ExternalNavbar";

const Adduser = () => {
  const { user: currentUser } = useAuth();
  const [fname, setFname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Inspector"); // Default role
  const [reviewerType, setReviewerType] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clients, setClients] = useState([]);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { openConfirm, ConfirmDialog } = useConfirmDialog();
  const isExternalReviewer = currentUser?.role === "External_Reviewer";
  const roleOptions = isExternalReviewer
    ? ["External_Reviewer"]
    : ["Admin", "Lead Inspector", "Inspector", "Manager", "External_Reviewer"];

  useEffect(() => {
    const requestedRole = searchParams.get("role");
    if (requestedRole) {
      setRole(requestedRole);
    }
  }, [searchParams]);
  useEffect(() => {
    const unsubClients = onSnapshot(collection(db, "clients"), (snapshot) => {
      setClients(snapshot.docs.map((clientDoc) => ({ id: clientDoc.id, ...clientDoc.data() })));
    });

    return () => unsubClients();
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        password
      );
      const createdUser = userCredential.user;
      console.log("Registered user:", createdUser);
      if (createdUser) {
        await setDoc(doc(db, "users", createdUser.uid), {
          email: createdUser.email,
          name: fname,
          role: role,
          reviewerType: role === "External_Reviewer" ? reviewerType : "",
          clientId: role === "External_Reviewer" ? clientId : "",
          clientName: role === "External_Reviewer" ? clientName : "",
          createdByUserId: currentUser?.uid || "",
          createdByUserName:
            currentUser?.fullName ||
            currentUser?.name ||
            currentUser?.displayName ||
          currentUser?.email ||
            "",
          createdByReviewerType: currentUser?.reviewerType || "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          authUid: createdUser.uid,
        });
        await secondaryAuth.signOut();
      }
      // Create a user document in Firestore with the role

      toast.success("Registration successful. Please sign in.");
      await openConfirm({
        title: "Registration Successful",
        message: "Registration Successful! Please log in.",
        confirmLabel: "OK",
        showCancel: false,
        tone: "success",
      });
      navigate("/admin/users");
    } catch (error) {
      console.error(error.message);
      toast.error(getToastErrorMessage(error, "Unable to complete registration."));
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      {isExternalReviewer ? <ExternalNavbar /> : <AdminNavbar />}
      {ConfirmDialog}
      <div className="flex flex-1 relative">
        {isExternalReviewer ? <ExternalSideBar /> : <AdminSidebar />}

        {/* FIXED: Removed the extra nested flex div that was wrapping <main> */}
        <main className="flex-1 ml-16 lg:ml-64 p-4 lg:p-8 min-h-[calc(100vh-65px)] overflow-y-auto bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Add Users
              </h1>
              <button
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-lg shadow-orange-900/20 active:scale-95"
                onClick={() =>
                  navigate(
                    isExternalReviewer
                      ? "/admin/users?role=External_Reviewer"
                      : "/admin/users",
                  )
                }
              >
                <ArrowBigLeftIcon className="inline-block mr-2" size={20} />
                {isExternalReviewer ? "Reviewer Directory" : "User Management"}
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
                    onChange={(e) => {
                      setRole(e.target.value);
                      if (e.target.value !== "External_Reviewer") {
                        setReviewerType("");
                        setClientId("");
                        setClientName("");
                      }
                    }}
                    className="w-full bg-slate-900/50 border border-slate-700 px-4 py-2 text-sm text-white focus:border-orange-500 rounded-sm"
                  >
                    {roleOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                {role === "External_Reviewer" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-bold text-slate-400 uppercase tracking-widest block mb-2">
                        Reviewer Type
                      </label>
                      <select
                        value={reviewerType}
                        onChange={(e) => setReviewerType(e.target.value)}
                        className="w-full bg-slate-900/50 border border-slate-700 px-4 py-2 text-sm text-white focus:border-orange-500 rounded-sm"
                      >
                        <option value="">Select reviewer type</option>
                        <option value="Verification Lead Officer">Verification Lead Officer</option>
                        <option value="Verification officer_1">Verification officer_1</option>
                        <option value="Verification officer_2">Verification officer_2</option>
                        <option value="Verification officer_3">Verification officer_3</option>
                        <option value="Verification officer_4">Verification officer_4</option>
                        <option value="Verification officer_5">Verification officer_5</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-400 uppercase tracking-widest block mb-2">
                        Assigned Client
                      </label>
                      <select
                        value={clientId}
                        onChange={(e) => {
                          const selectedClient = clients.find(
                            (client) => client.id === e.target.value,
                          );
                          setClientId(e.target.value);
                          setClientName(selectedClient?.name || "");
                        }}
                        className="w-full bg-slate-900/50 border border-slate-700 px-4 py-2 text-sm text-white focus:border-orange-500 rounded-sm"
                      >
                        <option value="">Select client</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : null}
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
