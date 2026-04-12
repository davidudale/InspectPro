import { useEffect, useState } from "react";
import { Save, Settings2, ToggleLeft } from "lucide-react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { db } from "../Auth/firebase";
import SuperAdminShell from "../Dashboards/SuperAdminShell";
import { getToastErrorMessage } from "../../utils/toast";

const defaultConfig = {
  maintenanceMode: false,
  allowSelfSignup: false,
  supportEmail: "",
  alertBanner: "",
  auditRetentionDays: 90,
};

const defaultFlags = {
  externalReviewsEnabled: true,
  issueLogEnabled: true,
  notificationsEnabled: true,
  reportDownloadsEnabled: true,
};

const SuperAdminSystemCenter = () => {
  const [config, setConfig] = useState(defaultConfig);
  const [flags, setFlags] = useState(defaultFlags);
  const [saving, setSaving] = useState(false);

  useEffect(
    () =>
      onSnapshot(doc(db, "system_config", "platform"), (snapshot) => {
        setConfig((current) => ({ ...current, ...(snapshot.data() || {}) }));
      }),
    [],
  );

  useEffect(
    () =>
      onSnapshot(doc(db, "feature_flags", "platform"), (snapshot) => {
        setFlags((current) => ({ ...current, ...(snapshot.data() || {}) }));
      }),
    [],
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        setDoc(
          doc(db, "system_config", "platform"),
          { ...config, updatedAt: serverTimestamp() },
          { merge: true },
        ),
        setDoc(
          doc(db, "feature_flags", "platform"),
          { ...flags, updatedAt: serverTimestamp() },
          { merge: true },
        ),
      ]);
      toast.success("Platform settings saved.");
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Unable to save platform settings."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SuperAdminShell>
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-slate-800 bg-[#0a1122] p-6 lg:p-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.36em] text-slate-500">
            Platform Control
          </p>
          <h1 className="mt-3 text-3xl font-black text-white">System Control Center</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
            Maintain global platform behavior, maintenance posture, support routing, and live feature toggles.
          </p>
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-[1.8rem] border border-slate-800 bg-[#0a1122] p-6 lg:p-7">
            <div className="mb-6 flex items-center gap-3">
              <Settings2 size={18} className="text-orange-400" />
              <h2 className="text-lg font-bold text-white">Global configuration</h2>
            </div>
            <div className="space-y-4">
              <ToggleField
                label="Maintenance mode"
                value={config.maintenanceMode}
                onChange={(checked) => setConfig((current) => ({ ...current, maintenanceMode: checked }))}
              />
              <ToggleField
                label="Allow self sign-up"
                value={config.allowSelfSignup}
                onChange={(checked) => setConfig((current) => ({ ...current, allowSelfSignup: checked }))}
              />
              <InputField
                label="Support email"
                value={config.supportEmail}
                onChange={(value) => setConfig((current) => ({ ...current, supportEmail: value }))}
                placeholder="support@inspectproedge.com"
              />
              <InputField
                label="Alert banner"
                value={config.alertBanner}
                onChange={(value) => setConfig((current) => ({ ...current, alertBanner: value }))}
                placeholder="Scheduled maintenance window notice"
              />
              <InputField
                label="Audit retention days"
                type="number"
                value={String(config.auditRetentionDays ?? 90)}
                onChange={(value) =>
                  setConfig((current) => ({
                    ...current,
                    auditRetentionDays: Number(value) || 0,
                  }))
                }
                placeholder="90"
              />
            </div>
          </section>

          <section className="rounded-[1.8rem] border border-slate-800 bg-[#0a1122] p-6 lg:p-7">
            <div className="mb-6 flex items-center gap-3">
              <ToggleLeft size={18} className="text-orange-400" />
              <h2 className="text-lg font-bold text-white">Feature flags</h2>
            </div>
            <div className="space-y-4">
              <ToggleField
                label="External reviews"
                value={flags.externalReviewsEnabled}
                onChange={(checked) => setFlags((current) => ({ ...current, externalReviewsEnabled: checked }))}
              />
              <ToggleField
                label="Support center"
                value={flags.issueLogEnabled}
                onChange={(checked) => setFlags((current) => ({ ...current, issueLogEnabled: checked }))}
              />
              <ToggleField
                label="Notifications"
                value={flags.notificationsEnabled}
                onChange={(checked) => setFlags((current) => ({ ...current, notificationsEnabled: checked }))}
              />
              <ToggleField
                label="Report downloads"
                value={flags.reportDownloadsEnabled}
                onChange={(checked) => setFlags((current) => ({ ...current, reportDownloadsEnabled: checked }))}
              />
            </div>
          </section>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl bg-orange-600 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={14} />
            {saving ? "Saving..." : "Save platform settings"}
          </button>
        </div>
      </div>
    </SuperAdminShell>
  );
};

const ToggleField = ({ label, value, onChange }) => (
  <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-4">
    <span className="text-sm font-semibold text-white">{label}</span>
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] ${
        value ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-400"
      }`}
    >
      {value ? "On" : "Off"}
    </button>
  </label>
);

const InputField = ({ label, value, onChange, placeholder, type = "text" }) => (
  <div>
    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500"
      placeholder={placeholder}
    />
  </div>
);

export default SuperAdminSystemCenter;
