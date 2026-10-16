import { 
  BMSOverallState, 
  LakeAsset, 
  PoolAsset, 
  FountainAsset, 
  BuildingAsset, 
  BMSAlarm, 
  AssetStatus 
} from '@stockly/domain';

// Initial 14 Lakes Seed
const initialLakes: LakeAsset[] = [
  {
    id: 'lake-1',
    name: 'بحيرة النادي الرئيسي (Club House Lake)',
    code: 'LK-01',
    type: 'lake',
    sector: 'القطاع المركزي',
    status: 'normal',
    lastUpdated: new Date().toISOString(),
    location: { x: 50, y: 48 },
    waterLevelPct: 82,
    targetWaterLevelPct: 85,
    lowLevelAlarmPct: 30,
    highLevelAlarmPct: 95,
    filtrationActive: true,
    waterQualityTds: 240,
    pumps: [
      { id: 'p-lk1-1', name: 'طلمبة التغذية والفلترة 1', state: 'running', mode: 'auto', powerKw: 7.5, hoursRun: 1420, flowRateM3h: 45 },
      { id: 'p-lk1-2', name: 'طلمبة التعويض الاحتياطية 2', state: 'stopped', mode: 'auto', powerKw: 7.5, hoursRun: 890, flowRateM3h: 0 },
    ]
  },
  {
    id: 'lake-2',
    name: 'بحيرة الممشى الغربي',
    code: 'LK-02',
    type: 'lake',
    sector: 'القطاع الغربي',
    status: 'normal',
    lastUpdated: new Date().toISOString(),
    location: { x: 28, y: 35 },
    waterLevelPct: 76,
    targetWaterLevelPct: 80,
    lowLevelAlarmPct: 25,
    highLevelAlarmPct: 95,
    filtrationActive: true,
    waterQualityTds: 260,
    pumps: [
      { id: 'p-lk2-1', name: 'طلمبة السحب والتدوير', state: 'running', mode: 'auto', powerKw: 5.5, hoursRun: 1100, flowRateM3h: 30 },
    ]
  },
  {
    id: 'lake-3',
    name: 'بحيرة المنطقة المركزية A',
    code: 'LK-03',
    type: 'lake',
    sector: 'القطاع المركزي',
    status: 'normal',
    lastUpdated: new Date().toISOString(),
    location: { x: 44, y: 40 },
    waterLevelPct: 88,
    targetWaterLevelPct: 85,
    lowLevelAlarmPct: 30,
    highLevelAlarmPct: 95,
    filtrationActive: false,
    waterQualityTds: 230,
    pumps: [
      { id: 'p-lk3-1', name: 'طلمبة تغذية A', state: 'stopped', mode: 'auto', powerKw: 5.5, hoursRun: 650, flowRateM3h: 0 },
    ]
  },
  {
    id: 'lake-4',
    name: 'بحيرة المنطقة المركزية B',
    code: 'LK-04',
    type: 'lake',
    sector: 'القطاع المركزي',
    status: 'normal',
    lastUpdated: new Date().toISOString(),
    location: { x: 56, y: 40 },
    waterLevelPct: 79,
    targetWaterLevelPct: 80,
    lowLevelAlarmPct: 30,
    highLevelAlarmPct: 95,
    filtrationActive: true,
    waterQualityTds: 250,
    pumps: [
      { id: 'p-lk4-1', name: 'طلمبة تغذية B', state: 'running', mode: 'auto', powerKw: 5.5, hoursRun: 720, flowRateM3h: 28 },
    ]
  },
  {
    id: 'lake-5',
    name: 'بحيرة 5 (منطقة الحدائق واللاندسكيب)',
    code: 'LK-05',
    type: 'lake',
    sector: 'القطاع الجنوبي',
    status: 'normal',
    lastUpdated: new Date().toISOString(),
    location: { x: 65, y: 65 },
    waterLevelPct: 84,
    targetWaterLevelPct: 85,
    lowLevelAlarmPct: 25,
    highLevelAlarmPct: 95,
    filtrationActive: true,
    waterQualityTds: 280,
    pumps: [
      { id: 'p-lk5-1', name: 'طلمبة الشلال والتدوير', state: 'running', mode: 'auto', powerKw: 11.0, hoursRun: 2100, flowRateM3h: 60 },
      { id: 'p-lk5-2', name: 'طلمبة التعويض', state: 'stopped', mode: 'auto', powerKw: 5.5, hoursRun: 430, flowRateM3h: 0 },
    ]
  },
  {
    id: 'lake-6',
    name: 'بحيرة القطاع الشمالي 1',
    code: 'LK-06',
    type: 'lake',
    sector: 'القطاع الشمالي',
    status: 'normal',
    lastUpdated: new Date().toISOString(),
    location: { x: 35, y: 20 },
    waterLevelPct: 72,
    targetWaterLevelPct: 75,
    lowLevelAlarmPct: 25,
    highLevelAlarmPct: 95,
    filtrationActive: false,
    waterQualityTds: 270,
    pumps: [
      { id: 'p-lk6-1', name: 'طلمبة التدوير الشمالية', state: 'stopped', mode: 'auto', powerKw: 4.0, hoursRun: 950, flowRateM3h: 0 },
    ]
  },
  {
    id: 'lake-7',
    name: 'بحيرة الزهور والحديقة المفتوحة',
    code: 'LK-07',
    type: 'lake',
    sector: 'القطاع الشرقي',
    status: 'normal',
    lastUpdated: new Date().toISOString(),
    location: { x: 75, y: 38 },
    waterLevelPct: 91,
    targetWaterLevelPct: 90,
    lowLevelAlarmPct: 30,
    highLevelAlarmPct: 95,
    filtrationActive: true,
    waterQualityTds: 220,
    pumps: [
      { id: 'p-lk7-1', name: 'طلمبة تدوير الزهور', state: 'running', mode: 'auto', powerKw: 5.5, hoursRun: 1340, flowRateM3h: 32 },
    ]
  },
  {
    id: 'lake-8',
    name: 'بحيرة الملاعب الرياضية',
    code: 'LK-08',
    type: 'lake',
    sector: 'قطاع الملاعب',
    status: 'normal',
    lastUpdated: new Date().toISOString(),
    location: { x: 80, y: 55 },
    waterLevelPct: 70,
    targetWaterLevelPct: 75,
    lowLevelAlarmPct: 25,
    highLevelAlarmPct: 95,
    filtrationActive: false,
    waterQualityTds: 290,
    pumps: [
      { id: 'p-lk8-1', name: 'طلمبة بحيرة الملاعب', state: 'stopped', mode: 'auto', powerKw: 5.5, hoursRun: 810, flowRateM3h: 0 },
    ]
  },
  {
    id: 'lake-9',
    name: 'بحيرة 9 (محطة الخنادق والري الرئيسية)',
    code: 'LK-09',
    type: 'lake',
    sector: 'القطاع الجنوبي الغربي',
    status: 'normal',
    lastUpdated: new Date().toISOString(),
    location: { x: 22, y: 72 },
    waterLevelPct: 68,
    targetWaterLevelPct: 85,
    lowLevelAlarmPct: 30,
    highLevelAlarmPct: 95,
    filtrationActive: true,
    waterQualityTds: 310,
    pumps: [
      { id: 'p-lk9-1', name: 'طلمبة سحب الري الرئيسية 1', state: 'running', mode: 'auto', powerKw: 15.0, hoursRun: 3200, flowRateM3h: 85 },
      { id: 'p-lk9-2', name: 'طلمبة سحب الري الرئيسية 2', state: 'stopped', mode: 'auto', powerKw: 15.0, hoursRun: 2900, flowRateM3h: 0 },
      { id: 'p-lk9-3', name: 'طلمبة تعويض بحيرة 9', state: 'running', mode: 'auto', powerKw: 7.5, hoursRun: 1150, flowRateM3h: 40 },
    ]
  },
  {
    id: 'lake-10',
    name: 'بحيرة قطاع الخدمات والمرافق',
    code: 'LK-10',
    type: 'lake',
    sector: 'قطاع الخدمات',
    status: 'normal',
    lastUpdated: new Date().toISOString(),
    location: { x: 48, y: 78 },
    waterLevelPct: 77,
    targetWaterLevelPct: 80,
    lowLevelAlarmPct: 25,
    highLevelAlarmPct: 95,
    filtrationActive: true,
    waterQualityTds: 250,
    pumps: [
      { id: 'p-lk10-1', name: 'طلمبة التدوير', state: 'running', mode: 'auto', powerKw: 4.0, hoursRun: 620, flowRateM3h: 22 },
    ]
  },
  {
    id: 'lake-11',
    name: 'بحيرة التلال الشرقية',
    code: 'LK-11',
    type: 'lake',
    sector: 'القطاع الشرقي',
    status: 'normal',
    lastUpdated: new Date().toISOString(),
    location: { x: 85, y: 30 },
    waterLevelPct: 83,
    targetWaterLevelPct: 85,
    lowLevelAlarmPct: 25,
    highLevelAlarmPct: 95,
    filtrationActive: false,
    waterQualityTds: 240,
    pumps: [
      { id: 'p-lk11-1', name: 'طلمبة الشلال الشرقي', state: 'stopped', mode: 'auto', powerKw: 7.5, hoursRun: 1450, flowRateM3h: 0 },
    ]
  },
  {
    id: 'lake-12',
    name: 'بحيرة النخيل',
    code: 'LK-12',
    type: 'lake',
    sector: 'القطاع الغربي',
    status: 'normal',
    lastUpdated: new Date().toISOString(),
    location: { x: 18, y: 45 },
    waterLevelPct: 80,
    targetWaterLevelPct: 80,
    lowLevelAlarmPct: 25,
    highLevelAlarmPct: 95,
    filtrationActive: true,
    waterQualityTds: 260,
    pumps: [
      { id: 'p-lk12-1', name: 'طلمبة النخيل', state: 'running', mode: 'auto', powerKw: 5.5, hoursRun: 990, flowRateM3h: 28 },
    ]
  },
  {
    id: 'lake-13',
    name: 'بحيرة الهدوء (Calm Zone Lake)',
    code: 'LK-13',
    type: 'lake',
    sector: 'القطاع الشمالي',
    status: 'normal',
    lastUpdated: new Date().toISOString(),
    location: { x: 60, y: 18 },
    waterLevelPct: 86,
    targetWaterLevelPct: 85,
    lowLevelAlarmPct: 25,
    highLevelAlarmPct: 95,
    filtrationActive: true,
    waterQualityTds: 210,
    pumps: [
      { id: 'p-lk13-1', name: 'طلمبة تدوير الهدوء', state: 'running', mode: 'auto', powerKw: 4.0, hoursRun: 880, flowRateM3h: 20 },
    ]
  },
  {
    id: 'lake-14',
    name: 'بحيرة البوابة الرئيسية',
    code: 'LK-14',
    type: 'lake',
    sector: 'البوابة الرئيسية',
    status: 'normal',
    lastUpdated: new Date().toISOString(),
    location: { x: 50, y: 92 },
    waterLevelPct: 92,
    targetWaterLevelPct: 90,
    lowLevelAlarmPct: 30,
    highLevelAlarmPct: 95,
    filtrationActive: true,
    waterQualityTds: 200,
    pumps: [
      { id: 'p-lk14-1', name: 'طلمبة المدخل والمشهد المائي', state: 'running', mode: 'auto', powerKw: 7.5, hoursRun: 2800, flowRateM3h: 48 },
    ]
  }
];

// Initial 8 Swimming Pools Seed
const initialPools: PoolAsset[] = [
  {
    id: 'pool-1',
    name: 'حمام سباحة النادي الرئيسي (نصف أولمبي)',
    code: 'PL-01',
    type: 'pool',
    sector: 'الكلوب هاوس',
    status: 'normal',
    lastUpdated: new Date().toISOString(),
    location: { x: 52, y: 52 },
    waterLevelPct: 98,
    temperatureC: 27.5,
    chlorinePpm: 1.8,
    phLevel: 7.3,
    underwaterLights: true,
    circulationPump: { state: 'running', mode: 'schedule', powerKw: 11.0 },
    schedule: { startTime: '06:00', endTime: '23:00', enabled: true }
  },
  {
    id: 'pool-2',
    name: 'حمام سباحة الأطفال والأنشطة',
    code: 'PL-02',
    type: 'pool',
    sector: 'الكلوب هاوس',
    status: 'normal',
    lastUpdated: new Date().toISOString(),
    location: { x: 48, y: 54 },
    waterLevelPct: 95,
    temperatureC: 29.0,
    chlorinePpm: 2.0,
    phLevel: 7.4,
    underwaterLights: true,
    circulationPump: { state: 'running', mode: 'schedule', powerKw: 5.5 },
    schedule: { startTime: '08:00', endTime: '20:00', enabled: true }
  },
  {
    id: 'pool-3',
    name: 'حمام سباحة القطاع الغربي',
    code: 'PL-03',
    type: 'pool',
    sector: 'القطاع الغربي',
    status: 'normal',
    lastUpdated: new Date().toISOString(),
    location: { x: 25, y: 42 },
    waterLevelPct: 94,
    temperatureC: 26.8,
    chlorinePpm: 1.5,
    phLevel: 7.2,
    underwaterLights: false,
    circulationPump: { state: 'running', mode: 'schedule', powerKw: 7.5 },
    schedule: { startTime: '07:00', endTime: '22:00', enabled: true }
  },
  {
    id: 'pool-4',
    name: 'حمام سباحة النادي الصحي (Spa & Jacuzzi)',
    code: 'PL-04',
    type: 'pool',
    sector: 'الكلوب هاوس',
    status: 'normal',
    lastUpdated: new Date().toISOString(),
    location: { x: 54, y: 47 },
    waterLevelPct: 99,
    temperatureC: 34.2,
    chlorinePpm: 1.9,
    phLevel: 7.4,
    underwaterLights: true,
    circulationPump: { state: 'running', mode: 'schedule', powerKw: 7.5 },
    schedule: { startTime: '07:00', endTime: '23:00', enabled: true }
  },
  {
    id: 'pool-5',
    name: 'حمام سباحة القطاع الشرقي',
    code: 'PL-05',
    type: 'pool',
    sector: 'القطاع الشرقي',
    status: 'normal',
    lastUpdated: new Date().toISOString(),
    location: { x: 78, y: 45 },
    waterLevelPct: 92,
    temperatureC: 27.1,
    chlorinePpm: 1.7,
    phLevel: 7.3,
    underwaterLights: true,
    circulationPump: { state: 'running', mode: 'schedule', powerKw: 7.5 },
    schedule: { startTime: '07:00', endTime: '22:00', enabled: true }
  },
  {
    id: 'pool-6',
    name: 'حمام سباحة كافيه البحيرة',
    code: 'PL-06',
    type: 'pool',
    sector: 'القطاع الجنوبي',
    status: 'normal',
    lastUpdated: new Date().toISOString(),
    location: { x: 62, y: 68 },
    waterLevelPct: 96,
    temperatureC: 28.0,
    chlorinePpm: 1.6,
    phLevel: 7.3,
    underwaterLights: true,
    circulationPump: { state: 'running', mode: 'schedule', powerKw: 5.5 },
    schedule: { startTime: '08:00', endTime: '23:00', enabled: true }
  },
  {
    id: 'pool-7',
    name: 'حمام سباحة السيدات المغطى',
    code: 'PL-07',
    type: 'pool',
    sector: 'الكلوب هاوس',
    status: 'normal',
    lastUpdated: new Date().toISOString(),
    location: { x: 46, y: 46 },
    waterLevelPct: 97,
    temperatureC: 30.5,
    chlorinePpm: 2.1,
    phLevel: 7.5,
    underwaterLights: true,
    circulationPump: { state: 'running', mode: 'schedule', powerKw: 9.0 },
    schedule: { startTime: '08:00', endTime: '21:00', enabled: true }
  },
  {
    id: 'pool-8',
    name: 'حمام سباحة قطاع 4',
    code: 'PL-08',
    type: 'pool',
    sector: 'القطاع الشمالي',
    status: 'normal',
    lastUpdated: new Date().toISOString(),
    location: { x: 40, y: 26 },
    waterLevelPct: 90,
    temperatureC: 26.5,
    chlorinePpm: 1.4,
    phLevel: 7.2,
    underwaterLights: false,
    circulationPump: { state: 'running', mode: 'schedule', powerKw: 5.5 },
    schedule: { startTime: '07:00', endTime: '21:00', enabled: true }
  }
];

// Initial 9 Fountains Seed
const initialFountains: FountainAsset[] = [
  {
    id: 'ft-1',
    name: 'نافورة الميدان والمدخل الرئيسي',
    code: 'FN-01',
    type: 'fountain',
    sector: 'البوابة الرئيسية',
    status: 'normal',
    lastUpdated: new Date().toISOString(),
    location: { x: 50, y: 88 },
    nozzlesActive: true,
    pumpState: 'running',
    mode: 'schedule',
    rgbLighting: { enabled: true, color: '#00e5ff', mode: 'waves' },
    schedule: { startTime: '16:00', endTime: '02:00', enabled: true }
  },
  {
    id: 'ft-2',
    name: 'نافورة الممشى المركزي الراقصة',
    code: 'FN-02',
    type: 'fountain',
    sector: 'القطاع المركزي',
    status: 'normal',
    lastUpdated: new Date().toISOString(),
    location: { x: 50, y: 60 },
    nozzlesActive: true,
    pumpState: 'running',
    mode: 'schedule',
    rgbLighting: { enabled: true, color: '#ff007f', mode: 'cycle' },
    schedule: { startTime: '18:00', endTime: '01:00', enabled: true }
  },
  {
    id: 'ft-3',
    name: 'نافورة واجهة النادي الاجتماعي',
    code: 'FN-03',
    type: 'fountain',
    sector: 'الكلوب هاوس',
    status: 'normal',
    lastUpdated: new Date().toISOString(),
    location: { x: 55, y: 50 },
    nozzlesActive: true,
    pumpState: 'running',
    mode: 'auto',
    rgbLighting: { enabled: true, color: '#ffb300', mode: 'fixed' },
    schedule: { startTime: '12:00', endTime: '00:00', enabled: true }
  },
  {
    id: 'ft-4',
    name: 'نافورة بلازا الخدمات',
    code: 'FN-04',
    type: 'fountain',
    sector: 'قطاع الخدمات',
    status: 'normal',
    lastUpdated: new Date().toISOString(),
    location: { x: 45, y: 75 },
    nozzlesActive: false,
    pumpState: 'stopped',
    mode: 'schedule',
    rgbLighting: { enabled: false, color: '#00e676', mode: 'fixed' },
    schedule: { startTime: '18:00', endTime: '23:00', enabled: true }
  },
  {
    id: 'ft-5',
    name: 'نافورة منطقة ألعاب الأطفال (Splash Fountain)',
    code: 'FN-05',
    type: 'fountain',
    sector: 'الكلوب هاوس',
    status: 'normal',
    lastUpdated: new Date().toISOString(),
    location: { x: 44, y: 56 },
    nozzlesActive: true,
    pumpState: 'running',
    mode: 'schedule',
    rgbLighting: { enabled: false, color: '#2979ff', mode: 'fixed' },
    schedule: { startTime: '10:00', endTime: '19:00', enabled: true }
  },
  {
    id: 'ft-6',
    name: 'نافورة حديقة قطاع 2',
    code: 'FN-06',
    type: 'fountain',
    sector: 'القطاع الغربي',
    status: 'normal',
    lastUpdated: new Date().toISOString(),
    location: { x: 30, y: 48 },
    nozzlesActive: true,
    pumpState: 'running',
    mode: 'schedule',
    rgbLighting: { enabled: true, color: '#7c4dff', mode: 'cycle' },
    schedule: { startTime: '17:00', endTime: '23:30', enabled: true }
  },
  {
    id: 'ft-7',
    name: 'نافورة ساحة قطاع 3',
    code: 'FN-07',
    type: 'fountain',
    sector: 'القطاع الشرقي',
    status: 'normal',
    lastUpdated: new Date().toISOString(),
    location: { x: 72, y: 42 },
    nozzlesActive: false,
    pumpState: 'stopped',
    mode: 'schedule',
    rgbLighting: { enabled: false, color: '#00b0ff', mode: 'fixed' },
    schedule: { startTime: '18:00', endTime: '23:00', enabled: true }
  },
  {
    id: 'ft-8',
    name: 'نافورة وسط بحيرة 9',
    code: 'FN-08',
    type: 'fountain',
    sector: 'القطاع الجنوبي الغربي',
    status: 'normal',
    lastUpdated: new Date().toISOString(),
    location: { x: 22, y: 72 },
    nozzlesActive: true,
    pumpState: 'running',
    mode: 'auto',
    rgbLighting: { enabled: true, color: '#00e5ff', mode: 'waves' },
    schedule: { startTime: '14:00', endTime: '02:00', enabled: true }
  },
  {
    id: 'ft-9',
    name: 'نافورة البوابة الجنوبية',
    code: 'FN-09',
    type: 'fountain',
    sector: 'البوابة الجنوبية',
    status: 'normal',
    lastUpdated: new Date().toISOString(),
    location: { x: 50, y: 12 },
    nozzlesActive: true,
    pumpState: 'running',
    mode: 'schedule',
    rgbLighting: { enabled: true, color: '#ffea00', mode: 'fixed' },
    schedule: { startTime: '17:00', endTime: '01:00', enabled: true }
  }
];

// Generate 462 Buildings
const generateBuildings = (): BuildingAsset[] => {
  const buildings: BuildingAsset[] = [];
  const sectors = [
    { name: 'القطاع 1 (المدخل والشرق)', start: 1, end: 80 },
    { name: 'القطاع 2 (الممشى الغربي)', start: 81, end: 160 },
    { name: 'القطاع 3 (المنطقة المركزية والنوادي)', start: 161, end: 240 },
    { name: 'القطاع 4 (المنطقة الشمالية)', start: 241, end: 320 },
    { name: 'القطاع 5 (منطقة البحيرات والحدائق)', start: 321, end: 400 },
    { name: 'القطاع 6 (المنطقة الجنوبية والغربية)', start: 401, end: 462 }
  ];

  for (let i = 1; i <= 462; i++) {
    const sec = sectors.find(s => i >= s.start && i <= s.end) || sectors[0];
    
    // Position on map roughly in clusters
    const sectorIndex = sectors.indexOf(sec);
    const row = Math.floor((i - sec.start) / 10);
    const col = (i - sec.start) % 10;
    
    const baseX = 15 + (sectorIndex % 3) * 28;
    const baseY = 20 + Math.floor(sectorIndex / 3) * 35;
    const x = Math.min(92, Math.max(8, baseX + col * 2.5 + (Math.sin(i) * 2)));
    const y = Math.min(92, Math.max(8, baseY + row * 3.5 + (Math.cos(i) * 2)));

    // Deterministic realistic initial parameters
    const tankPct = 65 + (i * 7) % 32;
    const isPumpRunning = tankPct < 75;
    const isCorridorOn = (i % 2 === 0);

    buildings.push({
      id: `bld-${i}`,
      name: `عمارة رقم ${i}`,
      code: `BLD-${String(i).padStart(3, '0')}`,
      type: 'building',
      sector: sec.name,
      buildingNumber: i,
      unitsCount: 8,
      floorsCount: 4,
      status: 'normal',
      lastUpdated: new Date().toISOString(),
      location: { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) },
      roofTankLevelPct: tankPct,
      groundTankLevelPct: 88,
      boosterPump: {
        state: isPumpRunning ? 'running' : 'stopped',
        mode: 'auto',
        pressureBar: 3.8
      },
      corridorLighting: isCorridorOn,
      energyConsumptionKwhToday: Number((45 + (i % 30) * 1.5).toFixed(1)),
      waterConsumptionM3Today: Number((12 + (i % 15) * 0.8).toFixed(1))
    });
  }
  return buildings;
};

// Alarms Store
const initialAlarms: BMSAlarm[] = [
  {
    id: 'alm-1',
    assetId: 'lake-9',
    assetName: 'بحيرة 9 (محطة الخنادق والري الرئيسية)',
    assetType: 'lake',
    severity: 'warning',
    title: 'انخفاض منسوب المياه عن المستوى المستهدف',
    message: 'المنسوب الحالي 68% والمستوى المستهدف 85%، طلمبة التعويض تعمل تلقائياً.',
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    acknowledged: true,
    resolved: false
  },
  {
    id: 'alm-2',
    assetId: 'pool-7',
    assetName: 'حمام سباحة السيدات المغطى',
    assetType: 'pool',
    severity: 'info',
    title: 'ارتفاع طفيف في درجة حرارة المياه',
    message: 'درجة حرارة المياه 30.5 مئوية، تم تفعيل نظام التبريد التلقائي.',
    timestamp: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    acknowledged: true,
    resolved: false
  },
  {
    id: 'alm-3',
    assetId: 'bld-21',
    assetName: 'عمارة رقم 21',
    assetType: 'building',
    severity: 'info',
    title: 'ضغط مضخة الرفع مستقر',
    message: 'الضغط الحالي 3.9 بار - متوافق مع معايير التشغيل.',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    acknowledged: false,
    resolved: true
  }
];

// In-memory state singleton for runtime
class BMSStateStore {
  private state: BMSOverallState;

  constructor() {
    this.state = {
      lakes: initialLakes,
      pools: initialPools,
      fountains: initialFountains,
      buildings: generateBuildings(),
      alarms: initialAlarms,
      metrics: {
        totalPowerKw: 184.5,
        totalWaterFlowM3h: 385.0,
        activePumpsCount: 28,
        criticalAlarmsCount: 0,
        systemHealthPct: 98.6,
        lastTelemetrySync: new Date().toISOString()
      }
    };
    this.recalculateMetrics();
  }

  public getState(): BMSOverallState {
    return this.state;
  }

  public recalculateMetrics() {
    let totalKw = 0;
    let totalFlow = 0;
    let activePumps = 0;

    // Lakes
    for (const lake of this.state.lakes) {
      for (const p of lake.pumps) {
        if (p.state === 'running') {
          totalKw += p.powerKw;
          totalFlow += p.flowRateM3h;
          activePumps++;
        }
      }
    }

    // Pools
    for (const pool of this.state.pools) {
      if (pool.circulationPump.state === 'running') {
        totalKw += pool.circulationPump.powerKw;
        activePumps++;
      }
    }

    // Fountains
    for (const ft of this.state.fountains) {
      if (ft.pumpState === 'running') {
        totalKw += 4.5;
        activePumps++;
      }
    }

    // Buildings active booster pumps
    for (const bld of this.state.buildings) {
      if (bld.boosterPump.state === 'running') {
        totalKw += 2.2;
        activePumps++;
      }
    }

    const criticalCount = this.state.alarms.filter(a => a.severity === 'critical' && !a.resolved).length;
    const warningCount = this.state.alarms.filter(a => a.severity === 'warning' && !a.resolved).length;

    let health = 100 - (criticalCount * 15) - (warningCount * 3);
    health = Math.max(40, Math.min(100, health));

    this.state.metrics = {
      totalPowerKw: Number(totalKw.toFixed(1)),
      totalWaterFlowM3h: Number(totalFlow.toFixed(1)),
      activePumpsCount: activePumps,
      criticalAlarmsCount: criticalCount,
      systemHealthPct: Number(health.toFixed(1)),
      lastTelemetrySync: new Date().toISOString()
    };
  }

  public setPumpState(assetId: string, pumpId: string | null, state: 'running' | 'stopped', mode?: 'auto' | 'manual') {
    // 1. Lake
    const lake = this.state.lakes.find(l => l.id === assetId);
    if (lake) {
      const p = lake.pumps.find(x => x.id === pumpId);
      if (p) {
        p.state = state;
        if (mode) p.mode = mode;
        p.flowRateM3h = state === 'running' ? (p.powerKw * 5.5) : 0;
      }
      lake.lastUpdated = new Date().toISOString();
      this.recalculateMetrics();
      return true;
    }

    // 2. Pool
    const pool = this.state.pools.find(p => p.id === assetId);
    if (pool) {
      pool.circulationPump.state = state;
      if (mode) pool.circulationPump.mode = mode;
      pool.lastUpdated = new Date().toISOString();
      this.recalculateMetrics();
      return true;
    }

    // 3. Fountain
    const fountain = this.state.fountains.find(f => f.id === assetId);
    if (fountain) {
      fountain.pumpState = state;
      fountain.nozzlesActive = state === 'running';
      if (mode) fountain.mode = mode;
      fountain.lastUpdated = new Date().toISOString();
      this.recalculateMetrics();
      return true;
    }

    // 4. Building
    const building = this.state.buildings.find(b => b.id === assetId);
    if (building) {
      building.boosterPump.state = state;
      if (mode) building.boosterPump.mode = mode;
      building.lastUpdated = new Date().toISOString();
      this.recalculateMetrics();
      return true;
    }

    return false;
  }

  public toggleLighting(assetId: string, type: 'fountain' | 'building' | 'pool') {
    if (type === 'fountain') {
      const ft = this.state.fountains.find(f => f.id === assetId);
      if (ft) ft.rgbLighting.enabled = !ft.rgbLighting.enabled;
    } else if (type === 'building') {
      const bld = this.state.buildings.find(b => b.id === assetId);
      if (bld) bld.corridorLighting = !bld.corridorLighting;
    } else if (type === 'pool') {
      const pl = this.state.pools.find(p => p.id === assetId);
      if (pl) pl.underwaterLights = !pl.underwaterLights;
    }
    this.recalculateMetrics();
  }

  public updateWaterLevel(assetId: string, levelPct: number) {
    const lake = this.state.lakes.find(l => l.id === assetId);
    if (lake) {
      lake.waterLevelPct = Math.max(0, Math.min(100, levelPct));
      
      // Safety rule check: Low level protection
      if (lake.waterLevelPct <= lake.lowLevelAlarmPct) {
        lake.status = 'critical';
        // Auto trip pumps to prevent dry run burn
        for (const p of lake.pumps) {
          if (p.state === 'running') {
            p.state = 'tripped';
            p.flowRateM3h = 0;
          }
        }
        // Add alarm if not existing
        if (!this.state.alarms.some(a => a.assetId === lake.id && a.severity === 'critical' && !a.resolved)) {
          this.state.alarms.unshift({
            id: `alm-${Date.now()}`,
            assetId: lake.id,
            assetName: lake.name,
            assetType: 'lake',
            severity: 'critical',
            title: `⚠️ إنذار حرج: انخفاض حاد في منسوب ${lake.name}`,
            message: `المنسوب انخفض إلى ${lake.waterLevelPct}%! تم إيقاف الطلمبات تلقائياً لحمايتها من التشغيل الجاف (Dry-Run Safety Protection).`,
            timestamp: new Date().toISOString(),
            acknowledged: false,
            resolved: false
          });
        }
      } else {
        lake.status = 'normal';
      }
      this.recalculateMetrics();
      return true;
    }

    const building = this.state.buildings.find(b => b.id === assetId);
    if (building) {
      building.roofTankLevelPct = Math.max(0, Math.min(100, levelPct));
      if (building.roofTankLevelPct < 20) {
        building.status = 'warning';
        // Auto start booster pump
        building.boosterPump.state = 'running';
      } else if (building.roofTankLevelPct >= 95) {
        building.status = 'normal';
        building.boosterPump.state = 'stopped';
      }
      this.recalculateMetrics();
      return true;
    }

    return false;
  }

  public acknowledgeAlarm(alarmId: string) {
    const alm = this.state.alarms.find(a => a.id === alarmId);
    if (alm) {
      alm.acknowledged = true;
      return true;
    }
    return false;
  }

  public resolveAlarm(alarmId: string) {
    const alm = this.state.alarms.find(a => a.id === alarmId);
    if (alm) {
      alm.resolved = true;
      alm.acknowledged = true;
      this.recalculateMetrics();
      return true;
    }
    return false;
  }

  public injectSimulatedFault(faultType: 'lake9_dry_run' | 'building_leak' | 'power_trip' | 'normal_reset') {
    if (faultType === 'lake9_dry_run') {
      const lk9 = this.state.lakes.find(l => l.id === 'lake-9');
      if (lk9) {
        this.updateWaterLevel('lake-9', 15);
      }
    } else if (faultType === 'building_leak') {
      const bld1 = this.state.buildings.find(b => b.id === 'bld-1');
      if (bld1) {
        bld1.status = 'critical';
        bld1.roofTankLevelPct = 12;
        bld1.waterConsumptionM3Today += 45;
        this.state.alarms.unshift({
          id: `alm-${Date.now()}`,
          assetId: 'bld-1',
          assetName: 'عمارة رقم 1',
          assetType: 'building',
          severity: 'critical',
          title: '🚨 اشتباه تسريب مياه جسيم في شبكة تغذية عمارة 1',
          message: 'انخفاض مفاجئ في ضغط الخط وزيادة غير طبيعية في التدفق (45 م3/ساعة). تم قفل المحبس الذكي تلقائياً.',
          timestamp: new Date().toISOString(),
          acknowledged: false,
          resolved: false
        });
      }
    } else if (faultType === 'power_trip') {
      const pool1 = this.state.pools.find(p => p.id === 'pool-1');
      if (pool1) {
        pool1.status = 'warning';
        pool1.circulationPump.state = 'tripped';
        this.state.alarms.unshift({
          id: `alm-${Date.now()}`,
          assetId: 'pool-1',
          assetName: 'حمام سباحة النادي الرئيسي (نصف أولمبي)',
          assetType: 'pool',
          severity: 'warning',
          title: '⚡ عطل كهربائي / فصل القاطع (Overload Trip)',
          message: 'فصل قاطع الحماية الحراري لطلمبة تدوير الحمام الرئيسي 11kW بسبب ارتفاع الحمل.',
          timestamp: new Date().toISOString(),
          acknowledged: false,
          resolved: false
        });
      }
    } else if (faultType === 'normal_reset') {
      // Reset all to healthy
      this.state.lakes = initialLakes.map(l => ({ ...l, status: 'normal', waterLevelPct: 85 }));
      this.state.pools = initialPools.map(p => ({ ...p, status: 'normal', circulationPump: { ...p.circulationPump, state: 'running' } }));
      this.state.fountains = initialFountains.map(f => ({ ...f, status: 'normal', pumpState: 'running', nozzlesActive: true }));
      this.state.buildings = generateBuildings();
      this.state.alarms = initialAlarms;
    }
    this.recalculateMetrics();
  }
}

// Global instance
const globalForBMS = globalThis as unknown as { bmsStore: BMSStateStore | undefined };
export const bmsStore = globalForBMS.bmsStore ?? new BMSStateStore();
if (process.env.NODE_ENV !== 'production') globalForBMS.bmsStore = bmsStore;
