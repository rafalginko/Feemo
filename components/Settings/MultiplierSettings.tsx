
import React from 'react';
import { GlobalMultipliers } from '../../types';
import { Sliders, Zap, Layers, Activity } from 'lucide-react';

interface MultiplierSettingsProps {
  multipliers: GlobalMultipliers;
  setMultipliers: React.Dispatch<React.SetStateAction<GlobalMultipliers>>;
}

export const MultiplierSettings: React.FC<MultiplierSettingsProps> = ({ multipliers, setMultipliers }) => {

  const handleChange = (section: keyof GlobalMultipliers, key: string | null, value: any) => {
    if (key) {
      setMultipliers({
        ...multipliers,
        [section]: {
          ...(multipliers[section] as any),
          [key]: value
        }
      });
    } else {
       setMultipliers({
        ...multipliers,
        [section]: value
      });
    }
  };

  const renderPercentageInput = (
    value: number, 
    onChange: (val: number) => void, 
    label: string, 
    description?: string
  ) => (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
      <div className="flex-1">
        <div className="text-sm font-medium text-slate-700">{label}</div>
        {description && <div className="text-xs text-slate-500 mt-1">{description}</div>}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          step="1"
          min="0"
          max="300"
          value={Math.round((value - 1) * 100)}
          onChange={(e) => onChange(1 + (parseFloat(e.target.value) / 100))}
          className="w-16 text-right rounded-md border border-slate-300 px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <span className="text-sm font-bold text-slate-600">%</span>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="mb-6 pb-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Złożoność Projektu (Complexity)
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Określ wpływ stopnia skomplikowania bryły i funkcji na pracochłonność.
          </p>
        </div>
        <div className="space-y-3">
          {renderPercentageInput(
            multipliers.complexity.low, 
            (v) => handleChange('complexity', 'low', v), 
            'Niski stopień złożoności',
            'Prosta bryła, powtarzalne elementy, brak skomplikowanych detali.'
          )}
          {renderPercentageInput(
            multipliers.complexity.medium, 
            (v) => handleChange('complexity', 'medium', v), 
            'Średni (Standard)',
            'Typowe rozwiązania projektowe, standardowa ilość detali.'
          )}
           {renderPercentageInput(
            multipliers.complexity.high, 
            (v) => handleChange('complexity', 'high', v), 
            'Wysoki stopień złożoności',
            'Nietypowa bryła, trudne warunki, indywidualne detale, skomplikowana funkcja.'
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="mb-6 pb-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-600" />
            Szczegółowość (LOD - Level of Detail)
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Wpływ wymaganego stopnia szczegółowości dokumentacji (np. standard vs BIM/High-End).
          </p>
        </div>
        <div className="space-y-3">
           {renderPercentageInput(
            multipliers.lod.standard, 
            (v) => handleChange('lod', 'standard', v), 
            'Standardowy',
            'Dokumentacja wystarczająca do uzyskania pozwoleń i realizacji (LOD 200-300).'
          )}
           {renderPercentageInput(
            multipliers.lod.high, 
            (v) => handleChange('lod', 'high', v), 
            'Wysoki (BIM / High-End)',
            'Pełne modelowanie informacji o budynku, wysoki detal wykonawczy (LOD 350-400).'
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="mb-6 pb-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Tryb Przyspieszony
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Dodatek za pracę pod presją czasu (Express Mode).
          </p>
        </div>
        <div className="space-y-3">
           {renderPercentageInput(
            multipliers.express, 
            (v) => handleChange('express', null, v), 
            'Dodatek za tryb przyspieszony',
            'Krótki termin realizacji wymagający nadgodzin lub priorytetyzacji.'
          )}
        </div>
      </div>

       <div className="mt-4 p-4 bg-blue-50 text-blue-800 text-sm rounded-lg border border-blue-100">
        Wartości te działają jako mnożnik całkowitej liczby godzin wewnętrznych (RBH).<br/>
        Wzór: <code>Bazowe RBH × Złożoność × LOD × (Opcjonalnie Express)</code>
      </div>
    </div>
  );
};
