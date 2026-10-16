export enum RequestLifecycleStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TechnicalApprovalStatus {
  NOT_REQUIRED = 'NOT_REQUIRED', // For drafts or direct issues
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum FinalApprovalStatus {
  NOT_REQUIRED = 'NOT_REQUIRED',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum IssueStatus {
  NOT_ISSUED = 'NOT_ISSUED',
  PARTIALLY_ISSUED = 'PARTIALLY_ISSUED',
  ISSUED = 'ISSUED',
  CANCELLED = 'CANCELLED',
}

export enum ExceptionStatus {
  NORMAL = 'NORMAL',
  EMERGENCY_PENDING_POST_APPROVAL = 'EMERGENCY_PENDING_POST_APPROVAL',
  EMERGENCY_REJECTED = 'EMERGENCY_REJECTED',
}

export interface MaterialRequest {
  id: string;
  requestNumber: string; // Enterprise document number e.g., MR-2026-000001
  departmentId: string;
  warehouseId: string;
  
  // Independent States as per WORKFLOW_MATRIX
  lifecycleStatus: RequestLifecycleStatus;
  technicalApprovalStatus: TechnicalApprovalStatus;
  finalApprovalStatus: FinalApprovalStatus;
  issueStatus: IssueStatus;
  exceptionStatus: ExceptionStatus;

  // Metadata
  notes?: string;
  rejectionReason?: string;
  emergencyJustification?: string;

  // Audit
  createdBy: string;
  createdAt: number;
  updatedBy: string;
  updatedAt: number;
  version: number;
}

export interface MaterialRequestLine {
  id: string; // Usually a combination of requestId and itemId
  requestId: string;
  itemId: string;
  
  // Immutable snapshots at time of request
  itemCodeSnapshot: string;
  itemNameSnapshot: string;
  unitSnapshot: string;

  // Quantities
  requestedQuantity: number;
  approvedQuantity: number; // Initially 0, populated upon technical approval if partial allowed, otherwise equals requested
  issuedQuantity: number; // Accumulated as physical issues happen

  notes?: string;
}
