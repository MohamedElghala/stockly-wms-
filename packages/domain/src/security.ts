export enum AccountStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
  SUSPENDED = 'SUSPENDED',
  DISABLED = 'DISABLED',
}

export enum MembershipApprovalStatus {
  NOT_SUBMITTED = 'NOT_SUBMITTED',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  MORE_INFORMATION_REQUIRED = 'MORE_INFORMATION_REQUIRED',
  CANCELLED = 'CANCELLED',
}

export enum AccountType {
  INTERNAL_EMPLOYEE = 'INTERNAL_EMPLOYEE',
  EXTERNAL_CONTRACTOR = 'EXTERNAL_CONTRACTOR',
  TEMPORARY_WORKER = 'TEMPORARY_WORKER',
  SERVICE_COMPANY = 'SERVICE_COMPANY',
  SYSTEM_ACCOUNT = 'SYSTEM_ACCOUNT',
}

export enum RegistrationSource {
  INVITATION = 'INVITATION',
  SELF_REGISTRATION = 'SELF_REGISTRATION',
}

export enum MfaPolicy {
  REQUIRED = 'REQUIRED',
  OPTIONAL = 'OPTIONAL',
}

export enum MfaFactorType {
  TOTP = 'TOTP',
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

export enum MfaChallengeStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  EXPIRED = 'EXPIRED',
  LOCKED = 'LOCKED',
  CANCELLED = 'CANCELLED',
}

export interface ExternalAccountDetails {
  validFrom?: Date;
  validUntil?: Date;
  contractNumber?: string;
  serviceCompanyId?: string;
  allowedWorkOrderIds?: string[];
  allowedDepartmentIds?: string[];
  allowedLocationIds?: string[];
}

export interface UserSecurityProfile {
  id: string; // Firebase Auth UID
  email: string;
  employeeCode?: string;
  accountStatus: AccountStatus;
  membershipApprovalStatus: MembershipApprovalStatus;
  accountType: AccountType;
  registrationSource: RegistrationSource;
  externalAccount?: ExternalAccountDetails;
  roleIds: string[]; // List of roles (e.g., ['WAREHOUSE_KEEPER'])
  departmentIds?: string[]; // Allowed departments
  warehouseIds?: string[]; // Allowed warehouses
  permissionVersion: number; // For forcing token refresh
  mfaEnabled: boolean;
  mfaPolicy: MfaPolicy;
  lastMfaVerifiedAt?: Date;
  emailVerifiedAt?: Date;
  membershipApprovedAt?: Date;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserInvitation {
  invitationId: string;
  email: string;
  employeeCode?: string;
  phoneNumber?: string;
  expectedDepartmentId?: string;
  expectedJobTitle?: string;
  requestedRoleIds?: string[];
  accountType: AccountType;
  invitedBy: string;
  createdAt: Date;
  expiresAt: Date;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED' | 'CANCELLED';
  usedAt?: Date;
  linkedUserId?: string;
}

export interface MembershipApprovalRecord {
  approvalId: string;
  userId: string;
  decision: 'APPROVED' | 'REJECTED' | 'MORE_INFORMATION_REQUIRED' | 'CANCELLED';
  decidedBy: string;
  decidedAt: Date;
  reason: string;
  assignedRoleIds: string[];
  departmentIds?: string[];
  warehouseIds?: string[];
  accountType: AccountType;
  invitationId?: string;
  registrationSource: RegistrationSource;
  beforeSnapshot: Partial<UserSecurityProfile>;
  afterSnapshot: Partial<UserSecurityProfile>;
  correlationId?: string;
}
