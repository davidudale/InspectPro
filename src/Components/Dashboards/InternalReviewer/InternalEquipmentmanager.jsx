import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../Auth/firebase";
import InternalReviewerShell from "./InternalReviewerShell";

const InternalEquipmentmanager = () => {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "projects"), (snapshot) => {
      setProjects(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
    });
    return () => unsubscribe();
  }, []);

  const equipmentRows = useMemo(() => {
    const rowsByKey = new Map();
    projects.forEach((project) => {
      const key = String(project.equipmentId || project.equipmentTag || project.tag || project.id).trim();
      if (!key || rowsByKey.has(key)) return;
      rowsByKey.set(key, {
        key,
        tag: project.equipmentTag || project.tag || "N/A",
        category: project.equipmentCategory || project.assetType || "N/A",
        client: project.clientName || project.client || "N/A",
        project: project.projectName || project.projectId || "N/A",
      });
    });
    return Array.from(rowsByKey.values());
  }, [projects]);

  return (
    <InternalReviewerShell>
      <div className="mx-auto max-w-7xl">
        <p className="text-[10px] font-black uppercase tracking-[0.26em] text-orange-400">
          Internal Equipment Scope
        </p>
        <h1 className="mt-3 text-3xl font-black uppercase tracking-tight text-white">
          Equipments
        </h1>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-950/70 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-4 py-4">Tag</th>
                  <th className="px-4 py-4">Category</th>
                  <th className="px-4 py-4">Client</th>
                  <th className="px-4 py-4">Project</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {equipmentRows.map((row) => (
                  <tr key={row.key} className="hover:bg-white/5">
                    <td className="px-4 py-4 text-sm text-white">{row.tag}</td>
                    <td className="px-4 py-4 text-sm text-slate-400">{row.category}</td>
                    <td className="px-4 py-4 text-sm text-slate-400">{row.client}</td>
                    <td className="px-4 py-4 text-sm text-slate-400">{row.project}</td>
                  </tr>
                ))}
                {!equipmentRows.length ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-12 text-center text-sm text-slate-500">
                      No equipment found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </InternalReviewerShell>
  );
};

export default InternalEquipmentmanager;
