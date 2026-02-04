
import React, { useEffect, useMemo, useState } from 'react';
import { Stage, TeamMember, ProjectInputs, RoleType, GlobalMultipliers, CalculationTemplate, TimeUnit, StageType, InputType } from '../../types';
import { Button } from '../ui/Button';
import { ChevronDown, ChevronRight, Settings2, Zap, ArrowRight, List, Layout, Wallet, Calculator, Info, HelpCircle, Plus, X, CheckSquare, ToggleLeft, Hash } from 'lucide-react';
import { TimeUnitSwitcher } from '../ui/TimeUnitSwitcher';

interface ScopeStepProps {
  inputs: ProjectInputs;
  setInputs: React.Dispatch<React.SetStateAction<ProjectInputs>>;
  templates: CalculationTemplate[];
  multipliers: GlobalMultipliers;
  onBack: () => void;
  onNext: () => void;
  lastCalculatedSignature: string;
  onUpdateSignature: (sig: string) => void;
  timeUnit: TimeUnit;
  setTimeUnit: (unit: TimeUnit) => void;
  team: TeamMember[];
  stages: Stage[];
  onAddTemplateElement?: (templateId: string, groupId: string, name: string, valueInCurrentUnit: number, unit: TimeUnit, type: InputType) => void;
}

// Reused constant for consistent UI
const INPUT_TYPES: { id: InputType; label: string; icon: React.ReactNode; }[] = [
    { id: 'boolean', label: 'Tak/Nie', icon: <ToggleLeft className="w-4 h-4" /> },
    { id: 'count', label: 'Liczba', icon: <Hash className="w-4 h-4" /> },
    { id: 'select', label: 'Wybór (1)', icon: <List className="w-4 h-4" /> },
    { id: 'multiselect', label: 'Wybór (N)', icon: <CheckSquare className="w-4 h-4" /> }
];

export const ScopeStep: React.FC<ScopeStepProps> = ({ 
  inputs, setInputs, templates, multipliers, onBack, onNext,
  lastCalculatedSignature, onUpdateSignature, timeUnit, setTimeUnit, team, stages,
  onAddTemplateElement
}) => {
  
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showModifiersHelp, setShowModifiersHelp] = useState(false);
  const activeTemplate = useMemo(() => templates.find(t => t.id === inputs.templateId), [templates, inputs.templateId]);
  
  // State for adding new element
  const [addingToGroupId, setAddingToGroupId] = useState<string | null>(null);
  const [newElName, setNewElName] = useState('');
  const [newElValue, setNewElValue] = useState<string>('');
  const [newElType, setNewElType] = useState<InputType>('boolean');

  useEffect(() => {
    if (activeTemplate && expandedGroups.size === 0) {
      setExpandedGroups(new Set(activeTemplate.groups.map(g => g.id)));
    }
  }, [activeTemplate]);

  const toggleGroup = (groupId: string) => {
    const newSet = new Set(expandedGroups);
    if (newSet.has(groupId)) newSet.delete(groupId);
    else newSet.add(groupId);
    setExpandedGroups(newSet);
  };

  const updateElementValue = (elementId: string, value: number | string | string[]) => {
     setInputs(prev => ({
        ...prev,
        elementValues: {
           ...prev.elementValues,
           [elementId]: value
        }
     }));
  };

  const handleMultiselectChange = (elementId: string, optionId: string, isChecked: boolean) => {
      const currentVal = inputs.elementValues[elementId];
      let newArray: string[] = [];
      
      if (Array.isArray(currentVal)) {
          newArray = [...currentVal];
      }

      if (isChecked) {
          if (!newArray.includes(optionId)) newArray.push(optionId);
      } else {
          newArray = newArray.filter(id => id !== optionId);
      }
      
      updateElementValue(elementId, newArray);
  };

  const getElementValue = (elementId: string) => {
     return inputs.elementValues[elementId];
  };

  // Handle adding new element
  const handleStartAdd = (e: React.MouseEvent, groupId: string) => {
      e.stopPropagation();
      setAddingToGroupId(groupId);
      setNewElName('');
      setNewElValue('');
      setNewElType('boolean');
  };

  const handleCancelAdd = () => {
      setAddingToGroupId(null);
  };

  const handleConfirmAdd = () => {
      if (!addingToGroupId || !newElName.trim() || !newElValue || !activeTemplate || !onAddTemplateElement) return;
      
      const val = parseFloat(newElValue);
      if (isNaN(val)) return;

      onAddTemplateElement(activeTemplate.id, addingToGroupId, newElName.trim(), val, timeUnit, newElType);
      setAddingToGroupId(null);
  };

  // --- Multiplier Selection Handlers ---
  const handleMultiplierSelect = (groupId: string, value: string) => {
      setInputs(prev => ({
          ...prev,
          selectedMultipliers: {
              ...prev.selectedMultipliers,
              [groupId]: value
          }
      }));
  };

  const handleMultiplierBoolean = (groupId: string) => {
      setInputs(prev => ({
          ...prev,
          selectedMultipliers: {
              ...prev.selectedMultipliers,
              [groupId]: !prev.selectedMultipliers[groupId]
          }
      }));
  };

  // --- Calculation Logic (Visual Only here) ---
  const rawTotalRBH = useMemo(() => {
     if (!activeTemplate) return 0;
     let total = 0;
     activeTemplate.groups.forEach(group => {
        group.elements.forEach(el => {
           const val = getElementValue(el.id);
           
           if (el.inputType === 'select') {
               // If it's a select type, val should be a string (Option ID)
               if (typeof val === 'string' && el.options) {
                   const selectedOption = el.options.find(opt => opt.id === val);
                   if (selectedOption) {
                       total += selectedOption.rbh;
                   }
               }
           } else if (el.inputType === 'multiselect') {
               if (Array.isArray(val) && el.options) {
                   val.forEach(optId => {
                       const opt = el.options?.find(o => o.id === optId);
                       if (opt) total += opt.rbh;
                   });
               }
           } else {
               // Count or Boolean (number)
               const numVal = typeof val === 'number' ? val : 0;
               total += numVal * el.baseRbh;
           }
        });
     });
     return total;
  }, [activeTemplate, inputs.elementValues]);

  const modifierFactor = useMemo(() => {
    let total = 1.0;
    
    // Ensure multipliers is array for iteration
    if (Array.isArray(multipliers)) {
        multipliers.forEach(group => {
            if (!group.isEnabled) return;
            const selection = inputs.selectedMultipliers[group.id];

            if (group.type === 'select' && group.options) {
                const opt = group.options.find(o => o.id === selection);
                if (opt) total *= opt.value;
            } else if (group.type === 'boolean') {
                if (selection === true) total *= (group.value || 1.0);
            } else if (group.type === 'scale' && group.scaleConfig && inputs.area > 0) {
                 const scaleMult = Math.pow(group.scaleConfig.baseArea / inputs.area, group.scaleConfig.exponent);
                 total *= scaleMult;
            }
        });
    }

    return total;
  }, [multipliers, inputs.selectedMultipliers, inputs.area]);

  const finalTotalRBH = rawTotalRBH * modifierFactor;

  // We don't calculate stages here anymore. Just update signature to detect changes.
  useEffect(() => {
     // Create a signature of multipliers
     const multSig = JSON.stringify(inputs.selectedMultipliers);
     const sig = `${inputs.templateId}-${finalTotalRBH.toFixed(2)}-${inputs.calculationMode}-${inputs.targetFee}-${inputs.includeExternalCostsInFee}-${multSig}`;
     if (sig !== lastCalculatedSignature) {
        onUpdateSignature(sig);
     }
  }, [finalTotalRBH, lastCalculatedSignature, inputs.calculationMode, inputs.targetFee, inputs.includeExternalCostsInFee, inputs.selectedMultipliers]);


  const getConversionFactor = () => {
    switch (timeUnit) {
      case 'd': return 8; 
      case 'w': return 40; 
      default: return 1; 
    }
  };
  const conversionFactor = getConversionFactor();
  const unitLabel = timeUnit === 'h' ? 'RBH' : timeUnit === 'd' ? 'dni' : 'tyg';

  // Calculate current external costs sum for Fee mode preview
  const currentExternalCostsSum = useMemo(() => {
      return stages.reduce((acc, s) => {
          return (s.isEnabled && s.type === StageType.EXTERNAL_FIXED) ? acc + (s.fixedPrice || 0) : acc;
      }, 0);
  }, [stages]);

  if (!activeTemplate) return <div>Wybierz szablon w kroku 1.</div>;

  const multiplierGroups = Array.isArray(multipliers) ? multipliers : [];

  return (
    <div className="max-w-7xl mx-auto pb-24 grid grid-cols-1 lg:grid-cols-3 gap-8">
       
       <div className="lg:col-span-3">
          <div className="bg-slate-100 p-1.5 rounded-xl inline-flex gap-1 mb-6">
             <button
               onClick={() => setInputs(prev => ({ ...prev, calculationMode: 'functional' }))}
               className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${inputs.calculationMode === 'functional' ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-800'}`}
             >
                <Layout className="w-4 h-4" /> Konfiguracja Funkcjonalna
             </button>
             <button
               onClick={() => setInputs(prev => ({ ...prev, calculationMode: 'fee' }))}
               className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${inputs.calculationMode === 'fee' ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-800'}`}
             >
                <Wallet className="w-4 h-4" /> Docelowa Kwota Fee
             </button>
          </div>
       </div>

       {inputs.calculationMode === 'functional' ? (
       <>
       {/* LEFT COLUMN: Functional Configurator */}
       <div className="lg:col-span-2 space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center justify-between">
             <div>
                <h2 className="text-lg font-bold text-slate-800">Konfiguracja Funkcjonalna</h2>
                <p className="text-sm text-slate-500">Zaznacz elementy występujące w projekcie</p>
             </div>
             <div className="flex items-center gap-6">
                <TimeUnitSwitcher unit={timeUnit} setUnit={setTimeUnit} />
                <div className="text-right">
                    <div className="text-xs text-slate-400 uppercase font-bold">Suma Bazowa</div>
                    <div className="text-2xl font-bold text-blue-600">{(rawTotalRBH / conversionFactor).toFixed(1)} <span className="text-sm text-slate-500">{unitLabel}</span></div>
                </div>
             </div>
          </div>

          <div className="space-y-4">
             {activeTemplate.groups.map(group => {
                const isExpanded = expandedGroups.has(group.id);
                // Calculate group total RBH for display
                const groupRBH = group.elements.reduce((acc, el) => {
                    const val = getElementValue(el.id);
                    if (el.inputType === 'select') {
                        if (typeof val === 'string' && el.options) {
                             const opt = el.options.find(o => o.id === val);
                             return acc + (opt ? opt.rbh : 0);
                        }
                        return acc;
                    } else if (el.inputType === 'multiselect') {
                        if (Array.isArray(val) && el.options) {
                            return acc + val.reduce((sum, optId) => {
                                const opt = el.options?.find(o => o.id === optId);
                                return sum + (opt ? opt.rbh : 0);
                            }, 0);
                        }
                        return acc;
                    }
                    return acc + ((typeof val === 'number' ? val : 0) * el.baseRbh);
                }, 0);
                
                return (
                   <div key={group.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div 
                        className="p-4 bg-slate-50 cursor-pointer flex items-center justify-between hover:bg-slate-100 transition-colors"
                        onClick={() => toggleGroup(group.id)}
                      >
                         <div className="flex items-center gap-3">
                            {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                            <h3 className="font-bold text-slate-800">{group.name}</h3>
                         </div>
                         <div className="text-sm font-semibold text-slate-600">{groupRBH > 0 && `${(groupRBH / conversionFactor).toFixed(1)} ${unitLabel}`}</div>
                      </div>
                      
                      {isExpanded && (
                         <div className="divide-y divide-slate-100">
                            {group.elements.map(el => {
                               const rawVal = getElementValue(el.id);
                               
                               let isActive = false;
                               
                               if (el.inputType === 'select') {
                                   isActive = !!rawVal; // String ID exists
                               } else if (el.inputType === 'multiselect') {
                                   isActive = Array.isArray(rawVal) && rawVal.length > 0;
                               } else {
                                   const numVal = typeof rawVal === 'number' ? rawVal : 0;
                                   isActive = numVal > 0;
                               }

                               return (
                                  <div key={el.id} className={`p-4 flex items-center justify-between transition-colors ${isActive ? 'bg-blue-50/30' : 'bg-white'}`}>
                                     <div className="flex-1 pr-4">
                                        <div className="font-medium text-slate-800 flex items-center gap-2">
                                          {el.name}
                                          {el.inputType === 'boolean' || el.inputType === 'count' ? (
                                             <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                {(el.baseRbh / conversionFactor).toFixed(1)}{unitLabel}
                                             </span>
                                          ) : (
                                              <span className="text-[10px] text-slate-400 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 flex items-center gap-1">
                                                  {el.inputType === 'multiselect' ? <CheckSquare className="w-3 h-3" /> : <List className="w-3 h-3" />}
                                                  Opcje
                                              </span>
                                          )}
                                        </div>
                                        {el.description && <div className="text-xs text-slate-500 mt-1">{el.description}</div>}
                                        
                                        {/* Multiselect UI */}
                                        {el.inputType === 'multiselect' && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {el.options?.map(opt => {
                                                    const isChecked = Array.isArray(rawVal) && rawVal.includes(opt.id);
                                                    return (
                                                        <label key={opt.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${isChecked ? 'bg-blue-100 border-blue-300' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                                            <input 
                                                                type="checkbox"
                                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                                checked={isChecked}
                                                                onChange={(e) => handleMultiselectChange(el.id, opt.id, e.target.checked)}
                                                            />
                                                            <span className={`text-sm ${isChecked ? 'text-blue-800 font-medium' : 'text-slate-600'}`}>{opt.name}</span>
                                                            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-1.5 rounded">
                                                                {(opt.rbh / conversionFactor).toFixed(1)}{unitLabel}
                                                            </span>
                                                        </label>
                                                    );
                                                })}
                                                {(!el.options || el.options.length === 0) && <span className="text-xs text-slate-400 italic">Brak zdefiniowanych opcji.</span>}
                                            </div>
                                        )}
                                     </div>
                                     
                                     <div className="flex items-center gap-4">
                                        {el.inputType === 'boolean' && (
                                           <div 
                                             onClick={() => updateElementValue(el.id, (typeof rawVal === 'number' && rawVal > 0) ? 0 : 1)}
                                             className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${(typeof rawVal === 'number' && rawVal > 0) ? 'bg-blue-600' : 'bg-slate-200'}`}
                                           >
                                              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${(typeof rawVal === 'number' && rawVal > 0) ? 'translate-x-6' : ''}`} />
                                           </div>
                                        )}

                                        {el.inputType === 'count' && (
                                           <div className="flex items-center bg-white border border-slate-300 rounded-lg overflow-hidden">
                                              <button 
                                                className="px-3 py-1 hover:bg-slate-100 text-slate-600 disabled:opacity-50"
                                                onClick={() => updateElementValue(el.id, Math.max((el.min || 0), (typeof rawVal === 'number' ? rawVal : 0) - 1))}
                                                disabled={(typeof rawVal === 'number' ? rawVal : 0) <= (el.min || 0)}
                                              >
                                                -
                                              </button>
                                              <div className="px-2 py-1 min-w-[2.5rem] text-center font-bold text-sm border-x border-slate-100">
                                                {typeof rawVal === 'number' ? rawVal : 0}
                                              </div>
                                              <button 
                                                className="px-3 py-1 hover:bg-slate-100 text-slate-600 disabled:opacity-50"
                                                onClick={() => updateElementValue(el.id, Math.min((el.max || 99), (typeof rawVal === 'number' ? rawVal : 0) + 1))}
                                                disabled={(typeof rawVal === 'number' ? rawVal : 0) >= (el.max || 99)}
                                              >
                                                +
                                              </button>
                                           </div>
                                        )}

                                        {el.inputType === 'select' && (
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={typeof rawVal === 'string' ? rawVal : ''}
                                                    onChange={(e) => updateElementValue(el.id, e.target.value)}
                                                    className="text-sm p-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[200px]"
                                                >
                                                    <option value="">-- Wybierz --</option>
                                                    {el.options?.map(opt => (
                                                        <option key={opt.id} value={opt.id}>
                                                            {opt.name} ({(opt.rbh / conversionFactor).toFixed(1)}{unitLabel})
                                                        </option>
                                                    ))}
                                                </select>
                                                {/* Show selected cost */}
                                                {typeof rawVal === 'string' && rawVal && el.options?.find(o => o.id === rawVal) && (
                                                     <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                                         {(el.options.find(o => o.id === rawVal)!.rbh / conversionFactor).toFixed(1)}{unitLabel}
                                                     </span>
                                                )}
                                            </div>
                                        )}
                                        
                                        {/* Multiselect summary cost */}
                                        {el.inputType === 'multiselect' && Array.isArray(rawVal) && rawVal.length > 0 && (
                                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded whitespace-nowrap">
                                                Suma: {rawVal.reduce((acc, id) => acc + (el.options?.find(o => o.id === id)?.rbh || 0), 0) / conversionFactor} {unitLabel}
                                            </span>
                                        )}
                                     </div>
                                  </div>
                               );
                            })}

                            {/* Add Element Section within Group */}
                            {onAddTemplateElement && (
                                <div className="p-3 bg-slate-50 border-t border-slate-100">
                                    {addingToGroupId === group.id ? (
                                        <div className="flex flex-col bg-white p-3 rounded border border-blue-200 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                                            
                                            {/* Type Selection */}
                                            <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
                                                {INPUT_TYPES.map(type => (
                                                    <button
                                                        key={type.id}
                                                        onClick={() => setNewElType(type.id)}
                                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all whitespace-nowrap ${newElType === type.id ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                                                    >
                                                        {type.icon} {type.label}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="flex flex-col sm:flex-row gap-2 items-end">
                                                <div className="flex-1 w-full">
                                                    <input 
                                                        autoFocus
                                                        placeholder="Nazwa elementu"
                                                        className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                                        value={newElName}
                                                        onChange={(e) => setNewElName(e.target.value)}
                                                    />
                                                </div>
                                                <div className="w-full sm:w-28 relative">
                                                    <input 
                                                        type="number"
                                                        placeholder={newElType === 'select' || newElType === 'multiselect' ? 'Koszt opcji' : 'Wartość'}
                                                        className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                                        value={newElValue}
                                                        onChange={(e) => setNewElValue(e.target.value)}
                                                    />
                                                    <span className="absolute right-2 top-2 text-xs text-slate-400 pointer-events-none">{unitLabel}</span>
                                                </div>
                                                <div className="flex gap-1 w-full sm:w-auto justify-end">
                                                    <Button size="sm" onClick={handleConfirmAdd} disabled={!newElName.trim() || !newElValue}>Dodaj</Button>
                                                    <Button size="sm" variant="ghost" onClick={handleCancelAdd}><X className="w-4 h-4" /></Button>
                                                </div>
                                            </div>
                                            {(newElType === 'select' || newElType === 'multiselect') && (
                                                <div className="text-[10px] text-slate-400 mt-2 italic">
                                                    Zostanie utworzony element z jedną domyślną opcją o podanej wartości.
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={(e) => handleStartAdd(e, group.id)}
                                            className="w-full py-2 text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-white rounded border border-dashed border-slate-300 hover:border-blue-300 flex items-center justify-center gap-1 transition-all"
                                        >
                                            <Plus className="w-3 h-3" /> Dodaj nowy element do tej grupy
                                        </button>
                                    )}
                                </div>
                            )}

                         </div>
                      )}
                   </div>
                );
             })}
          </div>
       </div>

       {/* RIGHT COLUMN: Summary & Modifiers */}
       <div className="lg:col-span-1 space-y-6 animate-in fade-in slide-in-from-right-2 duration-300 delay-100">
          
          {/* Modifiers Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
             <div className="flex justify-between items-start mb-4">
               <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-slate-500" /> Modyfikatory
               </h3>
               <button 
                 onClick={() => setShowModifiersHelp(!showModifiersHelp)}
                 className="text-slate-400 hover:text-blue-600 transition-colors"
                 title="Wyjaśnienie modyfikatorów"
               >
                 <HelpCircle className="w-5 h-5" />
               </button>
             </div>
             
             {/* Detailed Explanation */}
             {showModifiersHelp && (
               <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-800 space-y-2 animate-in fade-in slide-in-from-top-1">
                  <p>Te czynniki wpływają globalnie na całą wycenę, mnożąc bazową liczbę godzin.</p>
                  <p>Możesz je skonfigurować w zakładce Konfiguracja.</p>
               </div>
             )}

             <div className="space-y-5">
                {multiplierGroups.map(group => {
                    if (!group.isEnabled) return null;
                    
                    if (group.type === 'scale') {
                         if (!group.scaleConfig || inputs.area <= 0) return null;
                         const scaleMult = Math.pow(group.scaleConfig.baseArea / inputs.area, group.scaleConfig.exponent);
                         
                         return (
                            <div key={group.id} className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-bold text-purple-800">{group.name}</span>
                                    <span className="text-xs font-bold text-purple-600">x{scaleMult.toFixed(2)}</span>
                                </div>
                                <div className="text-[10px] text-purple-500">
                                    Automatyczna korekta dla {inputs.area}m²
                                </div>
                            </div>
                         );
                    }

                    return (
                        <div key={group.id}>
                           <label className="block text-xs font-bold text-slate-500 mb-2">{group.name}</label>
                           
                           {group.type === 'select' && group.options && (
                               <div className="flex flex-wrap gap-2">
                                  {group.options.map(opt => {
                                      const isSelected = inputs.selectedMultipliers[group.id] === opt.id;
                                      return (
                                         <button 
                                           key={opt.id}
                                           onClick={() => handleMultiplierSelect(group.id, opt.id)}
                                           className={`text-xs py-2 px-3 rounded-lg border transition-all ${isSelected ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                         >
                                            {opt.label}
                                         </button>
                                      );
                                  })}
                               </div>
                           )}

                           {group.type === 'boolean' && (
                               <div 
                                 onClick={() => handleMultiplierBoolean(group.id)}
                                 className={`cursor-pointer rounded-lg border p-3 flex items-center gap-3 transition-all ${inputs.selectedMultipliers[group.id] ? 'bg-amber-50 border-amber-400 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                               >
                                  <Zap className={`w-4 h-4 ${inputs.selectedMultipliers[group.id] ? 'fill-amber-500 text-amber-600' : 'text-slate-400'}`} />
                                  <div className="flex-1 text-sm font-medium text-slate-700">
                                      Aktywuj (x{group.value})
                                  </div>
                               </div>
                           )}
                           
                           {group.description && <div className="text-[10px] text-slate-400 mt-1 ml-1">{group.description}</div>}
                        </div>
                    );
                })}
             </div>
          </div>

          {/* Sticky Summary */}
          <div className="bg-slate-900 text-white rounded-xl shadow-lg p-6 sticky top-24">
             <div className="text-slate-400 text-xs font-bold uppercase mb-1">Estymacja (przed etapowaniem)</div>
             <div className="text-4xl font-bold mb-1">
                {Math.round(finalTotalRBH / conversionFactor)} <span className="text-lg font-normal text-slate-400">{unitLabel}</span>
             </div>
             
             <div className="mt-6 pt-6 border-t border-slate-700 space-y-2">
                <div className="flex justify-between text-sm">
                   <span className="text-slate-400">Baza (Elementy)</span>
                   <span>{(rawTotalRBH / conversionFactor).toFixed(1)} {unitLabel}</span>
                </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-slate-400">Modyfikatory</span>
                   <span className={modifierFactor > 1 ? "text-green-400" : "text-slate-200"}>x{modifierFactor.toFixed(2)}</span>
                </div>
             </div>
          </div>

       </div>
       </>
       ) : (
          /* --- TARGET FEE MODE --- */
          <div className="lg:col-span-3 flex justify-center animate-in fade-in slide-in-from-right-2 duration-300">
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 max-w-2xl w-full text-center">
                 <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Wallet className="w-8 h-8 text-emerald-600" />
                 </div>
                 
                 <h2 className="text-2xl font-bold text-slate-900 mb-2">Określ budżet prac (Fee)</h2>
                 <p className="text-slate-600 mb-8 max-w-md mx-auto">
                    Wpisz kwotę, jaką planujesz przeznaczyć na prace projektowe. 
                    System obliczy dostępną liczbę godzin dla zespołu na podstawie średnich stawek.
                 </p>

                 <div className="mb-6">
                     <label className="block text-sm font-bold text-slate-700 mb-2">Kwota (PLN)</label>
                     <div className="relative max-w-xs mx-auto">
                        <input 
                           type="number"
                           className="w-full text-3xl font-bold text-center p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                           placeholder="0"
                           value={inputs.targetFee || ''}
                           onChange={(e) => setInputs(prev => ({ ...prev, targetFee: parseFloat(e.target.value) }))}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">PLN</span>
                     </div>
                 </div>

                 {/* Inclusion Toggle */}
                 <div className="mb-8 flex justify-center">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                       <input 
                         type="checkbox" 
                         className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                         checked={inputs.includeExternalCostsInFee || false}
                         onChange={(e) => setInputs(prev => ({ ...prev, includeExternalCostsInFee: e.target.checked }))}
                       />
                       <div className="text-left">
                          <span className="block text-sm font-semibold text-slate-800">Kwota zawiera koszty zewnętrzne</span>
                          <span className="block text-xs text-slate-500">Jeśli zaznaczone, budżet zespołu zostanie pomniejszony o koszty branżowe.</span>
                       </div>
                    </label>
                 </div>

                 {/* Calculation Breakdown Preview */}
                 {inputs.calculationMode === 'fee' && inputs.targetFee && inputs.targetFee > 0 && inputs.includeExternalCostsInFee && (
                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 max-w-sm mx-auto mb-6 text-sm text-amber-900">
                       <div className="flex justify-between mb-1">
                          <span>Wpisana Kwota:</span>
                          <span className="font-bold">{inputs.targetFee.toLocaleString()} PLN</span>
                       </div>
                       <div className="flex justify-between mb-1 text-amber-700">
                          <span>- Koszty zewn. (estymacja):</span>
                          <span>{currentExternalCostsSum.toLocaleString()} PLN</span>
                       </div>
                       <div className="border-t border-amber-200 mt-2 pt-2 flex justify-between font-bold text-emerald-700">
                          <span>= Budżet zespołu:</span>
                          <span>{Math.max(0, inputs.targetFee - currentExternalCostsSum).toLocaleString()} PLN</span>
                       </div>
                    </div>
                 )}

                 {/* Display calculated Hours Preview */}
                 {(inputs.targetFee && inputs.targetFee > 0) && (
                     <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-6">
                        <div className="text-sm text-slate-500 mb-1">Przeliczony budżet czasowy</div>
                        <div className="text-4xl font-bold text-slate-900">
                           {(() => {
                               // Logic duplicated for preview consistency
                               let budget = inputs.targetFee;
                               if (inputs.includeExternalCostsInFee) {
                                   budget = Math.max(0, budget - currentExternalCostsSum);
                               }

                               let weightedSum = 0;
                               let weightTotal = 0;
                               Object.entries(activeTemplate.roleDistribution).forEach(([role, pct]) => {
                                  const members = team.filter(m => m.role === role);
                                  if (members.length > 0) {
                                      const val = pct as number;
                                      const avgRoleRate = members.reduce((sum, m) => sum + m.rate, 0) / members.length;
                                      weightedSum += avgRoleRate * val;
                                      weightTotal += val;
                                  }
                               });
                               const avgRate = weightTotal > 0 ? weightedSum / weightTotal : 0;
                               if (avgRate === 0) return 0;
                               
                               // Also factor in stage weights distribution to be accurate
                               const relevantStages = activeTemplate.defaultEnabledStages 
                                  ? activeTemplate.defaultEnabledStages 
                                  : Object.keys(activeTemplate.stageWeights);
                                  
                               const sumStageWeights = relevantStages.reduce((acc, stageId) => {
                                   return acc + (activeTemplate.stageWeights[stageId] || 0);
                               }, 0);

                               if (sumStageWeights === 0) return 0;

                               const hours = budget / (sumStageWeights * avgRate);
                               return Math.round(hours / conversionFactor);
                           })()} 
                           <span className="text-lg text-slate-400 font-normal ml-2">{unitLabel}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">
                           System rozdzieli te godziny na etapy zgodnie z wagami w szablonie.
                        </p>
                     </div>
                 )}
             </div>
          </div>
       )}

       {/* Footer Actions */}
       <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-20 col-span-1 lg:col-span-3">
         <div className="max-w-5xl mx-auto flex justify-between items-center">
            <Button variant="ghost" onClick={onBack} className="text-slate-500 hover:text-slate-800">
               Wstecz
            </Button>
            <div className="flex items-center gap-4">
               <div className="text-right hidden sm:block">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Krok 2 z 3</div>
                  <div className="text-xs font-semibold text-slate-900">
                      {inputs.calculationMode === 'functional' ? 'Zakres Funkcjonalny' : 'Target Fee'}
                  </div>
               </div>
               <Button size="lg" onClick={onNext} className="px-6 gap-2" disabled={inputs.calculationMode === 'fee' && (!inputs.targetFee || inputs.targetFee <= 0)}>
                  Dalej: Etapy i Koszty <ArrowRight className="w-4 h-4" />
               </Button>
            </div>
         </div>
      </div>
    </div>
  );
};
