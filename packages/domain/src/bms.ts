export type AssetStatus = 'normal' | 'warning' | 'critical' | 'offline';
export type ControlMode = 'auto' | 'manual' | 'schedule';
export type PumpState = 'running' | 'stopped' | 'tripped' | 'maintenance';

export interface BaseFacilityAsset {
  id: string;
  name: string;
  code: string;
  type: 'lake' | 'pool' | 'fountain' | 'building' | 'irrigation_zone' | 'substation';
  sector: string;
  status: AssetStatus;
  lastUpdated: string;
  location?: {
    x: number; // percentage on interactive map 0-100
    y: number; // percentage on interactive map 0-100
  };
}

export interface LakeAsset extends BaseFacilityAsset {
  type: 'lake';
  waterLevelPct: number; // 0 - 100%
  targetWaterLevelPct: number;
  lowLevelAlarmPct: number;
  highLevelAlarmPct: number;
  pumps: {
    id: string;
    name: string;
    state: PumpState;
    mode: ControlMode;
    powerKw: number;
    hoursRun: number;
    flowRateM3h: number;
  }[];
  filtrationActive: boolean;
  waterQualityTds?: number;
}

export interface PoolAsset extends BaseFacilityAsset {
  type: 'pool';
  waterLevelPct: number;
  temperatureC: number;
  chlorinePpm: number;
  phLevel: number;
  circulationPump: {
    state: PumpState;
    mode: ControlMode;
    powerKw: number;
  };
  schedule: {
    startTime: string; // "06:00"
    endTime: string;   // "22:00"
    enabled: boolean;
  };
  underwaterLights: boolean;
}

export interface FountainAsset extends BaseFacilityAsset {
  type: 'fountain';
  nozzlesActive: boolean;
  pumpState: PumpState;
  mode: ControlMode;
  rgbLighting: {
    enabled: boolean;
    color: string;
    mode: 'fixed' | 'cycle' | 'waves';
  };
  schedule: {
    startTime: string;
    endTime: string;
    enabled: boolean;
  };
}

export interface BuildingAsset extends BaseFacilityAsset {
  type: 'building';
  buildingNumber: number; // 1 to 462
  unitsCount: number;
  floorsCount: number;
  roofTankLevelPct: number;
  groundTankLevelPct?: number;
  boosterPump: {
    state: PumpState;
    mode: ControlMode;
    pressureBar: number;
  };
  corridorLighting: boolean;
  energyConsumptionKwhToday: number;
  waterConsumptionM3Today: number;
}

export interface BMSAlarm {
  id: string;
  assetId: string;
  assetName: string;
  assetType: BaseFacilityAsset['type'];
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  resolved: boolean;
}

export interface AssetInstalledMaterial {
  id: string;
  assetId: string;
  itemCode: string;
  itemName: string;
  disbursementId?: string;
  quantity: number;
  unit: string;
  installedDate: string;
  technicianName: string;
  notes?: string;
}

export interface MaintenanceWorkOrder {
  id: string;
  workOrderNumber: string;
  assetId: string;
  assetName: string;
  alarmId?: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'open' | 'pending_materials' | 'in_progress' | 'completed' | 'cancelled';
  description: string;
  requestedMaterials?: {
    itemCode: string;
    itemName: string;
    quantity: number;
    unit: string;
  }[];
  wmsRequisitionId?: string;
  createdAt: string;
  completedAt?: string;
}

export interface BMSOverallState {
  lakes: LakeAsset[];
  pools: PoolAsset[];
  fountains: FountainAsset[];
  buildings: BuildingAsset[];
  alarms: BMSAlarm[];
  workOrders?: MaintenanceWorkOrder[];
  installedMaterials?: AssetInstalledMaterial[];
  metrics: {
    totalPowerKw: number;
    totalWaterFlowM3h: number;
    activePumpsCount: number;
    criticalAlarmsCount: number;
    systemHealthPct: number;
    lastTelemetrySync: string;
  };
}

