
import React, { useMemo, useEffect, useState } from 'react';
import { ProjectInputs, Stage, TeamMember, StageType, TimeUnit, CalculationTemplate } from '../../types';
import { Button } from '../ui/Button';
import { Download, FileText, Percent, AlertTriangle, Check, X, Save, UserPlus, Edit2 } from 'lucide-react';
import { TimeUnitSwitcher } from '../ui/TimeUnitSwitcher';

interface SummaryStepProps {
  inputs: ProjectInputs;
  team: TeamMember[];
  stages: Stage[];
  projectTitle?: string;
  onBack: () => void;
  onAutoSave: (totalCost: number) => void;
  onRegister: () => void;
  isLoggedIn: boolean;
  lastSaved?: Date | null;
  readOnly?: boolean;
  templates: CalculationTemplate[];
  timeUnit: TimeUnit;
  setTimeUnit: (unit: TimeUnit) => void;
  onTotalCostChange: (newCost: number) => void;
}

export const SummaryStep: React.FC<SummaryStepProps> = ({ 
  inputs, 
  team, 
  stages, 
  projectTitle,
  onBack, 
  onAutoSave, 
  onRegister,
  isLoggedIn, 
  lastSaved,
  readOnly = false,
  templates,
  timeUnit,
  setTimeUnit,
  onTotalCostChange
}) => {
  // Unit conversion helper
  const getConversionFactor = () => {
    switch (timeUnit) {
      case 'd': return 8;
      case 'w': return 40;
      default: return 1;
    }
  };
  const conversionFactor = getConversionFactor();
  const unitLabel = timeUnit === 'd' ? 'Dni' : timeUnit === 'w' ? 'Tyg.' : 'Godz.';

  // Editing Cost State
  const [isEditingCost, setIsEditingCost] = useState(false);
  const [editedCost, setEditedCost] = useState<string>('');

  // Calculations
  const activeStages = stages.filter(s => s.isEnabled);
  
  const calculation = useMemo(() => {
    let totalHours = 0;
    let totalCost = 0;
    let internalCost = 0;

    activeStages.forEach(stage => {
      if (stage.type === StageType.INTERNAL_RBH) {
        stage.roleAllocations.forEach(alloc => {
          const member = team.find(m => m.id === alloc.memberId);
          if (member) {
            totalHours += alloc.hours;
            const cost = alloc.hours * member.rate;
            totalCost += cost;
            internalCost += cost;
          }
        });
      } else if (stage.type === StageType.EXTERNAL_FIXED) {
        // Use the stage.fixedPrice which should be already updated with selected quote price or manual override
        totalCost += (stage.fixedPrice || 0);
      }
    });

    return {
      totalHours,
      totalCost,
      internalCost,
      avgRate: totalHours > 0 ? internalCost / totalHours : 0,
      costPerSqm: inputs.area > 0 ? totalCost / inputs.area : 0
    };
  }, [activeStages, team, inputs.area]);

  // Sync edited cost with calculation when not editing
  useEffect(() => {
    if (!isEditingCost) {
      setEditedCost(calculation.totalCost.toString());
    }
  }, [calculation.totalCost, isEditingCost]);

  const handleSaveCost = () => {
    const val = parseFloat(editedCost);
    if (!isNaN(val) && val >= 0) {
      onTotalCostChange(val);
      setIsEditingCost(false);
    } else {
      setEditedCost(calculation.totalCost.toString());
      setIsEditingCost(false);
    }
  };

  // Auto Save Effect
  useEffect(() => {
    if (isLoggedIn && !readOnly) {
      const timer = setTimeout(() => {
        onAutoSave(calculation.totalCost);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [calculation.totalCost, isLoggedIn, onAutoSave, readOnly]);

  const activeTemplate = templates.find(t => t.id === inputs.templateId);
  const categoryName = activeTemplate ? activeTemplate.name : 'Nieznany szablon';
  const displayTitle = projectTitle || `${categoryName}`;

  const handleExportCSV = () => {
    const rateUnitLabel = timeUnit === 'd' ? 'PLN/dzień' : timeUnit === 'w' ? 'PLN/tydzień' : 'PLN/h';
    const headers = ['Etap', 'Typ', 'Rola / Opis', `Stawka (${rateUnitLabel})`, `Ilość (${unitLabel})`, 'Koszt (PLN)'];
    const rows: string[] = [];

    activeStages.forEach(stage => {
      if (stage.type === StageType.INTERNAL_RBH) {
        stage.roleAllocations.forEach(alloc => {
          if (alloc.hours > 0) {
            const member = team.find(m => m.id === alloc.memberId);
            if (member) {
               // Convert hours to selected unit for CSV
               const amountInUnits = alloc.hours / conversionFactor;
               const rateInUnits = member.rate * conversionFactor;

               rows.push([
                 `"${stage.name}"`,
                 `"Wewnętrzny"`,
                 `"${member.role}"`,
                 rateInUnits.toString().replace('.', ','),
                 amountInUnits.toString().replace('.', ','),
                 (alloc.hours * member.rate).toString().replace('.', ',')
               ].join(';'));
            }
          }
        });
      } else {
        // External Stage Row
        if ((stage.fixedPrice || 0) > 0) {
           // Determine name of the cost (Selected Quote Name or Generic)
           let desc = "Usługa zewnętrzna";
           if (stage.selectedQuoteId && stage.externalQuotes) {
              const quote = stage.externalQuotes.find(q => q.id === stage.selectedQuoteId);
              if (quote) {
                 desc = quote.name;
              }
           }

           rows.push([
             `"${stage.name}"`,
             `"Zewnętrzny"`,
             `"${desc}"`,
             `"-"`,
             `"-"`,
             (stage.fixedPrice || 0).toString().replace('.', ',')
           ].join(';'));
        }
      }
    });

    // Add selected functional elements to CSV for reference
    const functionalRows: string[] = [];
    if (activeTemplate) {
        activeTemplate.groups.forEach(group => {
            group.elements.forEach(el => {
                const val = inputs.elementValues[el.id];
                let displayVal = '';
                
                if (el.inputType === 'select') {
                    if (typeof val === 'string' && el.options) {
                        const opt = el.options.find(o => o.id === val);
                        if (opt) displayVal = opt.name;
                    }
                } else if (typeof val === 'number' && val > 0) {
                    displayVal = val.toString();
                }

                if (displayVal) {
                    functionalRows.push(`Element: ${el.name};${displayVal}`);
                }
            });
        });
    }

    const csvContent = [
      `Projekt: ${displayTitle}`,
      `Szablon: ${categoryName}`,
      `Powierzchnia: ${inputs.area} m2`,
      `Lokalizacja: ${inputs.location}`,
      '',
      headers.join(';'),
      ...rows,
      '',
      `SUMA ${unitLabel.toUpperCase()};;;;${(calculation.totalHours / conversionFactor).toString().replace('.', ',')};`,
      `SUMA KOSZT;;;;;${calculation.totalCost.toString().replace('.', ',')}`,
      '',
      '--- Wybrane elementy funkcjonalne ---',
      ...functionalRows
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `kalkulacja_${inputs.templateId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Main Summary Card */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Podsumowanie Ofertowe
              </h2>
              {projectTitle && <div className="text-sm text-slate-500 mt-1">{projectTitle}</div>}
            </div>
            
            <div className="flex items-center gap-2">
              <TimeUnitSwitcher unit={timeUnit} setUnit={setTimeUnit} className="hidden sm:flex" />
              {isLoggedIn && lastSaved && !readOnly && (
                <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                  <Check className="w-3 h-3" />
                  <span>Zapisano {lastSaved.toLocaleTimeString()}</span>
                </div>
              )}
               {readOnly && (
                 <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full border border-slate-200">
                   Tylko do odczytu
                 </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
             <div>
               <span className="block text-slate-500">Typ inwestycji</span>
               <span className="font-medium">{categoryName}</span>
             </div>
             <div>
               <span className="block text-slate-500">Powierzchnia</span>
               <span className="font-medium">{inputs.area} m²</span>
             </div>
             <div>
               <span className="block text-slate-500">Lokalizacja</span>
               <span className="font-medium">{inputs.location || '-'}</span>
             </div>
             <div>
               <span className="block text-slate-500">Budżet Inwestycji</span>
               <span className="font-medium">{inputs.budget ? `${inputs.budget} PLN` : '-'}</span>
             </div>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-3">
             <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                   <span className="text-slate-600">Suma nakładu pracy ({unitLabel})</span>
                </div>
                <span className="font-semibold text-slate-900">{(calculation.totalHours / conversionFactor).toFixed(1)}</span>
             </div>
             <div className="flex justify-between items-center">
                <span className="text-slate-600">Koszt za m² PUM</span>
                <span className="font-semibold text-slate-900">{calculation.costPerSqm.toFixed(2)} PLN/m²</span>
             </div>
             
             {/* Editable Total Cost */}
             <div className="flex justify-between items-start pt-2 border-t border-slate-100 mt-2">
                <div className="flex flex-col">
                   <span className="text-lg font-bold text-slate-800">Koszt Całkowity (Netto)</span>
                   {!readOnly && !isEditingCost && (
                      <button 
                         onClick={() => setIsEditingCost(true)} 
                         className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 mt-1 transition-colors"
                      >
                         <Edit2 className="w-3 h-3" /> Edytuj kwotę
                      </button>
                   )}
                </div>
                
                {isEditingCost && !readOnly ? (
                   <div className="flex flex-col items-end">
                      <div className="flex items-center gap-2">
                         <input 
                            type="number" 
                            autoFocus
                            className="w-36 text-right font-bold text-xl border border-blue-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
                            value={editedCost}
                            onChange={(e) => setEditedCost(e.target.value)}
                            onBlur={handleSaveCost}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveCost()}
                         />
                         <span className="text-sm font-bold text-slate-500">PLN</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1">Enter, aby zatwierdzić</span>
                   </div>
                ) : (
                   <span className="text-2xl font-bold text-blue-600">
                     {calculation.totalCost.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
                   </span>
                )}
             </div>
          </div>
        </div>

        {/* Stats / Info Card */}
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
             <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
               <Percent className="w-4 h-4" /> Rentowność
             </h3>
             <p className="text-sm text-blue-800 mb-4">
               Średnia stawka (tylko koszty wewnętrzne):
             </p>
             <div className="text-2xl font-bold text-blue-700">
               {(calculation.avgRate * conversionFactor).toFixed(2)} PLN/{unitLabel}
             </div>
           </div>

           {inputs.budget && (
             <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
               <h3 className="font-semibold text-slate-900 mb-2">Fee %</h3>
               <p className="text-sm text-slate-600">
                 Koszt projektu stanowi 
                 <span className="font-bold text-slate-900 ml-1">
                   {((calculation.totalCost / inputs.budget) * 100).toFixed(2)}% 
                 </span> 
                 {" "}szacowanego budżetu inwestycji.
               </p>
             </div>
           )}
        </div>
      </div>
      
      {/* Registration Banner for Logged Out Users */}
      {!isLoggedIn && !readOnly && (
        <div className="bg-indigo-600 rounded-xl p-6 text-white shadow-md mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4">
           <div className="flex-1">
             <h3 className="font-bold text-lg flex items-center gap-2 mb-1">
               <Save className="w-5 h-5 text-indigo-200" />
               Nie trać tej wyceny!
             </h3>
             <p className="text-indigo-100 text-sm">
               Załóż darmowe konto, aby zapisać tę kalkulację w historii, edytować ją później i tworzyć warianty.
             </p>
           </div>
           <Button 
              onClick={onRegister} 
              className="whitespace-nowrap bg-white text-indigo-700 hover:bg-indigo-50 border-transparent shadow-sm"
           >
             <UserPlus className="w-4 h-4 mr-2" />
             Załóż konto i zapisz
           </Button>
        </div>
      )}

      {/* Detailed Breakdown Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <div className="font-semibold text-slate-700">
            Szczegółowy harmonogram kosztów
          </div>
          <div className="sm:hidden">
             <TimeUnitSwitcher unit={timeUnit} setUnit={setTimeUnit} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50/50">
              <tr>
                <th className="px-6 py-3">Etap</th>
                <th className="px-6 py-3">Rola / Opis</th>
                <th className="px-6 py-3 text-right">Ilość ({unitLabel})</th>
                <th className="px-6 py-3 text-right">Stawka (/{unitLabel})</th>
                <th className="px-6 py-3 text-right">Koszt</th>
              </tr>
            </thead>
            <tbody>
              {activeStages.map((stage) => (
                <React.Fragment key={stage.id}>
                  <tr className={`border-b border-slate-100 ${stage.type === StageType.EXTERNAL_FIXED ? 'bg-amber-50/50' : 'bg-slate-50/30'}`}>
                    <td className="px-6 py-2 font-semibold text-slate-800" colSpan={5}>
                      {stage.name} 
                      {stage.type === StageType.EXTERNAL_FIXED && <span className="ml-2 text-xs font-normal text-amber-600">(Koszty zewnętrzne)</span>}
                    </td>
                  </tr>
                  
                  {/* Internal Rows */}
                  {stage.type === StageType.INTERNAL_RBH && stage.roleAllocations.map((alloc) => {
                     if (alloc.hours === 0) return null;
                     const member = team.find(m => m.id === alloc.memberId);
                     if (!member) return null;

                     const displayAmount = alloc.hours / conversionFactor;
                     const displayRate = member.rate * conversionFactor;

                     return (
                       <tr key={`${stage.id}-${member.id}`} className="border-b border-slate-100 hover:bg-slate-50">
                         <td className="px-6 py-3"></td>
                         <td className="px-6 py-3 text-slate-600">{member.role}</td>
                         <td className="px-6 py-3 text-right text-slate-900">{Number(displayAmount.toFixed(2))}</td>
                         <td className="px-6 py-3 text-right text-slate-500">{Number(displayRate.toFixed(0))} PLN</td>
                         <td className="px-6 py-3 text-right font-medium text-slate-900">
                           {(alloc.hours * member.rate).toLocaleString('pl-PL')} PLN
                         </td>
                       </tr>
                     );
                  })}

                  {/* External Row */}
                  {stage.type === StageType.EXTERNAL_FIXED && (
                     <tr className="border-b border-slate-100 hover:bg-amber-50/20">
                         <td className="px-6 py-3"></td>
                         <td className="px-6 py-3 text-slate-600 italic">
                            {stage.selectedQuoteId && stage.externalQuotes?.find(q => q.id === stage.selectedQuoteId)?.name 
                               ? stage.externalQuotes.find(q => q.id === stage.selectedQuoteId)?.name 
                               : "Usługa zewnętrzna"
                            }
                         </td>
                         <td className="px-6 py-3 text-right text-slate-400">-</td>
                         <td className="px-6 py-3 text-right text-slate-400">-</td>
                         <td className="px-6 py-3 text-right font-medium text-slate-900">
                           {(stage.fixedPrice || 0).toLocaleString('pl-PL')} PLN
                         </td>
                     </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {!readOnly && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8 flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold mb-1">Nota prawna</p>
            Wygenerowana kalkulacja ma charakter szacunkowy. Ostateczna oferta powinna uwzględniać ryzyka specyficzne dla danej inwestycji, koszty druku, dojazdów oraz konsultacji zewnętrznych (branżowych), jeśli nie zostały one ujęte powyżej.
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-12">
        {readOnly ? (
           <Button variant="secondary" onClick={onBack} className="w-full sm:w-auto gap-2">
             <X className="w-4 h-4" /> Zamknij podgląd
           </Button>
        ) : (
           <Button variant="secondary" onClick={onBack} className="w-full sm:w-auto">
             Edytuj dane
           </Button>
        )}
        
        <div className="flex gap-3 w-full sm:w-auto justify-end">
           <Button size="lg" onClick={handleExportCSV} className="gap-2 w-full sm:w-auto">
            <Download className="w-4 h-4" />
            Pobierz CSV
          </Button>
        </div>
      </div>
    </div>
  );
};
