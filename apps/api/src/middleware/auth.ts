import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '@pack-manager/shared';

export interface AuthContext {
  orgId: string;
  userId: string;
  role: UserRole;
}

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext;
    idempotencyKey?: string;
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  // Extract tenant context and user role from headers (or JWT in prod)
  const orgId = (request.headers['x-org-id'] as string) || 'org_demo_alpha';
  const userId = (request.headers['x-user-id'] as string) || 'user_demo_1';
  const roleHeader = (request.headers['x-user-role'] as string) || 'QC_OPERATOR';

  const role = Object.values(UserRole).includes(roleHeader as UserRole)
    ? (roleHeader as UserRole)
    : UserRole.QC_OPERATOR;

  request.auth = {
    orgId,
    userId,
    role,
  };
}

export function requireRole(allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
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
