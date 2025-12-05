

import React, { useState, useMemo } from 'react';
import { CalculationTemplate, FunctionalGroup, FunctionalElement, RoleType, Stage, StageType, SelectOption, BuildingType, ActionType, TimeUnit } from '../../types';
import { Button } from '../ui/Button';
import { Save, Plus, Trash2, Edit2, Box, Type, Check, Clock, PieChart, List, FilePlus, AlertCircle, Copy } from 'lucide-react';
import { nanoid } from 'nanoid';
import { TimeUnitSwitcher } from '../ui/TimeUnitSwitcher';

interface ModelsManagerProps {
  templates: CalculationTemplate[];
  setTemplates: React.Dispatch<React.SetStateAction<CalculationTemplate[]>>;
  stages?: Stage[];
  buildingTypes: BuildingType[];
  actionTypes: ActionType[];
  timeUnit: TimeUnit;
  setTimeUnit: (unit: TimeUnit) => void;
}

export const ModelsManager: React.FC<ModelsManagerProps> = ({ templates, setTemplates, stages = [], buildingTypes, actionTypes, timeUnit, setTimeUnit }) => {
  
  // State for Top Bar Selectors
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [selectedActionId, setSelectedActionId] = useState<string>('');
  const [copySourceTemplateId, setCopySourceTemplateId] = useState<string>('');

  // Derive Active Template based on selection
  const activeTemplate = useMemo(() => {
    return templates.find(t => t.buildingTypeId === selectedBuildingId && t.actionTypeId === selectedActionId);
  }, [templates, selectedBuildingId, selectedActionId]);

  // Edit Element State
  const [editingElement, setEditingElement] = useState<{groupId: string, el: FunctionalElement} | null>(null);

  // Add Element State
  const [isAddingElement, setIsAddingElement] = useState<string | null>(null); // groupId
  const [newElName, setNewElName] = useState('');
  const [newElRbh, setNewElRbh] = useState(0);
  const [newElType, setNewElType] = useState<'boolean' | 'count' | 'select'>('boolean');
  
  // Manage Options for Select Element
  const [editingOptionsId, setEditingOptionsId] = useState<string | null>(null); // element ID
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionRbh, setNewOptionRbh] = useState(0);

  const getConversionFactor = () => {
    switch (timeUnit) {
      case 'd': return 8; 
      case 'w': return 40; 
      default: return 1; 
    }
  };
  const conversionFactor = getConversionFactor();
  const unitLabel = timeUnit === 'h' ? 'RBH' : timeUnit === 'd' ? 'dni' : 'tyg';

  // --- Template Management ---

  const handleCreateTemplate = () => {
    if (!selectedBuildingId || !selectedActionId) return;
    
    const building = buildingTypes.find(b => b.id === selectedBuildingId);
    const action = actionTypes.find(a => a.id === selectedActionId);
    const name = `${building?.name} - ${action?.name}`;

    let newTpl: CalculationTemplate;

    if (copySourceTemplateId) {
        // Copy logic
        const source = templates.find(t => t.id === copySourceTemplateId);
        if (source) {
            newTpl = {
                ...source,
                id: `tpl_${nanoid()}`,
                buildingTypeId: selectedBuildingId,
                actionTypeId: selectedActionId,
                name: name,
                description: source.description + ' (Kopia)',
                // Deep copy arrays/objects to ensure independence
                groups: JSON.parse(JSON.stringify(source.groups)),
                roleDistribution: { ...source.roleDistribution },
                stageWeights: { ...source.stageWeights },
                defaultEnabledStages: source.defaultEnabledStages ? [...source.defaultEnabledStages] : [],
                defaultFixedCosts: source.defaultFixedCosts ? { ...source.defaultFixedCosts } : {}
            };
        } else {
             // Fallback if source not found
             newTpl = {
                id: `tpl_${nanoid()}`,
                buildingTypeId: selectedBuildingId,
                actionTypeId: selectedActionId,
                name: name,
                description: 'Nowy szablon wyceny',
                roleDistribution: {},
                stageWeights: {},
                groups: []
             };
        }
    } else {
        // Empty creation
        newTpl = {
          id: `tpl_${nanoid()}`,
          buildingTypeId: selectedBuildingId,
          actionTypeId: selectedActionId,
          name: name,
          description: 'Nowy szablon wyceny',
          roleDistribution: {},
          stageWeights: {},
          groups: []
        };
    }

    setTemplates([...templates, newTpl]);
    setCopySourceTemplateId(''); // Reset selection
  };

  const handleDeleteTemplate = () => {
    if (!activeTemplate) return;
    if (confirm('Czy na pewno chcesz usunąć całą konfigurację dla tej pary (Obiekt + Typ)? Tej operacji nie da się cofnąć.')) {
      setTemplates(prev => prev.filter(t => t.id !== activeTemplate.id));
    }
  };

  // --- Element Management ---

  const handleAddElement = (groupId: string) => {
     if (!newElName || !activeTemplate) return;
     // Convert display value to hours for storage
     const baseRbh = newElRbh * conversionFactor;

     const newEl: FunctionalElement = {
        id: nanoid(),
        name: newElName,
        baseRbh: baseRbh,
        inputType: newElType,
        options: newElType === 'select' ? [] : undefined
     };
     
     setTemplates(prev => prev.map(t => {
        if (t.id !== activeTemplate.id) return t;
        return {
           ...t,
           groups: t.groups.map(g => {
              if (g.id !== groupId) return g;
              return { ...g, elements: [...g.elements, newEl] };
           })
        };
     }));
     setIsAddingElement(null);
     setNewElName('');
     setNewElRbh(0);
  };

  const handleDeleteElement = (groupId: string, elId: string) => {
     if(!confirm("Usunąć element?") || !activeTemplate) return;
     setTemplates(prev => prev.map(t => {
        if (t.id !== activeTemplate.id) return t;
        return {
           ...t,
           groups: t.groups.map(g => {
              if (g.id !== groupId) return g;
              return { ...g, elements: g.elements.filter(e => e.id !== elId) };
           })
        };
     }));
  };

  const handleSaveElement = () => {
     if (!editingElement || !activeTemplate) return;
     
     setTemplates(prev => prev.map(t => {
        if (t.id !== activeTemplate.id) return t;
        return {
           ...t,
           groups: t.groups.map(g => {
              if (g.id !== editingElement.groupId) return g;
              return {
                 ...g,
                 elements: g.elements.map(e => e.id === editingElement.el.id ? editingElement.el : e)
              };
           })
        };
     }));
     setEditingElement(null);
  };

  // --- Option Management (for Select type) ---

  const handleAddOption = (groupId: string, elId: string) => {
     if (!newOptionName.trim() || !activeTemplate) return;
     
     const rbh = newOptionRbh * conversionFactor;

     const newOpt: SelectOption = {
       id: nanoid(),
       name: newOptionName,
       rbh: rbh
     };
     
     setTemplates(prev => prev.map(t => {
       if (t.id !== activeTemplate.id) return t;
       return {
         ...t,
         groups: t.groups.map(g => {
           if (g.id !== groupId) return g;
           return {
             ...g,
             elements: g.elements.map(el => {
               if (el.id !== elId) return el;
               return { ...el, options: [...(el.options || []), newOpt] };
             })
           };
         })
       };
     }));
     setNewOptionName('');
     setNewOptionRbh(0);
  };

  const handleDeleteOption = (groupId: string, elId: string, optId: string) => {
    if (!activeTemplate) return;
    setTemplates(prev => prev.map(t => {
       if (t.id !== activeTemplate.id) return t;
       return {
         ...t,
         groups: t.groups.map(g => {
           if (g.id !== groupId) return g;
           return {
             ...g,
             elements: g.elements.map(el => {
               if (el.id !== elId) return el;
               return { ...el, options: el.options?.filter(o => o.id !== optId) };
             })
           };
         })
       };
     }));
  };

  // --- Template Parameter Handlers ---

  const updateRoleDistribution = (role: string, value: number) => {
     if (!activeTemplate) return;
     setTemplates(prev => prev.map(t => {
         if (t.id !== activeTemplate.id) return t;
         return {
             ...t,
             roleDistribution: {
                 ...t.roleDistribution,
                 [role]: value / 100
             }
         }
     }));
  };

  const updateStageWeight = (stageId: string, value: number) => {
      if (!activeTemplate) return;
      setTemplates(prev => prev.map(t => {
          if (t.id !== activeTemplate.id) return t;
          return {
              ...t,
              stageWeights: {
                  ...t.stageWeights,
                  [stageId]: value / 100
              }
          }
      }));
  };

  const updateDefaultFixedCost = (stageId: string, value: number) => {
      if (!activeTemplate) return;
      setTemplates(prev => prev.map(t => {
          if (t.id !== activeTemplate.id) return t;
          return {
              ...t,
              defaultFixedCosts: {
                  ...t.defaultFixedCosts,
                  [stageId]: value
              }
          }
      }));
  };

  const toggleDefaultStage = (stageId: string) => {
      if (!activeTemplate) return;
      const current = activeTemplate.defaultEnabledStages || [];
      const updated = current.includes(stageId) 
        ? current.filter(id => id !== stageId)
        : [...current, stageId];

      setTemplates(prev => prev.map(t => {
          if (t.id !== activeTemplate.id) return t;
          return { ...t, defaultEnabledStages: updated };
      }));
  };

  const internalStages = stages.filter(s => s.type === StageType.INTERNAL_RBH);
  const allStages = stages;

  return (
    <div className="h-full flex flex-col space-y-6">
       
       {/* Top Selector Bar */}
       <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
           <div className="flex flex-col md:flex-row gap-6 items-end">
               <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Rodzaj Obiektu</label>
                  <select 
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium bg-slate-50 focus:bg-white transition-colors"
                    value={selectedBuildingId}
                    onChange={(e) => setSelectedBuildingId(e.target.value)}
                  >
                    <option value="">-- Wybierz Obiekt --</option>
                    {buildingTypes.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
               </div>
               
               <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Typ Projektu</label>
                  <select 
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium bg-slate-50 focus:bg-white transition-colors"
                    value={selectedActionId}
                    onChange={(e) => setSelectedActionId(e.target.value)}
                  >
                    <option value="">-- Wybierz Typ --</option>
                    {actionTypes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
               </div>

               {activeTemplate && (
                 <div className="pb-1">
                   <Button variant="ghost" className="text-red-500 hover:bg-red-50 hover:text-red-700 h-10 px-3" onClick={handleDeleteTemplate} title="Usuń ten model">
                      <Trash2 className="w-5 h-5" />
                   </Button>
                 </div>
               )}
           </div>
       </div>

       {/* Editor Content */}
       <div className="flex-1">
          {!selectedBuildingId || !selectedActionId ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                  <Box className="w-12 h-12 mb-3 opacity-20" />
                  <p>Wybierz Rodzaj Obiektu oraz Typ Projektu powyżej,</p>
                  <p>aby edytować model wyliczeń.</p>
              </div>
          ) : !activeTemplate ? (
              <div className="min-h-[300px] flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
                  <div className="bg-blue-50 p-4 rounded-full mb-4">
                     <FilePlus className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Brak konfiguracji</h3>
                  <p className="text-slate-500 max-w-md mb-8">
                    Nie zdefiniowano jeszcze modelu wyliczeń dla pary: <br/>
                    <strong>{buildingTypes.find(b => b.id === selectedBuildingId)?.name}</strong> + <strong>{actionTypes.find(a => a.id === selectedActionId)?.name}</strong>.
                  </p>
                  
                  <div className="w-full max-w-sm space-y-3">
                     <div className="text-left">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Skopiuj parametry z innego modelu (Opcjonalne)</label>
                        <select 
                            className="w-full p-2 border border-slate-300 rounded text-sm bg-white"
                            value={copySourceTemplateId}
                            onChange={(e) => setCopySourceTemplateId(e.target.value)}
                        >
                            <option value="">-- Pusty (Rozpocznij od zera) --</option>
                            {templates.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                     </div>
                     <Button size="lg" className="w-full gap-2" onClick={handleCreateTemplate}>
                        {copySourceTemplateId ? <Copy className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {copySourceTemplateId ? 'Utwórz i skopiuj dane' : 'Utwórz pustą konfigurację'}
                     </Button>
                  </div>
              </div>
          ) : (
            <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-2">
                
                {/* 1. Structure Editor (Groups & Elements) */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <List className="w-5 h-5 text-blue-600" /> Struktura Funkcjonalna
                    </h3>
                    <div className="flex items-center gap-4">
                       <TimeUnitSwitcher unit={timeUnit} setUnit={setTimeUnit} />
                       <Button size="sm" variant="outline" onClick={() => {
                          const newGroup: FunctionalGroup = { id: nanoid(), name: 'Nowa Grupa', elements: [] };
                          setTemplates(prev => prev.map(t => t.id === activeTemplate.id ? { ...t, groups: [...t.groups, newGroup] } : t));
                       }}>
                          <Plus className="w-3 h-3 mr-1" /> Dodaj Grupę
                       </Button>
                    </div>
                  </div>

                  <div className="space-y-6">
                      {activeTemplate.groups.map(group => (
                          <div key={group.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                               <input 
                                 className="font-bold text-slate-700 bg-transparent border-none focus:ring-0 p-0"
                                 value={group.name}
                                 onChange={(e) => {
                                   setTemplates(prev => prev.map(t => t.id === activeTemplate.id ? { ...t, groups: t.groups.map(g => g.id === group.id ? { ...g, name: e.target.value } : g) } : t));
                                 }}
                               />
                              <div className="flex gap-2">
                                 <Button size="sm" variant="ghost" onClick={() => setIsAddingElement(group.id === isAddingElement ? null : group.id)}>
                                    <Plus className="w-4 h-4 mr-1" /> Dodaj element
                                 </Button>
                                 <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600" onClick={() => {
                                    if(confirm('Usunąć grupę?')) {
                                      setTemplates(prev => prev.map(t => t.id === activeTemplate.id ? { ...t, groups: t.groups.filter(g => g.id !== group.id) } : t));
                                    }
                                 }}>
                                    <Trash2 className="w-4 h-4" />
                                 </Button>
                              </div>
                          </div>

                          {/* Add Form */}
                          {isAddingElement === group.id && (
                              <div className="p-4 bg-blue-50 border-b border-blue-100 flex items-end gap-3 animate-in slide-in-from-top-2">
                                  <div className="flex-1">
                                      <label className="text-xs font-bold text-blue-800">Nazwa</label>
                                      <input className="w-full text-sm p-2 rounded border border-blue-300" value={newElName} onChange={e => setNewElName(e.target.value)} placeholder="np. Garaż" />
                                  </div>
                                  <div className="w-24">
                                      <label className="text-xs font-bold text-blue-800">Baza {unitLabel}</label>
                                      <input type="number" className="w-full text-sm p-2 rounded border border-blue-300" value={newElRbh} onChange={e => setNewElRbh(parseFloat(e.target.value))} />
                                  </div>
                                  <div className="w-32">
                                      <label className="text-xs font-bold text-blue-800">Typ</label>
                                      <select className="w-full text-sm p-2 rounded border border-blue-300 bg-white" value={newElType} onChange={e => setNewElType(e.target.value as any)}>
                                      <option value="boolean">Tak/Nie</option>
                                      <option value="count">Licznik (0..N)</option>
                                      <option value="select">Wybór (Lista)</option>
                                      </select>
                                  </div>
                                  <Button size="sm" onClick={() => handleAddElement(group.id)}>Dodaj</Button>
                              </div>
                          )}

                          {/* Elements List */}
                          <div className="divide-y divide-slate-100">
                              {group.elements.map(el => {
                                  if (editingElement?.el.id === el.id) {
                                      return (
                                      <div key={el.id} className="p-3 bg-amber-50 flex items-center gap-2">
                                          <input className="flex-1 text-sm p-1 border rounded" value={editingElement.el.name} onChange={e => setEditingElement({...editingElement, el: {...editingElement.el, name: e.target.value}})} />
                                          <input 
                                            className="w-20 text-sm p-1 border rounded text-right" 
                                            type="number" 
                                            value={editingElement.el.baseRbh / conversionFactor} 
                                            onChange={e => {
                                               const val = parseFloat(e.target.value);
                                               const hours = val * conversionFactor;
                                               setEditingElement({...editingElement, el: {...editingElement.el, baseRbh: hours}});
                                            }} 
                                          />
                                          <span className="text-xs font-bold text-slate-500">{unitLabel}</span>
                                          <Button size="sm" onClick={handleSaveElement}><Save className="w-3 h-3" /></Button>
                                      </div>
                                      );
                                  }

                                  return (
                                      <div key={el.id} className="p-3 flex flex-col hover:bg-slate-50 transition-colors">
                                         <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-3">
                                                  <div className={`p-1.5 rounded ${el.inputType === 'boolean' ? 'bg-indigo-100 text-indigo-600' : el.inputType === 'select' ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                      {el.inputType === 'boolean' ? <Check className="w-3 h-3" /> : el.inputType === 'select' ? <List className="w-3 h-3" /> : <Type className="w-3 h-3" />}
                                                  </div>
                                                  <span className="text-sm font-medium text-slate-700">{el.name}</span>
                                              </div>
                                              <div className="flex items-center gap-4">
                                                  <div className="flex gap-2">
                                                     {el.inputType === 'select' && (
                                                         <button onClick={() => setEditingOptionsId(editingOptionsId === el.id ? null : el.id)} className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded border border-purple-100 hover:bg-purple-100">
                                                            Opcje ({el.options?.length || 0})
                                                         </button>
                                                     )}
                                                  </div>
                                                  
                                                  <span className="text-sm font-bold text-slate-900 min-w-[3rem] text-right">
                                                    {(el.baseRbh / conversionFactor).toFixed(1)} {unitLabel}
                                                  </span>
                                                  
                                                  <div className="flex gap-1">
                                                      <button onClick={() => setEditingElement({groupId: group.id, el})} className="p-1 text-slate-400 hover:text-blue-600"><Edit2 className="w-3 h-3" /></button>
                                                      <button onClick={() => handleDeleteElement(group.id, el.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                                                  </div>
                                              </div>
                                         </div>
                                         
                                         {/* Options Editor (Select Type) */}
                                         {el.inputType === 'select' && editingOptionsId === el.id && (
                                             <div className="mt-2 p-3 bg-purple-50 rounded-lg border border-purple-100 animate-in slide-in-from-top-1">
                                                <div className="text-xs font-bold text-purple-800 mb-2 uppercase tracking-wide">Lista Opcji Wyboru</div>
                                                <div className="space-y-2 mb-3">
                                                   {el.options?.map(opt => (
                                                      <div key={opt.id} className="flex items-center gap-2 bg-white p-2 rounded border border-purple-100">
                                                         <span className="text-sm text-slate-700 flex-1">{opt.name}</span>
                                                         <span className="text-xs font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                                                            {(opt.rbh / conversionFactor).toFixed(1)} {unitLabel}
                                                         </span>
                                                         <button onClick={() => handleDeleteOption(group.id, el.id, opt.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                                      </div>
                                                   ))}
                                                   {(!el.options || el.options.length === 0) && <div className="text-xs text-slate-400 italic">Brak zdefiniowanych opcji.</div>}
                                                </div>
                                                
                                                <div className="flex items-end gap-2 pt-2 border-t border-purple-200">
                                                   <div className="flex-1">
                                                      <input 
                                                        className="w-full text-xs p-1.5 border border-purple-300 rounded" 
                                                        placeholder="Nazwa opcji (np. Technologia Tradycyjna)"
                                                        value={newOptionName}
                                                        onChange={e => setNewOptionName(e.target.value)}
                                                      />
                                                   </div>
                                                   <div className="w-20">
                                                      <input 
                                                        type="number"
                                                        className="w-full text-xs p-1.5 border border-purple-300 rounded" 
                                                        placeholder={unitLabel}
                                                        value={newOptionRbh}
                                                        onChange={e => setNewOptionRbh(parseFloat(e.target.value))}
                                                      />
                                                   </div>
                                                   <Button size="sm" variant="secondary" onClick={() => handleAddOption(group.id, el.id)} disabled={!newOptionName}>Dodaj</Button>
                                                </div>
                                             </div>
                                         )}
                                      </div>
                                  );
                              })}
                          </div>
                          </div>
                      ))}
                  </div>
                </div>

                {/* 2. Role Distribution */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                   <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                       <PieChart className="w-5 h-5 text-purple-600" /> Dystrybucja Ról (Domyślna)
                   </h3>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       {Object.values(RoleType).map(role => (
                           <div key={role}>
                               <label className="block text-sm font-medium text-slate-700 mb-2">{role}</label>
                               <div className="flex items-center gap-2">
                                   <input 
                                     type="number" 
                                     min="0" max="100"
                                     value={Math.round((activeTemplate.roleDistribution[role] || 0) * 100)}
                                     onChange={(e) => updateRoleDistribution(role, parseFloat(e.target.value))}
                                     className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-purple-500 outline-none"
                                   />
                                   <span className="text-slate-500">%</span>
                               </div>
                           </div>
                       ))}
                   </div>
                </div>

                {/* 3. Stage Weights */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                   <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                       <Clock className="w-5 h-5 text-indigo-600" /> Wagi Etapów i Domyślny Zakres
                   </h3>
                   {stages.length === 0 ? (
                       <div className="text-slate-500 italic">Brak zdefiniowanych etapów w systemie.</div>
                   ) : (
                      <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                              <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                                  <tr>
                                      <th className="px-4 py-3">Etap</th>
                                      <th className="px-4 py-3 text-center">Waga (%) / Koszt (PLN)</th>
                                      <th className="px-4 py-3 text-center">Domyślnie aktywny</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                  {allStages.map(stage => {
                                      const isInternal = stage.type === StageType.INTERNAL_RBH;
                                      return (
                                          <tr key={stage.id} className="hover:bg-slate-50">
                                              <td className="px-4 py-3 font-medium text-slate-700">
                                                  {stage.name}
                                                  {!isInternal && <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1 rounded">Zewn.</span>}
                                              </td>
                                              <td className="px-4 py-3 text-center">
                                                  {isInternal ? (
                                                      <div className="flex items-center justify-center gap-1">
                                                          <input 
                                                              type="number"
                                                              min="0" max="100"
                                                              value={Math.round((activeTemplate.stageWeights?.[stage.id] || 0) * 100)}
                                                              onChange={(e) => updateStageWeight(stage.id, parseFloat(e.target.value))}
                                                              className="w-16 p-1 text-center border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                                          />
                                                          <span className="text-slate-400">%</span>
                                                      </div>
                                                  ) : (
                                                      <div className="flex items-center justify-center gap-1">
                                                          <input 
                                                              type="number"
                                                              min="0"
                                                              value={activeTemplate.defaultFixedCosts?.[stage.id] || 0}
                                                              onChange={(e) => updateDefaultFixedCost(stage.id, parseFloat(e.target.value))}
                                                              className="w-20 p-1 text-right border border-slate-300 rounded focus:ring-2 focus:ring-amber-500 outline-none"
                                                          />
                                                          <span className="text-slate-400 text-xs">PLN</span>
                                                      </div>
                                                  )}
                                              </td>
                                              <td className="px-4 py-3 text-center">
                                                  <input 
                                                      type="checkbox"
                                                      checked={(activeTemplate.defaultEnabledStages || []).includes(stage.id)}
                                                      onChange={() => toggleDefaultStage(stage.id)}
                                                      className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                                  />
                                              </td>
                                          </tr>
                                      )
                                  })}
                              </tbody>
                          </table>
                      </div>
                   )}
                </div>

            </div>
          )}
       </div>
    </div>
  );
};
