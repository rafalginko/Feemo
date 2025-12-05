
import React from 'react';
import { TeamMember, RoleType } from '../../types';
import { Button } from '../ui/Button';
import { Plus, Trash2 } from 'lucide-react';

interface TeamSettingsProps {
  team: TeamMember[];
  setTeam: React.Dispatch<React.SetStateAction<TeamMember[]>>;
}

export const TeamSettings: React.FC<TeamSettingsProps> = ({ team, setTeam }) => {
  const handleAddMember = () => {
    const newMember: TeamMember = {
      id: Math.random().toString(36).substr(2, 9),
      role: RoleType.ARCHITECT,
      rate: 0,
    };
    setTeam([...team, newMember]);
  };

  const handleRemoveMember = (id: string) => {
    if (team.length > 1) {
      setTeam(team.filter((m) => m.id !== id));
    }
  };

  const handleUpdateMember = (id: string, field: keyof TeamMember, value: string | number) => {
    setTeam(team.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
        <div className="mb-6 pb-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Struktura Zespołu</h2>
          <p className="text-slate-500 text-sm mt-1">
            Zdefiniuj role i stawki godzinowe (RBH) używane w Twoim biurze. Te ustawienia będą miały zastosowanie do wszystkich nowych kalkulacji.
          </p>
        </div>

        <div className="space-y-4">
          {team.map((member) => (
            <div key={member.id} className="flex flex-col md:flex-row gap-4 items-end md:items-center bg-slate-50 p-4 rounded-lg border border-slate-200/60">
              <div className="flex-1 w-full">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Rola</label>
                <input
                  type="text"
                  list="roles"
                  value={member.role}
                  onChange={(e) => handleUpdateMember(member.id, 'role', e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Wybierz lub wpisz rolę"
                />
                <datalist id="roles">
                  {Object.values(RoleType).map((role) => (
                    <option key={role} value={role} />
                  ))}
                </datalist>
              </div>
              
              <div className="w-full md:w-48">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Stawka (PLN/h)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={member.rate}
                    onChange={(e) => handleUpdateMember(member.id, 'rate', parseFloat(e.target.value) || 0)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute right-3 top-2 text-slate-400 text-sm">PLN</span>
                </div>
              </div>

              <Button
                variant="ghost"
                onClick={() => handleRemoveMember(member.id)}
                className="text-red-500 hover:bg-red-50 hover:text-red-700"
                title="Usuń"
                disabled={team.length <= 1}
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-between items-center">
          <Button variant="outline" onClick={handleAddMember} className="gap-2">
            <Plus className="w-4 h-4" />
            Dodaj członka zespołu
          </Button>
        </div>
      </div>
      
      <div className="mt-4 p-4 bg-blue-50 text-blue-800 text-sm rounded-lg border border-blue-100">
        Zmiany w zespole zostaną automatycznie uwzględnione przy tworzeniu nowych kalkulacji. Zmiana ról może wymagać aktualizacji dystrybucji procentowej w sekcji "Modele Wyliczeń".
      </div>
    </div>
  );
};
