
import React, { useEffect, useMemo, useState } from 'react';
import { Stage, TeamMember, ProjectInputs, RoleType, GlobalMultipliers, CalculationTemplate, TimeUnit, StageType } from '../../types';
import { Button } from '../ui/Button';
import { ChevronDown, ChevronRight, Settings2, Zap, ArrowRight, List, Layout, Wallet, Calculator } from 'lucide-react';
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
}

export const ScopeStep: React.FC<ScopeStepProps> = ({ 
  inputs, setInputs, templates, multipliers, onBack, onNext,
  lastCalculatedSignature, onUpdateSignature, timeUnit, setTimeUnit, team, stages
}) => {
  
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const activeTemplate = useMemo(() => templates.find(t => t.id === inputs.templateId), [templates, inputs.templateId]);
  
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

  const updateElementValue = (elementId: string, value: number | string) => {
     setInputs(prev => ({
        ...prev,
        elementValues: {
           ...prev.elementValues,
           [elementId]: value
        }
     }));
  };

  const getElementValue = (elementId: string) => {
     return inputs.elementValues[elementId];
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
           } else {
               // Count or Boolean (number)
               const numVal = typeof val === 'number' ? val : 0;
               total += numVal * el.baseRbh;
           }
        });
     });
     return total;
  }, [activeTemplate, inputs.elementValues]);

  const modifiers = useMemo(() => {
    const complexity = multipliers.complexity[inputs.complexity];
    const lod = multipliers.lod[inputs.lod];
    const express = inputs.isExpress ? multipliers.express : 1.0;
    const total = complexity * lod * express;
    return { complexity, lod, express, total };
  }, [inputs.complexity, inputs.lod, inputs.isExpress, multipliers]);

  const finalTotalRBH = rawTotalRBH * modifiers.total;

  // We don't calculate stages here anymore. Just update signature to detect changes.
  useEffect(() => {
     const sig = `${inputs.templateId}-${finalTotalRBH.toFixed(2)}-${inputs.calculationMode}-${inputs.targetFee}-${inputs.includeExternalCostsInFee}`;
     if (sig !== lastCalculatedSignature) {
        onUpdateSignature(sig);
     }
  }, [finalTotalRBH, lastCalculatedSignature, inputs.calculationMode, inputs.targetFee, inputs.includeExternalCostsInFee]);


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
                               } else {
                                   const numVal = typeof rawVal === 'number' ? rawVal : 0;
                                   isActive = numVal > 0;
                               }

                               return (
                                  <div key={el.id} className={`p-4 flex items-center justify-between transition-colors ${isActive ? 'bg-blue-50/30' : 'bg-white'}`}>
                                     <div className="flex-1 pr-4">
                                        <div className="font-medium text-slate-800 flex items-center gap-2">
                                          {el.name}
                                          {el.inputType !== 'select' ? (
                                             <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                {(el.baseRbh / conversionFactor).toFixed(1)}{unitLabel}
                                             </span>
                                          ) : (
                                              <span className="text-[10px] text-slate-400 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 flex items-center gap-1">
                                                  <List className="w-3 h-3" /> Opcje
                                              </span>
                                          )}
                                        </div>
                                        {el.description && <div className="text-xs text-slate-500 mt-1">{el.description}</div>}
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
                                     </div>
                                  </div>
                               );
                            })}
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
             <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Settings2 className="w-5 h-5 text-slate-500" /> Modyfikatory
             </h3>
             
             <div className="space-y-4">
                {/* Complexity */}
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-2">Trudność Globalna</label>
                   <div className="grid grid-cols-3 gap-2">
                      {(['low', 'medium', 'high'] as const).map(lvl => (
                         <button 
                           key={lvl}
                           onClick={() => setInputs(p => ({...p, complexity: lvl}))}
                           className={`text-xs py-2 rounded-lg border ${inputs.complexity === lvl ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}
                         >
                            {lvl === 'low' ? 'Niska' : lvl === 'medium' ? 'Std' : 'Wysoka'}
                         </button>
                      ))}
                   </div>
                </div>

                {/* LOD */}
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-2">LOD (Detal)</label>
                   <div className="grid grid-cols-2 gap-2">
                      {(['standard', 'high'] as const).map(lvl => (
                         <button 
                           key={lvl}
                           onClick={() => setInputs(p => ({...p, lod: lvl}))}
                           className={`text-xs py-2 rounded-lg border ${inputs.lod === lvl ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}
                         >
                            {lvl === 'standard' ? 'Standard' : 'BIM / High'}
                         </button>
                      ))}
                   </div>
                </div>

                {/* Express */}
                <div 
                   onClick={() => setInputs(p => ({...p, isExpress: !p.isExpress}))}
                   className={`cursor-pointer rounded-lg border p-3 flex items-center gap-3 transition-all ${inputs.isExpress ? 'bg-amber-50 border-amber-400' : 'border-slate-200'}`}
                 >
                    <Zap className={`w-4 h-4 ${inputs.isExpress ? 'fill-amber-500 text-amber-600' : 'text-slate-400'}`} />
                    <div className="flex-1 text-sm font-medium text-slate-700">Tryb Express (+20%)</div>
                 </div>
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
                   <span className={modifiers.total > 1 ? "text-green-400" : "text-slate-200"}>x{modifiers.total.toFixed(2)}</span>
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
