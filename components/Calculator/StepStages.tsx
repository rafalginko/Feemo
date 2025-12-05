
import React, { useEffect, useState, useMemo } from 'react';
import { Stage, StageType, ProjectInputs, CalculationTemplate, TeamMember, ExternalQuote, TimeUnit } from '../../types';
import { Button } from '../ui/Button';
import { CheckCircle2, Circle, ArrowRight, Plus, Trash2, Edit2, Check, X, Save, AlertCircle } from 'lucide-react';
import { nanoid } from 'nanoid';
import { TimeUnitSwitcher } from '../ui/TimeUnitSwitcher';

interface StepStagesProps {
  stages: Stage[];
  setStages: React.Dispatch<React.SetStateAction<Stage[]>>;
  totalRBH: number; // Calculated from Step 2
  inputs: ProjectInputs;
  templates: CalculationTemplate[];
  team: TeamMember[];
  onBack: () => void;
  onNext: () => void;
  timeUnit: TimeUnit;
  setTimeUnit: (unit: TimeUnit) => void;
}

export const StepStages: React.FC<StepStagesProps> = ({
  stages,
  setStages,
  totalRBH,
  inputs,
  templates,
  team,
  onBack,
  onNext,
  timeUnit,
  setTimeUnit
}) => {
  const activeTemplate = templates.find(t => t.id === inputs.templateId);

  // Track which stage is currently being edited (Internal Stages)
  const [editingInternalStageId, setEditingInternalStageId] = useState<string | null>(null);

  // Track inputs for new External Quotes (StageId -> {name, price})
  const [quoteInputs, setQuoteInputs] = useState<Record<string, {name: string, price: string}>>({});

  const getConversionFactor = () => {
    switch (timeUnit) {
      case 'd': return 8; 
      case 'w': return 40; 
      default: return 1; 
    }
  };
  const conversionFactor = getConversionFactor();
  const unitLabel = timeUnit === 'h' ? 'RBH' : timeUnit === 'd' ? 'dni' : 'tyg';

  // Recalculate Internal Stages based on Total RBH and Weights
  useEffect(() => {
    if (!activeTemplate) return;

    setStages(prevStages => {
      return prevStages.map(stage => {
        if (stage.type === StageType.INTERNAL_RBH) {
           const hasAllocations = stage.roleAllocations.length > 0 && stage.roleAllocations.some(r => r.hours > 0);
           
          const weight = activeTemplate.stageWeights[stage.id] || 0;
          const stageTotalHours = totalRBH * weight;
          const roleDist = activeTemplate.roleDistribution;
          
          const allocations = team.map(member => {
             const rolePct = roleDist[member.role] || 0;
             const membersWithSameRole = team.filter(t => t.role === member.role).length;
             let hours = 0;
             if (membersWithSameRole > 0 && rolePct > 0) {
                 hours = (stageTotalHours * rolePct) / membersWithSameRole;
             }
             // Round to nearest full hour as requested (integers)
             return { memberId: member.id, hours: Math.round(hours) };
          });
          
          // Only update if there is a significant change to avoid loops, but be sensitive enough
          const currentSum = stage.roleAllocations.reduce((acc, r) => acc + r.hours, 0);
          const newSum = allocations.reduce((acc, r) => acc + r.hours, 0);

          // Use a smaller epsilon or just check structure length/presence
          if (Math.abs(currentSum - newSum) > 0.001 || !hasAllocations) {
              return { ...stage, roleAllocations: allocations };
          }
        }
        return stage;
      });
    });
  }, [totalRBH, activeTemplate, team]); 

  // --- Real-time Cost Calculation for Preview ---
  const currentTotalFee = useMemo(() => {
    return stages.reduce((total, stage) => {
        if (!stage.isEnabled) return total;

        if (stage.type === StageType.INTERNAL_RBH) {
            const internalCost = stage.roleAllocations.reduce((acc, alloc) => {
                const member = team.find(m => m.id === alloc.memberId);
                return acc + (member ? alloc.hours * member.rate : 0);
            }, 0);
            return total + internalCost;
        } else {
            return total + (stage.fixedPrice || 0);
        }
    }, 0);
  }, [stages, team]);

  const toggleStage = (stageId: string) => {
    setStages(prev => prev.map(s => s.id === stageId ? { ...s, isEnabled: !s.isEnabled } : s));
  };

  // --- Internal Stage Manual Editing ---

  const handleRoleHourChange = (stageId: string, memberId: string, value: number) => {
    // If input is 1 day, we save 8 hours. Value coming in is in "units", we save "hours".
    const hours = value * conversionFactor;
    setStages(prev => prev.map(s => {
      if (s.id !== stageId) return s;
      return {
        ...s,
        roleAllocations: s.roleAllocations.map(alloc => 
          alloc.memberId === memberId ? { ...alloc, hours: hours } : alloc
        )
      };
    }));
  };

  const saveInternalEdit = () => {
    setEditingInternalStageId(null);
  };

  // --- External Quote Management ---

  const updateQuoteInput = (stageId: string, field: 'name' | 'price', value: string) => {
    setQuoteInputs(prev => ({
      ...prev,
      [stageId]: {
        ...prev[stageId],
        [field]: value
      }
    }));
  };

  const handleAddQuote = (stageId: string) => {
      const inputs = quoteInputs[stageId];
      if (!inputs || !inputs.name.trim()) return;
      
      const price = parseFloat(inputs.price || '0');
      const newQuote: ExternalQuote = { id: nanoid(), name: inputs.name, price };
      
      setStages(prev => prev.map(s => {
          if (s.id !== stageId) return s;
          const quotes = s.externalQuotes || [];
          return { 
              ...s, 
              externalQuotes: [...quotes, newQuote],
              selectedQuoteId: newQuote.id,
              fixedPrice: newQuote.price // Update the active price
          };
      }));

      // Reset inputs
      setQuoteInputs(prev => ({ ...prev, [stageId]: { name: '', price: '' } }));
  };

  const handleSelectQuote = (stageId: string, quoteId: string) => {
      setStages(prev => prev.map(s => {
          if (s.id !== stageId) return s;
          const quote = s.externalQuotes?.find(q => q.id === quoteId);
          return { 
              ...s, 
              selectedQuoteId: quoteId,
              fixedPrice: quote ? quote.price : s.fixedPrice
          };
      }));
  };

  const handleDeleteQuote = (stageId: string, quoteId: string) => {
      if (!confirm("Usunąć ten wariant wyceny?")) return;
      setStages(prev => prev.map(s => {
          if (s.id !== stageId) return s;
          const newQuotes = s.externalQuotes?.filter(q => q.id !== quoteId) || [];
          const isSelected = s.selectedQuoteId === quoteId;
          return {
              ...s,
              externalQuotes: newQuotes,
              selectedQuoteId: isSelected ? (newQuotes[0]?.id || null) : s.selectedQuoteId,
              fixedPrice: isSelected ? (newQuotes[0]?.price || 0) : s.fixedPrice
          };
      }));
  };

  const handleManualPriceChange = (stageId: string, price: number) => {
      setStages(prev => prev.map(s => {
          if (s.id !== stageId) return s;
          return { ...s, fixedPrice: price, selectedQuoteId: null }; // Manual override clears quote selection
      }));
  };


  return (
    <div className="max-w-5xl mx-auto pb-24">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start gap-4">
         <div>
            <h2 className="text-2xl font-bold text-slate-900">Zakres i Etapy</h2>
            <p className="text-slate-600">Zdecyduj, które etapy wchodzą w skład oferty oraz dostosuj nakłady pracy.</p>
         </div>
         <TimeUnitSwitcher unit={timeUnit} setUnit={setTimeUnit} />
      </div>

      <div className="space-y-8">
          {/* Internal Stages */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <h3 className="font-bold text-slate-800">Etapy Projektowe (Wewnętrzne)</h3>
              </div>
              <div className="divide-y divide-slate-100">
                  {stages.filter(s => s.type === StageType.INTERNAL_RBH).map(stage => {
                      const stageTotalHrs = stage.roleAllocations.reduce((acc, curr) => acc + curr.hours, 0);
                      const isEditing = editingInternalStageId === stage.id;
                      
                      return (
                          <div key={stage.id} className={`p-4 transition-colors ${stage.isEnabled ? 'bg-white' : 'bg-slate-50 opacity-75'}`}>
                              <div className="flex items-start gap-4">
                                  <button onClick={() => toggleStage(stage.id)} className="mt-1">
                                      {stage.isEnabled ? <CheckCircle2 className="w-6 h-6 text-blue-600" /> : <Circle className="w-6 h-6 text-slate-300" />}
                                  </button>
                                  <div className="flex-1">
                                      <div className="flex justify-between items-start">
                                          <div>
                                              <h4 className={`font-bold ${stage.isEnabled ? 'text-slate-900' : 'text-slate-500'}`}>{stage.name}</h4>
                                              <p className="text-sm text-slate-500">{stage.description}</p>
                                          </div>
                                          {stage.isEnabled && (
                                              <div className="flex items-center gap-4">
                                                  <div className="text-right">
                                                      <div className="text-lg font-bold text-slate-900">{Math.round(stageTotalHrs / conversionFactor)} <span className="text-xs font-normal text-slate-500">{unitLabel}</span></div>
                                                  </div>
                                                  {!isEditing ? (
                                                      <Button variant="ghost" size="sm" onClick={() => setEditingInternalStageId(stage.id)}>
                                                          <Edit2 className="w-4 h-4 text-slate-400 hover:text-blue-600" />
                                                      </Button>
                                                  ) : (
                                                      <Button variant="primary" size="sm" onClick={saveInternalEdit}>
                                                          <Save className="w-4 h-4" />
                                                      </Button>
                                                  )}
                                              </div>
                                          )}
                                      </div>
                                      
                                      {/* Role Breakdown / Editing */}
                                      {stage.isEnabled && (
                                          <div className="mt-4">
                                              {isEditing ? (
                                                  <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                                      {team.map(member => {
                                                          const alloc = stage.roleAllocations.find(r => r.memberId === member.id);
                                                          const hours = alloc ? alloc.hours : 0;
                                                          return (
                                                              <div key={member.id}>
                                                                  <label className="block text-xs font-bold text-slate-500 mb-1">{member.role}</label>
                                                                  <div className="relative">
                                                                      <input 
                                                                          type="number"
                                                                          min="0"
                                                                          step={timeUnit === 'h' ? 1 : 0.1}
                                                                          // Display rounded value
                                                                          value={timeUnit === 'h' ? hours : Math.round((hours / conversionFactor) * 100) / 100}
                                                                          onChange={(e) => handleRoleHourChange(stage.id, member.id, parseFloat(e.target.value) || 0)}
                                                                          className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                                      />
                                                                      <span className="absolute right-2 top-1.5 text-xs text-slate-400">{unitLabel}</span>
                                                                  </div>
                                                              </div>
                                                          );
                                                      })}
                                                  </div>
                                              ) : (
                                                  stageTotalHrs > 0 && (
                                                      <div className="flex flex-wrap gap-2">
                                                          {stage.roleAllocations.filter(r => r.hours > 0).map(alloc => {
                                                              const member = team.find(m => m.id === alloc.memberId);
                                                              return (
                                                                  <div key={alloc.memberId} className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200">
                                                                      {member?.role}: <strong>{(alloc.hours / conversionFactor).toFixed(timeUnit === 'h' ? 0 : 1)}{unitLabel}</strong>
                                                                  </div>
                                                              );
                                                          })}
                                                      </div>
                                                  )
                                              )}
                                          </div>
                                      )}
                                  </div>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>

          {/* External Stages */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 bg-amber-50 border-b border-amber-100">
                  <h3 className="font-bold text-amber-900">Koszty Zewnętrzne (Branże i Usługi)</h3>
              </div>
              <div className="divide-y divide-slate-100">
                  {stages.filter(s => s.type === StageType.EXTERNAL_FIXED).map(stage => (
                      <div key={stage.id} className={`p-4 transition-colors ${stage.isEnabled ? 'bg-white' : 'bg-slate-50 opacity-75'}`}>
                          <div className="flex items-start gap-4">
                               <button onClick={() => toggleStage(stage.id)} className="mt-1">
                                  {stage.isEnabled ? <CheckCircle2 className="w-6 h-6 text-amber-600" /> : <Circle className="w-6 h-6 text-slate-300" />}
                               </button>
                               <div className="flex-1">
                                  <div className="flex justify-between items-start mb-2">
                                      <div>
                                          <h4 className={`font-bold ${stage.isEnabled ? 'text-slate-900' : 'text-slate-500'}`}>{stage.name}</h4>
                                          <p className="text-sm text-slate-500">{stage.description}</p>
                                      </div>
                                      {stage.isEnabled && (
                                          <div className="text-right">
                                               <div className="flex items-center gap-2 justify-end">
                                                  <input 
                                                      type="number" 
                                                      className="w-32 text-right font-bold border-b border-slate-300 focus:border-blue-500 outline-none bg-transparent"
                                                      value={stage.fixedPrice || 0}
                                                      onChange={(e) => handleManualPriceChange(stage.id, parseFloat(e.target.value))}
                                                  />
                                                  <span className="text-sm font-medium text-slate-500">PLN</span>
                                               </div>
                                          </div>
                                      )}
                                  </div>

                                  {/* Quotes / Variants Logic */}
                                  {stage.isEnabled && (
                                      <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                          <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Oferty Podwykonawców</label>
                                          
                                          <div className="space-y-2 mb-3">
                                              {stage.externalQuotes?.map(quote => (
                                                  <div 
                                                      key={quote.id} 
                                                      onClick={() => handleSelectQuote(stage.id, quote.id)}
                                                      className={`flex items-center justify-between p-2 rounded border cursor-pointer text-sm ${stage.selectedQuoteId === quote.id ? 'bg-white border-blue-500 shadow-sm ring-1 ring-blue-500' : 'bg-slate-100 border-transparent hover:bg-white hover:border-slate-300'}`}
                                                  >
                                                      <div className="flex items-center gap-2">
                                                          <div className={`w-3 h-3 rounded-full border ${stage.selectedQuoteId === quote.id ? 'border-blue-500 bg-blue-500' : 'border-slate-400 bg-white'}`}></div>
                                                          <span className="font-medium text-slate-700">{quote.name}</span>
                                                      </div>
                                                      <div className="flex items-center gap-3">
                                                          <span className="font-bold text-slate-900">{quote.price.toLocaleString()} zł</span>
                                                          <button 
                                                              onClick={(e) => { e.stopPropagation(); handleDeleteQuote(stage.id, quote.id); }}
                                                              className="text-slate-400 hover:text-red-500"
                                                          >
                                                              <Trash2 className="w-3 h-3" />
                                                          </button>
                                                      </div>
                                                  </div>
                                              ))}
                                              
                                              {(!stage.externalQuotes || stage.externalQuotes.length === 0) && (
                                                  <div className="text-xs text-slate-400 italic mb-2">Brak dodanych ofert. Cena wpisana ręcznie.</div>
                                              )}
                                          </div>

                                          {/* Inline Form to Add Quote */}
                                          <div className="flex flex-col sm:flex-row gap-2 items-end pt-2 border-t border-slate-200">
                                             <div className="flex-1 w-full">
                                                <input 
                                                  placeholder="Nazwa (np. Firma XYZ)" 
                                                  className="w-full text-xs p-2 border border-slate-300 rounded focus:border-blue-500 outline-none"
                                                  value={quoteInputs[stage.id]?.name || ''}
                                                  onChange={e => updateQuoteInput(stage.id, 'name', e.target.value)}
                                                />
                                             </div>
                                             <div className="w-24">
                                                <input 
                                                  placeholder="Cena" 
                                                  type="number"
                                                  className="w-full text-xs p-2 border border-slate-300 rounded focus:border-blue-500 outline-none"
                                                  value={quoteInputs[stage.id]?.price || ''}
                                                  onChange={e => updateQuoteInput(stage.id, 'price', e.target.value)}
                                                />
                                             </div>
                                             <Button 
                                                size="sm" 
                                                variant="secondary" 
                                                onClick={() => handleAddQuote(stage.id)} 
                                                disabled={!quoteInputs[stage.id]?.name}
                                                className="h-[34px]"
                                              >
                                                <Plus className="w-3 h-3 mr-1" /> Dodaj
                                             </Button>
                                          </div>
                                      </div>
                                  )}
                               </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </div>

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-20">
         <div className="max-w-5xl mx-auto flex justify-between items-center">
            <Button variant="ghost" onClick={onBack} className="text-slate-500 hover:text-slate-800">
               Wstecz
            </Button>
            <div className="flex items-center gap-6">
               <div className="text-right flex flex-col items-end">
                   <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aktualna Wycena</div>
                   <div className="text-xl font-bold text-blue-600 leading-none">{currentTotalFee.toLocaleString('pl-PL')} PLN</div>
               </div>
               <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
               <div className="text-right hidden sm:block">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Krok 3 z 3</div>
                  <div className="text-xs font-semibold text-slate-900">Etapy i Koszty</div>
               </div>
               <Button size="lg" onClick={onNext} className="px-6 gap-2 shadow-lg shadow-blue-100">
                  Podsumowanie <ArrowRight className="w-4 h-4" />
               </Button>
            </div>
         </div>
      </div>
    </div>
  );
};
