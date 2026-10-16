# THE CALM WMS - RBAC MATRIX

*(Updated for MFA & Notification Gate)*

## 1. Permissions (Granular Actions)

**Inventory & Request Permissions:** (Remain as previously defined)

**Master Data & System Permissions:**
- `masterdata:view`
- `masterdata:manage_items`
- `system:manage_users`
- `system:view_audit_logs`

**Security & Notification Permissions (NEW):**
- `security:manage_mfa_policies` (Required to enforce MFA on other users or reset their factors).
- `notifications:manage_groups` (Required to create/edit Notification Groups and assign external webhooks/WhatsApp IDs).
- `notifications:view_delivery_logs`

## 2. Roles (Bundled Permissions)

| Role | Key Permissions Included | MFA Policy |
|---|---|---|
| **SUPER_ADMIN** | All permissions. | REQUIRED |
| **WAREHOUSE_KEEPER** | `inventory:issue_normal`, `inventory:issue_emergency` | REQUIRED |
| **MAINTENANCE_TECHNICIAN** | `request:create`, `request:view_own` | OPTIONAL |
| **MAINTENANCE_SUPERVISOR** | `request:approve_technical` | REQUIRED |
| **MAINTENANCE_MANAGER** | `request:approve_final`, `request:authorize_emergency` | REQUIRED |
| **EXTERNAL_CONTRACTOR** | `request:create` | OPTIONAL |
| **MANAGEMENT** | `request:view_all` | REQUIRED |
| **AUDITOR** | `system:view_audit_logs`, `notifications:view_delivery_logs` | REQUIRED |

## 3. Custom Claims Architecture & Delegations
*(Remains exactly as defined in the previous Correction Gate)*
