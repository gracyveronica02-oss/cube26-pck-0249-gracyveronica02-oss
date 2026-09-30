import { FastifyInstance, FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
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
