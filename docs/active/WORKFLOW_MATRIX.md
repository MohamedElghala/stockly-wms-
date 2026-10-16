# THE CALM WMS - WORKFLOW MATRIX

This document outlines the state machine and progression of a Material Request in the system. It uses explicit workflow states to accurately track who requested, technically approved, finally approved, and issued materials.

## 1. Material Request States

A Request document tracks multiple independent statuses to reflect the real-world workflow.

### A. Technical Approval Status (`technicalApprovalStatus`)
- **PENDING:** Waiting for a Supervisor to verify the technical necessity of the items.
- **APPROVED:** Supervisor approved the items.
- **REJECTED:** Supervisor denied the items (stops the workflow).

### B. Final Approval Status (`finalApprovalStatus`)
- **PENDING:** Waiting for the Maintenance Manager (or budget holder) to authorize the release.
- **APPROVED:** Authorized for physical release.
- **REJECTED:** Denied by management (stops the workflow).

### C. Issue Status (`issueStatus`)
- **NOT_ISSUED:** Warehouse has not released any items yet.
- **PARTIALLY_ISSUED:** Some items were issued, but backorders exist.
- **ISSUED:** All approved quantities have been physically released.
- **CANCELLED:** The requester or warehouse cancelled the issue before physical release.

### D. Exception Status (`exceptionStatus`)
- **NORMAL:** Standard operating procedure.
- **EMERGENCY_PENDING_POST_APPROVAL:** Materials were physically issued during an emergency without prior approval, and the system is waiting for retroactive Manager approval.
- **EMERGENCY_REJECTED:** Retroactive approval was denied (triggers an audit/investigation workflow).

### E. Request Lifecycle Status (`requestLifecycleStatus` - Derived)
A strictly **derived** (computed) status for UI display, never authoritative. 
Computed based on the combination of the 4 states above (e.g., if `technicalApprovalStatus == APPROVED` and `finalApprovalStatus == APPROVED` and `issueStatus == ISSUED`, display as "Completed").

## 2. Standard Workflow Progression

1. **Creation:** Technician submits request. 
   - `technicalApprovalStatus` = PENDING
   - `finalApprovalStatus` = PENDING
   - `issueStatus` = NOT_ISSUED
   - `exceptionStatus` = NORMAL
2. **Technical Review:** Supervisor approves.
   - `technicalApprovalStatus` = APPROVED
3. **Final Review:** Manager approves.
   - `finalApprovalStatus` = APPROVED
   - Inventory `reserved` balances are increased atomically.
4. **Fulfillment:** Warehouse Keeper issues stock.
   - `issueStatus` = ISSUED (or PARTIALLY_ISSUED)
   - Inventory `reserved` is decreased, `onHand` is decreased.

## 3. Emergency Workflow Progression (Correction Applied)

The Warehouse Keeper physically issues stock during an emergency. This does NOT automatically grant Final Approval.

1. **Emergency Trigger:** An authorized user (with `inventory:issue_emergency`) declares an emergency and physically issues the material.
2. **Physical Issue Execution:**
   - Request is auto-generated or an existing request is hijacked.
   - `technicalApprovalStatus` = PENDING (or APPROVED if previously done).
   - `finalApprovalStatus` = **PENDING** (Must wait for manager post-approval).
   - `issueStatus` = **ISSUED**
   - `exceptionStatus` = **EMERGENCY_PENDING_POST_APPROVAL**
   - Inventory `onHand` is decreased immediately.
3. **Post-Incident Review:** Maintenance Manager logs in later to review the Pending Final Approval queue.
   - **Approves:** `finalApprovalStatus` = APPROVED, `exceptionStatus` = NORMAL (Exception resolved).
   - **Rejects:** `finalApprovalStatus` = REJECTED, `exceptionStatus` = EMERGENCY_REJECTED (Exception flagged for HR/Audit review).
   
*Note: The UI will clearly show: "Emergency Issue Executed by Warehouse Keeper" and "Final Approval Pending".*
