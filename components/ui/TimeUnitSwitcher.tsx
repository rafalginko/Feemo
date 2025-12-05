
import React from 'react';
import { TimeUnit } from '../../types';

interface TimeUnitSwitcherProps {
  unit: TimeUnit;
  setUnit: (u: TimeUnit) => void;
  className?: string;
}

export const TimeUnitSwitcher: React.FC<TimeUnitSwitcherProps> = ({ unit, setUnit, className = '' }) => {
  return (
    <div className={`flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200 ${className}`}>
      <button 
        onClick={() => setUnit('h')} 
        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${unit === 'h' ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-700'}`} 
        title="Roboczogodziny"
      >
        RBH
      </button>
      <button 
        onClick={() => setUnit('d')} 
        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${unit === 'd' ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-700'}`} 
        title="Dni robocze (8h)"
      >
        Dni
      </button>
      <button 
        onClick={() => setUnit('w')} 
        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${unit === 'w' ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-700'}`} 
        title="Tygodnie robocze (40h)"
      >
        Tyg
      </button>
    </div>
  );
};
