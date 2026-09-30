"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.requireRole = requireRole;
const shared_1 = require("@pack-manager/shared");
async function authMiddleware(request, reply) {
    // Extract tenant context and user role from headers (or JWT in prod)
    const orgId = request.headers['x-org-id'] || 'org_demo_alpha';
    const userId = request.headers['x-user-id'] || 'user_demo_1';
    const roleHeader = request.headers['x-user-role'] || 'QC_OPERATOR';
    const role = Object.values(shared_1.UserRole).includes(roleHeader)
        ? roleHeader
        : shared_1.UserRole.QC_OPERATOR;
    request.auth = {
        orgId,
        userId,
        role,
    };
}
function requireRole(allowedRoles) {
    return async (request, reply) => {
        if (!request.auth) {
            return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Missing authentication context' });
        }
        if (!allowedRoles.includes(request.auth.role)) {
            return reply.status(403).send({
                error: 'FORBIDDEN',
                message: `Role ${request.auth.role} is not permitted to perform this action. Required: ${allowedRoles.join(', ')}`,
            });
        }
    };
}
//# sourceMappingURL=auth.js.map