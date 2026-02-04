import React, { useState, useMemo, useRef } from 'react';
import { CalculationTemplate, FunctionalGroup, FunctionalElement, SelectOption, BuildingType, ActionType, TimeUnit, SupervisionSettings, TeamMember, StageType, Stage, InputType } from '../../types';
import { Button } from '../ui/Button';
import { Plus, Trash2, Edit2, Box, Type, Check, Clock, PieChart, List, FilePlus, Copy, FolderPen, HardHat, Save, GripVertical, CheckSquare, ToggleLeft, Hash, Layers, AlertTriangle } from 'lucide-react';
import { nanoid } from 'nanoid';
import { TimeUnitSwitcher } from '../ui/TimeUnitSwitcher';
import { Modal, ModalVariant } from '../ui/Modal';

interface ModelsManagerProps {
  templates: CalculationTemplate[];
  setTemplates: React.Dispatch<React.SetStateAction<CalculationTemplate[]>>;
  stages?: Stage[];
  buildingTypes: BuildingType[];
  actionTypes: ActionType[];
  timeUnit: TimeUnit;
  setTimeUnit: (unit: TimeUnit) => void;
  team: TeamMember[];
}

// Type definitions with descriptions for the UI
const INPUT_TYPES: { id: InputType; label: string; icon: React.ReactNode; desc: string; example: string }[] = [
    { 
        id: 'boolean', 
        label: 'Element Tak/Nie', 
        icon: <ToggleLeft className="w-4 h-4" />, 
        desc: 'Przełącznik (Switch). Dodaje stałą wartość czasu, jeśli jest włączony.',
        example: 'Np. Garaż w bryle, Taras, Antresola.' 
    },
    { 
        id: 'count', 
        label: 'Liczba elementów', 
        icon: <Hash className="w-4 h-4" />, 
        desc: 'Pole liczbowe. Mnoży wpisaną ilość przez bazowy czas.',
        example: 'Np. Liczba łazienek, Liczba kuchni, Liczba powtarzalnych modułów.' 
    },
    { 
        id: 'select', 
        label: 'Wybór jednego (Zestaw)', 
        icon: <List className="w-4 h-4" />, 
        desc: 'Lista rozwijana. Użytkownik wybiera jedną opcję, która dodaje przypisaną do niej wartość.',
        example: 'Np. Standard wykończenia (Podstawowy/Premium), Rodzaj dachu.' 
    },
    { 
        id: 'multiselect', 
        label: 'Wybór wielu (Zestaw)', 
        icon: <CheckSquare className="w-4 h-4" />, 
        desc: 'Lista pól wyboru (Checkboxy). Użytkownik może zaznaczyć wiele opcji, ich wartości są sumowane.',
        example: 'Np. Dodatkowe instalacje (Klimatyzacja + Alarm + PV).' 
    }
];

export const ModelsManager: React.FC<ModelsManagerProps> = ({ templates, setTemplates, stages = [], buildingTypes, actionTypes, timeUnit, setTimeUnit, team }) => {
  
  // State for Top Bar Selectors
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [selectedActionId, setSelectedActionId] = useState<string>('');
  const [copySourceTemplateId, setCopySourceTemplateId] = useState<string>('');

  // Drag and Drop Refs
  const dragGroup = useRef<number | null>(null);
  const dragElement = useRef<{ groupIndex: number; elementIndex: number } | null>(null);

  // Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    variant: ModalVariant;
    onConfirm?: () => void;
    confirmLabel?: string;
  }>({
    isOpen: false,
    title: '',
    description: '',
    variant: 'info'
  });

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  // Derive Active Template based on selection
  const activeTemplate = useMemo(() => {
    return templates.find(t => t.buildingTypeId === selectedBuildingId && t.actionTypeId === selectedActionId);
  }, [templates, selectedBuildingId, selectedActionId]);

  // Compute available roles from Team
  const availableRoles = useMemo(() => {
    return Array.from(new Set(team.map(m => m.role))).filter(r => r && (r as string).trim() !== '');
  }, [team]);

  // Edit Element State
  const [editingElement, setEditingElement] = useState<{groupId: string, el: FunctionalElement} | null>(null);

  // Add Element State
  const [isAddingElement, setIsAddingElement] = useState<string | null>(null); // groupId
  const [newElName, setNewElName] = useState('');
  const [newElRbh, setNewElRbh] = useState(0);
  const [newElType, setNewElType] = useState<InputType>('boolean');
  
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

  // --- Helper to get safe default stages ---
  const getSafeDefaultEnabledStages = () => {
      return stages.filter(s => s.isEnabled).map(s => s.id);
  };

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
                defaultEnabledStages: source.defaultEnabledStages ? [...source.defaultEnabledStages] : getSafeDefaultEnabledStages(),
                defaultFixedCosts: source.defaultFixedCosts ? { ...source.defaultFixedCosts } : {},
                supervisionSettings: source.supervisionSettings ? { ...source.supervisionSettings } : undefined
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
                groups: [],
                defaultEnabledStages: getSafeDefaultEnabledStages()
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
          groups: [],
          defaultEnabledStages: getSafeDefaultEnabledStages()
        };
    }

    setTemplates([...templates, newTpl]);
    setCopySourceTemplateId(''); // Reset selection
  };

  const handleDeleteTemplate = () => {
    if (!activeTemplate) return;
    
    setModalConfig({
      isOpen: true,
      title: 'Usunąć konfigurację?',
      description: 'Czy na pewno chcesz usunąć całą konfigurację dla tej pary (Obiekt + Typ)? Tej operacji nie da się cofnąć.',
      variant: 'danger',
      confirmLabel: 'Usuń',
      onConfirm: () => {
         setTemplates(prev => prev.filter(t => t.id !== activeTemplate.id));
      }
    });
  };

  // --- Group Management ---

  const handleAddGroup = () => {
      if (!activeTemplate) return;
      const newGroup: FunctionalGroup = { id: nanoid(), name: 'Nowa Grupa', elements: [] };
      setTemplates(prev => prev.map(t => t.id === activeTemplate.id ? { ...t, groups: [...t.groups, newGroup] } : t));
  };

  const handleDeleteGroup = (groupId: string) => {
    if (!activeTemplate) return;

    // Pobieramy aktualny szablon bezpośrednio z tablicy
    const currentTemplate = templates.find(t => t.id === activeTemplate.id);
    if (!currentTemplate) return;

    const group = currentTemplate.groups.find(g => g.id === groupId);
    if (!group) return;

    // Przygotuj komunikat zależny od zawartości grupy
    const hasElements = group.elements && group.elements.length > 0;
    const description = hasElements 
        ? `Ta grupa zawiera ${group.elements.length} elementów. Usunięcie grupy spowoduje trwałe usunięcie wszystkich zawartych w niej elementów.`
        : 'Czy na pewno chcesz usunąć tę grupę?';

    setModalConfig({
      isOpen: true,
      title: 'Usunąć grupę?',
      description: description,
      variant: 'danger',
      confirmLabel: 'Usuń',
      onConfirm: () => {
        setTemplates(prev => prev.map(t => {
           if (t.id !== currentTemplate.id) return t;
           return {
              ...t,
              groups: t.groups.filter(g => g.id !== groupId)
           };
        }));
      }
    });
  };

  // --- Drag & Drop: Groups ---

  const handleDragStartGroup = (e: React.DragEvent, index: number) => {
      dragGroup.current = index;
      dragElement.current = null; // Clear element drag
  };

  const handleDragEnterGroup = (index: number) => {
      if (dragGroup.current === null) return;
      if (dragGroup.current === index) return;
      if (!activeTemplate) return;

      const newGroups = [...activeTemplate.groups];
      const draggedGroup = newGroups[dragGroup.current];
      
      // Remove from old
      newGroups.splice(dragGroup.current, 1);
      // Insert at new
      newGroups.splice(index, 0, draggedGroup);

      // Update refs immediately to avoid jitter
      dragGroup.current = index;

      setTemplates(prev => prev.map(t => {
          if (t.id !== activeTemplate.id) return t;
          return { ...t, groups: newGroups };
      }));
  };

  const handleDragEndGroup = () => {
      dragGroup.current = null;
  };

  // --- Drag & Drop: Elements ---

  const handleDragStartElement = (e: React.DragEvent, groupIndex: number, elementIndex: number) => {
      e.stopPropagation(); // Stop propagation to Group
      dragElement.current = { groupIndex, elementIndex };
      dragGroup.current = null; // Clear group drag
  };

  const handleDragEnterElement = (e: React.DragEvent, groupIndex: number, elementIndex: number) => {
      e.stopPropagation();
      if (!dragElement.current) return;
      if (!activeTemplate) return;

      // Restrict to reordering within the SAME group
      if (dragElement.current.groupIndex !== groupIndex) return;
      if (dragElement.current.elementIndex === elementIndex) return;

      const gIndex = groupIndex;
      const newGroups = [...activeTemplate.groups];
      const newElements = [...newGroups[gIndex].elements];
      
      const draggedEl = newElements[dragElement.current.elementIndex];
      newElements.splice(dragElement.current.elementIndex, 1);
      newElements.splice(elementIndex, 0, draggedEl);

      newGroups[gIndex] = { ...newGroups[gIndex], elements: newElements };

      dragElement.current = { groupIndex, elementIndex };

      setTemplates(prev => prev.map(t => {
          if (t.id !== activeTemplate.id) return t;
          return { ...t, groups: newGroups };
      }));
  };

  const handleDragEndElement = (e: React.DragEvent) => {
      e.stopPropagation();
      dragElement.current = null;
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
        options: (newElType === 'select' || newElType === 'multiselect') ? [] : undefined
     };
     
     setTemplates(prev => prev.map(t => {
        if (t.id !== activeTemplate.id) return t;
        return {
           ...t,
           groups: t.groups.map(g => {
              if (g.id !== groupId) return g;
              return { ...g, elements: [...(g.elements || []), newEl] };
           })
        };
     }));
     setIsAddingElement(null);
     setNewElName('');
     setNewElRbh(0);
     setNewElType('boolean');
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

  const handleDeleteElement = (groupId: string, elementId: string) => {
    if (!activeTemplate) return;
    
    setModalConfig({
        isOpen: true,
        title: 'Usunąć element?',
        description: 'Czy na pewno chcesz usunąć ten element funkcjonalny? Tej operacji nie da się cofnąć.',
        variant: 'danger',
        confirmLabel: 'Usuń',
        onConfirm: () => {
            setTemplates(prev => prev.map(t => {
            if (t.id !== activeTemplate.id) return t;
            return {
                ...t,
                groups: t.groups.map(g => {
                    if (g.id !== groupId) return g;
                    const currentElements = g.elements || [];
                    return { ...g, elements: currentElements.filter(e => e.id !== elementId) };
                })
            };
            }));
        }
    });
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
             ...g, // Correctly spread group properties
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

  const updateSupervision = (field: keyof SupervisionSettings, value: any) => {
      if (!activeTemplate) return;
      const current = activeTemplate.supervisionSettings || { enabled: true, duration: 20, timeUnit: 'weeks', frequency: 1, visitTime: 3 };
      setTemplates(prev => prev.map(t => {
          if (t.id !== activeTemplate.id) return t;
          return {
              ...t,
              supervisionSettings: {
                  ...current,
                  [field]: value
              }
          }
      }));
  };

  const toggleSupervisionDefault = () => {
    if (!activeTemplate) return;
    
    // Toggle Boolean
    const currentEnabled = activeTemplate.supervisionSettings?.enabled ?? true;
    const newEnabled = !currentEnabled;

    // 1. Update Supervision Settings
    const newSettings = {
        ...(activeTemplate.supervisionSettings || { duration: 20, timeUnit: 'weeks', frequency: 1, visitTime: 3 }),
        enabled: newEnabled
    };

    // 2. Sync with defaultEnabledStages array
    let currentDefaults = activeTemplate.defaultEnabledStages ? [...activeTemplate.defaultEnabledStages] : getSafeDefaultEnabledStages();
    
    if (newEnabled) {
        if (!currentDefaults.includes('stage_supervision')) {
            currentDefaults.push('stage_supervision');
        }
    } else {
        currentDefaults = currentDefaults.filter(id => id !== 'stage_supervision');
    }

    setTemplates(prev => prev.map(t => {
        if (t.id !== activeTemplate.id) return t;
        return {
            ...t,
            supervisionSettings: newSettings,
            defaultEnabledStages: currentDefaults
        }
    }));
  };

  const toggleDefaultStage = (stageId: string) => {
      if (!activeTemplate) return;
      
      const currentDefaults = activeTemplate.defaultEnabledStages ? [...activeTemplate.defaultEnabledStages] : getSafeDefaultEnabledStages();
      
      const updated = currentDefaults.includes(stageId) 
        ? currentDefaults.filter(id => id !== stageId)
        : [...currentDefaults, stageId];

      setTemplates(prev => prev.map(t => {
          if (t.id !== activeTemplate.id) return t;
          return { ...t, defaultEnabledStages: updated };
      }));
  };

  // Filter out supervision from general internal stages list for the weights table
  const internalStages = stages.filter(s => s.type === StageType.INTERNAL_RBH && s.id !== 'stage_supervision');
  const allStages = stages.filter(s => s.id !== 'stage_supervision');

  const isSupervisionEnabled = activeTemplate?.supervisionSettings?.enabled ?? true;

  const renderIcon = (type: InputType) => {
      switch(type) {
          case 'boolean': return <ToggleLeft className="w-3 h-3" />;
          case 'count': return <Hash className="w-3 h-3" />;
          case 'select': return <List className="w-3 h-3" />;
          case 'multiselect': return <CheckSquare className="w-3 h-3" />;
          default: return <Type className="w-3 h-3" />;
      }
  }

  const getTypeLabel = (type: InputType) => {
      const def = INPUT_TYPES.find(t => t.id === type);
      return def ? def.label : type;
  }

  const roleSum = activeTemplate ? Math.round(Object.values(activeTemplate.roleDistribution).reduce((acc: number, v: number) => acc + (v || 0), 0) * 100) : 0;

  return (
    <div className="h-full flex flex-col space-y-6">
       
       <Modal 
          isOpen={modalConfig.isOpen}
          onClose={closeModal}
          title={modalConfig.title}
          description={modalConfig.description}
          variant={modalConfig.variant}
          onConfirm={modalConfig.onConfirm}
          confirmLabel={modalConfig.confirmLabel}
       />

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
                    </div>
                  </div>

                  <div className="space-y-6">
                      {activeTemplate.groups.map((group, groupIndex) => (
                          <div 
                            key={group.id} 
                            className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                            draggable
                            onDragStart={(e) => handleDragStartGroup(e, groupIndex)}
                            onDragEnter={() => handleDragEnterGroup(groupIndex)}
                            onDragEnd={handleDragEndGroup}
                            onDragOver={(e) => e.preventDefault()}
                          >
                          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between group/header cursor-move">
                               <div className="flex items-center gap-3 flex-1">
                                  <GripVertical className="w-5 h-5 text-slate-400 cursor-grab active:cursor-grabbing" />
                                  <div className="flex items-center gap-2 flex-1">
                                    <input 
                                        className="font-bold text-slate-700 bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded px-2 py-1 transition-all w-full max-w-md outline-none"
                                        value={group.name}
                                        title="Kliknij, aby edytować nazwę grupy"
                                        onChange={(e) => {
                                            setTemplates(prev => prev.map(t => t.id === activeTemplate.id ? { ...t, groups: t.groups.map(g => g.id === group.id ? { ...g, name: e.target.value } : g) } : t));
                                        }}
                                        onClick={(e) => e.stopPropagation()} 
                                        onMouseDown={(e) => e.stopPropagation()}
                                    />
                                    <FolderPen className="w-4 h-4 text-slate-400 opacity-0 group-hover/header:opacity-100 transition-opacity" />
                                  </div>
                               </div>
                              <div className="flex gap-1">
                                 <Button 
                                    type="button"
                                    size="sm" 
                                    variant="ghost" 
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => { e.stopPropagation(); setIsAddingElement(group.id === isAddingElement ? null : group.id) }}
                                 >
                                    <Plus className="w-4 h-4 mr-1" /> Dodaj element
                                 </Button>
                                 <Button 
                                    type="button"
                                    size="sm" 
                                    variant="ghost" 
                                    className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                                    title="Usuń grupę"
                                 >
                                    <Trash2 className="w-4 h-4 pointer-events-none" />
                                 </Button>
                              </div>
                          </div>

                          {/* Add Form */}
                          {isAddingElement === group.id && (
                              <div className="p-4 bg-blue-50 border-b border-blue-100 animate-in slide-in-from-top-2">
                                  <div className="mb-4">
                                      <h4 className="text-xs font-bold text-blue-800 uppercase mb-2">Wybierz typ elementu</h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          {INPUT_TYPES.map(type => (
                                              <div 
                                                key={type.id}
                                                onClick={() => setNewElType(type.id)}
                                                className={`cursor-pointer p-3 rounded-lg border flex items-start gap-3 transition-all ${newElType === type.id ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-500' : 'bg-blue-50/50 border-blue-200 hover:bg-white hover:border-blue-300'}`}
                                              >
                                                  <div className={`p-2 rounded ${newElType === type.id ? 'bg-blue-100 text-blue-600' : 'bg-white text-slate-400'}`}>
                                                      {type.icon}
                                                  </div>
                                                  <div>
                                                      <div className={`font-semibold text-sm ${newElType === type.id ? 'text-blue-900' : 'text-slate-700'}`}>{type.label}</div>
                                                      <div className="text-xs text-slate-500 mt-1">{type.desc}</div>
                                                      <div className="text-[10px] text-blue-400 mt-1 italic">{type.example}</div>
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  </div>

                                  <div className="flex flex-col md:flex-row items-end gap-3 pt-4 border-t border-blue-100">
                                      <div className="flex-1 w-full">
                                          <label className="text-xs font-bold text-blue-800">Nazwa elementu</label>
                                          <input className="w-full text-sm p-2 rounded border border-blue-300 outline-none focus:ring-2 focus:ring-blue-500" value={newElName} onChange={e => setNewElName(e.target.value)} placeholder="np. Garaż, Liczba łazienek" />
                                      </div>
                                      
                                      {(newElType === 'boolean' || newElType === 'count') && (
                                          <div className="w-32">
                                              <label className="text-xs font-bold text-blue-800">Baza {unitLabel}</label>
                                              <input type="number" className="w-full text-sm p-2 rounded border border-blue-300 outline-none focus:ring-2 focus:ring-blue-500" value={newElRbh} onChange={e => setNewElRbh(parseFloat(e.target.value))} />
                                          </div>
                                      )}
                                      
                                      <Button size="sm" onClick={() => handleAddElement(group.id)} disabled={!newElName.trim()}>
                                          <Plus className="w-4 h-4 mr-1"/> Dodaj do grupy
                                      </Button>
                                  </div>
                              </div>
                          )}

                          {/* Elements List */}
                          <div className="divide-y divide-slate-100">
                              {group.elements?.map((el, elIndex) => {
                                  if (editingElement?.el.id === el.id) {
                                      return (
                                      <div key={el.id} className="p-3 bg-amber-50 flex items-center gap-2">
                                          <input className="flex-1 text-sm p-1 border rounded" value={editingElement.el.name} onChange={e => setEditingElement({...editingElement, el: {...editingElement.el, name: e.target.value}})} />
                                          {(el.inputType === 'boolean' || el.inputType === 'count') && (
                                              <div className="flex items-center gap-1">
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
                                              </div>
                                          )}
                                          <Button size="sm" onClick={handleSaveElement}><Save className="w-3 h-3" /></Button>
                                      </div>
                                      );
                                  }

                                  return (
                                      <div 
                                        key={el.id} 
                                        className="p-3 flex flex-col hover:bg-slate-50 transition-colors group/item"
                                        draggable
                                        onDragStart={(e) => handleDragStartElement(e, groupIndex, elIndex)}
                                        onDragEnter={(e) => handleDragEnterElement(e, groupIndex, elIndex)}
                                        onDragEnd={handleDragEndElement}
                                        onDragOver={(e) => e.preventDefault()}
                                      >
                                         <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-3 flex-1">
                                                  <GripVertical className="w-4 h-4 text-slate-300 cursor-grab active:cursor-grabbing hover:text-slate-500" />
                                                  <div className={`p-1.5 rounded bg-white border border-slate-200 text-slate-500`} title={getTypeLabel(el.inputType)}>
                                                      {renderIcon(el.inputType)}
                                                  </div>
                                                  <div className="flex flex-col">
                                                      <span className="text-sm font-medium text-slate-700">{el.name}</span>
                                                      <span className="text-[10px] text-slate-400">{getTypeLabel(el.inputType)}</span>
                                                  </div>
                                              </div>
                                              <div className="flex items-center gap-4">
                                                  <div className="flex gap-2">
                                                     {(el.inputType === 'select' || el.inputType === 'multiselect') && (
                                                         <button 
                                                            type="button"
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                            onClick={(e) => { e.stopPropagation(); setEditingOptionsId(editingOptionsId === el.id ? null : el.id) }} 
                                                            className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded border border-purple-100 hover:bg-purple-100 flex items-center gap-1"
                                                         >
                                                            <List className="w-3 h-3" />
                                                            Opcje ({el.options?.length || 0})
                                                         </button>
                                                     )}
                                                  </div>
                                                  
                                                  {(el.inputType === 'boolean' || el.inputType === 'count') && (
                                                      <span className="text-sm font-bold text-slate-900 min-w-[3rem] text-right">
                                                        {(el.baseRbh / conversionFactor).toFixed(1)} {unitLabel}
                                                      </span>
                                                  )}
                                                  
                                                  <div className="flex gap-1">
                                                      <button 
                                                        type="button"
                                                        onMouseDown={(e) => e.stopPropagation()} 
                                                        onClick={(e) => { e.stopPropagation(); setEditingElement({groupId: group.id, el}) }} 
                                                        className="p-1 text-slate-400 hover:text-blue-600"
                                                      >
                                                        <Edit2 className="w-3 h-3 pointer-events-none" />
                                                      </button>
                                                      <button 
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteElement(group.id, el.id); }} 
                                                        className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                                        title="Usuń element"
                                                      >
                                                        <Trash2 className="w-3 h-3 pointer-events-none" />
                                                      </button>
                                                  </div>
                                              </div>
                                         </div>
                                         
                                         {/* Options Editor (Select/MultiSelect Type) */}
                                         {(el.inputType === 'select' || el.inputType === 'multiselect') && editingOptionsId === el.id && (
                                             <div className="mt-2 p-3 bg-purple-50 rounded-lg border border-purple-100 animate-in slide-in-from-top-1 ml-8">
                                                <div className="text-xs font-bold text-purple-800 mb-2 uppercase tracking-wide">Lista Opcji Wyboru</div>
                                                <div className="space-y-2 mb-3">
                                                   {el.options?.map(opt => (
                                                      <div key={opt.id} className="flex items-center gap-2 bg-white p-2 rounded border border-purple-100">
                                                         <span className="text-sm text-slate-700 flex-1">{opt.name}</span>
                                                         <span className="text-xs font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                                                            {(opt.rbh / conversionFactor).toFixed(1)} {unitLabel}
                                                         </span>
                                                      </div>
                                                   ))}
                                                   {(!el.options || el.options.length === 0) && <div className="text-xs text-slate-400 italic">Brak zdefiniowanych opcji.</div>}
                                                </div>
                                                
                                                <div className="flex items-end gap-2 pt-2 border-t border-purple-200">
                                                   <div className="flex-1">
                                                      <input 
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        className="w-full text-xs p-1.5 border border-purple-300 rounded" 
                                                        placeholder="Nazwa opcji (np. Technologia Tradycyjna)"
                                                        value={newOptionName}
                                                        onChange={e => setNewOptionName(e.target.value)}
                                                      />
                                                   </div>
                                                   <div className="w-20">
                                                      <input 
                                                        type="number"
                                                        onMouseDown={(e) => e.stopPropagation()}
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

                      {/* Add New Group Section */}
                      <div className="mt-6 border-2 border-dashed border-slate-200 rounded-xl p-6 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
                          <div>
                              <h4 className="font-semibold text-slate-700">Dodaj nową grupę funkcjonalną</h4>
                              <p className="text-sm text-slate-500">Grupy pozwalają kategoryzować elementy wyceny (np. Bryła, Wnętrza, Instalacje).</p>
                          </div>
                          <Button variant="outline" onClick={handleAddGroup} className="gap-2 bg-white hover:bg-slate-50 border-slate-300 text-slate-700 whitespace-nowrap">
                              <Plus className="w-4 h-4" /> Dodaj Grupę
                          </Button>
                      </div>
                  </div>
                </div>

                {/* 2. Role Distribution */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                   <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                       <PieChart className="w-5 h-5 text-purple-600" /> Dystrybucja Ról (Domyślna)
                   </h3>
                   {availableRoles.length === 0 ? (
                       <div className="text-slate-500 text-sm italic bg-slate-50 p-4 rounded-lg border border-slate-100">
                           Brak zdefiniowanych ról w zespole. Przejdź do zakładki "Zespół i Stawki", aby dodać członków zespołu.
                       </div>
                   ) : (
                       <>
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                               {availableRoles.map(role => (
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

                           <div className={`mt-6 p-4 rounded-lg border flex gap-3 ${
                                roleSum === 100 
                                    ? 'bg-green-50 border-green-200 text-green-800' 
                                    : roleSum > 100 
                                        ? 'bg-red-50 border-red-200 text-red-800' 
                                        : 'bg-amber-50 border-amber-200 text-amber-800'
                            }`}>
                                <div className="mt-0.5">
                                    {roleSum === 100 ? <Check className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>}
                                </div>
                                <div>
                                    <div className="font-bold mb-1">
                                        Suma przydziału: {roleSum}%
                                        {roleSum !== 100 && (roleSum < 100 ? ' (Niedoszacowanie)' : ' (Przeszacowanie)')}
                                    </div>
                                    <p className="text-xs opacity-90 leading-relaxed">
                                        {roleSum === 100 
                                            ? "Suma wynosi dokładnie 100%. Całkowity czas wyliczony dla etapów zostanie idealnie rozdzielony pomiędzy członków zespołu."
                                            : roleSum < 100 
                                                ? `Suma jest mniejsza niż 100%. Oznacza to, że ${100 - roleSum}% czasu wyliczonego dla etapu nie zostanie przypisane do nikogo. Całkowity kosztorys będzie niższy niż wynikałoby to z samej pracochłonności etapu.`
                                                : `Suma przekracza 100%. Oznacza to, że suma godzin przypisanych pracownikom będzie wyższa niż całkowity czas trwania etapu (o ${roleSum - 100}%). Kosztorys zostanie sztucznie zawyżony.`
                                        }
                                    </p>
                                </div>
                            </div>
                       </>
                   )}
                </div>

                {/* 3. Supervision Configuration (New Section) */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                   <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                       <HardHat className="w-5 h-5 text-orange-600" /> Konfiguracja Nadzoru Autorskiego
                   </h3>
                   <div className="bg-orange-50/50 p-4 rounded-lg border border-orange-100">
                       <div className="mb-6 pb-4 border-b border-orange-200/50 flex items-center gap-3">
                           <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox"
                                    id="sup-enabled"
                                    checked={isSupervisionEnabled} 
                                    onChange={toggleSupervisionDefault}
                                    className="w-5 h-5 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                                />
                                <label htmlFor="sup-enabled" className="text-sm font-bold text-slate-700 cursor-pointer">
                                    Etap domyślnie włączony
                                </label>
                           </div>
                           <div className="text-xs text-orange-600/70 italic">
                               (Nadzór zostanie dodany automatycznie do nowej wyceny)
                           </div>
                       </div>
                       
                       <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end transition-opacity ${!isSupervisionEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                           <div>
                               <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Czas trwania</label>
                               <div className="flex gap-2">
                                   <input 
                                     type="number" 
                                     min="0"
                                     value={activeTemplate.supervisionSettings?.duration ?? 20}
                                     onChange={(e) => updateSupervision('duration', parseFloat(e.target.value))}
                                     className="w-20 p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 outline-none"
                                   />
                                   <select
                                      className="p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 outline-none bg-white text-sm"
                                      value={activeTemplate.supervisionSettings?.timeUnit ?? 'weeks'}
                                      onChange={(e) => updateSupervision('timeUnit', e.target.value)}
                                   >
                                       <option value="weeks">Tygodnie</option>
                                       <option value="months">Miesiące</option>
                                   </select>
                               </div>
                           </div>
                           
                           <div>
                               <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Częstotliwość</label>
                               <div className="flex items-center gap-2">
                                   <input 
                                     type="number" 
                                     min="0"
                                     value={activeTemplate.supervisionSettings?.frequency ?? 1}
                                     onChange={(e) => updateSupervision('frequency', parseFloat(e.target.value))}
                                     className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 outline-none"
                                   />
                                   <span className="text-sm text-slate-500 whitespace-nowrap">wizyt / {activeTemplate.supervisionSettings?.timeUnit === 'months' ? 'm-c' : 'tydz.'}</span>
                               </div>
                           </div>

                           <div>
                               <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Czas 1 wizyty (RBH)</label>
                               <div className="flex items-center gap-2">
                                   <input 
                                     type="number" 
                                     min="0"
                                     value={activeTemplate.supervisionSettings?.visitTime ?? 3}
                                     onChange={(e) => updateSupervision('visitTime', parseFloat(e.target.value))}
                                     className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 outline-none"
                                   />
                                   <span className="text-sm text-slate-500">h</span>
                               </div>
                           </div>

                           <div className="bg-white p-3 rounded border border-orange-200 text-right">
                               <div className="text-xs text-orange-500 font-bold uppercase">Suma Nadzoru</div>
                               <div className="text-xl font-bold text-slate-800">
                                   {(() => {
                                       const duration = activeTemplate.supervisionSettings?.duration || 0;
                                       const frequency = activeTemplate.supervisionSettings?.frequency || 0;
                                       const visitTime = activeTemplate.supervisionSettings?.visitTime || 0;
                                       return duration * frequency * visitTime;
                                   })()} <span className="text-sm font-normal text-slate-500">RBH</span>
                               </div>
                           </div>
                       </div>
                   </div>
                </div>

                {/* 4. Stage Weights */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                   <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                       <Clock className="w-5 h-5 text-indigo-600" /> Wagi Etapów i Domyślny Zakres
                   </h3>
                   {allStages.length === 0 ? (
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
                                      const currentDefaults = activeTemplate.defaultEnabledStages || getSafeDefaultEnabledStages();
                                      const isChecked = currentDefaults.includes(stage.id);

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
                                                      checked={isChecked}
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