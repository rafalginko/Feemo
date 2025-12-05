
import React, { useState } from 'react';
import { ArrowLeft, Users, Settings as SettingsIcon, Sliders, List, LayoutList, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';

export enum ConfigTab {
  TEAM = 'TEAM',
  MODELS = 'MODELS',
  MULTIPLIERS = 'MULTIPLIERS',
  LISTS = 'LISTS',
  STAGES = 'STAGES'
}

interface ConfigurationLayoutProps {
  onBack: () => void;
  activeTab: ConfigTab;
  setActiveTab: (tab: ConfigTab) => void;
  children: React.ReactNode;
}

export const ConfigurationLayout: React.FC<ConfigurationLayoutProps> = ({
  onBack,
  activeTab,
  setActiveTab,
  children
}) => {
  const menuItems = [
    { id: ConfigTab.TEAM, label: 'Zespół i Stawki', icon: Users, desc: 'Zdefiniuj role i koszty RBH' },
    { id: ConfigTab.LISTS, label: 'Listy i Kategorie', icon: List, desc: 'Edytuj typy projektów' },
    { id: ConfigTab.STAGES, label: 'Zakres i Etapy', icon: LayoutList, desc: 'Domyślne składniki oferty' },
    { id: ConfigTab.MODELS, label: 'Modele Wyliczeń', icon: SettingsIcon, desc: 'Matryce pracochłonności' },
    { id: ConfigTab.MULTIPLIERS, label: 'Czynniki i Mnożniki', icon: Sliders, desc: 'Skala, złożoność, LOD' },
  ];

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 h-[calc(100vh-80px)]">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={onBack} className="gap-2 pl-0 hover:bg-transparent text-slate-500 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" /> Wróć do aplikacji
        </Button>
        <h1 className="text-xl font-bold text-slate-900">Konfiguracja Systemu</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 h-full">
        {/* Sidebar Navigation */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-white' : 'bg-slate-100 group-hover:bg-white'}`}>
                       <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                    </div>
                    <div className="text-left">
                      <div className={isActive ? 'font-bold' : 'font-medium'}>{item.label}</div>
                      <div className={`text-[10px] ${isActive ? 'text-blue-400' : 'text-slate-400'}`}>{item.desc}</div>
                    </div>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-blue-400" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:p-8 overflow-y-auto scrollbar-hide">
           {children}
        </div>
      </div>
    </div>
  );
};
