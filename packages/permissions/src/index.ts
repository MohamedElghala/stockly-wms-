
export const Permissions = {
  // Inventory
  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_RECEIVE: 'inventory:receive',
  INVENTORY_ISSUE_NORMAL: 'inventory:issue_normal',
  INVENTORY_ISSUE_EMERGENCY: 'inventory:issue_emergency',
  INVENTORY_SCRAP: 'inventory:scrap',
  INVENTORY_ADJUST: 'inventory:adjust',
  INVENTORY_TRANSFER: 'inventory:transfer',
  INVENTORY_RESERVE: 'inventory:reserve',

  // Master Data
  MASTERDATA_VIEW: 'masterdata:view',
  MASTERDATA_MANAGE_ITEMS: 'masterdata:manage_items',
  MASTERDATA_MANAGE_VENDORS: 'masterdata:manage_vendors',
  MASTERDATA_MANAGE_LOCATIONS: 'masterdata:manage_locations',
  MASTERDATA_MANAGE_DEPARTMENTS: 'masterdata:manage_departments',
  MASTERDATA_MANAGE_WAREHOUSES: 'masterdata:manage_warehouses',
  MASTERDATA_MANAGE_POLICIES: 'masterdata:manage_policies',

  // Requests
  REQUEST_VIEW_OWN: 'request:view_own',
  REQUEST_VIEW_DEPARTMENT: 'request:view_department',
  REQUEST_VIEW_ALL: 'request:view_all',
  REQUEST_CREATE: 'request:create',
  REQUEST_APPROVE_TECHNICAL: 'request:approve_technical',
  REQUEST_APPROVE_FINAL: 'request:approve_final',
  REQUEST_AUTHORIZE_EMERGENCY: 'request:authorize_emergency',
  REQUEST_REJECT: 'request:reject',

  // System & Administration
  SYSTEM_VIEW_AUDIT_LOGS: 'system:view_audit_logs',
  SYSTEM_MANAGE_USERS: 'system:manage_users',
  SYSTEM_MANAGE_ROLES: 'system:manage_roles',
  SYSTEM_MANAGE_DELEGATIONS: 'system:manage_delegations',
  SYSTEM_CONFIGURE_SETTINGS: 'system:configure_settings',

  // Notifications
  NOTIFICATIONS_VIEW_DELIVERY_LOGS: 'notifications:view_delivery_logs',
  NOTIFICATIONS_MANAGE_PREFERENCES: 'notifications:manage_preferences',
  NOTIFICATIONS_MANAGE_GROUPS: 'notifications:manage_groups',

  // Membership & Onboarding
  USERS_VIEW_PENDING_MEMBERSHIPS: 'users:view_pending_memberships',
  USERS_APPROVE_MEMBERSHIP: 'users:approve_membership',
  USERS_REJECT_MEMBERSHIP: 'users:reject_membership',
  USERS_REQUEST_MEMBERSHIP_INFORMATION: 'users:request_membership_information',
  USERS_ASSIGN_OPERATIONAL_ROLES: 'users:assign_operational_roles',
  USERS_ASSIGN_PRIVILEGED_ROLES: 'users:assign_privileged_roles',
  USERS_ASSIGN_BASIC_ROLES: 'users:assign_basic_roles',
  USERS_MANAGE_INVITATIONS: 'users:manage_invitations',
} as const;

export type Permission = typeof Permissions[keyof typeof Permissions];

export const isValidPermission = (permission: string): permission is Permission => {
  return Object.values(Permissions).includes(permission as Permission);
};

export const Roles = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  WAREHOUSE_KEEPER: 'WAREHOUSE_KEEPER',
  MAINTENANCE_TECHNICIAN: 'MAINTENANCE_TECHNICIAN',
  EXTERNAL_CONTRACTOR: 'EXTERNAL_CONTRACTOR',
  MAINTENANCE_SUPERVISOR: 'MAINTENANCE_SUPERVISOR',
  MAINTENANCE_MANAGER: 'MAINTENANCE_MANAGER',
  MANAGEMENT: 'MANAGEMENT',
  AUDITOR: 'AUDITOR',
  READ_ONLY: 'READ_ONLY',
} as const;

export type Role = typeof Roles[keyof typeof Roles];

export const BaseRolePermissions: Record<Role, string[]> = {
  [Roles.SUPER_ADMIN]: Object.values(Permissions), // All permissions
  [Roles.WAREHOUSE_KEEPER]: [
    Permissions.INVENTORY_VIEW,
    Permissions.INVENTORY_RECEIVE,
    Permissions.INVENTORY_ISSUE_NORMAL,
    Permissions.INVENTORY_ISSUE_EMERGENCY,
    Permissions.INVENTORY_SCRAP,
    Permissions.INVENTORY_ADJUST,
    Permissions.INVENTORY_TRANSFER,
    Permissions.INVENTORY_RESERVE,
    // Membership capabilities for warehouse scopes
    Permissions.USERS_VIEW_PENDING_MEMBERSHIPS,
    Permissions.USERS_APPROVE_MEMBERSHIP,
    Permissions.USERS_REJECT_MEMBERSHIP,
    Permissions.USERS_REQUEST_MEMBERSHIP_INFORMATION,
    Permissions.USERS_ASSIGN_OPERATIONAL_ROLES,
    Permissions.USERS_MANAGE_INVITATIONS,
  ],
  [Roles.MAINTENANCE_TECHNICIAN]: [
    Permissions.INVENTORY_VIEW,
    Permissions.REQUEST_CREATE,
    Permissions.REQUEST_VIEW_OWN,
  ],
  [Roles.EXTERNAL_CONTRACTOR]: [
    Permissions.INVENTORY_VIEW,
    Permissions.REQUEST_CREATE,
    Permissions.REQUEST_VIEW_OWN,
  ],
  [Roles.MAINTENANCE_SUPERVISOR]: [
    Permissions.INVENTORY_VIEW,
    Permissions.REQUEST_CREATE,
    Permissions.REQUEST_VIEW_DEPARTMENT,
    Permissions.REQUEST_APPROVE_TECHNICAL,
  ],
  [Roles.MAINTENANCE_MANAGER]: [
    Permissions.INVENTORY_VIEW,
    Permissions.REQUEST_VIEW_ALL,
    Permissions.REQUEST_AUTHORIZE_EMERGENCY,
    Permissions.REQUEST_APPROVE_FINAL,
  ],
  [Roles.MANAGEMENT]: [
    Permissions.INVENTORY_VIEW,
    Permissions.REQUEST_VIEW_ALL,
    Permissions.MASTERDATA_VIEW,
  ],
  [Roles.AUDITOR]: [
    Permissions.INVENTORY_VIEW,
    Permissions.REQUEST_VIEW_ALL,
    Permissions.MASTERDATA_VIEW,
    Permissions.SYSTEM_VIEW_AUDIT_LOGS,
    Permissions.NOTIFICATIONS_VIEW_DELIVERY_LOGS,
  ],
  [Roles.READ_ONLY]: [
    Permissions.INVENTORY_VIEW,
    Permissions.MASTERDATA_VIEW,
  ]
};
