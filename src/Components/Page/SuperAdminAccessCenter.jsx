import { useEffect, useMemo, useState } from "react";
import { Save, ShieldCheck, UserCog, Users } from "lucide-react";
import { collection, doc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { db } from "../Auth/firebase";
import { useAuth } from "../Auth/AuthContext";
import SuperAdminShell from "../Dashboards/SuperAdminShell";
import { getToastErrorMessage } from "../../utils/toast";

const ROLE_OPTIONS = [
  "Super_Admin",
  "Admin",
  "Manager",
  "Lead Inspector",
  "Inspector",
  "External_Reviewer",
];

const SuperAdminAccessCenter = () => {
  const { user } = useAuth();
  const [usersData, setUsersData] = useState([]);
  const [pendingRoles, setPendingRoles] = useState({});
  const [savingUserId, setSavingUserId] = useState("");

  useEffect(
    () =>
      onSnapshot(collection(db, "users"), (snapshot) => {
        const nextUsers = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
        setUsersData(nextUsers);
        setPendingRoles((current) => {
          const next = { ...current };
          nextUsers.forEach((entry) => {
            if (!next[entry.id]) {
              next[entry.id] = entry.role || "Inspector";
            }
          });
          return next;
        });
      }),
    [],
  );

  const elevatedUsers = useMemo(
    () => usersData.filter((entry) => ["Super_Admin", "Admin"].includes(String(entry.role || ""))),
    [usersData],
  );

  const handleSaveRole = async (entry) => {
    const nextRole = pendingRoles[entry.id] || entry.role || "Inspector";
    setSavingUserId(entry.id);
    try {
      await updateDoc(doc(db, "users", entry.id), {
        role: nextRole,
        reviewerType: nextRole === "External_Reviewer" ? entry.reviewerType || "" : "",
        updatedAt: serverTimestamp(),
      });
      toast.success("User role updated.");
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Unable to update the user role."));
    } finally {
      setSavingUserId("");
    }
  };

  return (
    <SuperAdminShell>
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-slate-800 bg-[#0a1122] p-6 lg:p-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.36em] text-slate-500">
            Access Control
          </p>
          <h1 className="mt-3 text-3xl font-black text-white">Platform Access Center</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
            Govern elevated roles, keep operational access tidy, and maintain ownership coverage across the app.
          </p>
        </section>

        {/*<div className="grid gap-5 md:grid-cols-3">
          <AccessStat
            icon={<ShieldCheck size={16} className="text-orange-400" />}
            label="Super Admins"
            value={String(elevatedUsers.filter((entry) => entry.role === "Super_Admin").length)}
          />
          <AccessStat
            icon={<UserCog size={16} className="text-orange-400" />}
            label="Admins"
            value={String(elevatedUsers.filter((entry) => entry.role === "Admin").length)}
          />
          <AccessStat
            icon={<Users size={16} className="text-orange-400" />}
            label="Total Users"
            value={String(usersData.length)}
          />
        </div>*/}

        <section className="rounded-[1.8rem] border border-slate-800 bg-[#0a1122] p-6 lg:p-7">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.36em] text-slate-500">
                Role Governance
              </p>
              <h2 className="mt-3 text-2xl font-black text-white">Elevated and managed accounts</h2>
            </div>
            <p className="text-sm text-slate-400">Signed in as {user?.email}</p>
          </div>

          <div className="overflow-hidden rounded-[1.5rem] border border-slate-800 bg-slate-950/60">
            <div className="table-scroll-region max-h-[38rem] overflow-x-auto overflow-y-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/70">
                    <th className="p-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Name
                    </th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Email
                    </th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Current Role
                    </th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Pending Role
                    </th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Verification
                    </th>
                    <th className="p-4 text-right text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {usersData.map((entry) => (
                    <tr key={entry.id} className="transition-colors hover:bg-slate-900/40">
                      <td className="p-4">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {entry.fullName || entry.name || entry.email || "Unnamed user"}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                            {entry.id}
                          </p>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-400">{entry.email || "No email"}</td>
                      <td className="p-4">
                        <span className="inline-flex rounded-full border border-slate-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300">
                          {entry.role || "Inspector"}
                        </span>
                      </td>
                      <td className="p-4">
                        <select
                          value={pendingRoles[entry.id] || entry.role || "Inspector"}
                          onChange={(event) =>
                            setPendingRoles((current) => ({
                              ...current,
                              [entry.id]: event.target.value,
                            }))
                          }
                          className="w-full min-w-[11rem] rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500"
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                            entry.emailVerified
                              ? "bg-emerald-500/10 text-emerald-300"
                              : "bg-amber-500/10 text-amber-300"
                          }`}
                        >
                          {entry.emailVerified ? "Verified" : "Unverified"}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleSaveRole(entry)}
                          disabled={savingUserId === entry.id}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Save size={14} />
                          {savingUserId === entry.id ? "Saving..." : "Save Role"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </SuperAdminShell>
  );
};

const AccessStat = ({ icon, label, value }) => (
  <div className="rounded-[1.6rem] border border-slate-800 bg-[#0a1122] px-6 py-6">
    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-950">
      {icon}
    </div>
    <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
    <p className="mt-2 text-3xl font-black text-white">{value}</p>
  </div>
);

export default SuperAdminAccessCenter;
