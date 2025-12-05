
import React, { useState } from 'react';
import { SavedCalculation, ProjectInputs, StageType, ProjectGroup, CalculationTemplate, TimeUnit } from '../../types';
import { Button } from '../ui/Button';
import { FolderOpen, Trash2, Copy, Calendar, MapPin, DollarSign, Eye, Download, ChevronDown, ChevronRight, Folder, FolderInput, Edit2, Check, X, Plus, PlayCircle } from 'lucide-react';
import { TimeUnitSwitcher } from '../ui/TimeUnitSwitcher';

interface HistoryListProps {
  history: SavedCalculation[];
  projects: ProjectGroup[];
  onLoad: (calc: SavedCalculation) => void;
  onDelete: (id: string) => void;
  onPreview: (calc: SavedCalculation) => void;
  onBack: () => void;
  onCreateProject?: (name: string) => void;
  onUpdateProject?: (id: string, name: string) => void;
  onDeleteProject?: (id: string) => void;
  onMoveCalculation?: (calcId: string, projectId: string | null) => void;
  onStartCalculation?: (projectId: string) => void;
  templates: CalculationTemplate[];
  timeUnit: TimeUnit;
  setTimeUnit: (unit: TimeUnit) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ 
  history, projects, onLoad, onDelete, onPreview, onBack,
  onCreateProject, onUpdateProject, onDeleteProject, onMoveCalculation, onStartCalculation,
  templates, timeUnit, setTimeUnit
}) => {
  
  // State to track expanded project folders
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set(projects.map(p => p.id))); // Default open all

  // Project Creation State
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // Project Editing State
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');

  // Move Calculation State
  const [movingCalc, setMovingCalc] = useState<SavedCalculation | null>(null); // The calculation being moved
  const [targetProjectId, setTargetProjectId] = useState<string>(''); // Target project ID

  const toggleProject = (projectId: string) => {
    const newSet = new Set(expandedProjects);
    if (newSet.has(projectId)) {
      newSet.delete(projectId);
    } else {
      newSet.add(projectId);
    }
    setExpandedProjects(newSet);
  };

  const getProjectLabel = (inputs: ProjectInputs) => {
    const template = templates.find(t => t.id === inputs.templateId);
    return template ? template.name : 'Nieznany szablon';
  };

  const handleCreateSubmit = () => {
    if (newProjectName.trim() && onCreateProject) {
      onCreateProject(newProjectName.trim());
      setIsCreatingProject(false);
      setNewProjectName('');
    }
  };

  const startEditingProject = (project: ProjectGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProjectId(project.id);
    setEditingProjectName(project.name);
  };

  const saveEditingProject = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingProjectId && editingProjectName.trim() && onUpdateProject) {
      onUpdateProject(editingProjectId, editingProjectName.trim());
      setEditingProjectId(null);
    }
  };

  const cancelEditingProject = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProjectId(null);
  };

  const handleDeleteProjectClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeleteProject) {
      onDeleteProject(id);
    }
  };

  const openMoveModal = (calc: SavedCalculation) => {
    setMovingCalc(calc);
    setTargetProjectId(calc.projectId || '');
  };

  const confirmMove = () => {
    if (movingCalc && onMoveCalculation) {
      // If targetProjectId is empty string, pass null for "Unassigned"
      onMoveCalculation(movingCalc.id, targetProjectId || null);
      setMovingCalc(null);
    }
  };

  const generateCSV = (calc: SavedCalculation) => {
    const templateName = templates.find(t => t.id === calc.inputs.templateId)?.name || 'Nieznany';
    const headers = ['Etap', 'Typ', 'Rola / Opis', 'Stawka (PLN/h)', 'Godziny', 'Koszt (PLN)'];
    const rows: string[] = [];
    let totalHours = 0;

    calc.stages.filter(s => s.isEnabled).forEach(stage => {
       if (stage.type === StageType.INTERNAL_RBH) {
          stage.roleAllocations.forEach(alloc => {
            if (alloc.hours > 0) {
              const member = calc.team.find(m => m.id === alloc.memberId);
              if (member) {
                totalHours += alloc.hours;
                rows.push([
                  `"${stage.name}"`,
                  `"Wewnętrzny"`,
                  `"${member.role}"`,
                  member.rate.toString(),
                  alloc.hours.toString().replace('.', ','),
                  (alloc.hours * member.rate).toString().replace('.', ',')
                ].join(';'));
              }
            }
          });
       } else {
          if ((stage.fixedPrice || 0) > 0) {
             rows.push([
               `"${stage.name}"`,
               `"Zewnętrzny"`,
               `"Usługa zewnętrzna"`,
               `"-"`,
               `"-"`,
               (stage.fixedPrice || 0).toString().replace('.', ',')
             ].join(';'));
          }
       }
    });

    const csvContent = [
      `Projekt: ${calc.name || templateName}`,
      `Typ: ${templateName}`,
      `Powierzchnia: ${calc.inputs.area} m2`,
      `Lokalizacja: ${calc.inputs.location}`,
      `Data: ${new Date(calc.date).toLocaleDateString('pl-PL')}`,
      '',
      headers.join(';'),
      ...rows,
      '',
      `SUMA RBH;;;;${totalHours.toString().replace('.', ',')};`,
      `SUMA KOSZT;;;;;${calc.totalCost.toString().replace('.', ',')}`
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `kalkulacja_${calc.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Group history items
  const groupedHistory: { project: ProjectGroup | null, items: SavedCalculation[] }[] = [];
  
  // 1. Add known projects
  projects.forEach(proj => {
    const items = history.filter(h => h.projectId === proj.id);
    groupedHistory.push({ project: proj, items });
  });

  // 2. Add orphans
  const orphans = history.filter(h => !h.projectId || !projects.find(p => p.id === h.projectId));
  if (orphans.length > 0) {
    groupedHistory.push({ project: null, items: orphans });
  }

  return (
    <div className="max-w-4xl mx-auto py-8 relative">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FolderOpen className="w-7 h-7 text-blue-600" />
          Projekty i Wyceny
        </h1>
        
        <div className="flex items-center gap-3">
           {isCreatingProject ? (
             <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg p-1 shadow-sm animate-in fade-in zoom-in duration-200">
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Nazwa projektu..."
                  className="text-sm px-2 py-1 outline-none bg-transparent w-40"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                />
                <Button size="sm" onClick={handleCreateSubmit} disabled={!newProjectName.trim()} className="h-7 px-2"><Check className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setIsCreatingProject(false)} className="h-7 px-2"><X className="w-3 h-3" /></Button>
             </div>
           ) : (
             onCreateProject && (
               <Button variant="outline" onClick={() => setIsCreatingProject(true)} className="gap-2 border-dashed">
                  <Plus className="w-4 h-4" /> Nowy Projekt
               </Button>
             )
           )}
           <TimeUnitSwitcher unit={timeUnit} setUnit={setTimeUnit} />
           <Button variant="secondary" onClick={onBack}>Wróć</Button>
        </div>
      </div>

      {history.length === 0 && projects.length === 0 ? (
         <div className="max-w-4xl mx-auto text-center py-16">
            <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <FolderOpen className="w-10 h-10 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Brak zapisanych kalkulacji</h2>
            <p className="text-slate-500 mb-8">Twoja historia wycen jest pusta. Stwórz nową kalkulację i zapisz ją, aby pojawiła się tutaj.</p>
            <Button onClick={onBack}>Wróć do kalkulatora</Button>
          </div>
      ) : (
        <div className="space-y-6 pb-20">
          {groupedHistory.map((group) => {
            const groupId = group.project ? group.project.id : 'orphans';
            const groupName = group.project ? group.project.name : 'Pozostałe / Nieprzypisane';
            const isExpanded = expandedProjects.has(groupId);
            const isEditing = editingProjectId === groupId;

            return (
              <div key={groupId} className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
                {/* Header */}
                <div 
                  className="flex items-center justify-between p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors group"
                  onClick={() => toggleProject(groupId)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                    <Folder className={`w-5 h-5 ${group.project ? 'text-blue-500' : 'text-slate-400'}`} />
                    
                    {isEditing ? (
                       <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <input 
                            autoFocus
                            className="border border-blue-300 rounded px-2 py-1 text-sm"
                            value={editingProjectName}
                            onChange={(e) => setEditingProjectName(e.target.value)}
                          />
                          <Button size="sm" onClick={saveEditingProject}><Check className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="sm" onClick={cancelEditingProject}><X className="w-3 h-3" /></Button>
                       </div>
                    ) : (
                       <div>
                          <h3 className="font-semibold text-slate-800">{groupName}</h3>
                          <p className="text-xs text-slate-500">
                            {group.items.length} {group.items.length === 1 ? 'wariant' : 'wariantów'}
                          </p>
                       </div>
                    )}
                  </div>

                  {/* Project Actions */}
                  <div className="flex items-center gap-1">
                     {/* Add New Calculation to this Project */}
                     {group.project && onStartCalculation && !isEditing && (
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-100 hover:text-blue-700" 
                         onClick={(e) => { e.stopPropagation(); onStartCalculation(group.project!.id); }}
                         title="Dodaj nową wycenę w tym projekcie"
                        >
                          <PlayCircle className="w-4 h-4 mr-1" /> Dodaj Wycenę
                       </Button>
                     )}

                     {group.project && !isEditing && (
                       <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity border-l border-slate-200 pl-2 ml-2">
                          {onUpdateProject && (
                             <Button variant="ghost" size="sm" onClick={(e) => startEditingProject(group.project!, e)} title="Edytuj nazwę">
                                <Edit2 className="w-4 h-4 text-slate-400 hover:text-blue-600" />
                             </Button>
                          )}
                          {onDeleteProject && group.items.length === 0 && (
                             <Button variant="ghost" size="sm" onClick={(e) => handleDeleteProjectClick(group.project!.id, e)} title="Usuń pusty projekt">
                                <Trash2 className="w-4 h-4 text-slate-300 hover:text-red-500" />
                             </Button>
                          )}
                       </div>
                     )}
                  </div>
                </div>

                {/* List */}
                {isExpanded && (
                  <div className="divide-y divide-slate-100">
                    {group.items.length === 0 && (
                       <div className="p-8 text-center text-slate-400 text-sm italic">
                          Brak kalkulacji w tym projekcie.
                       </div>
                    )}
                    {group.items.map((item) => (
                      <div key={item.id} className="p-4 hover:bg-blue-50/30 transition-colors group/item">
                        <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4">
                          <div className="flex-1 min-w-0 ml-8"> {/* Indent to align with header text */}
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-bold text-slate-900 truncate">{item.name}</h4>
                              <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-xs">
                                {new Date(item.date).toLocaleDateString('pl-PL')}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                              <span>{getProjectLabel(item.inputs)}</span>
                              <span>|</span>
                              <span>{item.inputs.area} m²</span>
                              <span>|</span>
                              <span className="font-medium text-slate-700">{item.totalCost.toLocaleString('pl-PL')} PLN</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 ml-8 xl:ml-0">
                            <Button variant="ghost" size="sm" onClick={() => onPreview(item)} title="Podgląd">
                              <Eye className="w-4 h-4 text-slate-400 hover:text-blue-600" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => generateCSV(item)} title="Pobierz CSV">
                              <Download className="w-4 h-4 text-slate-400 hover:text-blue-600" />
                            </Button>
                            {onMoveCalculation && (
                               <Button variant="ghost" size="sm" onClick={() => openMoveModal(item)} title="Przenieś do innego projektu">
                                  <FolderInput className="w-4 h-4 text-slate-400 hover:text-blue-600" />
                               </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => onLoad(item)} title="Nowy wariant na podstawie tego">
                              <Copy className="w-4 h-4 text-slate-400 hover:text-blue-600" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => onDelete(item.id)} title="Usuń">
                              <Trash2 className="w-4 h-4 text-slate-300 hover:text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Move Calculation Modal */}
      {movingCalc && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
               <h3 className="text-lg font-bold text-slate-900 mb-2">Przenieś kalkulację</h3>
               <p className="text-sm text-slate-600 mb-4">
                  Wybierz projekt docelowy dla wyceny <span className="font-semibold text-slate-800">"{movingCalc.name}"</span>.
               </p>
               
               <div className="mb-6">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Projekt docelowy</label>
                  <select 
                     className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                     value={targetProjectId}
                     onChange={(e) => setTargetProjectId(e.target.value)}
                  >
                     <option value="">-- Pozostałe / Nieprzypisane --</option>
                     {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                     ))}
                  </select>
               </div>

               <div className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setMovingCalc(null)}>Anuluj</Button>
                  <Button onClick={confirmMove}>Przenieś</Button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};
