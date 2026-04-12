import { useEffect, useMemo, useState } from "react";
import { Activity, Siren, TimerReset } from "lucide-react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { db } from "../Auth/firebase";
import SuperAdminShell from "../Dashboards/SuperAdminShell";

const toDate = (value) => value?.toDate?.() || null;

const SuperAdminAuditCenter = () => {
  const [activityLogs, setActivityLogs] = useState([]);
  const [issueLogs, setIssueLogs] = useState([]);

  useEffect(
    () =>
      onSnapshot(
        query(collection(db, "activity_logs"), orderBy("timestamp", "desc"), limit(20)),
        (snapshot) => setActivityLogs(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }))),
      ),
    [],
  );

  useEffect(
    () =>
      onSnapshot(
        query(collection(db, "issue_logs"), orderBy("createdAt", "desc"), limit(20)),
        (snapshot) => setIssueLogs(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }))),
      ),
    [],
  );

  const mergedFeed = useMemo(() => {
    const activityItems = activityLogs.map((entry) => ({
      id: `activity-${entry.id}`,
      kind: "Activity",
      title: entry.action || "Platform activity",
      description: entry.description || entry.details || entry.message || "Operational event captured.",
      actor: entry.userEmail || entry.userName || entry.userId || "Unknown actor",
      timestamp: entry.timestamp,
    }));
    const issueItems = issueLogs.map((entry) => ({
      id: `issue-${entry.id}`,
      kind: "Issue",
      title: entry.title || entry.subject || "Support issue",
      description: entry.description || entry.message || "Support event captured.",
      actor: entry.reportedByEmail || entry.reportedBy || entry.email || "Unknown reporter",
      timestamp: entry.createdAt,
    }));

    return [...activityItems, ...issueItems]
      .sort((left, right) => (toDate(right.timestamp)?.getTime() || 0) - (toDate(left.timestamp)?.getTime() || 0))
      .slice(0, 24);
  }, [activityLogs, issueLogs]);

  return (
    <SuperAdminShell>
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-slate-800 bg-[#0a1122] p-6 lg:p-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.36em] text-slate-500">
            Audit Console
          </p>
          <h1 className="mt-3 text-3xl font-black text-white">Operational Audit Feed</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
            Watch the most recent platform actions and support escalations in one live governance feed.
          </p>
        </section>

        <div className="grid gap-5 md:grid-cols-3">
          <AuditStat icon={<Activity size={16} className="text-orange-400" />} label="Activity events" value={String(activityLogs.length)} />
          <AuditStat icon={<Siren size={16} className="text-orange-400" />} label="Issue events" value={String(issueLogs.length)} />
          <AuditStat icon={<TimerReset size={16} className="text-orange-400" />} label="Combined feed" value={String(mergedFeed.length)} />
        </div>

        <section className="rounded-[1.8rem] border border-slate-800 bg-[#0a1122] p-6 lg:p-7">
          <div className="space-y-4">
            {mergedFeed.map((entry) => (
              <div key={entry.id} className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${
                        entry.kind === "Issue"
                          ? "bg-rose-500/10 text-rose-300"
                          : "bg-sky-500/10 text-sky-300"
                      }`}>
                        {entry.kind}
                      </span>
                      <p className="text-base font-semibold text-white">{entry.title}</p>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-400">{entry.description}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-500">
                      Actor: <span className="text-slate-300">{entry.actor}</span>
                    </p>
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    {toDate(entry.timestamp)
                      ? formatDistanceToNow(toDate(entry.timestamp), { addSuffix: true })
                      : "No timestamp"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </SuperAdminShell>
  );
};

const AuditStat = ({ icon, label, value }) => (
  <div className="rounded-[1.6rem] border border-slate-800 bg-[#0a1122] px-6 py-6">
    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-950">
      {icon}
    </div>
    <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
    <p className="mt-2 text-3xl font-black text-white">{value}</p>
  </div>
);

export default SuperAdminAuditCenter;
