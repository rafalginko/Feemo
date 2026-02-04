
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppView, TeamMember, ProjectInputs, Stage, CalculationTemplate, GlobalMultipliers, User, SavedCalculation, ProjectGroup, TimeUnit, StageType, BuildingType, ActionType, UserConfiguration, FunctionalElement, InputType, SelectOption } from './types';
import { DEFAULT_TEAM, DEFAULT_STAGES_TEMPLATE, DEFAULT_MULTIPLIERS, DEFAULT_TEMPLATES, DEFAULT_BUILDING_TYPES, DEFAULT_ACTION_TYPES } from './constants';
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
import { UserProfile } from './components/Profile/UserProfile';
import { Calculator, Info, Settings, LogIn, LogOut, FolderOpen, ArrowRight, UserCircle } from 'lucide-react';
import { Button } from './components/ui/Button';
import { nanoid } from 'nanoid';
import firebase, { auth, db } from './firebase';

// --- Utility: Sanitize Data for Firestore ---
// Firestore crashes if you pass 'undefined'. This removes undefined keys.
const sanitizeForFirestore = (obj: any): any => {
  if (obj === undefined) return null;
  return JSON.parse(JSON.stringify(obj));
};

function App() {
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [currentStep, setCurrentStep] = useState(1);
  const [configTab, setConfigTab] = useState<ConfigTab>(ConfigTab.TEAM);
  
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // App Data State (Synced with Firestore)
  const [team, setTeam] = useState<TeamMember[]>(DEFAULT_TEAM);
  const [globalMultipliers, setGlobalMultipliers] = useState<GlobalMultipliers>(DEFAULT_MULTIPLIERS);
  const [buildingTypes, setBuildingTypes] = useState<BuildingType[]>(DEFAULT_BUILDING_TYPES);
  const [actionTypes, setActionTypes] = useState<ActionType[]>(DEFAULT_ACTION_TYPES);
  const [stageTemplates, setStageTemplates] = useState<Omit<Stage, 'roleAllocations'>[]>(DEFAULT_STAGES_TEMPLATE);
  
  const [templates, setTemplates] = useState<CalculationTemplate[]>(DEFAULT_TEMPLATES);
  const [projects, setProjects] = useState<ProjectGroup[]>([]);
  const [savedCalculations, setSavedCalculations] = useState<SavedCalculation[]>([]);

  // Calculation Workflow State (Local)
  const [currentCalculationId, setCurrentCalculationId] = useState<string | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [returnToCalculatorAfterAuth, setReturnToCalculatorAfterAuth] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string>('');
  const [previewCalculation, setPreviewCalculation] = useState<SavedCalculation | null>(null);
  const [projectTitle, setProjectTitle] = useState<string>('');
  const [timeUnit, setTimeUnit] = useState<TimeUnit>('h');
  
  // Refs to access latest state inside auth listener without re-subscribing
  const viewRef = useRef(view);
  const returnToCalcRef = useRef(returnToCalculatorAfterAuth);

  // --- GLOBAL EFFECT: Prevent Scroll on Number Inputs ---
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      // If the target is an input of type number and is currently focused
      if (
        target.tagName === 'INPUT' && 
        (target as HTMLInputElement).type === 'number' &&
        document.activeElement === target
      ) {
        // Blur the element to stop the value change behavior and allow normal scrolling
        (target as HTMLInputElement).blur();
      }
    };

    // Add passive: false (though blurring doesn't strictly require preventing default, it's safer for interaction handling)
    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    returnToCalcRef.current = returnToCalculatorAfterAuth;
  }, [returnToCalculatorAfterAuth]);
  
  // Project Inputs State
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
    selectedMultipliers: {}, // New dynamic multiplier storage
  });
  
  const [lastCalculatedSignature, setLastCalculatedSignature] = useState<string>('');
  const [stages, setStages] = useState<Stage[]>([]);

  // --- Firestore Sync Logic ---

  const syncUserSession = async (uid: string, email: string, name: string, photoURL?: string) => {
      try {
        const userRef = db.collection('users').doc(uid);
        const configRef = db.collection('configurations').doc(uid);

        let userExists = false;
        let configExists = false;

        try {
            const userSnap = await userRef.get();
            userExists = userSnap.exists;
        } catch (e) {
            // Permission denied usually means doc doesn't exist in strict mode
            userExists = false;
        }

        try {
            const configSnap = await configRef.get();
            configExists = configSnap.exists;
        } catch (e) {
            configExists = false;
        }

        if (!userExists) {
            // If user doesn't exist, create it (likely Google Login flow where Register.tsx wasn't used)
            // Try to split name for first/last
            let firstName = '';
            let lastName = '';
            if (name) {
                const parts = name.split(' ');
                firstName = parts[0];
                if (parts.length > 1) lastName = parts.slice(1).join(' ');
            }

            const userData = { uid, email, displayName: name, firstName, lastName, photoURL: photoURL || '', createdAt: new Date().toISOString() };
            await userRef.set(sanitizeForFirestore(userData));
        }

        if (!configExists) {
            const defaultConfig: UserConfiguration = {
                userId: uid,
                team: DEFAULT_TEAM,
                multipliers: DEFAULT_MULTIPLIERS,
                lists: {
                    buildingTypes: DEFAULT_BUILDING_TYPES,
                    actionTypes: DEFAULT_ACTION_TYPES
                },
                stageTemplates: DEFAULT_STAGES_TEMPLATE
            };
            await configRef.set(sanitizeForFirestore(defaultConfig));
            
            const batch = db.batch();
            DEFAULT_TEMPLATES.forEach(tpl => {
                const newRef = db.collection('templates').doc();
                const tplData = { ...tpl, userId: uid, id: newRef.id };
                batch.set(newRef, sanitizeForFirestore(tplData));
            });
            await batch.commit();
        }
      } catch (error) {
          console.error("Error syncing user session:", error);
      }
  };

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (firebaseUser) => {
      setAuthLoading(true);
      
      if (firebaseUser) {
        if (!firebaseUser.emailVerified && firebaseUser.providerData.some(p => p.providerId === 'password')) {
           setVerificationEmail(firebaseUser.email || '');
           await auth.signOut();
           setView(AppView.EMAIL_VERIFICATION);
           setAuthLoading(false);
           return;
        }

        // Fetch user data from Firestore to get first/last name
        let firstName = '';
        let lastName = '';
        try {
            const userSnap = await db.collection('users').doc(firebaseUser.uid).get();
            if (userSnap.exists) {
                const data = userSnap.data();
                if (data) {
                    firstName = data.firstName || '';
                    lastName = data.lastName || '';
                }
            }
        } catch (e) {
            console.error("Error fetching user detail", e);
        }

        const appUser: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'Użytkownik',
          firstName: firstName,
          lastName: lastName,
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || undefined
        };
        
        // This ensures the doc exists if it's a first time google login
        await syncUserSession(appUser.id, appUser.email, appUser.name, appUser.photoURL);
        
        setUser(appUser);

        // --- Subscriptions ---

        // 1. Configuration (Using Query to avoid missing doc permission issues)
        const qConfig = db.collection('configurations').where("userId", "==", appUser.id);
        const unsubConfig = qConfig.onSnapshot((snapshot) => {
            if (!snapshot.empty) {
                const data = snapshot.docs[0].data() as UserConfiguration;
                setTeam(data.team || DEFAULT_TEAM);
                
                // Handle legacy or array-based multipliers
                if (data.multipliers) {
                   if (Array.isArray(data.multipliers)) {
                      setGlobalMultipliers(data.multipliers);
                   } else {
                      // It's legacy object format, we should probably stick to default or try to migrate
                      // For simplicity, if structure doesn't match, we fallback to DEFAULT but user loses settings.
                      // Ideally we would migrate here. Let's assume new users or migration handled elsewhere.
                      setGlobalMultipliers(DEFAULT_MULTIPLIERS);
                   }
                } else {
                   setGlobalMultipliers(DEFAULT_MULTIPLIERS);
                }

                if (data.lists) {
                    setBuildingTypes(data.lists.buildingTypes || DEFAULT_BUILDING_TYPES);
                    setActionTypes(data.lists.actionTypes || DEFAULT_ACTION_TYPES);
                }
                setStageTemplates(data.stageTemplates || DEFAULT_STAGES_TEMPLATE);
            }
        }, (error) => console.error("Config listener error:", error));

        // 2. Templates
        const qTemplates = db.collection('templates').where("userId", "==", appUser.id);
        const unsubTemplates = qTemplates.onSnapshot((snapshot) => {
            const tpls: CalculationTemplate[] = [];
            snapshot.forEach(doc => tpls.push({ ...doc.data(), id: doc.id } as CalculationTemplate));
            setTemplates(tpls);
        }, (error) => console.error("Templates listener error:", error));

        // 3. Projects
        const qProjects = db.collection('projects').where("userId", "==", appUser.id);
        const unsubProjects = qProjects.onSnapshot((snapshot) => {
             const projs: ProjectGroup[] = [];
             snapshot.forEach(doc => projs.push({ ...doc.data(), id: doc.id } as ProjectGroup));
             setProjects(projs);
        }, (error) => console.error("Projects listener error:", error));

        // 4. Calculations
        const qCalcs = db.collection('calculations').where("userId", "==", appUser.id);
        const unsubCalcs = qCalcs.onSnapshot((snapshot) => {
             const calcs: SavedCalculation[] = [];
             snapshot.forEach(doc => calcs.push({ ...doc.data(), id: doc.id } as SavedCalculation));
             calcs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
             setSavedCalculations(calcs);
        }, (error) => console.error("Calculations listener error:", error));

        // Navigation
        if (returnToCalcRef.current) {
           setView(AppView.CALCULATOR);
           setReturnToCalculatorAfterAuth(false);
        } else {
           const currentView = viewRef.current;
           if (currentView === AppView.LOGIN || currentView === AppView.REGISTER || currentView === AppView.EMAIL_VERIFICATION) {
             setView(AppView.LANDING);
           }
        }

        setAuthLoading(false);
        
        return () => {
            unsubConfig();
            unsubTemplates();
            unsubProjects();
            unsubCalcs();
        };

      } else {
        setUser(null);
        setSavedCalculations([]);
        setProjects([]);
        setTemplates(DEFAULT_TEMPLATES); 
        setTeam(DEFAULT_TEAM);
        setGlobalMultipliers(DEFAULT_MULTIPLIERS);
        
        const currentView = viewRef.current;
        if (currentView !== AppView.LOGIN && currentView !== AppView.REGISTER && currentView !== AppView.EMAIL_VERIFICATION) {
           setView(AppView.LANDING);
        }
        setAuthLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // --- Initializing Stages ---
  useEffect(() => {
      if (stages.length === 0 && stageTemplates.length > 0) {
          setStages(stageTemplates.map(s => ({ ...s, roleAllocations: [] })));
      }
  }, [stageTemplates]);

  // --- Template Defaults ---
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

  // --- State Setters Wrappers (with Sanitization) ---
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const templatesDebounceMap = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const updateConfigField = (field: keyof UserConfiguration, value: any) => {
      if (!user) return;
      if (field === 'team') setTeam(value);
      if (field === 'multipliers') setGlobalMultipliers(value);
      if (field === 'stageTemplates') setStageTemplates(value);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
          const ref = db.collection('configurations').doc(user.id);
          await ref.update({ [field]: sanitizeForFirestore(value) });
      }, 1000);
  };

  const setTeamWrapper = (action: React.SetStateAction<TeamMember[]>) => {
      const newVal = typeof action === 'function' ? action(team) : action;
      updateConfigField('team', newVal);
  };

  const setMultipliersWrapper = (action: React.SetStateAction<GlobalMultipliers>) => {
      const newVal = typeof action === 'function' ? action(globalMultipliers) : action;
      updateConfigField('multipliers', newVal);
  };

  const setStagesWrapper = (action: React.SetStateAction<Omit<Stage, 'roleAllocations'>[]>) => {
       const newVal = typeof action === 'function' ? action(stageTemplates) : action;
       updateConfigField('stageTemplates', newVal);
  };

  const setBuildingTypesWrapper = (action: React.SetStateAction<BuildingType[]>) => {
      const newVal = typeof action === 'function' ? action(buildingTypes) : action;
      setBuildingTypes(newVal); 
      if (user) {
          const ref = db.collection('configurations').doc(user.id);
          ref.update({ "lists.buildingTypes": sanitizeForFirestore(newVal) });
      }
  };

  const setActionTypesWrapper = (action: React.SetStateAction<ActionType[]>) => {
      const newVal = typeof action === 'function' ? action(actionTypes) : action;
      setActionTypes(newVal); 
      if (user) {
          const ref = db.collection('configurations').doc(user.id);
          ref.update({ "lists.actionTypes": sanitizeForFirestore(newVal) });
      }
  };

  const setTemplatesWrapper = (action: React.SetStateAction<CalculationTemplate[]>) => {
      const newVal = typeof action === 'function' ? action(templates) : action;
      setTemplates(newVal); 

      if (!user) return;
      if (newVal.length > templates.length) {
          // ADD
          const added = newVal.find(n => !templates.find(o => o.id === n.id));
          if (added) {
              db.collection('templates').doc(added.id).set(sanitizeForFirestore({ ...added, userId: user.id }));
          }
      } else if (newVal.length < templates.length) {
          // DELETE
          const removed = templates.find(o => !newVal.find(n => n.id === o.id));
          if (removed) {
              db.collection('templates').doc(removed.id).delete();
          }
      } else {
          // UPDATE
          newVal.forEach(t => {
              const old = templates.find(o => o.id === t.id);
              if (JSON.stringify(old) !== JSON.stringify(t)) {
                   if (templatesDebounceMap.current.has(t.id)) {
                       clearTimeout(templatesDebounceMap.current.get(t.id)!);
                   }
                   
                   // Set new debounce
                   const timer = setTimeout(() => {
                      db.collection('templates').doc(t.id).update(sanitizeForFirestore(t));
                      templatesDebounceMap.current.delete(t.id);
                   }, 1000);
                   
                   templatesDebounceMap.current.set(t.id, timer);
              }
          });
      }
  };

  // --- Calculations Logic ---
  const calculatedTotalRBH = useMemo(() => {
      const activeTemplate = templates.find(t => t.id === projectInputs.templateId);
      if (!activeTemplate) return 0;
      
      if (projectInputs.calculationMode === 'fee') {
          if (!projectInputs.targetFee || projectInputs.targetFee <= 0) return 0;
          let internalBudget = projectInputs.targetFee;

          if (projectInputs.includeExternalCostsInFee) {
              const totalExternalCosts = stages.reduce((acc, s) => {
                  return (s.isEnabled && s.type === StageType.EXTERNAL_FIXED) ? acc + (s.fixedPrice || 0) : acc;
              }, 0);
              internalBudget = Math.max(0, internalBudget - totalExternalCosts);
          }

          let weightedRoleRateSum = 0;
          Object.entries(activeTemplate.roleDistribution).forEach(([role, pct]) => {
              const members = team.filter(m => m.role === role);
              if (members.length > 0) {
                  const avgRoleRate = members.reduce((sum, m) => sum + m.rate, 0) / members.length;
                  weightedRoleRateSum += avgRoleRate * (pct as number);
              }
          });

          if (weightedRoleRateSum === 0) return 0;

          const relevantStages = activeTemplate.defaultEnabledStages 
             ? activeTemplate.defaultEnabledStages 
             : Object.keys(activeTemplate.stageWeights);
             
          const sumStageWeights = relevantStages.reduce((acc, stageId) => {
              return acc + (activeTemplate.stageWeights[stageId] || 0);
          }, 0);
          
          if (sumStageWeights === 0) return 0;

          return internalBudget / (sumStageWeights * weightedRoleRateSum);
      }

      // Functional Mode
      let raw = 0;
      activeTemplate.groups.forEach(group => {
          group.elements.forEach(el => {
              const val = projectInputs.elementValues[el.id];
              if (el.inputType === 'select') {
                  if (typeof val === 'string' && el.options) {
                      const selectedOption = el.options.find(opt => opt.id === val);
                      if (selectedOption) raw += selectedOption.rbh;
                  }
              } else if (el.inputType === 'multiselect') {
                  if (Array.isArray(val) && el.options) {
                      // Sum up all selected options
                      val.forEach(optId => {
                          const opt = el.options?.find(o => o.id === optId);
                          if (opt) raw += opt.rbh;
                      });
                  }
              } else {
                   const numVal = typeof val === 'number' ? val : 0;
                   raw += numVal * el.baseRbh;
              }
          });
      });

      // Apply Multipliers
      let multiplierTotal = 1.0;
      
      // Ensure we are working with an array
      if (Array.isArray(globalMultipliers)) {
         globalMultipliers.forEach(group => {
             if (!group.isEnabled) return;
             
             const selectedValue = projectInputs.selectedMultipliers[group.id];
             
             if (group.type === 'select' && group.options) {
                 const option = group.options.find(o => o.id === selectedValue);
                 if (option) {
                     multiplierTotal *= option.value;
                 }
             } else if (group.type === 'boolean') {
                 if (selectedValue === true) {
                     multiplierTotal *= (group.value || 1.0);
                 }
             } else if (group.type === 'scale' && group.scaleConfig) {
                 if (projectInputs.area > 0) {
                     const scaleMult = Math.pow(group.scaleConfig.baseArea / projectInputs.area, group.scaleConfig.exponent);
                     multiplierTotal *= scaleMult;
                 }
             }
         });
      }

      return raw * multiplierTotal;
  }, [projectInputs, templates, globalMultipliers, team, stages]);

  const handleSummaryCostChange = (newTotalCost: number) => {
     const externalCosts = stages.reduce((acc, s) => s.isEnabled && s.type === StageType.EXTERNAL_FIXED ? acc + (s.fixedPrice || 0) : acc, 0);
     const newInternalFee = Math.max(0, newTotalCost - externalCosts);
     const newInputs = { ...projectInputs, calculationMode: 'fee' as const, targetFee: newTotalCost, includeExternalCostsInFee: true };
     setProjectInputs(newInputs);

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
      const sumStageWeights = enabledInternalStages.reduce((acc, s) => acc + (activeTemplate.stageWeights[s.id] || 0), 0);
      if (weightedRoleRateSum === 0 || sumStageWeights === 0) return;
      const newTotalRBH = newInternalFee / (sumStageWeights * weightedRoleRateSum);

      setStages(prevStages => {
         return prevStages.map(stage => {
            if (stage.type === StageType.INTERNAL_RBH && stage.isEnabled) {
               const weight = activeTemplate.stageWeights[stage.id] || 0;
               const stageTotalHours = newTotalRBH * weight;
               const roleDist = activeTemplate.roleDistribution;
               const allocations = team.map(member => {
                  const rolePct = roleDist[member.role] || 0;
                  const membersWithSameRole = team.filter(t => t.role === member.role).length;
                  const hours = (membersWithSameRole > 0 && rolePct > 0) ? (stageTotalHours * rolePct) / membersWithSameRole : 0;
                  return { memberId: member.id, hours: Math.round(hours) };
               });
               return { ...stage, roleAllocations: allocations };
            }
            return stage;
         });
      });
  };

  // --- Add New Element to Template (from ScopeStep) ---
  const handleAddTemplateElement = (templateId: string, groupId: string, name: string, valueInCurrentUnit: number, unit: TimeUnit, type: InputType) => {
      const conversion = unit === 'd' ? 8 : unit === 'w' ? 40 : 1;
      const baseRbh = valueInCurrentUnit * conversion;
      const newElId = nanoid();
      
      let newEl: FunctionalElement = {
         id: newElId,
         name,
         baseRbh: (type === 'boolean' || type === 'count') ? baseRbh : 0,
         inputType: type,
         options: (type === 'select' || type === 'multiselect') ? [] : undefined
      };

      let initialValue: any = 0;

      if (type === 'boolean') {
          initialValue = 1;
      } else if (type === 'count') {
          initialValue = 1;
      } else if (type === 'select' || type === 'multiselect') {
          const optId = nanoid();
          const newOpt: SelectOption = {
              id: optId,
              name: 'Domyślna', // Default option name for quick add
              rbh: baseRbh
          };
          newEl.options = [newOpt];
          
          if (type === 'select') initialValue = optId;
          if (type === 'multiselect') initialValue = [optId];
      }

      setTemplatesWrapper(prev => prev.map(t => {
         if (t.id !== templateId) return t;
         return {
            ...t,
            groups: t.groups.map(g => {
               if (g.id !== groupId) return g;
               return { ...g, elements: [...g.elements, newEl] };
            })
         };
      }));

      // Immediately select this new element in the current calculation
      setProjectInputs(prev => ({
         ...prev,
         elementValues: { ...prev.elementValues, [newEl.id]: initialValue }
      }));
  };

  // --- Project Actions ---

  const handleCreateProject = async (name: string, initialInputs?: ProjectInputs) => {
    if (!user) return;
    const newProject: ProjectGroup = { id: nanoid(), userId: user.id, name, createdAt: new Date().toISOString(), defaultInputs: initialInputs };
    await db.collection('projects').doc(newProject.id).set(sanitizeForFirestore(newProject));
    setCurrentProjectId(newProject.id);
  };

  const handleUpdateProject = async (id: string, name: string) => {
     if (!user) return;
     await db.collection('projects').doc(id).update({ name });
  };

  const handleDeleteProject = async (id: string) => {
     if (!user) return;
     if(confirm("Usunąć projekt? Wszystkie przypisane kalkulacje stracą powiązanie.")) {
         await db.collection('projects').doc(id).delete();
         if (currentProjectId === id) setCurrentProjectId(null);
     }
  };

  const handleSelectProject = (projectId: string | null) => {
    setCurrentProjectId(projectId);
    if (projectId) {
      const selectedProject = projects.find(p => p.id === projectId);
      if (selectedProject && selectedProject.defaultInputs) setProjectInputs(selectedProject.defaultInputs);
    }
  };

  const handleMoveCalculation = async (calcId: string, projectId: string | null) => {
      await db.collection('calculations').doc(calcId).update({ projectId: projectId || null }); 
  };

  const handleUpdateCalculationName = async (id: string, name: string) => {
     if (!user) return;
     await db.collection('calculations').doc(id).update({ name });
  };

  const autoSaveCalculation = useCallback((totalCost: number) => {
    if (!user) return;
    let variantName = projectTitle;
    if (!variantName) {
       const templateName = templates.find(t => t.id === projectInputs.templateId)?.name || 'Wycena';
       variantName = `${templateName} ${new Date().toLocaleDateString()}`;
    }
    
    const entryData: SavedCalculation = { 
        id: currentCalculationId || nanoid(),
        userId: user.id, 
        projectId: currentProjectId || undefined, 
        date: new Date().toISOString(), 
        name: variantName, 
        inputs: projectInputs, 
        stages, 
        team, 
        templates, 
        multipliers: globalMultipliers, 
        totalCost 
    };
    
    db.collection('calculations').doc(entryData.id).set(sanitizeForFirestore(entryData)).then(() => {
        setLastSavedTime(new Date());
        if (!currentCalculationId) setCurrentCalculationId(entryData.id);
    });

    if (currentProjectId) {
        db.collection('projects').doc(currentProjectId).update({ defaultInputs: sanitizeForFirestore(projectInputs) });
    }
  }, [user, currentCalculationId, currentProjectId, projectTitle, projectInputs, stages, team, templates, globalMultipliers]);

  const handleDeleteCalculation = async (id: string) => {
    if (!confirm("Usunąć?")) return;
    await db.collection('calculations').doc(id).delete();
    if (currentCalculationId === id) setCurrentCalculationId(null);
    if (previewCalculation?.id === id) setPreviewCalculation(null);
  };

  const handleUseTemplate = (calc: SavedCalculation) => {
    if (!confirm("Stworzyć nowy wariant?")) return;
    setProjectInputs(calc.inputs); setStages(calc.stages); setTeam(calc.team); 
    // Handle array-based multipliers from saved calc
    if (Array.isArray(calc.multipliers)) {
        setGlobalMultipliers(calc.multipliers);
    } else {
        // Fallback or migration if loading old data format
        setGlobalMultipliers(DEFAULT_MULTIPLIERS);
    }
    setLastCalculatedSignature(JSON.stringify({ tpl: calc.inputs.templateId, vals: calc.inputs.elementValues, mult: calc.multipliers }));
    setProjectTitle(`${calc.name} (Kopia)`);
    setCurrentProjectId(calc.projectId || null); setCurrentCalculationId(null); setLastSavedTime(null); setPreviewCalculation(null);
    setView(AppView.CALCULATOR); setCurrentStep(1);
  };

  const handleEditCalculation = (calc: SavedCalculation) => {
    // Load data and maintain ID to allow overwriting
    setProjectInputs(calc.inputs); 
    setStages(calc.stages); 
    setTeam(calc.team); 
    if (Array.isArray(calc.multipliers)) {
        setGlobalMultipliers(calc.multipliers);
    } else {
        setGlobalMultipliers(DEFAULT_MULTIPLIERS);
    }
    
    setCurrentCalculationId(calc.id); // Important: Keep existing ID
    setCurrentProjectId(calc.projectId || null);
    setProjectTitle(calc.name);
    setLastSavedTime(new Date(calc.date));
    
    // Set signature to prevent immediate recalc side-effects
    setLastCalculatedSignature(JSON.stringify({ tpl: calc.inputs.templateId, vals: calc.inputs.elementValues, mult: calc.multipliers }));
    
    setPreviewCalculation(null);
    setView(AppView.CALCULATOR); 
    setCurrentStep(1);
  };

  const startCalculator = (projectId: string | null = null) => {
    setCurrentCalculationId(null); 
    setLastSavedTime(null); 
    setProjectTitle(''); 
    setLastCalculatedSignature(''); 
    setTimeUnit('h'); 
    setReturnToCalculatorAfterAuth(false);
    
    setCurrentProjectId(projectId);
    
    // Initialize defaults for new multiplier structure
    const initialMultipliers: Record<string, string | boolean> = {};
    if (Array.isArray(globalMultipliers)) {
        globalMultipliers.forEach(g => {
            if (g.type === 'select' && g.options) {
                const def = g.options.find(o => o.isDefault);
                if (def) initialMultipliers[g.id] = def.id;
            } else if (g.type === 'boolean') {
                initialMultipliers[g.id] = false;
            }
        });
    }

    let initialInputs: ProjectInputs = { 
        buildingTypeId: '',
        actionTypeId: '',
        templateId: '', 
        area: 0, 
        location: '', 
        elementValues: {},
        selectedMultipliers: initialMultipliers,
        calculationMode: 'functional'
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

  const handleGoogleAuth = async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      await auth.signInWithPopup(provider);
    } catch (error: any) {
      console.error("Google Auth Error:", error);
      if (error.code === 'auth/unauthorized-domain') {
          alert('Ten adres domeny nie jest autoryzowany w konsoli Firebase. Dodaj go w Authentication > Settings > Authorized Domains.');
      } else if (error.code === 'auth/invalid-credential') {
          alert('Błąd autoryzacji Google. Nieprawidłowe poświadczenia.');
      } else if (error.code !== 'auth/popup-closed-by-user') {
          if (error.code === 'auth/account-exists-with-different-credential') {
             alert('Konto o tym adresie email już istnieje i jest powiązane z inną metodą logowania.');
          } else {
             alert(`Wystąpił błąd logowania Google. Spróbuj ponownie.`);
          }
      }
    }
  };

  const handleLogout = () => {
    auth.signOut().then(() => {
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
                        {user.photoURL ? (
                           <img src={user.photoURL} alt={user.name} className="w-8 h-8 rounded-full border border-slate-200" />
                        ) : (
                           <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold border border-blue-200">
                              {user.firstName ? user.firstName.charAt(0).toUpperCase() : user.name.charAt(0).toUpperCase()}
                           </div>
                        )}
                     </button>
                     <div className="absolute right-0 top-full pt-2 w-48 hidden group-hover:block z-50">
                        <div className="bg-white rounded-lg shadow-lg border border-slate-200 py-1">
                          <div className="px-4 py-2 text-xs text-slate-500 border-b border-slate-100 mb-1 truncate">{user.email}</div>
                          <button onClick={() => setView(AppView.PROFILE)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                             <UserCircle className="w-4 h-4" /> Profil
                          </button>
                          <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                             <LogOut className="w-4 h-4" /> Wyloguj
                          </button>
                        </div>
                     </div>
                  </div>
                </div>
              </>
            ) : (
              !authLoading && (
                <Button variant="primary" size="sm" onClick={() => setView(AppView.LOGIN)} className="ml-4">
                    <LogIn className="w-4 h-4 mr-2" /> Zaloguj
                </Button>
              )
            )}
          </nav>
        </div>
      </header>

      <main className="flex-grow">
        {view === AppView.LANDING && (
          <div className="max-w-4xl mx-auto px-4 text-center mt-16 md:mt-32 pb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
              Profesjonalny Kalkulator <br /><span className="text-blue-600">Wycen Projektowych</span>
            </h1>
            <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
               Kompleksowe narzędzie dla architektów. Precyzyjnie oszacuj czas pracy zespołu, uwzględnij koszty branżowe i twórz profesjonalne oferty w kilka minut.
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
            {configTab === ConfigTab.TEAM ? <TeamSettings team={team} setTeam={setTeamWrapper} /> : 
             configTab === ConfigTab.STAGES ? <StagesManager stages={stageTemplates} setStages={setStagesWrapper} /> : 
             configTab === ConfigTab.MODELS ? <ModelsManager templates={templates} setTemplates={setTemplatesWrapper} stages={stages} buildingTypes={buildingTypes} actionTypes={actionTypes} timeUnit={timeUnit} setTimeUnit={setTimeUnit} team={team} /> : 
             configTab === ConfigTab.LISTS ? <ListsManager buildingTypes={buildingTypes} setBuildingTypes={setBuildingTypesWrapper} actionTypes={actionTypes} setActionTypes={setActionTypesWrapper} /> : 
             <MultiplierSettings multipliers={globalMultipliers} setMultipliers={setMultipliersWrapper} />}
          </ConfigurationLayout>
        )}

        {view === AppView.LOGIN && <Login onGoogleLogin={handleGoogleAuth} onSwitchToRegister={() => setView(AppView.REGISTER)} onBack={goHome} onVerificationNeeded={handleVerificationNeeded} />}
        {view === AppView.REGISTER && <Register onGoogleLogin={handleGoogleAuth} onSwitchToLogin={() => setView(AppView.LOGIN)} onBack={goHome} onVerificationNeeded={handleVerificationNeeded} />}
        {view === AppView.EMAIL_VERIFICATION && <EmailVerification email={verificationEmail} onGoToLogin={() => setView(AppView.LOGIN)} />}
        {view === AppView.PROFILE && user && <UserProfile user={user} onBack={goHome} onLogout={handleLogout} />}

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
                 <SummaryStep inputs={previewCalculation.inputs} team={previewCalculation.team} stages={previewCalculation.stages} projectTitle={previewCalculation.name} onBack={() => setPreviewCalculation(null)} onAutoSave={() => {}} onRegister={() => setView(AppView.REGISTER)} isLoggedIn={true} readOnly={true} templates={templates} timeUnit={timeUnit} setTimeUnit={setTimeUnit} onTotalCostChange={handleSummaryCostChange} />
               </div>
             ) : (
               <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <HistoryList history={savedCalculations} projects={projects} onLoad={handleUseTemplate} onDelete={handleDeleteCalculation} onEdit={handleEditCalculation} onPreview={setPreviewCalculation} onBack={goHome} onCreateProject={handleCreateProject} onUpdateProject={handleUpdateProject} onDeleteProject={handleDeleteProject} onMoveCalculation={handleMoveCalculation} onStartCalculation={startCalculator} onUpdateCalculationName={handleUpdateCalculationName} templates={templates} />
               </div>
             )}
           </>
        )}

        {view === AppView.CALCULATOR && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
             <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 min-h-[80vh]">
                {currentStep === 1 && <StepProject inputs={projectInputs} setInputs={setProjectInputs} title={projectTitle} setTitle={setProjectTitle} projects={projects} currentProjectId={currentProjectId} onSetProject={handleSelectProject} onCreateProject={handleCreateProject} onBack={goHome} onNext={() => setCurrentStep(2)} templates={templates} buildingTypes={buildingTypes} actionTypes={actionTypes} />}
                {currentStep === 2 && <ScopeStep inputs={projectInputs} setInputs={setProjectInputs} templates={templates} multipliers={globalMultipliers} onBack={() => setCurrentStep(1)} onNext={() => setCurrentStep(3)} lastCalculatedSignature={lastCalculatedSignature} onUpdateSignature={setLastCalculatedSignature} timeUnit={timeUnit} setTimeUnit={setTimeUnit} team={team} stages={stages} onAddTemplateElement={handleAddTemplateElement} />}
                {currentStep === 3 && <StepStages stages={stages} setStages={setStages} totalRBH={calculatedTotalRBH} inputs={projectInputs} templates={templates} team={team} onBack={() => setCurrentStep(2)} onNext={() => setCurrentStep(4)} timeUnit={timeUnit} setTimeUnit={setTimeUnit} />}
                {currentStep === 4 && <SummaryStep inputs={projectInputs} team={team} stages={stages} projectTitle={projectTitle} onBack={() => setCurrentStep(3)} onAutoSave={autoSaveCalculation} onRegister={() => { setReturnToCalculatorAfterAuth(true); setView(AppView.REGISTER); }} isLoggedIn={true} lastSaved={lastSavedTime} templates={templates} timeUnit={timeUnit} setTimeUnit={setTimeUnit} onTotalCostChange={handleSummaryCostChange} />}
             </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
