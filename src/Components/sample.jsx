import React, { useState, useEffect } from "react";
import { db } from "../../../Auth/firebase";
import { 
  collection, onSnapshot, query, addDoc, updateDoc, 
  deleteDoc, doc, serverTimestamp, orderBy 
} from "firebase/firestore";
import { 
  ShieldCheck, Plus, Trash2, Edit2, Search, X, Zap, AlertTriangle, Check
} from "lucide-react";
import AdminNavbar from "../../AdminNavbar";
import AdminSidebar from "../../AdminSidebar";
import { toast } from "react-toastify";

const InspectionTypeManager = () => {
  // ... existing states
  const [types, setTypes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // NEW: Dynamic Options State
  const [categories, setCategories] = useState(["Static Equipment", "Piping Systems", "Rotating Equipment", "Engineering Evaluation"]);
  const [designCodes, setDesignCodes] = useState(["ASME Section VIII", "ASME B31.3", "API 650", "ASME B31.8", "ASME FFS-1"]);

  // NEW: UI Toggle States
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingDesignCode, setIsAddingDesignCode] = useState(false);
  const [tempInput, setTempInput] = useState("");

  const [newType, setNewType] = useState({
    title: "",
    fullName: "",
    category: "Static Equipment",
    defaultStandard: "ASME Section VIII",
    requiredTechniques: ["Visual"]
  });

  const availableTechniques = ["Visual", "Detailed", "AUT", "MUT", "Pulsed Eddy Current", "Radiography"];

  // ... (Keep existing useEffect, handleStandardChange, handleToggleTechnique, handleEditOpen, handleSubmit)

  // Sub-component for the "Add More" Dropdown Logic
  const AddMoreDropdown = ({ label, value, options, onSelect, isAdding, setIsAdding, fieldKey }) => (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{label}</label>
      {!isAdding ? (
        <select 
          className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white outline-none focus:border-orange-500 cursor-pointer"
          value={value} 
          onChange={(e) => {
            if (e.target.value === "ADD_NEW") {
              setIsAdding(true);
            } else {
              onSelect(e.target.value);
            }
          }}
        >
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          <option value="ADD_NEW" className="text-orange-500 font-bold">+ Add Custom {label}</option>
        </select>
      ) : (
        <div className="flex gap-2 animate-in slide-in-from-top-1 duration-200">
          <input 
            autoFocus
            className="flex-1 bg-slate-950 border border-orange-500/40 p-4 rounded-2xl text-sm text-white outline-none"
            placeholder={`New ${label}...`}
            value={tempInput}
            onChange={(e) => setTempInput(e.target.value)}
          />
          <button 
            type="button"
            onClick={() => {
              if (tempInput.trim()) {
                if (fieldKey === 'cat') {
                  setCategories([...categories, tempInput]);
                } else {
                  setDesignCodes([...designCodes, tempInput]);
                }
                onSelect(tempInput);
              }
              setTempInput("");
              setIsAdding(false);
            }}
            className="bg-orange-600 p-4 rounded-2xl text-white hover:bg-orange-500 transition-all"
          >
            <Check size={18} />
          </button>
        </div>
      )}
    </div>
  );

  // ... (Include existing Table JSX)

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      {/* ... Nav/Sidebar */}
      <AdminNavbar />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-8">
            {/* ... Header and Table (remains the same) */}

            {/* MODAL SECTION */}
            {isModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
                <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                  <button onClick={handleCloseModal} className="absolute top-8 right-8 text-slate-500 hover:text-white"><X size={20}/></button>
                  <h2 className="text-2xl font-bold text-white uppercase tracking-tighter mb-8">{editingId ? "Modify Protocol" : "Register Protocol"}</h2>
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* ... Regulatory Standard Selection (remains same) */}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Category with Add More */}
                      <AddMoreDropdown 
                        label="Category"
                        value={newType.category}
                        options={categories}
                        isAdding={isAddingCategory}
                        setIsAdding={setIsAddingCategory}
                        fieldKey="cat"
                        onSelect={(val) => setNewType({...newType, category: val})}
                      />

                      {/* Design Code with Add More */}
                      <AddMoreDropdown 
                        label="Design Code"
                        value={newType.defaultStandard}
                        options={designCodes}
                        isAdding={isAddingDesignCode}
                        setIsAdding={setIsAddingDesignCode}
                        fieldKey="code"
                        onSelect={(val) => setNewType({...newType, defaultStandard: val})}
                      />
                    </div>

                    {/* ... Techniques Multi-select and Submit Buttons (remains same) */}
                  </form>
                </div>
              </div>
            )}
        </main>
      </div>
    </div>
  );
};

export default InspectionTypeManager;