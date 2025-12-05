
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppView, TeamMember, ProjectInputs, Stage, CalculationTemplate, GlobalMultipliers, User, SavedCalculation, RoleType, ProjectGroup, TimeUnit, StageType, BuildingType, ActionType } from './types';
import { DEFAULT_TEAM, DEFAULT_STAGES_TEMPLATE, STAGE_DISTRIBUTION, DEFAULT_MULTIPLIERS, DEFAULT_TEMPLATES, DEFAULT_BUILDING_TYPES, DEFAULT_ACTION_TYPES } from './constants';
import { StepProject } from './components/Calculator/StepProject';
import { ScopeStep } from './components/Calculator/ScopeStep';
import { StepStages } from './components/Calculator/StepStages';
import { SummaryStep } from './components/Calculator/SummaryStep';
import { ModelsManager } from './components/Settings/ModelsManager';
import { TeamSettings } from './components/Settings/TeamSettings';
import { MultiplierSettings } from './components/Settings/MultiplierSettings';
import { ListsManager } from './components/Settings/ListsManager';
import { StagesManager } from './components/Settings/StagesManager';
import { ConfigurationLayout, ConfigTab } from './components/Settings/ConfigurationLayout';
import { About } from './pages/About';
import { Login } from './components/Auth/Login';
import { Register } from './components/Auth/Register';
import { EmailVerification } from './components/Auth/EmailVerification';
import { HistoryList } from './components/History/HistoryList';
import { Calculator, Info, Settings, LogIn, LogOut, FolderOpen, UserCircle, ArrowRight, Clock } from 'lucide-react';
import { Button } from './components/ui/Button';
import { nanoid } from 'nanoid';
import { auth } from './firebase';
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

function App() {
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [currentStep, setCurrentStep] = useState(1);
  
  const [configTab, setConfigTab] = useState<ConfigTab>(ConfigTab.TEAM);
  
  const [user, setUser] = useState<User | null>(null);
  const [savedCalculations, setSavedCalculations] = useState<SavedCalculation[]>([]);
  const [projects, setProjects] = useState<ProjectGroup[]>([]);
  
  const [currentCalculationId, setCurrentCalculationId] = useState<string | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [returnToCalculatorAfterAuth, setReturnToCalculatorAfterAuth] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string>('');

  const [previewCalculation, setPreviewCalculation] = useState<SavedCalculation | null>(null);

  const [projectTitle, setProjectTitle] = useState<string>('');
  const [team, setTeam] = useState<TeamMember[]>(DEFAULT_TEAM);
  const [timeUnit, setTimeUnit] = useState<TimeUnit>('h');
  
  const [globalMultipliers, setGlobalMultipliers] = useState<GlobalMultipliers>(() => {
     const saved = localStorage.getItem('archcalc_multipliers');
     return saved ? JSON.parse(saved) : DEFAULT_MULTIPLIERS;
  });

  useEffect(() => {
    localStorage.setItem('archcalc_multipliers', JSON.stringify(globalMultipliers));
  }, [globalMultipliers]);

  // --- Functional Data Lists ---
  const [buildingTypes, setBuildingTypes] = useState<BuildingType[]>(() => {
    const saved = localStorage.getItem('archcalc_building_types');
    return saved ? JSON.parse(saved) : DEFAULT_BUILDING_TYPES;
  });
  useEffect(() => { localStorage.setItem('archcalc_building_types', JSON.stringify(buildingTypes)); }, [buildingTypes]);

  const [actionTypes, setActionTypes] = useState<ActionType[]>(() => {
    const saved = localStorage.getItem('archcalc_action_types');
    return saved ? JSON.parse(saved) : DEFAULT_ACTION_TYPES;
  });
  useEffect(() => { localStorage.setItem('archcalc_action_types', JSON.stringify(actionTypes)); }, [actionTypes]);

  // --- Functional Templates ---
  const [templates, setTemplates] = useState<CalculationTemplate[]>(() => {
    const saved = localStorage.getItem('archcalc_templates');
    return saved ? JSON.parse(saved) : DEFAULT_TEMPLATES;
  });
  useEffect(() => { localStorage.setItem('archcalc_templates', JSON.stringify(templates)); }, [templates]);

  const [projectInputs, setProjectInputs] = useState<ProjectInputs>({
    buildingTypeId: '',
    actionTypeId: '',
    templateId: '',
    area: 0,
    location: '',
    budget: undefined,
    deadline: '',
    calculationMode: 'functional',
    targetFee: undefined,
    includeExternalCostsInFee: false,
    elementValues: {},
    complexity: 'medium',
    lod: 'standard',
    isExpress: false
  });
  
  const [lastCalculatedSignature, setLastCalculatedSignature] = useState<string>('');
  
  const [stageTemplates, setStageTemplates] = useState<Omit<Stage, 'roleAllocations'>[]>(() => {
    const saved = localStorage.getItem('archcalc_stage_templates');
    return saved ? JSON.parse(saved) : DEFAULT_STAGES_TEMPLATE;
  });

  const [stages, setStages] = useState<Stage[]>(
    stageTemplates.map(s => ({ ...s, roleAllocations: [] }))
  );

  useEffect(() => { localStorage.setItem('archcalc_stage_templates', JSON.stringify(stageTemplates)); }, [stageTemplates]);

  // Handle Template Selection & Default Stages & Fixed Costs
  useEffect(() => {
      if (projectInputs.templateId) {
          const template = templates.find(t => t.id === projectInputs.templateId);
          if (template && template.defaultEnabledStages) {
              setStages(prev => prev.map(s => ({
                  ...s,
                  isEnabled: template.defaultEnabledStages!.includes(s.id),
                  fixedPrice: s.type === StageType.EXTERNAL_FIXED
                      ? (template.defaultFixedCosts?.[s.id] || 0)
                      : s.fixedPrice
              })));
          }
      }
  }, [projectInputs.templateId, templates]);

  // --- Calculate Total RBH (Used for Step 3) ---
  const calculatedTotalRBH = useMemo(() => {
      const activeTemplate = templates.find(t => t.id === projectInputs.templateId);
      if (!activeTemplate) return 0;
      
      // TARGET FEE MODE
      if (projectInputs.calculationMode === 'fee') {
          if (!projectInputs.targetFee || projectInputs.targetFee <= 0) return 0;
          
          let internalBudget = projectInputs.targetFee;

          // If Fee includes external costs, subtract them to get Internal Budget
          if (projectInputs.includeExternalCostsInFee) {
              const totalExternalCosts = stages.reduce((acc, s) => {
                  return (s.isEnabled && s.type === StageType.EXTERNAL_FIXED) ? acc + (s.fixedPrice || 0) : acc;
              }, 0);
              internalBudget = Math.max(0, internalBudget - totalExternalCosts);
          }

          // 1. Calculate weighted sum of rates based on Role Distribution
          // This represents the average cost of 1 hour of "project time" before stage weighting
          let weightedRoleRateSum = 0;
          
          Object.entries(activeTemplate.roleDistribution).forEach(([role, pct]) => {
              const members = team.filter(m => m.role === role);
              if (members.length > 0) {
                  const avgRoleRate = members.reduce((sum, m) => sum + m.rate, 0) / members.length;
                  weightedRoleRateSum += avgRoleRate * (pct as number);
              }
          });

          if (weightedRoleRateSum === 0) return 0;

          // 2. Calculate sum of weights for ENABLED stages
          const relevantStages = activeTemplate.defaultEnabledStages 
             ? activeTemplate.defaultEnabledStages 
             : Object.keys(activeTemplate.stageWeights);
             
          const sumStageWeights = relevantStages.reduce((acc, stageId) => {
              return acc + (activeTemplate.stageWeights[stageId] || 0);
          }, 0);
          
          if (sumStageWeights === 0) return 0;

          // Return RBH derived from Fee
          // Formula: TotalCost = TotalRBH * sumStageWeights * weightedRoleRateSum
          return internalBudget / (sumStageWeights * weightedRoleRateSum);
      }

      // FUNCTIONAL MODE
      let raw = 0;
      activeTemplate.groups.forEach(group => {
          group.elements.forEach(el => {
              const val = projectInputs.elementValues[el.id];
              
              if (el.inputType === 'select') {
                  if (typeof val === 'string' && el.options) {
                      const selectedOption = el.options.find(opt => opt.id === val);
                      if (selectedOption) {
                          raw += selectedOption.rbh;
                      }
                  }
              } else {
                   const numVal = typeof val === 'number' ? val : 0;
                   raw += numVal * el.baseRbh;
              }
          });
      });

      const comp = globalMultipliers.complexity[projectInputs.complexity];
      const lod = globalMultipliers.lod[projectInputs.lod];
      const express = projectInputs.isExpress ? globalMultipliers.express : 1.0;
      
      // Apply Scale Effect
      let scaleMult = 1.0;
      if (globalMultipliers.scale?.enabled && projectInputs.area > 0) {
           scaleMult = Math.pow(globalMultipliers.scale.baseArea / projectInputs.area, globalMultipliers.scale.exponent);
      }

      return raw * comp * lod * express * scaleMult;
  }, [projectInputs, templates, globalMultipliers, team, stages]); // Added stages dependency for external costs


  // --- Handle Summary Cost Change (Step 4 Edit) ---
  const handleSummaryCostChange = (newTotalCost: number) => {
     // 1. Calculate External Costs
     const externalCosts = stages.reduce((acc, s) => {
        return s.isEnabled && s.type === StageType.EXTERNAL_FIXED ? acc + (s.fixedPrice || 0) : acc;
     }, 0);

     // 2. Determine Internal Fee Budget
     // If we are editing Total Cost, we effectively treat input as Gross
     const newInternalFee = Math.max(0, newTotalCost - externalCosts);

     // 3. Update Inputs to Fee Mode
     const newInputs = {
        ...projectInputs,
        calculationMode: 'fee' as const,
        targetFee: newTotalCost,
        includeExternalCostsInFee: true
     };
     setProjectInputs(newInputs);

     // 4. Recalculate Logic immediately to update Stages State
     const activeTemplate = templates.find(t => t.id === newInputs.templateId);
     if (!activeTemplate) return;

     let weightedRoleRateSum = 0;
     Object.entries(activeTemplate.roleDistribution).forEach(([role, pct]) => {
          const members = team.filter(m => m.role === role);
          if (members.length > 0) {
              const avgRoleRate = members.reduce((sum, m) => sum + m.rate, 0) / members.length;
              weightedRoleRateSum += avgRoleRate * (pct as number);
          }
      });

      const enabledInternalStages = stages.filter(s => s.isEnabled && s.type === StageType.INTERNAL_RBH);
      const sumStageWeights = enabledInternalStages.reduce((acc, s) => {
          return acc + (activeTemplate.stageWeights[s.id] || 0);
      }, 0);

      if (weightedRoleRateSum === 0 || sumStageWeights === 0) return;

      const newTotalRBH = newInternalFee / (sumStageWeights * weightedRoleRateSum);

      // 5. Redistribute to Stages
      setStages(prevStages => {
         return prevStages.map(stage => {
            if (stage.type === StageType.INTERNAL_RBH && stage.isEnabled) {
               const weight = activeTemplate.stageWeights[stage.id] || 0;
               const stageTotalHours = newTotalRBH * weight;
               const roleDist = activeTemplate.roleDistribution;
               
               const allocations = team.map(member => {
                  const rolePct = roleDist[member.role] || 0;
                  const membersWithSameRole = team.filter(t => t.role === member.role).length;
                  let hours = 0;
                  if (membersWithSameRole > 0 && rolePct > 0) {
                      hours = (stageTotalHours * rolePct) / membersWithSameRole;
                  }
                  return { memberId: member.id, hours: Math.round(hours) };
               });
               return { ...stage, roleAllocations: allocations };
            }
            return stage;
         });
      });
  };


  // --- Demo Data ---
  const generateDemoData = (userId: string) => {
    const proj1Id = nanoid();
    const demoTemplate = DEFAULT_TEMPLATES[0];
    const demoProjects: ProjectGroup[] = [
      { id: proj1Id, userId, name: "Dom w Jabłonnie", createdAt: new Date().toISOString(), defaultInputs: { 
          templateId: demoTemplate.id,
          buildingTypeId: demoTemplate.buildingTypeId,
          actionTypeId: demoTemplate.actionTypeId,
          area: 150, 
          location: 'Jabłonna', 
          complexity: 'medium', 
          lod: 'standard', 
          calculationMode: 'functional',
          isExpress: false,
          elementValues: { 'el_base': 1, 'el_bathroom': 2, 'el_rooms': 3 }
      }}
    ];
    const demoCalc: SavedCalculation = {
        id: nanoid(), userId, projectId: proj1Id, date: new Date().toISOString(), name: "Wariant A", totalCost: 45000,
        inputs: demoProjects[0].defaultInputs!, stages: DEFAULT_STAGES_TEMPLATE.map(s => ({...s, roleAllocations: []})),
        team: DEFAULT_TEAM, templates: DEFAULT_TEMPLATES, multipliers: DEFAULT_MULTIPLIERS
    };
    return { demoProjects, demoCalculations: [demoCalc] };
  };

  // --- Auth & Storage Effects (FIREBASE) ---

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // CHECK EMAIL VERIFICATION
        if (!firebaseUser.emailVerified && firebaseUser.providerData.some(p => p.providerId === 'password')) {
           // User logged in with password but email not verified
           setVerificationEmail(firebaseUser.email || '');
           signOut(auth).then(() => {
              setView(AppView.EMAIL_VERIFICATION);
           });
           return;
        }

        // User logged in and verified
        const newUser: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'Użytkownik',
          email: firebaseUser.email || '',
        };
        setUser(newUser);
        
        // Load data for this user from local storage (or in future, from Firestore)
        const allHistory = JSON.parse(localStorage.getItem('archcalc_history') || '[]');
        const allProjects = JSON.parse(localStorage.getItem('archcalc_projects') || '[]');
        let userHistory = allHistory.filter((h: SavedCalculation) => h.userId === newUser.id);
        let userProjects = allProjects.filter((p: ProjectGroup) => p.userId === newUser.id);

        if (userHistory.length === 0 && userProjects.length === 0) {
          const { demoProjects, demoCalculations } = generateDemoData(newUser.id);
          userProjects = demoProjects;
          userHistory = demoCalculations;
          localStorage.setItem('archcalc_projects', JSON.stringify([...allProjects, ...demoProjects]));
          localStorage.setItem('archcalc_history', JSON.stringify([...allHistory, ...demoCalculations]));
        }
        setSavedCalculations(userHistory);
        setProjects(userProjects);

        // Handle return flow
        if (returnToCalculatorAfterAuth) {
           setView(AppView.CALCULATOR);
           setReturnToCalculatorAfterAuth(false);
        } else {
           if (view === AppView.LOGIN || view === AppView.REGISTER || view === AppView.EMAIL_VERIFICATION) {
             setView(AppView.LANDING);
           }
        }
      } else {
        // User logged out
        setUser(null);
        setSavedCalculations([]);
        setProjects([]);
        
        // Only redirect to landing if we are not on specific auth screens
        if (view !== AppView.LOGIN && view !== AppView.REGISTER && view !== AppView.EMAIL_VERIFICATION) {
           setView(AppView.LANDING);
        }
      }
    });

    return () => unsubscribe();
  }, [returnToCalculatorAfterAuth, view]);

  // --- Actions ---
  
  const handleGoogleAuth = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // The logic in onAuthStateChanged will handle the successful login
    } catch (error: any) {
      console.error("Google Auth Error:", error);
      if (error.code !== 'auth/popup-closed-by-user') {
          // Translate common errors if possible, or show message
          if (error.code === 'auth/account-exists-with-different-credential') {
             alert('Konto o tym adresie email już istnieje i jest powiązane z inną metodą logowania (np. hasłem). Zaloguj się emailem.');
          } else {
             alert(`Wystąpił błąd logowania Google: ${error.message}`);
          }
      }
    }
  };

  const handleLogout = () => {
    signOut(auth).then(() => {
      setView(AppView.LANDING);
      setCurrentCalculationId(null);
      setCurrentProjectId(null);
      setProjectTitle('');
    });
  };

  const handleVerificationNeeded = (email: string) => {
    setVerificationEmail(email);
    setView(AppView.EMAIL_VERIFICATION);
  };

  const handleCreateProject = (name: string, initialInputs?: ProjectInputs) => {
    if (!user) return;
    const newProject: ProjectGroup = { id: nanoid(), userId: user.id, name, createdAt: new Date().toISOString(), defaultInputs: initialInputs };
    const allProjects = JSON.parse(localStorage.getItem('archcalc_projects') || '[]');
    localStorage.setItem('archcalc_projects', JSON.stringify([...allProjects, newProject]));
    setProjects(prev => [...prev, newProject]);
    setCurrentProjectId(newProject.id);
    return newProject.id;
  };

  const handleSelectProject = (projectId: string | null) => {
    setCurrentProjectId(projectId);
    if (projectId) {
      const selectedProject = projects.find(p => p.id === projectId);
      if (selectedProject && selectedProject.defaultInputs) setProjectInputs(selectedProject.defaultInputs);
    }
  };

  const handleUpdateProject = (id: string, name: string) => {
     const updated = projects.map(p => p.id === id ? { ...p, name } : p);
     setProjects(updated);
     const all = JSON.parse(localStorage.getItem('archcalc_projects') || '[]');
     localStorage.setItem('archcalc_projects', JSON.stringify(all.map((p: ProjectGroup) => p.id === id ? { ...p, name } : p)));
  };
  const handleDeleteProject = (id: string) => {
     setProjects(prev => prev.filter(p => p.id !== id));
     const all = JSON.parse(localStorage.getItem('archcalc_projects') || '[]');
     localStorage.setItem('archcalc_projects', JSON.stringify(all.filter((p: ProjectGroup) => p.id !== id)));
     if (currentProjectId === id) setCurrentProjectId(null);
  };
  const handleMoveCalculation = (calcId: string, projectId: string | null) => {
    const updated = savedCalculations.map(c => c.id === calcId ? { ...c, projectId: projectId || undefined } : c);
    setSavedCalculations(updated);
    const all = JSON.parse(localStorage.getItem('archcalc_history') || '[]');
    localStorage.setItem('archcalc_history', JSON.stringify(all.map((c: SavedCalculation) => c.id === calcId ? { ...c, projectId: projectId || undefined } : c)));
  };

  const autoSaveCalculation = useCallback((totalCost: number) => {
    if (!user) return;
    let variantName = projectTitle;
    if (!variantName) {
       const templateName = templates.find(t => t.id === projectInputs.templateId)?.name || 'Wycena';
       variantName = `${templateName} ${new Date().toLocaleDateString()}`;
    }
    const allHistory = JSON.parse(localStorage.getItem('archcalc_history') || '[]');
    const entryData = { userId: user.id, projectId: currentProjectId || undefined, date: new Date().toISOString(), name: variantName, inputs: projectInputs, stages, team, templates, multipliers: globalMultipliers, totalCost };
    
    let updatedGlobalHistory;
    if (currentCalculationId) {
       updatedGlobalHistory = allHistory.map((h: SavedCalculation) => h.id === currentCalculationId ? { ...h, ...entryData } : h);
    } else {
       const newId = nanoid();
       setCurrentCalculationId(newId);
       updatedGlobalHistory = [{ id: newId, ...entryData }, ...allHistory];
    }
    localStorage.setItem('archcalc_history', JSON.stringify(updatedGlobalHistory));
    setSavedCalculations(updatedGlobalHistory.filter((h: SavedCalculation) => h.userId === user.id));
    setLastSavedTime(new Date());
    if (currentProjectId) {
       setProjects(prev => prev.map(p => p.id === currentProjectId ? { ...p, defaultInputs: projectInputs } : p));
    }
  }, [user, currentCalculationId, currentProjectId, projectTitle, projectInputs, stages, team, templates, globalMultipliers]);

  const handleUseTemplate = (calc: SavedCalculation) => {
    if (!confirm("Stworzyć nowy wariant?")) return;
    setProjectInputs(calc.inputs); setStages(calc.stages); setTeam(calc.team); 
    setGlobalMultipliers({ ...DEFAULT_MULTIPLIERS, ...calc.multipliers });
    setLastCalculatedSignature(JSON.stringify({ tpl: calc.inputs.templateId, vals: calc.inputs.elementValues, mult: calc.multipliers }));
    setProjectTitle(`${calc.name} (Kopia)`);
    setCurrentProjectId(calc.projectId || null); setCurrentCalculationId(null); setLastSavedTime(null); setPreviewCalculation(null);
    setView(AppView.CALCULATOR); setCurrentStep(1);
  };

  const handleDeleteCalculation = (id: string) => {
    if (!confirm("Usunąć?")) return;
    const all = JSON.parse(localStorage.getItem('archcalc_history') || '[]');
    localStorage.setItem('archcalc_history', JSON.stringify(all.filter((h: SavedCalculation) => h.id !== id)));
    setSavedCalculations(prev => prev.filter(h => h.id !== id));
    if (currentCalculationId === id) setCurrentCalculationId(null);
    if (previewCalculation?.id === id) setPreviewCalculation(null);
  };

  const startCalculator = (projectId: string | null = null) => {
    setCurrentCalculationId(null); 
    setLastSavedTime(null); 
    setProjectTitle(''); 
    setLastCalculatedSignature(''); 
    setTimeUnit('h'); 
    setReturnToCalculatorAfterAuth(false);
    
    // Set current project context if provided
    setCurrentProjectId(projectId);
    
    // Load defaults from project if applicable
    let initialInputs: ProjectInputs = { 
        buildingTypeId: '',
        actionTypeId: '',
        templateId: '', 
        area: 0, 
        location: '', 
        elementValues: {}, 
        complexity: 'medium', 
        lod: 'standard', 
        calculationMode: 'functional',
        isExpress: false 
    };

    if (projectId) {
        const proj = projects.find(p => p.id === projectId);
        if (proj && proj.defaultInputs) {
            initialInputs = { ...proj.defaultInputs };
        }
    }

    setProjectInputs(initialInputs);
    setStages(stageTemplates.map(s => ({ ...s, roleAllocations: [] })));
    setView(AppView.CALCULATOR); 
    setCurrentStep(1);
  };

  const goHome = () => { setView(AppView.LANDING); setPreviewCalculation(null); setReturnToCalculatorAfterAuth(false); };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={goHome}>
            <div className="bg-blue-600 text-white p-1.5 rounded-lg group-hover:bg-blue-700 transition-colors">
              <Calculator className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl text-slate-900 tracking-tight">Feemo</span>
          </div>
          
          <nav className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setView(AppView.ABOUT)} className="text-slate-600 hidden md:inline-flex">
              <Info className="w-4 h-4 mr-2" /> O aplikacji
            </Button>

            {user ? (
              <>
                <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>
                <div className="flex items-center gap-2">
                   <Button variant="ghost" size="sm" onClick={() => setView(AppView.HISTORY)} className={`text-slate-700 ${view === AppView.HISTORY ? 'bg-slate-100' : ''}`}>
                    <FolderOpen className="w-4 h-4 mr-2 text-blue-600" /> Projekty
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setView(AppView.CONFIGURATION)} className={`text-slate-700 ${view === AppView.CONFIGURATION ? 'bg-slate-100' : ''}`}>
                    <Settings className="w-4 h-4 mr-2 text-slate-500" /> Konfiguracja
                  </Button>
                  <div className="relative group ml-2 pt-2 pb-2">
                     <button className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold border border-blue-200">
                           {user.name.charAt(0).toUpperCase()}
                        </div>
                     </button>
                     <div className="absolute right-0 top-full pt-2 w-48 hidden group-hover:block z-50">
                        <div className="bg-white rounded-lg shadow-lg border border-slate-200 py-1">
                          <div className="px-4 py-2 text-xs text-slate-500 border-b border-slate-100 mb-1 truncate">{user.email}</div>
                          <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                             <LogOut className="w-4 h-4" /> Wyloguj
                          </button>
                        </div>
                     </div>
                  </div>
                </div>
              </>
            ) : (
              <Button variant="primary" size="sm" onClick={() => setView(AppView.LOGIN)} className="ml-4">
                <LogIn className="w-4 h-4 mr-2" /> Zaloguj
              </Button>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-grow">
        {view === AppView.LANDING && (
          <div className="max-w-4xl mx-auto px-4 text-center mt-16 md:mt-32 pb-12">
            <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6">
              Wyceny architektoniczne <br /><span className="text-blue-600">szybko i&nbsp;trafnie</span>
            </h1>
            <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
              Nowoczesne narzędzie do estymacji. Zapomnij o prostym mnożniku za metr. Skonfiguruj funkcje obiektu, a system obliczy realną pracochłonność.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" onClick={() => startCalculator(null)} className="text-lg px-8 py-4 h-auto shadow-xl shadow-blue-200 hover:shadow-blue-300 transform hover:-translate-y-0.5 transition-all">
                Rozpocznij kalkulację
              </Button>
              {!user && (
                 <Button variant="outline" size="lg" onClick={() => setView(AppView.REGISTER)} className="text-lg px-8 py-4 h-auto">
                   Załóż darmowe konto
                 </Button>
              )}
            </div>
          </div>
        )}

        {view === AppView.ABOUT && <About onBack={goHome} />}

        {view === AppView.CONFIGURATION && (
          <ConfigurationLayout onBack={goHome} activeTab={configTab} setActiveTab={setConfigTab}>
            {configTab === ConfigTab.TEAM ? <TeamSettings team={team} setTeam={setTeam} /> : 
             configTab === ConfigTab.STAGES ? <StagesManager stages={stageTemplates} setStages={setStageTemplates} /> : 
             configTab === ConfigTab.MODELS ? <ModelsManager templates={templates} setTemplates={setTemplates} stages={stages} buildingTypes={buildingTypes} actionTypes={actionTypes} timeUnit={timeUnit} setTimeUnit={setTimeUnit} /> : 
             configTab === ConfigTab.LISTS ? <ListsManager buildingTypes={buildingTypes} setBuildingTypes={setBuildingTypes} actionTypes={actionTypes} setActionTypes={setActionTypes} /> : 
             <MultiplierSettings multipliers={globalMultipliers} setMultipliers={setGlobalMultipliers} />}
          </ConfigurationLayout>
        )}

        {view === AppView.LOGIN && <Login onGoogleLogin={handleGoogleAuth} onSwitchToRegister={() => setView(AppView.REGISTER)} onBack={goHome} onVerificationNeeded={handleVerificationNeeded} />}
        {view === AppView.REGISTER && <Register onGoogleLogin={handleGoogleAuth} onSwitchToLogin={() => setView(AppView.LOGIN)} onBack={goHome} onVerificationNeeded={handleVerificationNeeded} />}
        {view === AppView.EMAIL_VERIFICATION && <EmailVerification email={verificationEmail} onGoToLogin={() => setView(AppView.LOGIN)} />}

        {view === AppView.HISTORY && (
           <>
             {previewCalculation ? (
               <div className="max-w-5xl mx-auto py-8 px-4">
                 <Button variant="ghost" onClick={() => setPreviewCalculation(null)} className="mb-4 pl-0 gap-2 text-slate-500">
                   <ArrowRight className="w-4 h-4 rotate-180" /> Wróć do listy
                 </Button>
                 <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl mb-8 text-sm text-blue-800 flex items-center gap-2 shadow-sm">
                    <Info className="w-4 h-4" /> Tryb podglądu.
                 </div>
                 <SummaryStep inputs={previewCalculation.inputs} team={previewCalculation.team} stages={previewCalculation.stages} projectTitle={previewCalculation.name} onBack={() => setPreviewCalculation(null)} onAutoSave={() => {}} onRegister={() => setView(AppView.REGISTER)} isLoggedIn={true} readOnly={true} templates={templates} timeUnit={timeUnit} setTimeUnit={setTimeUnit} onTotalCostChange={()=>{}} />
               </div>
             ) : (
               <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <HistoryList history={savedCalculations} projects={projects} onLoad={handleUseTemplate} onDelete={handleDeleteCalculation} onPreview={setPreviewCalculation} onBack={goHome} onCreateProject={handleCreateProject} onUpdateProject={handleUpdateProject} onDeleteProject={handleDeleteProject} onMoveCalculation={handleMoveCalculation} onStartCalculation={startCalculator} templates={templates} timeUnit={timeUnit} setTimeUnit={setTimeUnit} />
               </div>
             )}
           </>
        )}

        {view === AppView.CALCULATOR && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
             <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 min-h-[80vh]">
                {currentStep === 1 && <StepProject inputs={projectInputs} setInputs={setProjectInputs} title={projectTitle} setTitle={setProjectTitle} projects={projects} currentProjectId={currentProjectId} onSetProject={handleSelectProject} onCreateProject={handleCreateProject} onBack={goHome} onNext={() => setCurrentStep(2)} templates={templates} buildingTypes={buildingTypes} actionTypes={actionTypes} />}
                
                {/* Passed stages to ScopeStep */}
                {currentStep === 2 && <ScopeStep inputs={projectInputs} setInputs={setProjectInputs} templates={templates} multipliers={globalMultipliers} onBack={() => setCurrentStep(1)} onNext={() => setCurrentStep(3)} lastCalculatedSignature={lastCalculatedSignature} onUpdateSignature={setLastCalculatedSignature} timeUnit={timeUnit} setTimeUnit={setTimeUnit} team={team} stages={stages} />}
                
                {currentStep === 3 && <StepStages stages={stages} setStages={setStages} totalRBH={calculatedTotalRBH} inputs={projectInputs} templates={templates} team={team} onBack={() => setCurrentStep(2)} onNext={() => setCurrentStep(4)} timeUnit={timeUnit} setTimeUnit={setTimeUnit} />}

                {currentStep === 4 && <SummaryStep inputs={projectInputs} team={team} stages={stages} projectTitle={projectTitle} onBack={() => setCurrentStep(3)} onAutoSave={autoSaveCalculation} onRegister={() => { setReturnToCalculatorAfterAuth(true); setView(AppView.REGISTER); }} isLoggedIn={!!user} lastSaved={lastSavedTime} templates={templates} timeUnit={timeUnit} setTimeUnit={setTimeUnit} onTotalCostChange={handleSummaryCostChange} />}
             </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
