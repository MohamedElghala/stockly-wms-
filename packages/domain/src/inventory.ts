export interface Category {
  id: string;
  nameAr: string;
  nameEn: string;
  isActive: boolean;
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
  createdBy: string;
  updatedBy: string;
}

export interface Unit {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
}

export interface Warehouse {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  location?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
}

export interface Item {
  id: string; // Document ID (usually same as itemCode or auto-gen)
  itemCode: string; // Sequentially generated, e.g., ITM-000001
  legacyItemCode?: string; // e.g., 1001 for migrated items
  categoryId: string;
  nameAr: string;
  nameEn: string;
  unitId: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
}

export interface InventoryPolicy {
  warehouseId: string;
  itemId: string;
  minimumStock: number;
  reorderPoint: number;
  maximumStock: number;
  safetyStock: number;
  allowNegativeStock: boolean; // Policy can be per-item/warehouse or global
  createdAt: number;
  updatedAt: number;
  updatedBy: string;
}

export interface StockBalance {
  id: string; // composite: warehouseId_itemId
  warehouseId: string;
  itemId: string;
  onHand: number;
  reserved: number;
  available: number;
  lastMovementId?: string;
  lastUpdatedAt: number;
}

export enum MovementType {
  RECEIPT = 'RECEIPT',
  ISSUE = 'ISSUE',
  SCRAP = 'SCRAP',
  ADJUSTMENT = 'ADJUSTMENT',
  TRANSFER = 'TRANSFER',
}

export enum MovementDirection {
  IN = 'IN',
  OUT = 'OUT',
}

export interface StockMovement {
  movementId: string;
  movementType: MovementType;
  direction: MovementDirection;
  warehouseId: string;
  itemId: string;
  quantity: number;
  previousBalance: number;
  newBalance: number;
  referenceType: string;
  referenceId: string;
  referenceNumber?: string; // Human-readable ref
  createdBy: string;
  createdAt: number;
  correlationId?: string; // For tying IN/OUT transfers or reservations together
  operationId: string; // Idempotency key
}

export interface IdempotencyRecord {
  operationId: string;
  idempotencyKey: string;
  operationType: string;
  actorId: string;
  payloadHash: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  resultReference?: any;
  createdAt: number;
  completedAt?: number;
}

export interface BusinessEvent {
  eventId: string;
  eventType: string; // e.g., RECEIPT_POSTED, RESERVATION_CREATED
  entityType: string; // e.g., ITEM, RECEIPT, ISSUE
  entityId: string;
  operationId: string;
  correlationId?: string;
  eventVersion: number;
  status: 'PENDING' | 'PROCESSED' | 'FAILED';
  payload: any;
  createdAt: number;
  processedAt?: number;
  retryCount: number;
  lastError?: string;
}

export interface Transfer {
  transferId: string;
  transferNumber: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  status: 'DRAFT' | 'APPROVED' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED'; // Prepared for multi-step
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface TransferLine {
  transferId: string;
  itemId: string;
  itemCodeSnapshot: string;
  itemNameSnapshot: string;
  unitSnapshot: string;
  quantity: number;
}

export enum ReservationStatus {
  ACTIVE = 'ACTIVE',
  ISSUED = 'ISSUED',
  CANCELLED = 'CANCELLED'
}

export interface Reservation {
  reservationId: string;
  warehouseId: string;
  itemId: string;
  quantity: number;
  referenceType: string;
  referenceId: string;
  status: ReservationStatus;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}
