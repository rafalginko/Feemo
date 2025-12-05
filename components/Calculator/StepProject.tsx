
import React, { useState, useEffect } from 'react';
import { ProjectInputs, ProjectGroup, CalculationTemplate, BuildingType, ActionType } from '../../types';
import { Button } from '../ui/Button';
import { Building2, MapPin, Calendar, Wallet, FolderPlus, Info, LayoutGrid, Hammer } from 'lucide-react';

interface StepProjectProps {
  inputs: ProjectInputs;
  setInputs: React.Dispatch<React.SetStateAction<ProjectInputs>>;
  title: string;
  setTitle: React.Dispatch<React.SetStateAction<string>>;
  projects: ProjectGroup[];
  currentProjectId: string | null;
  onSetProject: (id: string | null) => void;
  onCreateProject: (name: string, inputs?: ProjectInputs) => void;
  onBack: () => void;
  onNext: () => void;
  templates: CalculationTemplate[];
  buildingTypes: BuildingType[];
  actionTypes: ActionType[];
}

export const StepProject: React.FC<StepProjectProps> = ({ 
  inputs, setInputs, title, setTitle, projects, currentProjectId, onSetProject, onCreateProject, onBack, onNext,
  templates, buildingTypes, actionTypes
}) => {
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // Auto-match Template based on Building & Action
  useEffect(() => {
    if (inputs.buildingTypeId && inputs.actionTypeId) {
        // Try to find exact match
        const match = templates.find(t => t.buildingTypeId === inputs.buildingTypeId && t.actionTypeId === inputs.actionTypeId);
        if (match) {
            if (inputs.templateId !== match.id) {
                setInputs(prev => ({ ...prev, templateId: match.id, elementValues: {} })); // Reset values on new template
            }
        } else {
             // If no exact match, perhaps allow proceed with a "generic" or just don't set templateId?
             // For now, let's clear templateId to indicate "Not Supported" configuration
             if (inputs.templateId) {
                setInputs(prev => ({ ...prev, templateId: '' }));
             }
        }
    }
  }, [inputs.buildingTypeId, inputs.actionTypeId, templates, inputs.templateId, setInputs]);

  // Initial Auto-Select first available types if empty
  useEffect(() => {
      if (!inputs.buildingTypeId && buildingTypes.length > 0) {
          setInputs(prev => ({ ...prev, buildingTypeId: buildingTypes[0].id }));
      }
      if (!inputs.actionTypeId && actionTypes.length > 0) {
           setInputs(prev => ({ ...prev, actionTypeId: actionTypes[0].id }));
      }
  }, [buildingTypes, actionTypes, inputs.buildingTypeId, inputs.actionTypeId, setInputs]);


  const handleChange = (field: keyof ProjectInputs, value: any) => {
     setInputs({ ...inputs, [field]: value });
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'NEW') {
      setIsCreatingProject(true);
      onSetProject(null);
    } else {
      setIsCreatingProject(false);
      onSetProject(val === '' ? null : val);
    }
  };

  const handleCreateProjectSubmit = () => {
    if (newProjectName.trim()) {
      onCreateProject(newProjectName, inputs);
      setIsCreatingProject(false);
      setNewProjectName('');
    }
  };

  const matchedTemplate = templates.find(t => t.id === inputs.templateId);

  return (
    <div className="max-w-5xl mx-auto pb-12">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Context & Tech Data */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 1. Context Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Kontekst Ofertowy</h2>
             </div>
             <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1.5">Projekt Główny</label>
                   {!isCreatingProject ? (
                     <div className="relative">
                       <select
                          value={currentProjectId || ''}
                          onChange={handleProjectChange}
                          className="w-full appearance-none rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                       >
                         <option value="">-- Nieprzypisany / Nowy --</option>
                         {projects.map(p => (
                           <option key={p.id} value={p.id}>{p.name}</option>
                         ))}
                         <option value="NEW" className="text-blue-600 font-bold">+ Utwórz nowy projekt</option>
                       </select>
                       <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                       </div>
                     </div>
                   ) : (
                     <div className="flex gap-2">
                       <input 
                          autoFocus
                          type="text"
                          value={newProjectName}
                          onChange={(e) => setNewProjectName(e.target.value)}
                          placeholder="Nazwa projektu"
                          className="flex-1 rounded-lg border border-blue-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                       />
                       <Button size="sm" onClick={handleCreateProjectSubmit} disabled={!newProjectName.trim()}>OK</Button>
                       <Button size="sm" variant="ghost" onClick={() => setIsCreatingProject(false)}>X</Button>
                     </div>
                   )}
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1.5">Nazwa Wariantu</label>
                   <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="np. Wariant 1 - Pełny"
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                   />
                </div>
             </div>
          </div>

          {/* 2. Technical Data Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Dane Inwestycji</h2>
             </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-6">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Rodzaj Obiektu <span className="text-red-500">*</span></label>
                    <div className="relative">
                        <select
                        value={inputs.buildingTypeId}
                        onChange={(e) => handleChange('buildingTypeId', e.target.value)}
                        className="w-full appearance-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-800"
                        >
                        {buildingTypes.map((bt) => (
                            <option key={bt.id} value={bt.id}>{bt.name}</option>
                        ))}
                        </select>
                        <Building2 className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                 </div>
                 
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Typ Projektu <span className="text-red-500">*</span></label>
                    <div className="relative">
                        <select
                        value={inputs.actionTypeId}
                        onChange={(e) => handleChange('actionTypeId', e.target.value)}
                        className="w-full appearance-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-800"
                        >
                        {actionTypes.map((at) => (
                            <option key={at.id} value={at.id}>{at.name}</option>
                        ))}
                        </select>
                        <Hammer className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                 </div>
              </div>
              
              {!matchedTemplate && inputs.buildingTypeId && inputs.actionTypeId && (
                  <div className="col-span-2 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                      Brak zdefiniowanego modelu wyliczeń dla powyższej kombinacji. Przejdź do Konfiguracji, aby utworzyć odpowiedni szablon.
                  </div>
              )}
              
              {matchedTemplate?.description && (
                  <div className="col-span-2 p-3 bg-blue-50 text-blue-800 text-sm rounded-lg border border-blue-100">
                      <strong>Wybrany model:</strong> {matchedTemplate.description}
                  </div>
              )}

              <div className="border-t border-slate-100 col-span-2 my-1"></div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Powierzchnia (Info)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={inputs.area || ''}
                    onChange={(e) => handleChange('area', parseFloat(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none pl-10 text-slate-600"
                    placeholder="m²"
                  />
                  <LayoutGrid className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Parametr informacyjny, wpływa na efekt skali.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Lokalizacja</label>
                <div className="relative">
                  <input
                    type="text"
                    value={inputs.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none pl-10"
                    placeholder="Miasto"
                  />
                   <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Budżet Inwestycji</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={inputs.budget || ''}
                    onChange={(e) => handleChange('budget', parseFloat(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none pl-10"
                    placeholder="PLN"
                  />
                  <Wallet className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Termin Ukończenia</label>
                <div className="relative">
                  <input
                    type="date"
                    value={inputs.deadline || ''}
                    onChange={(e) => handleChange('deadline', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none pl-10 text-slate-600"
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Info */}
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-blue-50 rounded-xl shadow-sm border border-blue-100 overflow-hidden h-full">
             <div className="p-6">
                <h2 className="text-blue-800 font-bold text-lg mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5" /> Jak to działa?
                </h2>
                <p className="text-sm text-blue-700 mb-4 leading-relaxed">
                  System łączy <strong>Rodzaj Obiektu</strong> (np. Dom) z <strong>Typem Projektu</strong> (np. Budowa), aby dobrać odpowiedni model funkcjonalny.
                </p>
                <p className="text-sm text-blue-700 mb-4 leading-relaxed">
                  W następnym kroku określisz szczegółowe <strong>elementy funkcjonalne</strong> (np. liczba łazienek, instalacje), które determinują rzeczywistą pracochłonność projektu.
                </p>
                <div className="p-3 bg-white/60 rounded border border-blue-100 text-xs text-blue-900">
                    Wskazówka: Jeśli nie widzisz odpowiedniej pary Obiekt-Typ, możesz ją dodać w menu Konfiguracja.
                </div>
             </div>
           </div>
        </div>

      </div>

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-10">
         <div className="max-w-5xl mx-auto flex justify-between items-center">
            <Button variant="ghost" onClick={onBack} className="text-slate-500 hover:text-slate-800">
               Wstecz
            </Button>
            <div className="flex items-center gap-4">
               <div className="text-right hidden sm:block">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Krok 1 z 3</div>
                  <div className="text-xs font-semibold text-slate-900">Wybór Modelu</div>
               </div>
               <Button size="lg" onClick={onNext} disabled={!inputs.templateId} className="px-8 shadow-lg shadow-blue-200">
                  Dalej: Konfiguracja Funkcji
               </Button>
            </div>
         </div>
      </div>
      <div className="h-16" /> {/* Spacer for fixed footer */}
    </div>
  );
};
