
import React, { useState, useRef } from 'react';
import { GlobalMultipliers, MultiplierGroup, MultiplierOption } from '../../types';
import { Sliders, Plus, Trash2, Edit2, Check, X, GripVertical, Settings2, ToggleLeft, List, Activity, Save } from 'lucide-react';
import { Button } from '../ui/Button';
import { nanoid } from 'nanoid';
import { Modal, ModalVariant } from '../ui/Modal';

interface MultiplierSettingsProps {
  multipliers: GlobalMultipliers;
  setMultipliers: React.Dispatch<React.SetStateAction<GlobalMultipliers>>;
}

export const MultiplierSettings: React.FC<MultiplierSettingsProps> = ({ multipliers, setMultipliers }) => {
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    variant: ModalVariant;
    onConfirm?: () => void;
    confirmLabel?: string;
  }>({ isOpen: false, title: '', description: '', variant: 'info' });

  const closeModal = () => setModalConfig({ ...modalConfig, isOpen: false });

  // --- Add New Group State ---
  const [isAdding, setIsAdding] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState<'select' | 'boolean'>('select');

  // --- Edit Group State ---
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupData, setEditGroupData] = useState<Partial<MultiplierGroup>>({});

  // --- Drag & Drop ---
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    if (dragItem.current === null) return;
    const dragIndex = dragItem.current;
    if (dragIndex === index) return;

    // Must convert to array first if it's not (should be by now)
    const newItems = [...(Array.isArray(multipliers) ? multipliers : [])];
    const draggedItem = newItems[dragIndex];
    newItems.splice(dragIndex, 1);
    newItems.splice(index, 0, draggedItem);
    
    dragItem.current = index;
    setMultipliers(newItems);
  };

  const handleDragEnd = () => {
    dragItem.current = null;
    dragOverItem.current = null;
  };

  // --- CRUD Operations ---

  const handleAddGroup = () => {
    if (!newGroupName.trim()) return;
    
    const newGroup: MultiplierGroup = {
       id: `mult_${nanoid()}`,
       name: newGroupName.trim(),
       type: newGroupType,
       isEnabled: true,
       description: '',
       options: newGroupType === 'select' ? [{ id: nanoid(), label: 'Standard', value: 1.0, isDefault: true }] : undefined,
       value: newGroupType === 'boolean' ? 1.1 : undefined
    };

    setMultipliers([...(Array.isArray(multipliers) ? multipliers : []), newGroup]);
    setIsAdding(false);
    setNewGroupName('');
  };

  const handleDeleteGroup = (id: string) => {
     setModalConfig({
        isOpen: true,
        title: 'Usunąć grupę mnożników?',
        description: 'Czy na pewno chcesz usunąć tę grupę? Zostanie ona usunięta z konfiguracji nowych projektów.',
        variant: 'danger',
        confirmLabel: 'Usuń',
        onConfirm: () => {
            setMultipliers(prev => Array.isArray(prev) ? prev.filter(g => g.id !== id) : []);
        }
     });
  };

  const startEdit = (group: MultiplierGroup) => {
      setEditingGroupId(group.id);
      setEditGroupData({ ...group });
  };

  const cancelEdit = () => {
      setEditingGroupId(null);
      setEditGroupData({});
  };

  const saveEdit = () => {
      if (!editingGroupId) return;
      setMultipliers(prev => Array.isArray(prev) ? prev.map(g => g.id === editingGroupId ? { ...g, ...editGroupData } as MultiplierGroup : g) : []);
      setEditingGroupId(null);
  };

  const toggleEnabled = (id: string) => {
      setMultipliers(prev => Array.isArray(prev) ? prev.map(g => g.id === id ? { ...g, isEnabled: !g.isEnabled } : g) : []);
  };

  // --- Option Editing (for Select) ---
  const updateOption = (optionId: string, field: keyof MultiplierOption, value: any) => {
      if (!editGroupData.options) return;
      setEditGroupData({
          ...editGroupData,
          options: editGroupData.options.map(o => o.id === optionId ? { ...o, [field]: value } : o)
      });
  };

  const addOption = () => {
      if (!editGroupData.options) return;
      setEditGroupData({
          ...editGroupData,
          options: [...editGroupData.options, { id: nanoid(), label: 'Nowa opcja', value: 1.0 }]
      });
  };

  const removeOption = (optionId: string) => {
      if (!editGroupData.options) return;
      if (editGroupData.options.length <= 1) return;
      setEditGroupData({
          ...editGroupData,
          options: editGroupData.options.filter(o => o.id !== optionId)
      });
  };
  
  const setOptionDefault = (optionId: string) => {
      if (!editGroupData.options) return;
      setEditGroupData({
          ...editGroupData,
          options: editGroupData.options.map(o => ({ ...o, isDefault: o.id === optionId }))
      });
  };

  const groups = Array.isArray(multipliers) ? multipliers : [];

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <Modal {...modalConfig} onClose={closeModal} />
      
      <div className="mb-8">
         <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-6 h-6 text-blue-600" /> Czynniki i Mnożniki
         </h2>
         <p className="text-slate-500 mt-2">
            Zdefiniuj globalne czynniki wpływające na wycenę (np. Złożoność, LOD, Tryb Express). 
            Możesz zmieniać ich kolejność oraz ukrywać wybrane grupy w kalkulatorze.
         </p>
      </div>

      <div className="space-y-4">
         {groups.map((group, index) => {
             const isEditing = editingGroupId === group.id;

             if (isEditing) {
                 return (
                    <div key={group.id} className="bg-white border-2 border-blue-500 rounded-xl p-6 shadow-md animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-bold text-blue-900">Edycja: {group.name}</h3>
                            <div className="flex gap-2">
                                <Button size="sm" variant="ghost" onClick={cancelEdit}>Anuluj</Button>
                                <Button size="sm" onClick={saveEdit} className="gap-2"><Save className="w-4 h-4"/> Zapisz</Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Nazwa</label>
                                <input 
                                   className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                   value={editGroupData.name}
                                   onChange={e => setEditGroupData({...editGroupData, name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Opis (pomocniczy)</label>
                                <input 
                                   className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                   value={editGroupData.description || ''}
                                   onChange={e => setEditGroupData({...editGroupData, description: e.target.value})}
                                />
                            </div>
                        </div>

                        {/* Type Specific Editors */}
                        
                        {/* Boolean Editor */}
                        {group.type === 'boolean' && (
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <label className="block text-xs font-bold text-slate-500 mb-2">Mnożnik przy włączeniu</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" step="0.01"
                                        className="w-24 border border-slate-300 rounded px-2 py-1 text-sm text-right"
                                        value={editGroupData.value || 1.0}
                                        onChange={e => setEditGroupData({...editGroupData, value: parseFloat(e.target.value)})}
                                    />
                                    <span className="text-sm font-bold text-slate-500">x</span>
                                    <span className="text-xs text-slate-400">
                                       (np. 1.20 oznacza +20% do ceny)
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Select Editor */}
                        {group.type === 'select' && (
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-bold text-slate-500">Opcje Wyboru</label>
                                    <Button size="sm" variant="ghost" onClick={addOption} className="h-6 text-xs"><Plus className="w-3 h-3 mr-1"/> Dodaj opcję</Button>
                                </div>
                                <div className="space-y-2">
                                    {editGroupData.options?.map((opt, i) => (
                                        <div key={opt.id} className="flex items-center gap-2">
                                            <input 
                                                type="radio" 
                                                name="default_opt"
                                                checked={!!opt.isDefault}
                                                onChange={() => setOptionDefault(opt.id)}
                                                className="cursor-pointer"
                                                title="Ustaw jako domyślne"
                                            />
                                            <input 
                                                className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm"
                                                value={opt.label}
                                                onChange={e => updateOption(opt.id, 'label', e.target.value)}
                                            />
                                            <div className="flex items-center gap-1">
                                                <input 
                                                    type="number" step="0.01"
                                                    className="w-16 border border-slate-300 rounded px-2 py-1 text-sm text-right"
                                                    value={opt.value}
                                                    onChange={e => updateOption(opt.id, 'value', parseFloat(e.target.value))}
                                                />
                                                <span className="text-xs text-slate-500 font-bold">x</span>
                                            </div>
                                            <button 
                                                onClick={() => removeOption(opt.id)}
                                                disabled={(editGroupData.options?.length || 0) <= 1}
                                                className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                         {/* Scale Editor */}
                        {group.type === 'scale' && editGroupData.scaleConfig && (
                             <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <label className="block text-xs font-bold text-slate-500 mb-2">Konfiguracja Skali</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] uppercase text-slate-400 mb-1">Powierzchnia Bazowa (m2)</label>
                                        <input 
                                            type="number"
                                            className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                                            value={editGroupData.scaleConfig.baseArea}
                                            onChange={e => setEditGroupData({...editGroupData, scaleConfig: { ...editGroupData.scaleConfig!, baseArea: parseFloat(e.target.value) } })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase text-slate-400 mb-1">Wykładnik (Exponent)</label>
                                        <input 
                                            type="number" step="0.01"
                                            className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                                            value={editGroupData.scaleConfig.exponent}
                                            onChange={e => setEditGroupData({...editGroupData, scaleConfig: { ...editGroupData.scaleConfig!, exponent: parseFloat(e.target.value) } })}
                                        />
                                    </div>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-2 italic">
                                    Wzór: (Baza / Powierzchnia) ^ Wykładnik
                                </div>
                            </div>
                        )}

                    </div>
                 );
             }

             return (
                 <div 
                    key={group.id} 
                    className={`bg-white border rounded-xl p-4 flex items-center gap-4 transition-all ${group.isEnabled ? 'border-slate-200 shadow-sm' : 'border-slate-100 bg-slate-50 opacity-60'}`}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragEnter={() => handleDragEnter(index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                 >
                     <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500">
                        <GripVertical className="w-5 h-5" />
                     </div>

                     <div className={`p-2 rounded-lg ${group.type === 'select' ? 'bg-blue-100 text-blue-600' : group.type === 'boolean' ? 'bg-amber-100 text-amber-600' : 'bg-purple-100 text-purple-600'}`}>
                        {group.type === 'select' ? <List className="w-5 h-5" /> : group.type === 'boolean' ? <ToggleLeft className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                     </div>

                     <div className="flex-1">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                           {group.name}
                           {!group.isEnabled && <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-500 rounded uppercase">Ukryty</span>}
                        </h3>
                        <p className="text-sm text-slate-500">{group.description}</p>
                        
                        {/* Preview Values */}
                        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            {group.type === 'select' && group.options?.map(opt => (
                                <span key={opt.id} className={`text-xs px-2 py-0.5 rounded border ${opt.isDefault ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                    {opt.label} (x{opt.value})
                                </span>
                            ))}
                            {group.type === 'boolean' && (
                                <span className="text-xs px-2 py-0.5 rounded border bg-amber-50 border-amber-200 text-amber-700">
                                    Tak: x{group.value}
                                </span>
                            )}
                            {group.type === 'scale' && (
                                <span className="text-xs px-2 py-0.5 rounded border bg-purple-50 border-purple-200 text-purple-700">
                                    Baza: {group.scaleConfig?.baseArea}m² (Exp: {group.scaleConfig?.exponent})
                                </span>
                            )}
                        </div>
                     </div>

                     <div className="flex items-center gap-2 border-l border-slate-100 pl-4">
                        <div className="flex flex-col gap-1">
                            <label className="relative inline-flex items-center cursor-pointer" title={group.isEnabled ? "Ukryj w kalkulatorze" : "Pokaż w kalkulatorze"}>
                                <input type="checkbox" className="sr-only peer" checked={group.isEnabled} onChange={() => toggleEnabled(group.id)} />
                                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => startEdit(group)} title="Edytuj"><Edit2 className="w-4 h-4 text-slate-400 hover:text-blue-600" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteGroup(group.id)} title="Usuń"><Trash2 className="w-4 h-4 text-slate-300 hover:text-red-600" /></Button>
                     </div>
                 </div>
             )
         })}
      </div>

      {/* Add New Group Button/Form */}
      <div className="mt-8">
         {!isAdding ? (
            <button 
               onClick={() => setIsAdding(true)}
               className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center gap-2 text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-slate-50 transition-all font-medium"
            >
               <Plus className="w-5 h-5" /> Dodaj nową grupę czynników
            </button>
         ) : (
            <div className="bg-white border rounded-xl p-6 shadow-sm animate-in fade-in slide-in-from-bottom-2">
               <h3 className="font-bold text-slate-800 mb-4">Nowa Grupa Mnożników</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                   <div>
                       <label className="block text-xs font-bold text-slate-500 mb-1">Nazwa</label>
                       <input 
                          autoFocus
                          className="w-full border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="np. Standard Wykończenia"
                          value={newGroupName}
                          onChange={e => setNewGroupName(e.target.value)}
                       />
                   </div>
                   <div>
                       <label className="block text-xs font-bold text-slate-500 mb-1">Typ Pola</label>
                       <div className="flex gap-2">
                           <button 
                              onClick={() => setNewGroupType('select')}
                              className={`flex-1 py-2 rounded text-sm border flex items-center justify-center gap-2 ${newGroupType === 'select' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'bg-white border-slate-200'}`}
                           >
                               <List className="w-4 h-4" /> Lista Wyboru
                           </button>
                           <button 
                              onClick={() => setNewGroupType('boolean')}
                              className={`flex-1 py-2 rounded text-sm border flex items-center justify-center gap-2 ${newGroupType === 'boolean' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'bg-white border-slate-200'}`}
                           >
                               <ToggleLeft className="w-4 h-4" /> Przełącznik
                           </button>
                       </div>
                   </div>
               </div>
               <div className="flex justify-end gap-2">
                   <Button variant="ghost" onClick={() => { setIsAdding(false); setNewGroupName(''); }}>Anuluj</Button>
                   <Button onClick={handleAddGroup} disabled={!newGroupName.trim()}>Utwórz Grupę</Button>
               </div>
            </div>
         )}
      </div>
    </div>
  );
};
