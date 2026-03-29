import React, { useEffect, useMemo, useState } from "react";
import AdminNavbar from "../../AdminNavbar";
import {
  PlusCircle, Search, ArrowLeft, Cog, Zap, X, Package, Ruler, Layers
} from "lucide-react";
import AdminSidebar from "../../AdminSidebar";
import { db } from "../../../Auth/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import TableQueryControls from "../../../Common/TableQueryControls";
import { groupRowsByOption, TABLE_GROUP_NONE } from "../../../../utils/tableGrouping";

const InspectionLogs = () => {
  const [inspections, setInspections] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [masterInspectionTypes, setMasterInspectionTypes] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupBy, setGroupBy] = useState(TABLE_GROUP_NONE);
  const navigate = useNavigate();

  const [phase, setPhase] = useState(1); 
  const [selectedEquip, setSelectedEquip] = useState(null); 

  useEffect(() => {
    // Sync Inspection History
    const unsubLogs = onSnapshot(query(collection(db, "inspections"), orderBy("timestamp", "desc")), (snap) => {
      setInspections(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    // Sync Master Equipment Registry
    const unsubEquip = onSnapshot(query(collection(db, "equipment"), orderBy("tagNumber", "asc")), (snap) => {
      setEquipment(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Sync NDT Techniques
    const unsubTypes = onSnapshot(query(collection(db, "inspection_types"), orderBy("title", "asc")), (snap) => {
      setMasterInspectionTypes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubLogs(); unsubEquip(); unsubTypes(); };
  }, []);

  const normalizeTechniqueLabel = (tech = "") => {
    const normalized = String(tech).trim().toLowerCase();
    if (normalized === "utreport" || normalized === "ut report") {
      return "Ultrasonic Test";
    }
    return tech;
  };

  const getReportRoutePath = (tech = "") => {
    const normalized = String(tech).trim().toLowerCase();
    if (
      normalized === "utreport" ||
      normalized === "ut report" ||
      normalized === "ultrasonic test" ||
      normalized === "manual ut"
    ) {
      return "utreport";
    }
    return normalized.split(" ")[0].replace(/[^a-z]/g, "");
  };

  const availableTechniques = Array.from(
    new Set(
      masterInspectionTypes.flatMap(type =>
        (type.requiredTechniques || []).map(normalizeTechniqueLabel),
      ),
    ),
  ).filter(tech => tech.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleRouteToReport = (tech) => {
    const routePath = getReportRoutePath(tech);
    const assetData = equipment.find(e => e.tagNumber === selectedEquip);
    const relatedLog = inspections.find(i => i.items?.some(item => item.reference === selectedEquip))?.items?.[0];

    navigate(`/admin/reports/${routePath}`, { 
      state: { 
        preFill: {
          tag: selectedEquip,
          assetType: assetData?.assetType || "Default",
          client: relatedLog?.Client || "Standard Client",
          platform: relatedLog?.Location || "Facility Alpha",
          reportNo: `${tech.substring(0,2)}-${Math.floor(1000 + Math.random() * 9000)}`
        }
      } 
    });
  };

  const filteredEquipment = useMemo(
    () =>
      equipment.filter((asset) => {
        const matchesSearch = String(asset.tagNumber || "")
          .toUpperCase()
          .includes(searchTerm.toUpperCase());
        const matchesStatus =
          statusFilter === "all" ||
          String(asset.status || "").toLowerCase() === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [equipment, searchTerm, statusFilter],
  );

  const groupedEquipment = useMemo(
    () =>
      groupRowsByOption(filteredEquipment, groupBy, [
        {
          value: "status",
          label: "Status",
          getValue: (asset) => asset.status,
          emptyLabel: "Unknown Status",
        },
        {
          value: "assetType",
          label: "Equipment Type",
          getValue: (asset) => asset.assetType,
          emptyLabel: "Unknown Type",
        },
      ]),
    [filteredEquipment, groupBy],
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <AdminNavbar />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-4 sm:p-6 lg:p-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                {phase > 1 && <button onClick={() => setPhase(1)} className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-orange-500 hover:bg-orange-600 hover:text-white transition-all"><ArrowLeft size={18} /></button>}
                <h1 className="text-3xl font-bold uppercase tracking-tighter text-white">
                  {phase === 1 ? "Report Management" : `Selection: ${selectedEquip}`}
                </h1>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input type="text" placeholder="Filter tags..." className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-12 text-xs focus:border-orange-500 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>

            {loading ? (
               <div className="py-40 flex justify-center"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-orange-500"></div></div>
            ) : phase === 1 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] overflow-hidden backdrop-blur-md">
                <TableQueryControls
                  filters={[
                    {
                      key: "status",
                      label: "Status Filter",
                      value: statusFilter,
                      onChange: setStatusFilter,
                      options: [
                        { value: "all", label: "All Statuses" },
                        ...Array.from(new Set(equipment.map((asset) => asset.status).filter(Boolean))).map((status) => ({
                          value: String(status).toLowerCase(),
                          label: status,
                        })),
                      ],
                    },
                  ]}
                  groupBy={groupBy}
                  onGroupByChange={setGroupBy}
                  groupOptions={[
                    { value: TABLE_GROUP_NONE, label: "No Grouping" },
                    { value: "status", label: "Status" },
                    { value: "assetType", label: "Equipment Type" },
                  ]}
                />
                <div className="table-scroll-region overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-950/50 border-b border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <tr>
                      <th className="p-6">Asset Identity</th>
                      <th className="p-6">Technical Specs</th>
                      <th className="p-6">Registry Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {groupedEquipment.map((group) => (
                      <React.Fragment key={group.key}>
                        {groupBy !== TABLE_GROUP_NONE ? (
                          <tr className="bg-slate-950/80">
                            <td
                              colSpan="3"
                              className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-orange-400"
                            >
                              {group.label} ({group.items.length})
                            </td>
                          </tr>
                        ) : null}
                    {group.items.map(asset => (
                      <tr key={asset.id} onClick={() => { setSelectedEquip(asset.tagNumber); setPhase(2); }} className="group hover:bg-white/5 cursor-pointer transition-colors">
                        <td className="p-6">
                           <div className="flex items-center gap-4">
                              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-orange-500 group-hover:rotate-12 transition-transform"><Cog size={18}/></div>
                              <div><p className="text-sm font-bold text-white uppercase">{asset.assetType}</p><p className="text-[9px] text-slate-500 font-bold uppercase">{asset.tagNumber}</p></div>
                           </div>
                        </td>
                        <td className="p-6 text-[10px] font-mono text-slate-400 uppercase tracking-tight">
                          {asset.nominalThickness}mm Thk | {asset.materialSpec}
                        </td>
                        <td className="p-6">
                          <span className="px-2 py-1 rounded text-[8px] font-black uppercase border border-emerald-500/30 text-emerald-500 bg-emerald-500/5">{asset.status}</span>
                        </td>
                      </tr>
                    ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 animate-in zoom-in-95 duration-300">
                {availableTechniques.map(tech => (
                  <div key={tech} onClick={() => handleRouteToReport(tech)} className="bg-slate-950 border border-slate-800 p-10 rounded-[2.5rem] hover:bg-orange-600 transition-all cursor-pointer group flex flex-col items-center text-center gap-4 shadow-2xl">
                    <Zap size={32} className="text-orange-500 group-hover:text-white transition-colors" />
                    <span className="text-xl font-black text-white uppercase tracking-tighter">{tech}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default InspectionLogs;
