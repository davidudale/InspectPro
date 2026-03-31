import React, { useEffect, useMemo, useState } from "react";
import AdminNavbar from "../../AdminNavbar";
import { PlusCircle, Edit2, Trash2, User, X, Save, Lock } from "lucide-react";
import AdminSidebar from "../../AdminSidebar";
import TableQueryControls from "../../../Common/TableQueryControls";
import { db, secondaryAuth } from "../../../Auth/firebase";
import {
  collection,
  onSnapshot,
  doc,
  deleteDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { toast } from "react-toastify";
import { getToastErrorMessage } from "../../../../utils/toast";
import { useConfirmDialog } from "../../../Common/ConfirmDialog";
import { groupRowsByOption, TABLE_GROUP_NONE } from "../../../../utils/tableGrouping";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../../Auth/AuthContext";
import ExternalNavbar from "../../ExternalDashboard/ExternalNavbar";
import ExternalSideBar from "../../ExternalDashboard/ExternalSideBar";

const DEFAULT_ROLE = "Inspector";
const ROLE_OPTIONS = [
  "Admin",
  "Lead Inspector",
  "Inspector",
  "Manager",
  "External_Reviewer",
];
const REVIEWER_TYPE_OPTIONS = [
  "Level_1",
  "Senior",
  "Client_Reviewer",
];

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  role: DEFAULT_ROLE,
  reviewerType: "",
};

const UserPage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const toMillis = (value) => {
    if (!value) return 0;
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    if (typeof value?.toMillis === "function") return value.toMillis();
    if (typeof value?.toDate === "function") return value.toDate().getTime();
    return 0;
  };

  const getRowTimestamp = (row) =>
    row?.updatedAt || row?.createdAt || row?.timestamp || 0;

  const formatTimestamp = (value) => {
    const millis = toMillis(value);
    if (!millis) return "—";
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(millis));
  };

  const getUserName = (user) =>
    user?.fullName || user?.displayName || user?.name || "Unnamed User";

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("all");
  const [groupBy, setGroupBy] = useState(TABLE_GROUP_NONE);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { openConfirm, ConfirmDialog } = useConfirmDialog();
  const isExternalReviewer = user?.role === "External_Reviewer";
  const availableRoleOptions = isExternalReviewer
    ? ["External_Reviewer"]
    : ROLE_OPTIONS;
  const effectiveRoleFilter = isExternalReviewer ? "External_Reviewer" : roleFilter;

  useEffect(() => {
    const requestedRole = searchParams.get("role");
    if (requestedRole) {
      setRoleFilter(requestedRole);
    }
  }, [searchParams]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
      setUsers(snapshot.docs.map((userDoc) => ({ id: userDoc.id, ...userDoc.data() })));
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: getUserName(user),
        email: user.email || "",
        password: "",
        role: user.role || DEFAULT_ROLE,
        reviewerType: user.reviewerType || "",
      });
    } else {
      setEditingUser(null);
      setFormData({
        ...EMPTY_FORM,
        role:
          searchParams.get("role") === "External_Reviewer"
            ? "External_Reviewer"
            : EMPTY_FORM.role,
      });
    }

    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData(EMPTY_FORM);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingUser) {
        const userRef = doc(db, "users", editingUser.id);
        const { password, ...profileData } = formData;
        const normalizedProfileData =
          profileData.role === "External_Reviewer"
            ? profileData
            : { ...profileData, reviewerType: "" };

        await updateDoc(userRef, {
          ...normalizedProfileData,
          name: normalizedProfileData.name,
          fullName: normalizedProfileData.name,
          displayName: normalizedProfileData.name,
          updatedAt: serverTimestamp(),
        });

        toast.success("User profile updated.");
      } else {
        const userCredential = await createUserWithEmailAndPassword(
          secondaryAuth,
          formData.email,
          formData.password,
        );

        const newUserId = userCredential.user.uid;
        const { password, ...dataToSave } = formData;
        const normalizedDataToSave =
          dataToSave.role === "External_Reviewer"
            ? dataToSave
            : { ...dataToSave, reviewerType: "" };

        await setDoc(doc(db, "users", newUserId), {
          ...normalizedDataToSave,
          name: normalizedDataToSave.name,
          fullName: normalizedDataToSave.name,
          displayName: normalizedDataToSave.name,
          createdByUserId: user?.uid || "",
          createdByUserName:
            user?.fullName || user?.name || user?.displayName || user?.email || "",
          createdByReviewerType: user?.reviewerType || "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          authUid: newUserId,
        });

        await secondaryAuth.signOut();
        toast.success("User profile created.");
      }

      handleCloseModal();
    } catch (error) {
      console.error("Critical Auth/DB Error:", error);
      if (error.code === "auth/email-already-in-use") {
        toast.error("Email is already registered.");
      } else if (error.code === "auth/weak-password") {
        toast.error("Password must be at least 6 characters.");
      } else {
        toast.error(getToastErrorMessage(error, "Unable to save the user profile."));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, name, role = "") => {
    if (String(role).toUpperCase() === "ADMIN") {
      return;
    }

    const confirmed = await openConfirm({
      title: "Remove User",
      message: `Permanently remove ${name} from the directory?`,
      confirmLabel: "Remove",
      cancelLabel: "Cancel",
      tone: "danger",
    });

    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "users", id));
      toast.success("User profile deleted.");
    } catch (error) {
      toast.error("You do not have permission to delete this user.");
    }
  };

  const filteredUsers = useMemo(
    () =>
      [...users]
        .filter((entry) => {
          const matchesRole =
            effectiveRoleFilter === "all" ||
            String(entry.role || DEFAULT_ROLE) === effectiveRoleFilter;
          const matchesCreator = !isExternalReviewer
            ? true
            : String(entry.createdByUserId || "").trim() === String(user?.uid || "").trim();
          return matchesRole && matchesCreator;
        })
        .sort(
          (a, b) =>
            toMillis(getRowTimestamp(b)) -
            toMillis(getRowTimestamp(a)),
        ),
    [effectiveRoleFilter, isExternalReviewer, user?.uid, users],
  );

  const groupedUsers = useMemo(
    () =>
      groupRowsByOption(filteredUsers, groupBy, [
        {
          value: "role",
          label: "Role",
          getValue: (user) => user.role || DEFAULT_ROLE,
          emptyLabel: DEFAULT_ROLE,
        },
      ]),
    [filteredUsers, groupBy],
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      {isExternalReviewer ? <ExternalNavbar /> : <AdminNavbar />}
      {ConfirmDialog}
      <div className="flex flex-1 relative">
        {isExternalReviewer ? <ExternalSideBar /> : <AdminSidebar />}
        <main className="flex-1 ml-16 lg:ml-64 p-4 lg:p-8 min-h-[calc(100vh-65px)] overflow-y-auto bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-white tracking-tight uppercase">
                {isExternalReviewer ? "Reviewer User Management" : "User Management"}
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
                  <p className="text-slate-500 text-sm animate-pulse uppercase tracking-widest">
                    Querying Records...
                  </p>
                </div>
              ) : (
                <>
                  <TableQueryControls
                    filters={[
                      {
                        key: "role",
                        label: "Role Filter",
                        value: roleFilter,
                        onChange: setRoleFilter,
                        options: [
                          { value: "all", label: "All Roles" },
                          ...availableRoleOptions.map((role) => ({
                            value: role,
                            label: role,
                          })),
                        ],
                      },
                    ]}
                    groupBy={groupBy}
                    onGroupByChange={setGroupBy}
                    groupOptions={[
                      { value: TABLE_GROUP_NONE, label: "No Grouping" },
                      { value: "role", label: "Role" },
                    ]}
                  />
                <div className="table-scroll-region overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900/60 border-b border-slate-800">
                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500">
                          S/N
                        </th>
                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500">
                          Full Name
                        </th>
                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500">
                          Email
                        </th>
                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500">
                          Authorization
                        </th>
                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500">
                          Date Created
                        </th>
                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500 text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {groupedUsers.map((group) => (
                        <React.Fragment key={group.key}>
                          {groupBy !== TABLE_GROUP_NONE ? (
                            <tr className="bg-slate-950/80">
                              <td
                                colSpan="6"
                                className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-orange-400"
                              >
                                {group.label} ({group.items.length})
                              </td>
                            </tr>
                          ) : null}
                        {group.items.map((user, index) => (
                          <tr
                            key={user.id}
                            className="hover:bg-slate-800/20 transition-colors group"
                          >
                            <td className="p-4 text-sm font-bold text-slate-400">
                              {index + 1}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-orange-600/20 flex items-center justify-center text-orange-500 font-bold border border-orange-500/20 shadow-inner">
                                  {getUserName(user).charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm font-medium text-white">
                                  {getUserName(user)}
                                </span>
                              </div>
                            </td>
                            <td className="p-4 text-sm text-slate-400 font-mono">
                              {user.email}
                            </td>
                            <td className="p-4">
                              <span
                                className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter ${
                                  user.role === "Admin"
                                    ? "bg-orange-600/20 text-orange-400 border border-orange-500/20"
                                    : "bg-slate-800 text-slate-400"
                                }`}
                              >
                                {user.role || DEFAULT_ROLE}
                              </span>
                            </td>
                            <td className="p-4 text-sm text-slate-400">
                              {formatTimestamp(getRowTimestamp(user))}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleOpenModal(user)}
                                  title="Edit User"
                                  aria-label={`Edit ${getUserName(user)}`}
                                  className="p-2 text-slate-500 hover:text-orange-500 transition-colors bg-slate-900/50 border border-slate-800 rounded-lg shadow-sm"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() =>
                                    handleDelete(user.id, getUserName(user), user.role)
                                  }
                                  title={
                                    String(user.role).toUpperCase() === "ADMIN"
                                      ? "Admin users cannot be deleted"
                                      : "Delete User"
                                  }
                                  aria-label={`Delete ${getUserName(user)}`}
                                  disabled={String(user.role).toUpperCase() === "ADMIN"}
                                  className={`p-2 transition-colors bg-slate-900/50 border border-slate-800 rounded-lg shadow-sm ${
                                    String(user.role).toUpperCase() === "ADMIN"
                                      ? "text-slate-700 cursor-not-allowed opacity-50"
                                      : "text-slate-500 hover:text-red-500"
                                  }`}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>

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
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                  Full Name
                </label>
                <input
                  required
                  type="text"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-orange-500 transition-all shadow-inner"
                  value={formData.name}
                  onChange={(event) =>
                    setFormData({ ...formData, name: event.target.value })
                  }
                  placeholder="e.g. John Doe"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                  Email Address
                </label>
                <input
                  required
                  type="email"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-orange-500 transition-all shadow-inner disabled:opacity-60 disabled:cursor-not-allowed"
                  value={formData.email}
                  onChange={(event) =>
                    setFormData({ ...formData, email: event.target.value })
                  }
                  placeholder="name@company.com"
                  disabled={Boolean(editingUser)}
                />
                {editingUser && (
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide ml-1">
                    Email updates are disabled here to avoid auth mismatch.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                  Access Password
                </label>
                <div className="relative">
                  <input
                    required={!editingUser}
                    type="password"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 pl-10 text-sm text-white focus:outline-none focus:border-orange-500 transition-all shadow-inner"
                    value={formData.password}
                    onChange={(event) =>
                      setFormData({ ...formData, password: event.target.value })
                    }
                    placeholder={
                      editingUser
                        ? "Leave blank to keep current password"
                        : "••••••••"
                    }
                  />
                  <Lock
                    size={14}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"
                  />
                </div>
                {editingUser && (
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide ml-1">
                    Password changes are not available from this form.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                  Access Role
                </label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-orange-500 transition-all appearance-none cursor-pointer"
                  value={formData.role}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      role: event.target.value,
                      reviewerType:
                        event.target.value === "External_Reviewer"
                          ? formData.reviewerType
                          : "",
                    })
                  }
                >
                  {availableRoleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              {formData.role === "External_Reviewer" ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    Reviewer Type
                  </label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-orange-500 transition-all appearance-none cursor-pointer"
                    value={formData.reviewerType}
                    onChange={(event) =>
                      setFormData({ ...formData, reviewerType: event.target.value })
                    }
                  >
                    <option value="">Select reviewer type</option>
                    {REVIEWER_TYPE_OPTIONS.map((reviewerType) => (
                      <option key={reviewerType} value={reviewerType}>
                        {reviewerType}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

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
