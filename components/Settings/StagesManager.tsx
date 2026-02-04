
import React, { useState, useRef } from 'react';
import { Stage, StageType } from '../../types';
import { Button } from '../ui/Button';
import { Plus, Trash2, Check, X, Edit2, Briefcase, Clock, HardHat, GripVertical } from 'lucide-react';
import { nanoid } from 'nanoid';

interface StagesManagerProps {
  stages: Omit<Stage, 'roleAllocations'>[];
  setStages: (stages: Omit<Stage, 'roleAllocations'>[]) => void;
}

export const StagesManager: React.FC<StagesManagerProps> = ({ stages, setStages }) => {
  // Add New Stage State
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<StageType>(StageType.INTERNAL_RBH);

  // Editing Stage State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editType, setEditType] = useState<StageType>(StageType.INTERNAL_RBH);

  // Drag & Drop State
  const dragId = useRef<string | null>(null);

  const handleAdd = () => {
    if (!newName.trim()) return;

    const newStage: Omit<Stage, 'roleAllocations'> = {
      id: `stage_${nanoid()}`,
      name: newName.trim(),
      description: newDesc.trim(),
      type: newType,
      isEnabled: true,
      fixedPrice: newType === StageType.EXTERNAL_FIXED ? 0 : undefined
    };

    setStages([...stages, newStage]);
    setNewName('');
    setNewDesc('');
    setNewType(StageType.INTERNAL_RBH);
  };

  const handleDelete = (id: string) => {
    if (id === 'stage_supervision') {
        alert("Etap 'Nadzór Autorski' jest systemowy i nie może zostać usunięty.");
        return;
    }
    if (stages.length <= 1) {
      alert("Lista musi zawierać przynajmniej jeden etap.");
      return;
    }
    if (confirm("Czy na pewno usunąć ten etap? Zostanie on usunięty z szablonu nowych kalkulacji.")) {
      setStages(stages.filter(s => s.id !== id));
    }
  };

  const startEdit = (stage: Omit<Stage, 'roleAllocations'>) => {
    setEditingId(stage.id);
    setEditName(stage.name);
    setEditDesc(stage.description);
    setEditType(stage.type);
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;

    setStages(stages.map(s => {
      if (s.id === editingId) {
        return {
          ...s,
          name: editName.trim(),
          description: editDesc.trim(),
          type: editType,
          fixedPrice: editType === StageType.EXTERNAL_FIXED ? (s.fixedPrice || 0) : undefined
        };
      }
      return s;
    }));

    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  // --- Drag Handlers ---

  const handleDragStart = (id: string) => {
    dragId.current = id;
  };

  const handleDragEnter = (targetId: string) => {
    if (!dragId.current) return;
    if (dragId.current === targetId) return;

    const sourceIndex = stages.findIndex(s => s.id === dragId.current);
    const targetIndex = stages.findIndex(s => s.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    // Constraints:
    // 1. Prevent moving 'stage_supervision'
    // 2. Prevent dragging items ONTO 'stage_supervision'
    // 3. Prevent dragging between different types (Internal <-> External) to avoid UI confusion
    const sourceStage = stages[sourceIndex];
    const targetStage = stages[targetIndex];

    if (sourceStage.id === 'stage_supervision' || targetStage.id === 'stage_supervision') return;
    if (sourceStage.type !== targetStage.type) return;

    const newStages = [...stages];
    const [removed] = newStages.splice(sourceIndex, 1);
    newStages.splice(targetIndex, 0, removed);
    
    setStages(newStages);
  };

  const handleDragEnd = () => {
    dragId.current = null;
  };

  // Group stages for rendering
  const internalStages = stages.filter(s => s.type === StageType.INTERNAL_RBH && s.id !== 'stage_supervision');
  const supervisionStage = stages.find(s => s.id === 'stage_supervision');
  const externalStages = stages.filter(s => s.type === StageType.EXTERNAL_FIXED);

  const renderStageItem = (stage: Omit<Stage, 'roleAllocations'>, isLocked = false) => {
      const isEditing = editingId === stage.id;
      const isDraggable = !isLocked && !isEditing && editingId === null;

      if (isEditing) {
        return (
          <div key={stage.id} className="p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm animate-in fade-in zoom-in duration-200 cursor-default">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                   <label className="block text-xs font-semibold text-blue-800 mb-1">Nazwa Etapu</label>
                   <input 
                     className="w-full border border-blue-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                     value={editName}
                     onChange={(e) => setEditName(e.target.value)}
                   />
                </div>
                {!isLocked && (
                    <div>
                        <label className="block text-xs font-semibold text-blue-800 mb-1">Typ Rozliczenia</label>
                        <select 
                            className="w-full border border-blue-300 rounded px-3 py-2 text-sm bg-white"
                            value={editType}
                            onChange={(e) => setEditType(e.target.value as StageType)}
                        >
                            <option value={StageType.INTERNAL_RBH}>Wewnętrzny (RBH / Godzinowy)</option>
                            <option value={StageType.EXTERNAL_FIXED}>Zewnętrzny / Koszt Stały</option>
                        </select>
                    </div>
                )}
             </div>
             <div className="mb-3">
                 <label className="block text-xs font-semibold text-blue-800 mb-1">Opis</label>
                 <input 
                     className="w-full border border-blue-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                     value={editDesc}
                     onChange={(e) => setEditDesc(e.target.value)}
                     placeholder="Opcjonalny opis"
                   />
             </div>
             <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={cancelEdit}>Anuluj</Button>
                <Button size="sm" onClick={saveEdit} className="gap-2"><Check className="w-4 h-4"/> Zapisz Zmiany</Button>
             </div>
          </div>
        );
      }

      return (
        <div 
          key={stage.id} 
          className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-blue-300 transition-all group ${isDraggable ? 'cursor-move hover:shadow-md' : 'cursor-default'}`}
          draggable={isDraggable}
          onDragStart={() => isDraggable && handleDragStart(stage.id)}
          onDragEnter={() => isDraggable && handleDragEnter(stage.id)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => e.preventDefault()}
        >
           <div className="flex items-center gap-3 mb-3 sm:mb-0">
             <div className={`flex items-center justify-center text-slate-300 ${isDraggable ? 'cursor-grab active:cursor-grabbing hover:text-slate-500' : 'opacity-0'}`}>
                <GripVertical className="w-5 h-5" />
             </div>

             <div className={`p-1.5 rounded-md ${stage.id === 'stage_supervision' ? 'bg-orange-100 text-orange-600' : stage.type === StageType.INTERNAL_RBH ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
                {stage.id === 'stage_supervision' ? <HardHat className="w-4 h-4" /> : stage.type === StageType.INTERNAL_RBH ? <Clock className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
             </div>
             <div>
                <div className="font-semibold text-slate-800 flex items-center gap-2">
                  {stage.name}
                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${stage.type === StageType.INTERNAL_RBH ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                    {stage.type === StageType.INTERNAL_RBH ? 'RBH' : 'Koszt'}
                  </span>
                </div>
                <div className="text-sm text-slate-500">{stage.description}</div>
             </div>
           </div>
           
           <div className="flex items-center gap-2 self-end sm:self-center">
              <Button variant="ghost" size="sm" onClick={() => startEdit(stage)} title="Edytuj">
                 <Edit2 className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
              </Button>
              {!isLocked && (
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(stage.id)} title="Usuń">
                     <Trash2 className="w-4 h-4 text-slate-300 group-hover:text-red-500" />
                  </Button>
              )}
           </div>
        </div>
      );
  };

  return (
    <div className="max-w-4xl mx-auto">
       <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
        <div className="mb-6 border-b border-slate-100 pb-4">
          <h2 className="text-lg font-bold text-slate-900">Elementy Zakresu (Etapy)</h2>
          <p className="text-slate-500 text-sm mt-1">
            Zdefiniuj domyślne etapy oraz ich kolejność (przeciągnij i upuść). 
            Ustalony tutaj porządek będzie widoczny w nowych kalkulacjach.
          </p>
        </div>

        <div className="space-y-6 mb-8">
           {/* Internal Stages */}
           <div>
               <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wide pl-1">Etapy Projektowe (Wewnętrzne)</h3>
               <div className="space-y-3">
                   {internalStages.map(s => renderStageItem(s))}
               </div>
           </div>

           {/* Supervision Special Section */}
           {supervisionStage && (
               <div>
                   <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wide pl-1">Nadzór</h3>
                   <div className="space-y-3">
                       {renderStageItem(supervisionStage, true)}
                   </div>
               </div>
           )}

           {/* External Stages */}
           <div>
               <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wide pl-1">Koszty Zewnętrzne / Branże</h3>
               <div className="space-y-3">
                   {externalStages.map(s => renderStageItem(s))}
               </div>
           </div>
        </div>

        <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
           <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
             <Plus className="w-4 h-4 text-blue-600" /> Dodaj nowy etap
           </h3>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
             <div className="md:col-span-2">
                <input 
                  placeholder="Nazwa etapu (np. Analiza Chłonności)"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
             </div>
             <div>
                <select 
                   className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                   value={newType}
                   onChange={(e) => setNewType(e.target.value as StageType)}
                >
                   <option value={StageType.INTERNAL_RBH}>Wewnętrzny (RBH)</option>
                   <option value={StageType.EXTERNAL_FIXED}>Koszt Zewnętrzny</option>
                </select>
             </div>
           </div>
           <div className="mb-4">
              <input 
                  placeholder="Krótki opis (opcjonalnie)"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
           </div>
           
           <div className="flex justify-end">
             <Button onClick={handleAdd} disabled={!newName.trim()} className="gap-2">
               <Plus className="w-4 h-4" /> Dodaj do listy
             </Button>
           </div>
        </div>
      </div>
    </div>
  );
};
