

import { CalculationTemplate, RoleType, Stage, TeamMember, StageType, GlobalMultipliers, BuildingType, ActionType } from './types';

export const DEFAULT_TEAM: TeamMember[] = [
  { id: '1', role: RoleType.ARCHITECT, rate: 250 },
  { id: '2', role: RoleType.ASSISTANT, rate: 100 },
  { id: '3', role: RoleType.MANAGER, rate: 300 },
];

export const DEFAULT_MULTIPLIERS: GlobalMultipliers = {
  complexity: {
    low: 0.9,    
    medium: 1.0, 
    high: 1.2    
  },
  lod: {
    standard: 1.0,
    high: 1.25     
  },
  express: 1.20,
  scale: {
    enabled: true,
    baseArea: 150,
    exponent: 0.2
  }
};

export const STAGE_DISTRIBUTION: Record<string, number> = {
  'stage_inventory': 0.05,
  'stage_concept': 0.15,
  'stage_permit': 0.30,
  'stage_technical': 0.20,
  'stage_executive': 0.20,
  'stage_supervision': 0.10,
};

// --- New Lists Defaults ---

export const DEFAULT_BUILDING_TYPES: BuildingType[] = [
  { id: 'b_house', name: 'Dom Jednorodzinny' },
  { id: 'b_industrial', name: 'Obiekt Przemysłowy / Hala' },
  { id: 'b_office', name: 'Budynek Biurowy' },
  { id: 'b_multi', name: 'Budynek Wielorodzinny' },
  { id: 'b_interior', name: 'Wnętrza' }
];

export const DEFAULT_ACTION_TYPES: ActionType[] = [
  { id: 'act_new', name: 'Budowa' },
  { id: 'act_extension', name: 'Rozbudowa' },
  { id: 'act_superstructure', name: 'Nadbudowa' },
  { id: 'act_rebuild', name: 'Przebudowa' },
  { id: 'act_modernization', name: 'Modernizacja' },
  { id: 'act_usage_change', name: 'Zmiana sposobu użytkowania' },
  { id: 'act_revital', name: 'Rewitalizacja / Rewaloryzacja' }
];

// --------------------------

export const DEFAULT_TEMPLATES: CalculationTemplate[] = [
  {
    id: 'tpl_house_new',
    buildingTypeId: 'b_house',
    actionTypeId: 'act_new',
    name: 'Dom Jednorodzinny - Budowa',
    description: 'Szablon dla budynków mieszkalnych jednorodzinnych (wolnostojące, bliźniaki).',
    roleDistribution: { [RoleType.ARCHITECT]: 0.6, [RoleType.ASSISTANT]: 0.4 },
    stageWeights: {
        'stage_inventory': 0.05,
        'stage_concept': 0.15,
        'stage_permit': 0.30,
        'stage_technical': 0.20,
        'stage_executive': 0.20,
        'stage_supervision': 0.10,
    },
    defaultFixedCosts: {
        'ext_geo': 1500,
        'ext_soil': 1000
    },
    defaultEnabledStages: ['stage_concept', 'stage_permit', 'stage_technical', 'stage_executive', 'ext_geo'],
    groups: [
      {
        id: 'g_mass',
        name: 'Bryła i Konstrukcja',
        elements: [
          { id: 'el_base', name: 'Podstawa (Baza projektu)', description: 'Standardowy zakres prac, dokumentacja podstawowa.', baseRbh: 120, inputType: 'boolean' },
          { id: 'el_story', name: 'Dodatkowa kondygnacja', description: 'Piętro lub poddasze użytkowe.', baseRbh: 40, inputType: 'count', min: 0, max: 5 },
          { id: 'el_basement', name: 'Podpiwniczenie', description: 'Projekt izolacji, fundamentów zagłębionych.', baseRbh: 50, inputType: 'boolean' },
          { id: 'el_complex_roof', name: 'Dach wielospadowy / skomplikowany', description: 'Więźba o złożonej geometrii.', baseRbh: 35, inputType: 'boolean' },
          { id: 'el_garage', name: 'Garaż w bryle', description: 'Integracja garażu z częścią mieszkalną.', baseRbh: 20, inputType: 'boolean' }
        ]
      },
      {
        id: 'g_interior',
        name: 'Układ Funkcjonalny',
        elements: [
          { id: 'el_bathroom', name: 'Łazienka / WC', description: 'Detalika, rozwinięcia ścian, instalacje.', baseRbh: 15, inputType: 'count', min: 1 },
          { id: 'el_kitchen', name: 'Kuchnia', description: 'Projekt funkcjonalny kuchni.', baseRbh: 15, inputType: 'count', min: 1 },
          { id: 'el_rooms', name: 'Pokoje / Sypialnie', description: 'Liczba pomieszczeń mieszkalnych.', baseRbh: 5, inputType: 'count' },
          { id: 'el_mezzanine', name: 'Antresola / Pustka', description: 'Otwarta przestrzeń, barierki, widoki.', baseRbh: 25, inputType: 'boolean' }
        ]
      },
      {
        id: 'g_tech',
        name: 'Strefy Techniczne',
        elements: [
          { id: 'el_hvac_recu', name: 'Rekuperacja', description: 'Projekt wentylacji mechanicznej (koordynacja).', baseRbh: 15, inputType: 'boolean' },
          { id: 'el_smarthome', name: 'Smart Home', description: 'Zaawansowana elektryka.', baseRbh: 30, inputType: 'boolean' },
          { id: 'el_heat_pump', name: 'Pompa ciepła', description: 'Dobór i lokalizacja jednostek.', baseRbh: 10, inputType: 'boolean' }
        ]
      },
      {
        id: 'g_facade',
        name: 'Powłoka i Detal',
        elements: [
          { id: 'el_glass', name: 'Przeszklenia wielkoformatowe', description: 'HS, ściany kurtynowe, detale montażu.', baseRbh: 40, inputType: 'boolean' },
          { id: 'el_terrace', name: 'Taras / Balkon', description: 'Warstwy, odwodnienie, balustrady.', baseRbh: 20, inputType: 'count' },
          { id: 'el_facade_detail', name: 'Indywidualny detal elewacji', description: 'Kamień, drewno, spieki.', baseRbh: 35, inputType: 'boolean' }
        ]
      }
    ]
  },
  {
    id: 'tpl_industrial_new',
    buildingTypeId: 'b_industrial',
    actionTypeId: 'act_new',
    name: 'Obiekt Przemysłowy - Budowa',
    description: 'Szablon dla hal produkcyjnych, magazynowych i obiektów logistycznych.',
    roleDistribution: { [RoleType.ARCHITECT]: 0.5, [RoleType.ASSISTANT]: 0.3, [RoleType.MANAGER]: 0.2 },
    stageWeights: {
        'stage_inventory': 0.05,
        'stage_concept': 0.10,
        'stage_permit': 0.35,
        'stage_technical': 0.25,
        'stage_executive': 0.15,
        'stage_supervision': 0.10,
    },
    defaultFixedCosts: {},
    defaultEnabledStages: ['stage_concept', 'stage_permit', 'stage_technical'],
    groups: [
      {
        id: 'g_ind_struct',
        name: 'Struktura Hali',
        elements: [
          { id: 'el_ind_base', name: 'Baza Projektu Hali', description: 'Konstrukcja główna, obudowa systemowa.', baseRbh: 250, inputType: 'boolean' },
          { id: 'el_ind_nave', name: 'Dodatkowa nawa', description: 'Powielenie układu konstrukcyjnego.', baseRbh: 80, inputType: 'count' },
          { id: 'el_ind_soc', name: 'Część socjalno-biurowa (mała)', description: 'Do 200m2 wbudowana.', baseRbh: 100, inputType: 'boolean' },
          { id: 'el_ind_soc_large', name: 'Biurowiec przy hali (>200m2)', description: 'Oddzielna bryła biurowa.', baseRbh: 250, inputType: 'boolean' }
        ]
      },
      {
        id: 'g_ind_process',
        name: 'Proces i Technologia',
        elements: [
          { id: 'el_ind_line', name: 'Linia technologiczna', description: 'Koordynacja z technologią produkcji.', baseRbh: 60, inputType: 'count' },
          { id: 'el_ind_crane', name: 'Suwnica', description: 'Belki podsuwnicowe, fundamenty.', baseRbh: 40, inputType: 'count' },
          { id: 'el_ind_zone', name: 'Wydzielona strefa pożarowa', description: 'Ściany oddzielenia ppoż, bramy.', baseRbh: 30, inputType: 'count' }
        ]
      },
      {
        id: 'g_ind_logistics',
        name: 'Logistyka',
        elements: [
          { id: 'el_ind_dock', name: 'Dok przeładunkowy', description: 'Rampa, uszczelnienie, detale.', baseRbh: 15, inputType: 'count' },
          { id: 'el_ind_gate', name: 'Brama "0"', description: 'Wjazd z poziomu terenu.', baseRbh: 10, inputType: 'count' },
          { id: 'el_ind_roads', name: 'Układ drogowy TIR', description: 'Place manewrowe, promienie skrętu.', baseRbh: 60, inputType: 'boolean' }
        ]
      },
      {
        id: 'g_ind_install',
        name: 'Instalacje Przemysłowe',
        elements: [
          { id: 'el_ind_sprinkler', name: 'Instalacja tryskaczowa', description: 'Koordynacja zbiornika i pompowni.', baseRbh: 40, inputType: 'boolean' },
          { id: 'el_ind_ex', name: 'Strefy zagrożenia wybuchem (EX)', description: 'Specjalistyczne rozwiązania.', baseRbh: 80, inputType: 'boolean' }
        ]
      }
    ]
  }
];

export const DEFAULT_STAGES_TEMPLATE: Omit<Stage, 'roleAllocations'>[] = [
  { id: 'stage_inventory', type: StageType.INTERNAL_RBH, name: 'Analiza Chłonności / Wstępna', description: 'Sprawdzenie MPZP, uwarunkowań.', isEnabled: true },
  { id: 'stage_concept', type: StageType.INTERNAL_RBH, name: 'Koncepcja (K)', description: 'Układy funkcjonalne, wizualizacje.', isEnabled: true },
  { id: 'stage_permit', type: StageType.INTERNAL_RBH, name: 'Projekt Budowlany (PB)', description: 'Dokumentacja do PNB.', isEnabled: true },
  { id: 'stage_technical', type: StageType.INTERNAL_RBH, name: 'Projekt Techniczny (PT)', description: 'Konstrukcja, instalacje (koordynacja).', isEnabled: true },
  { id: 'stage_executive', type: StageType.INTERNAL_RBH, name: 'Projekt Wykonawczy (PW)', description: 'Detale architektury.', isEnabled: true },
  { id: 'stage_supervision', type: StageType.INTERNAL_RBH, name: 'Nadzór Autorski', description: 'Wizyty na budowie.', isEnabled: true },
  
  // External
  { id: 'ext_geo', type: StageType.EXTERNAL_FIXED, name: 'Geodezja (Mapa)', description: 'Mapa do celów projektowych.', isEnabled: false, fixedPrice: 0 },
  { id: 'ext_soil', type: StageType.EXTERNAL_FIXED, name: 'Geologia', description: 'Badania gruntu.', isEnabled: false, fixedPrice: 0 },
  { id: 'ext_constr', type: StageType.EXTERNAL_FIXED, name: 'Branża Konstrukcyjna', description: 'Projektant konstrukcji.', isEnabled: false, fixedPrice: 0 },
  { id: 'ext_hvac', type: StageType.EXTERNAL_FIXED, name: 'Branża Sanitarna (HVAC)', description: 'Wod-Kan, CO, Wentylacja.', isEnabled: false, fixedPrice: 0 },
  { id: 'ext_ele', type: StageType.EXTERNAL_FIXED, name: 'Branża Elektryczna', description: 'Prąd, niskie prądy.', isEnabled: false, fixedPrice: 0 },
  { id: 'ext_fire', type: StageType.EXTERNAL_FIXED, name: 'Rzeczoznawca PPOŻ', description: 'Uzgodnienia projektu.', isEnabled: false, fixedPrice: 0 },
];
