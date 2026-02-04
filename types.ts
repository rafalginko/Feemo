
export enum AppView {
  LANDING = 'LANDING',
  CALCULATOR = 'CALCULATOR',
  ABOUT = 'ABOUT',
  SETTINGS = 'SETTINGS',
  CONFIGURATION = 'CONFIGURATION',
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER',
  HISTORY = 'HISTORY',
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  PROFILE = 'PROFILE'
}

export enum RoleType {
  ARCHITECT = 'Architekt',
  ASSISTANT = 'Asystent',
  MANAGER = 'Project Manager'
}

export enum StageType {
  INTERNAL_RBH = 'INTERNAL_RBH',
  EXTERNAL_FIXED = 'EXTERNAL_FIXED'
}

export type TimeUnit = 'h' | 'd' | 'w';
export type InputType = 'boolean' | 'count' | 'select' | 'multiselect';

export interface User {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  photoURL?: string;
}

export interface UserConfiguration {
  userId: string;
  team: TeamMember[];
  multipliers: GlobalMultipliers;
  lists: {
    buildingTypes: BuildingType[];
    actionTypes: ActionType[];
  };
  stageTemplates: Omit<Stage, 'roleAllocations'>[];
}

export interface ProjectGroup {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  defaultInputs?: ProjectInputs;
}

// --- List Definitions ---

export interface BuildingType {
  id: string;
  name: string;
}

export interface ActionType {
  id: string;
  name: string;
}

// --- Functional Logic Types ---

export interface SelectOption {
  id: string;
  name: string;
  rbh: number;
}

export interface FunctionalElement {
  id: string;
  name: string;
  description?: string;
  baseRbh: number;
  inputType: InputType;
  min?: number;
  max?: number;
  options?: SelectOption[];
}

export interface FunctionalGroup {
  id: string;
  name: string;
  elements: FunctionalElement[];
}

export interface SupervisionSettings {
  enabled: boolean;
  duration: number;
  timeUnit: 'weeks' | 'months';
  frequency: number; // visits per unit
  visitTime: number; // RBH per visit
}

export interface CalculationTemplate {
  id: string;
  userId?: string; // Optional for defaults, required for user created
  buildingTypeId: string; // Link to BuildingType
  actionTypeId: string;   // Link to ActionType
  name: string; // Computed or Display Name
  description?: string;
  roleDistribution: Record<string, number>;
  stageWeights: Record<string, number>;
  defaultFixedCosts?: Record<string, number>; // New: Default costs for external stages
  supervisionSettings?: SupervisionSettings; // New: Specific logic for Supervision
  groups: FunctionalGroup[];
  defaultEnabledStages?: string[];
}

// ----------------------------------

export interface SavedCalculation {
  id: string;
  userId: string;
  projectId?: string;
  date: string;
  name: string;
  inputs: ProjectInputs;
  stages: Stage[];
  team: TeamMember[];
  templates: CalculationTemplate[];
  multipliers: GlobalMultipliers;
  totalCost: number;
}

export interface TeamMember {
  id: string;
  role: RoleType | string;
  rate: number;
}

export interface ProjectInputs {
  // Selection Context
  buildingTypeId: string;
  actionTypeId: string;
  templateId: string; // The specific template matched from the pair above
  
  area: number;
  location: string;
  budget?: number;
  deadline?: string;
  
  // Calculation Mode
  calculationMode: 'functional' | 'fee';
  targetFee?: number;
  includeExternalCostsInFee?: boolean; // If true, targetFee includes external costs (Gross for project). If false, it's Net for internal team.

  elementValues: Record<string, number | string | string[]>; 
  elementRoleOverrides?: Record<string, Record<string, number>>;

  // Dynamic Multipliers Selection
  // Key: MultiplierGroup ID, Value: Option ID (string) or Boolean value
  selectedMultipliers: Record<string, string | boolean>;
}

// --- Dynamic Multipliers System ---

export interface MultiplierOption {
  id: string;
  label: string;
  value: number; // Factor (e.g., 1.2 for +20%)
  isDefault?: boolean;
}

export type MultiplierType = 'select' | 'boolean' | 'scale';

export interface MultiplierGroup {
  id: string;
  name: string;
  description?: string;
  type: MultiplierType;
  isEnabled: boolean; // If false, hidden in calculator but preserved in config
  
  // For 'select' type
  options?: MultiplierOption[];
  
  // For 'boolean' type
  value?: number; // Factor when true
  
  // For 'scale' type
  scaleConfig?: {
    baseArea: number;
    exponent: number;
  };
}

export type GlobalMultipliers = MultiplierGroup[];

export interface ExternalQuote {
  id: string;
  name: string;
  price: number;
}

export interface Stage {
  id: string;
  type: StageType;
  name: string;
  description: string;
  isEnabled: boolean;
  fixedPrice?: number;
  externalQuotes?: ExternalQuote[];
  selectedQuoteId?: string | null;
  roleAllocations: {
    memberId: string;
    hours: number;
  }[];
}

export interface CalculationResult {
  totalHours: number;
  totalCost: number;
  avgRate: number;
}
