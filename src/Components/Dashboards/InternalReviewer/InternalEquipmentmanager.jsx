import React, { useEffect, useMemo, useState } from "react";
import { Boxes, Briefcase, MapPin, PackageSearch } from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../Auth/firebase";
import ControlCenterTableShell from "../../Common/ControlCenterTableShell";
import TableQueryControls from "../../Common/TableQueryControls";
import { groupRowsByOption, TABLE_GROUP_NONE } from "../../../utils/tableGrouping";
import InternalReviewerNavbar from "./InternalReviewerNavbar";
import InternalReviewerSidebar from "./InternalReviewerSidebar";

const InternalEquipmentmanager = () => {
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [groupBy, setGroupBy] = useState(TABLE_GROUP_NONE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "projects"), (snapshot) => {
      setProjects(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
      setLoading(false);
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
        location: project.locationName || "N/A",
        project: project.projectName || project.projectId || "N/A",
        status: project.status || "N/A",
      });
    });
    return Array.from(rowsByKey.values()).sort((a, b) => a.tag.localeCompare(b.tag));
  }, [projects]);

  const clientOptions = useMemo(
    () =>
      Array.from(new Set(equipmentRows.map((row) => row.client).filter(Boolean))).map((client) => ({
        value: client.toLowerCase(),
        label: client,
      })),
    [equipmentRows],
  );

  const filteredRows = useMemo(
    () =>
      equipmentRows
        .filter((row) => {
          const haystack = [row.tag, row.category, row.client, row.location, row.project, row.status]
            .join(" ")
            .toLowerCase();
          return haystack.includes(searchTerm.toLowerCase());
        })
        .filter((row) => clientFilter === "all" || row.client.toLowerCase() === clientFilter),
    [clientFilter, equipmentRows, searchTerm],
  );

  const groupedRows = useMemo(
    () =>
      groupRowsByOption(filteredRows, groupBy, [
        {
          value: "client",
          label: "Client",
          getValue: (row) => row.client,
          emptyLabel: "Unassigned Client",
        },
        {
          value: "category",
          label: "Category",
          getValue: (row) => row.category,
          emptyLabel: "Uncategorized",
        },
      ]),
    [filteredRows, groupBy],
  );

  return (
    <ControlCenterTableShell
      navbar={<InternalReviewerNavbar />}
      sidebar={<InternalReviewerSidebar />}
      title="Internal Equipment Scope"
      subtitle="Inspect equipment linked to projects visible to internal reviewers."
      icon={<PackageSearch size={18} />}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Search equipment..."
      summary={`${filteredRows.length} Equipment Item${filteredRows.length === 1 ? "" : "s"}`}
      loading={loading}
      hasData={filteredRows.length > 0}
      emptyTitle="No Equipment Found"
      emptyDescription="Equipment linked to visible projects will appear here."
      sectionTitle="Equipment Register"
      sectionSubtitle="Unique equipment references derived from project records."
      sectionBadgeLabel="Visible"
      sectionBadgeValue={filteredRows.length}
      toolbar={
        <TableQueryControls
          filters={[
            {
              key: "client",
              label: "Client Filter",
              value: clientFilter,
              onChange: setClientFilter,
              options: [{ value: "all", label: "All Clients" }, ...clientOptions],
            },
          ]}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          groupOptions={[
            { value: TABLE_GROUP_NONE, label: "No Grouping" },
            { value: "client", label: "Client" },
            { value: "category", label: "Category" },
          ]}
        />
      }
    >
      <div className="table-scroll-region max-h-[68vh] overflow-auto">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-800/80 bg-[#0b1326]">
              <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                Equipment Identity
              </th>
              <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                Category
              </th>
              <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                Client
              </th>
              <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                Facility
              </th>
              <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                Project
              </th>
              <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {groupedRows.map((group) => (
              <React.Fragment key={group.key}>
                {groupBy !== TABLE_GROUP_NONE ? (
                  <tr className="bg-[#08101f]">
                    <td
                      colSpan="6"
                      className="px-3 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-orange-400"
                    >
                      {group.label} ({group.items.length})
                    </td>
                  </tr>
                ) : null}
                {group.items.map((row) => (
                  <tr key={row.key} className="group transition-colors hover:bg-white/5">
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-4">
                        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-orange-500 shadow-inner">
                          <Boxes size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold uppercase text-white transition-colors group-hover:text-orange-500">
                            {row.tag}
                          </p>
                          <p className="text-[9px] font-mono uppercase text-slate-500">
                            Equipment Tag
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-xs font-semibold uppercase text-slate-300">
                      {row.category}
                    </td>
                    <td className="px-3 py-4 text-xs font-medium text-slate-400">{row.client}</td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2 text-slate-400">
                        <MapPin size={14} className="text-orange-500/50" />
                        <span className="text-xs font-medium">{row.location}</span>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Briefcase size={14} className="text-orange-500/50" />
                        <span className="text-xs font-medium">{row.project}</span>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-xs font-medium text-slate-400">{row.status}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </ControlCenterTableShell>
  );
};

export default InternalEquipmentmanager;
