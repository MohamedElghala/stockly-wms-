import { z } from 'zod';
import { MovementDirection } from '@stockly/domain';

// Common structures
const positiveQuantitySchema = z.number().min(0.001, "Quantity must be greater than zero");

// Master Data
export const createItemSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  nameAr: z.string().min(1, "Arabic name is required"),
  nameEn: z.string().min(1, "English name is required"),
  unitId: z.string().min(1, "Unit is required"),
});

export const updateItemSchema = createItemSchema.partial();

export const createWarehouseSchema = z.object({
  code: z.string().min(1, "Code is required"),
  nameAr: z.string().min(1, "Arabic name is required"),
  nameEn: z.string().min(1, "English name is required"),
  location: z.string().optional(),
});

export const updateWarehouseSchema = createWarehouseSchema.partial();

export const inventoryPolicySchema = z.object({
  warehouseId: z.string().min(1),
  itemId: z.string().min(1),
  minimumStock: z.number().min(0),
  reorderPoint: z.number().min(0),
  maximumStock: z.number().min(0),
  safetyStock: z.number().min(0),
  allowNegativeStock: z.boolean().default(false),
}).refine(data => data.maximumStock >= data.reorderPoint, {
  message: "maximumStock must be greater than or equal to reorderPoint",
  path: ["maximumStock"],
}).refine(data => data.reorderPoint >= data.minimumStock, {
  message: "reorderPoint must be greater than or equal to minimumStock",
  path: ["reorderPoint"],
});

// Stock Operations
export const reserveStockSchema = z.object({
  idempotencyKey: z.string().min(1),
  warehouseId: z.string().min(1),
  itemId: z.string().min(1),
  quantity: positiveQuantitySchema,
  referenceType: z.string().min(1),
  referenceId: z.string().min(1),
});

export const releaseReservationSchema = z.object({
  idempotencyKey: z.string().min(1),
  reservationId: z.string().min(1),
});

export const cancelReservationSchema = releaseReservationSchema;

export const receiveStockSchema = z.object({
  idempotencyKey: z.string().min(1),
  receiptNumber: z.string().min(1),
  warehouseId: z.string().min(1),
  supplierName: z.string().min(1),
  invoiceNumber: z.string().optional(),
  lines: z.array(z.object({
    itemId: z.string().min(1),
    receivedQty: positiveQuantitySchema,
  })).min(1, "At least one line is required"),
});

export const issueReservedStockSchema = z.object({
  idempotencyKey: z.string().min(1),
  reservationId: z.string().min(1),
  issueQuantity: positiveQuantitySchema,
});

export const issueDirectStockSchema = z.object({
  idempotencyKey: z.string().min(1),
  warehouseId: z.string().min(1),
  itemId: z.string().min(1),
  quantity: positiveQuantitySchema,
  referenceType: z.string().min(1),
  referenceId: z.string().min(1),
});

export const emergencyIssueSchema = z.object({
  idempotencyKey: z.string().min(1),
  warehouseId: z.string().min(1),
  itemId: z.string().min(1),
  quantity: positiveQuantitySchema,
  emergencyReason: z.string().min(5, "Emergency reason must be descriptive"),
  receiver: z.string().min(1, "Receiver identity is required"),
  relatedRequestId: z.string().optional(),
  relatedWorkOrderId: z.string().optional(),
});

export const scrapStockSchema = z.object({
  idempotencyKey: z.string().min(1),
  warehouseId: z.string().min(1),
  itemId: z.string().min(1),
  quantity: positiveQuantitySchema,
  reason: z.string().min(1),
});

export const adjustStockSchema = z.object({
  idempotencyKey: z.string().min(1),
  warehouseId: z.string().min(1),
  itemId: z.string().min(1),
  quantity: positiveQuantitySchema,
  direction: z.nativeEnum(MovementDirection),
  reason: z.string().min(1),
});

export const transferStockSchema = z.object({
  idempotencyKey: z.string().min(1),
  transferNumber: z.string().min(1),
  sourceWarehouseId: z.string().min(1),
  destinationWarehouseId: z.string().min(1),
  lines: z.array(z.object({
    itemId: z.string().min(1),
    quantity: positiveQuantitySchema,
  })).min(1),
}).refine(data => data.sourceWarehouseId !== data.destinationWarehouseId, {
  message: "Source and destination warehouses cannot be the same",
  path: ["destinationWarehouseId"],
});
