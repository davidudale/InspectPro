import React, { useEffect, useState } from "react";
import AdminNavbar from "../../AdminNavbar";
import AdminSidebar from "../../AdminSidebar";
import { db } from "../../../Auth/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "react-toastify";

const CompanyProfile = () => {
  const [formData, setFormData] = useState({
    companyName: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    logo: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const docRef = doc(db, "companyprofile", "default");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setFormData({
            companyName: data.companyName || "",
            address: data.address || "",
            phone: data.phone || "",
            email: data.email || "",
            website: data.website || "",
            logo: data.logo || "",
          });
        }
      } catch (error) {
        toast.error("Failed to load company profile");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, "companyprofile", "default");
      await setDoc(
        docRef,
        {
          ...formData,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      toast.success("Company profile saved");
    } catch (error) {
      toast.error("Failed to save company profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <AdminNavbar />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-4 sm:p-6 lg:p-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-5xl mx-auto">
            <header className="mb-8">
              <h1 className="text-3xl font-bold uppercase tracking-tighter text-white">
                Company Profile
              </h1>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">
                System Setup
              </p>
            </header>
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-6 sm:p-8">
              <p className="text-sm text-slate-300 mb-6">
                Configure your company identity, branding, and default details
                used across reports and dashboards.
              </p>

              {loading ? (
                <div className="py-16 flex justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-orange-500"></div>
                </div>
              ) : (
                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField
                      label="Company Name"
                      value={formData.companyName}
                      onChange={(v) => handleChange("companyName", v)}
                    required
                  />
                  <InputField
                    label="Contact Phone"
                    value={formData.phone}
                    onChange={(v) => handleChange("phone", v)}
                    required
                  />
                  <InputField
                    label="Email Address"
                    type="email"
                    value={formData.email}
                    onChange={(v) => handleChange("email", v)}
                    required
                  />
                  <InputField
                    label="Website"
                    value={formData.website}
                    onChange={(v) => handleChange("website", v)}
                  />
                </div>

                <TextArea
                  label="Company Address"
                  value={formData.address}
                  onChange={(v) => handleChange("address", v)}
                  required
                />

                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Upload Company Logo
                  </label>
                  <div className="mt-3 flex items-center gap-3">
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white hover:border-orange-500 transition-colors cursor-pointer">
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            handleChange("logo", reader.result);
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                    {formData.logo && (
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                        Logo attached
                      </span>
                    )}
                  </div>
                  {formData.logo && (
                    <div className="mt-4 w-28 h-28 border border-slate-800 rounded-2xl bg-slate-900 flex items-center justify-center overflow-hidden">
                      <img
                        src={formData.logo}
                        alt="Company logo preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-orange-600 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-white hover:bg-orange-700 transition-all disabled:opacity-60"
                    >
                      {saving ? "Saving..." : "Save Profile"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

const InputField = ({ label, value, onChange, type = "text", required = false }) => (
  <div className="flex flex-col gap-2">
    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
      {label}
    </label>
    <input
      type={type}
      value={value}
      required={required}
      onChange={(e) => onChange(e.target.value)}
      className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white focus:border-orange-500 outline-none transition-all"
    />
  </div>
);

const TextArea = ({ label, value, onChange, required = false }) => (
  <div className="flex flex-col gap-2">
    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
      {label}
    </label>
    <textarea
      value={value}
      required={required}
      onChange={(e) => onChange(e.target.value)}
      rows={4}
      className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white focus:border-orange-500 outline-none transition-all resize-none"
    />
  </div>
);

export default CompanyProfile;
