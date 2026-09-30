import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import {
  InMemoryRepositories,
  InMemoryObjectStorage,
  IObjectStorage,
} from '@pack-manager/database';
import {
  MockVisionProvider,
  VisionProvider,
} from '@pack-manager/vision';
import {
  PackVerificationPipeline,
  InMemoryWorkerQueue,
  IVerificationQueue,
  WebhookDispatcher,
} from '@pack-manager/worker';
import { authMiddleware } from './middleware/auth.js';
import { idempotencyMiddleware } from './middleware/idempotency.js';
import { packsRoutes } from './routes/packs.js';
import { analysesRoutes } from './routes/analyses.js';
import { productsRoutes } from './routes/products.js';
import { ordersRoutes } from './routes/orders.js';
import { webhooksRoutes } from './routes/webhooks.js';
import { qcRoutes } from './routes/qc.js';
import { metricsRoutes } from './routes/metrics.js';
import { healthRoutes } from './routes/health.js';

export interface ServerOptions {
  repos?: InMemoryRepositories;
  storage?: IObjectStorage;
  visionProvider?: VisionProvider;
  queue?: IVerificationQueue;
  webhookDispatcher?: WebhookDispatcher;
}

export function buildServer(options?: ServerOptions): FastifyInstance {
  const fastify = Fastify({
    logger: false,
  });

  const repos = options?.repos || new InMemoryRepositories();
  const storage = options?.storage || new InMemoryObjectStorage();
  const visionProvider = options?.visionProvider || new MockVisionProvider();
  const webhookDispatcher = options?.webhookDispatcher || new WebhookDispatcher();

  const pipeline = new PackVerificationPipeline({
    packRepo: repos,
    orderRepo: repos,
    productRepo: repos,
    analysisRepo: repos,
    jobRepo: repos,
    auditRepo: repos,
    storage,
    visionProvider,
    webhookDispatcher,
  });

  const queue = options?.queue || new InMemoryWorkerQueue(pipeline, 3, true);

  // Register CORS
  fastify.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });

  // Register OpenAPI Documentation
  fastify.register(swagger, {
    openapi: {
      info: {
        title: 'AI Outbound Pack Manager API',
        description: 'High-precision computer vision outbound order verification system',
        version: '1.0.0',
      },
      servers: [{ url: 'http://localhost:4000' }],
    },
  });

  fastify.register(swaggerUi, {
    routePrefix: '/documentation',
  });

  // Global Middlewares
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', idempotencyMiddleware);

  // Register Health Routes
  fastify.register(healthRoutes);

  // Register Core API v1 Routes
  fastify.register(async (apiV1) => {
    apiV1.register(packsRoutes, { repos, storage, queue });
    apiV1.register(analysesRoutes, { repos, storage });
    apiV1.register(productsRoutes, { repos });
    apiV1.register(ordersRoutes, { repos });
    apiV1.register(webhooksRoutes, { webhookDispatcher });
    apiV1.register(qcRoutes, { repos });
    apiV1.register(metricsRoutes, { repos });
  }, { prefix: '/api/v1' });

  return fastify;
}
