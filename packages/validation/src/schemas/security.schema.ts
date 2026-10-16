import { z } from 'zod';
import { MfaChallengeStatus, MfaFactorType } from '@stockly/domain';
import { Permissions, isValidPermission } from '@stockly/permissions';

export const DelegationSchema = z.object({
  delegationId: z.string().min(1),
  delegatorId: z.string().min(1),
  delegateeId: z.string().min(1),
  delegatedPermissions: z.array(z.string().refine(isValidPermission, {
    message: "Invalid permission string"
  })),
  documentTypes: z.array(z.string()).optional(),
  warehouseIds: z.array(z.string()).optional(),
  departmentIds: z.array(z.string()).optional(),
  startDate: z.date(),
  endDate: z.date(),
  isActive: z.boolean(),
  reason: z.string().min(1),
  createdAt: z.date(),
  createdBy: z.string().min(1),
  revokedAt: z.date().optional(),
  revokedBy: z.string().optional(),
});

export const MfaChallengeSchema = z.object({
  challengeId: z.string().min(1),
  userId: z.string().min(1),
  factorType: z.nativeEnum(MfaFactorType),
  deliveryChannel: z.string(),
  status: z.nativeEnum(MfaChallengeStatus),
  attemptCount: z.number().int().nonnegative(),
  maxAttempts: z.number().int().positive(),
  createdAt: z.date(),
  expiresAt: z.date(),
  consumedAt: z.date().optional(),
});

export const AuditLogSchema = z.object({
  logId: z.string().optional(), // usually auto-generated ID
  actorId: z.string().min(1),
  action: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  timestamp: z.date(),
  reason: z.string().optional(),
  beforeSnapshot: z.record(z.string(), z.any()).optional(),
  afterSnapshot: z.record(z.string(), z.any()).optional(),
  delegationId: z.string().optional(),
  correlationId: z.string().optional(),
  requestId: z.string().optional(),
});
