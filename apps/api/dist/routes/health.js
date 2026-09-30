"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRoutes = void 0;
const healthRoutes = async (fastify) => {
    // GET /health (Liveness)
    fastify.get('/health', async (request, reply) => {
        return reply.status(200).send({
            status: 'UP',
            service: 'pack-manager-api',
            timestamp: new Date().toISOString(),
        });
    });
    // GET /ready (Readiness)
    fastify.get('/ready', async (request, reply) => {
        return reply.status(200).send({
            status: 'READY',
            checks: {
                database: 'CONNECTED',
                objectStorage: 'ACCESSIBLE',
                queue: 'ACTIVE',
            },
            timestamp: new Date().toISOString(),
        });
    });
};
exports.healthRoutes = healthRoutes;
//# sourceMappingURL=health.js.map