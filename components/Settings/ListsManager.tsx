
import React, { useState } from 'react';
import { BuildingType, ActionType } from '../../types';
import { Button } from '../ui/Button';
import { Trash2, Plus, Edit2, Check, X, Home, Activity } from 'lucide-react';
import { nanoid } from 'nanoid';

interface ListsManagerProps {
  buildingTypes: BuildingType[];
  setBuildingTypes: (types: BuildingType[]) => void;
  actionTypes: ActionType[];
  setActionTypes: (types: ActionType[]) => void;
}

export const ListsManager: React.FC<ListsManagerProps> = ({
  buildingTypes,
  setBuildingTypes,
  actionTypes,
  setActionTypes
}) => {
  // State for Building Types
  const [newBuildingName, setNewBuildingName] = useState('');
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);
  const [editingBuildingName, setEditingBuildingName] = useState('');

  // State for Action Types
  const [newActionName, setNewActionName] = useState('');
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [editingActionName, setEditingActionName] = useState('');

  // Building Actions
  const handleAddBuilding = () => {
    if (!newBuildingName.trim()) return;
    setBuildingTypes([...buildingTypes, { id: `b_${nanoid()}`, name: newBuildingName.trim() }]);
    setNewBuildingName('');
  };
  const handleDeleteBuilding = (id: string) => {
    if(confirm("Usunąć ten typ obiektu?")) setBuildingTypes(buildingTypes.filter(t => t.id !== id));
  };
  const saveBuildingEdit = () => {
    if (editingBuildingId) {
      setBuildingTypes(buildingTypes.map(t => t.id === editingBuildingId ? { ...t, name: editingBuildingName } : t));
      setEditingBuildingId(null);
    }
  };

  // Action Actions
  const handleAddAction = () => {
    if (!newActionName.trim()) return;
    setActionTypes([...actionTypes, { id: `act_${nanoid()}`, name: newActionName.trim() }]);
    setNewActionName('');
  };
  const handleDeleteAction = (id: string) => {
    if(confirm("Usunąć ten typ projektu?")) setActionTypes(actionTypes.filter(t => t.id !== id));
  };
  const saveActionEdit = () => {
    if (editingActionId) {
      setActionTypes(actionTypes.map(t => t.id === editingActionId ? { ...t, name: editingActionName } : t));
      setEditingActionId(null);
    }
  };


  const renderList = (
    title: string, 
    icon: React.ReactNode, 
    items: { id: string, name: string }[], 
    onAdd: () => void,
    onDelete: (id: string) => void,
    onEditStart: (id: string, name: string) => void,
    onEditSave: () => void,
    onEditCancel: () => void,
    newName: string,
    setNewName: (s: string) => void,
    editingId: string | null,
    editingName: string,
    setEditingName: (s: string) => void
  ) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex-1 flex flex-col">
       <div className="mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
         {icon}
         <h3 className="font-bold text-slate-800">{title}</h3>
       </div>
       
       <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1">
          {items.map(item => (
             <div key={item.id} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100">
                {editingId === item.id ? (
                   <div className="flex-1 flex gap-2">
                      <input 
                         className="flex-1 border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                         value={editingName}
                         onChange={e => setEditingName(e.target.value)}
                         autoFocus
                      />
                      <Button size="sm" onClick={onEditSave}><Check className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={onEditCancel}><X className="w-3 h-3" /></Button>
                   </div>
                ) : (
                   <>
                      <span className="text-sm text-slate-700 font-medium">{item.name}</span>
                      <div className="flex gap-1">
                         <button onClick={() => onEditStart(item.id, item.name)} className="p-1 text-slate-400 hover:text-blue-600"><Edit2 className="w-3 h-3" /></button>
                         <button onClick={() => onDelete(item.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                      </div>
                   </>
                )}
             </div>
          ))}
       </div>

       <div className="flex gap-2 pt-2 border-t border-slate-100">
          <input 
             className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
             placeholder="Nowa nazwa..."
             value={newName}
             onChange={e => setNewName(e.target.value)}
          />
          <Button size="sm" onClick={onAdd} disabled={!newName.trim()}><Plus className="w-4 h-4" /></Button>
       </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col">
       <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">Listy i Kategorie</h2>
          <p className="text-slate-500 text-sm mt-1">
             Zarządzaj słownikami typów obiektów i działań projektowych.
          </p>
       </div>

       <div className="flex flex-col md:flex-row gap-6 h-[600px]">
          {renderList(
             'Rodzaje Obiektów', 
             <Home className="w-5 h-5 text-blue-600" />,
             buildingTypes,
             handleAddBuilding,
             handleDeleteBuilding,
             (id, name) => { setEditingBuildingId(id); setEditingBuildingName(name); },
             saveBuildingEdit,
             () => setEditingBuildingId(null),
             newBuildingName,
             setNewBuildingName,
             editingBuildingId,
             editingBuildingName,
             setEditingBuildingName
          )}

          {renderList(
             'Typy Projektu (Działania)', 
             <Activity className="w-5 h-5 text-green-600" />,
             actionTypes,
             handleAddAction,
             handleDeleteAction,
             (id, name) => { setEditingActionId(id); setEditingActionName(name); },
             saveActionEdit,
             () => setEditingActionId(null),
             newActionName,
             setNewActionName,
             editingActionId,
             editingActionName,
             setEditingActionName
          )}
       </div>
    </div>
  );
};
