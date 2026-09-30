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
export declare function authMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void>;
export declare function requireRole(allowedRoles: UserRole[]): (request: FastifyRequest, reply: FastifyReply) => Promise<undefined>;
//# sourceMappingURL=auth.d.ts.map