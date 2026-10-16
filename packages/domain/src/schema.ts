export interface Item {
  id?: string;
  code: string;
  category: string;
  name: string;
  unit: string;
  openingBalance: number;
  totalIn: number;
  totalOut: number;
  totalScrap: number;
  stock: number;
  alertLimit: number;
  status: string;
  classification?: string;
  shortageOverride?: 'AUTO' | 'NORMAL' | 'ON_DEMAND' | 'CRITICAL';
  substituteCode?: string;
  substituteNotes?: string;
  updatedAt: number;
  // FSN Tracking Fields
  disbursementCount?: number;
  additionCount?: number;
  recentDisbursements?: number[];
  lastDisbursedAt?: number;
  lastAddedAt?: number;
}

export interface Addition {
  id?: string;
  date: string;
  invoiceNo: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  qty: number;
  supplier: string;
  notes: string;
  category: string;
  createdBy: string;
  createdByName: string;
  createdAt: number;
}

export interface Disbursement {
  id?: string;
  date: string;
  invoiceNo: string;
  department: string;
  destination: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  qty: number;
  notes: string;
  receiver: string;
  category: string;
  sourceRequestId: string;
  createdBy: string;
  createdAt: number;
}

export interface MaterialRequest {
  id?: string;
  reqId: string;
  status: string; // pending, pending_engineer, approved, issued, completed, rejected
  userId: string;
  userName: string;
  category: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  qty: number;
  dept: string;
  jobTitle: string;
  notes: string;
  location: string;
  installationLocation?: string; // Explicit string location for install
  companyName?: string;
  emergency: "عادي" | "عاجل";
  createdAt: number;
  isSupplierRequest?: boolean;
  
  // New Workflow Flags
  isApprovedBySupervisor: boolean;
  isApprovedByManagement: boolean;
  isDisbursedByAdmin: boolean;
  isReceivedByRequester?: boolean; // For completed status
  
  supervisorResolvedBy?: string;
  supervisorResolvedAt?: number;
  
  managementResolvedBy?: string;
  managementResolvedAt?: number;
  
  adminDisbursedBy?: string;
  adminDisbursedAt?: number;
  disbursementInvoiceNo?: string;

  receivedBy?: string;
  receivedAt?: number;
}

export interface Scrap {
  id?: string;
  date: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  qty: number;
  reason: string;
  category: string;
  createdBy: string;
  createdAt: number;
}

export interface User {
  id?: string;
  email: string;
  name: string;
  jobTitle: string;
  category: string;
  role: "pending" | "user" | "company_user" | "supervisor" | "admin" | "management" | "blocked";
  roleClass: "role-admin" | "role-management" | "role-supervisor" | "role-user" | "role-company" | "";
  companyName?: string;
  isCompanyUser?: boolean;
  createdAt: number;
}

export interface AppNotification {
  id?: string;
  userId: string;
  title: string;
  message: string;
  type: 'INBOUND' | 'SYSTEM';
  isRead: boolean;
  createdAt: number;
  link?: string;
}
