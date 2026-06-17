import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../Auth/firebase";
import InternalReviewerShell from "./InternalReviewerShell";

const InternalProjects = () => {
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "projects"), (snapshot) => {
      setProjects(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
    });
    return () => unsubscribe();
  }, []);

  const filteredProjects = useMemo(
    () =>
      projects.filter((project) => {
        const haystack = [
          project.projectName,
          project.projectId,
          project.clientName,
          project.status,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(searchTerm.toLowerCase());
      }),
    [projects, searchTerm],
  );

  return (
    <InternalReviewerShell>
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-orange-400">
              Internal Reviewer Projects
            </p>
            <h1 className="mt-3 text-3xl font-black uppercase tracking-tight text-white">
              Projects
            </h1>
          </div>
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search projects..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-orange-500 sm:max-w-sm"
          />
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-950/70 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-4 py-4">Project</th>
                  <th className="px-4 py-4">Client</th>
                  <th className="px-4 py-4">Equipment</th>
                  <th className="px-4 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-white/5">
                    <td className="px-4 py-4 text-sm text-white">
                      {project.projectName || project.projectId || project.id}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-400">
                      {project.clientName || project.client || "N/A"}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-400">
                      {project.equipmentTag || project.tag || project.equipmentCategory || "N/A"}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-400">{project.status || "N/A"}</td>
                  </tr>
                ))}
                {!filteredProjects.length ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-12 text-center text-sm text-slate-500">
                      No projects found.
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

export default InternalProjects;
