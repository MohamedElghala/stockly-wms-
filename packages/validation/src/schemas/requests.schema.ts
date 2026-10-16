import { z } from 'zod';

export const materialRequestLineSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  requestedQuantity: z.number().positive('Quantity must be greater than 0'),
  notes: z.string().optional(),
});

export const createDraftRequestSchema = z.object({
  departmentId: z.string().min(1, 'Department ID is required'),
  warehouseId: z.string().min(1, 'Warehouse ID is required'),
  notes: z.string().optional(),
});

export const submitRequestSchema = z.object({
  requestId: z.string().min(1, 'Request ID is required'),
  lines: z.array(materialRequestLineSchema).min(1, 'At least one item must be requested'),
});

export const technicalApprovalSchema = z.object({
  requestId: z.string().min(1, 'Request ID is required'),
  approved: z.boolean(),
  rejectionReason: z.string().optional(),
});

export const finalApprovalSchema = z.object({
  requestId: z.string().min(1, 'Request ID is required'),
  approved: z.boolean(),
  rejectionReason: z.string().optional(),
});

export const emergencyRequestSchema = z.object({
  departmentId: z.string().min(1, 'Department ID is required'),
  warehouseId: z.string().min(1, 'Warehouse ID is required'),
  emergencyJustification: z.string().min(5, 'Detailed justification is required'),
  lines: z.array(materialRequestLineSchema).min(1, 'At least one item must be issued'),
});

export const issueRequestSchema = z.object({
  requestId: z.string().min(1, 'Request ID is required'),
});

export const cancelRequestSchema = z.object({
  requestId: z.string().min(1, 'Request ID is required'),
  cancelReason: z.string().optional(),
});
