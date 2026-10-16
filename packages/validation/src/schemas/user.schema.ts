import { z } from 'zod';
import { 
  AccountStatus, 
  MfaPolicy, 
  MembershipApprovalStatus, 
  AccountType, 
  RegistrationSource 
} from '@stockly/domain';

export const ExternalAccountDetailsSchema = z.object({
  validFrom: z.date().optional(),
  validUntil: z.date().optional(),
  contractNumber: z.string().optional(),
  serviceCompanyId: z.string().optional(),
  allowedWorkOrderIds: z.array(z.string()).optional(),
  allowedDepartmentIds: z.array(z.string()).optional(),
  allowedLocationIds: z.array(z.string()).optional(),
});

export const UserSecurityProfileSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  employeeCode: z.string().optional(),
  accountStatus: z.nativeEnum(AccountStatus),
  membershipApprovalStatus: z.nativeEnum(MembershipApprovalStatus),
  accountType: z.nativeEnum(AccountType),
  registrationSource: z.nativeEnum(RegistrationSource),
  externalAccount: ExternalAccountDetailsSchema.optional(),
  roleIds: z.array(z.string()),
  departmentIds: z.array(z.string()).optional(),
  warehouseIds: z.array(z.string()).optional(),
  permissionVersion: z.number().int().nonnegative(),
  mfaEnabled: z.boolean(),
  mfaPolicy: z.nativeEnum(MfaPolicy),
  lastMfaVerifiedAt: z.date().optional(),
  emailVerifiedAt: z.date().optional(),
  membershipApprovedAt: z.date().optional(),
  approvedBy: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserSecurityProfileInput = z.infer<typeof UserSecurityProfileSchema>;
