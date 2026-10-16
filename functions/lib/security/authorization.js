"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasActiveDelegation = exports.assertPermission = exports.getEffectivePermissions = void 0;
const domain_1 = require("@calm-wms/domain");
const getEffectivePermissions = async (user, db) => {
    if (user.isSuperAdmin) {
        return [];
    }
    const permissions = new Set();
    const roleDocs = await db.collection('roles').where('__name__', 'in', user.roleIds).get();
    return Array.from(permissions);
};
exports.getEffectivePermissions = getEffectivePermissions;
const assertPermission = async (user, permission, db, context) => {
    if (user.accountStatus !== domain_1.AccountStatus.ACTIVE) {
        return false;
    }
    if (user.isSuperAdmin) {
        return true;
    }
    if (user.roleIds.length > 0) {
        const rolesSnapshot = await db.collection('roles').where('__name__', 'in', user.roleIds).get();
        for (const doc of rolesSnapshot.docs) {
            const roleData = doc.data();
            if (roleData.permissions && Array.isArray(roleData.permissions)) {
                if (roleData.permissions.includes(permission)) {
                    return true;
                }
            }
        }
    }
    return await (0, exports.hasActiveDelegation)(user.uid, permission, db, context);
};
exports.assertPermission = assertPermission;
const hasActiveDelegation = async (userId, permission, db, context) => {
    const nowMillis = Date.now();
    const now = new Date();
    let query = db.collection('delegations')
        .where('delegateeId', '==', userId)
        .where('isActive', '==', true)
        .where('delegatedPermissions', 'array-contains', permission)
        .where('startDate', '<=', now);
    const snapshot = await query.get();
    if (snapshot.empty)
        return false;
    for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.endDate && data.endDate.toMillis() < nowMillis) {
            continue;
        }
        if (data.revokedAt) {
            continue;
        }
        if (context?.warehouseId && data.warehouseIds && data.warehouseIds.length > 0) {
            if (!data.warehouseIds.includes(context.warehouseId)) {
                continue;
            }
        }
        if (context?.departmentId && data.departmentIds && data.departmentIds.length > 0) {
            if (!data.departmentIds.includes(context.departmentId)) {
                continue;
            }
        }
        return true;
    }
    return false;
};
exports.hasActiveDelegation = hasActiveDelegation;
//# sourceMappingURL=authorization.js.map