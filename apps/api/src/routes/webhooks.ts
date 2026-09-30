import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { WebhookDispatcher } from '@pack-manager/worker';
import { UserRole } from '@pack-manager/shared';
import { requireRole } from '../middleware/auth.js';

export interface WebhooksRouteOptions {
  webhookDispatcher: WebhookDispatcher;
}

export interface WebhookRegistration {
  webhookId: string;
  orgId: string;
  url: string;
  events: string[];
  secretKey?: string;
  active: boolean;
  createdAt: Date;
}

const registeredWebhooks = new Map<string, WebhookRegistration>();

const RegisterWebhookBodySchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).default(['pack.verification.completed']),
  secretKey: z.string().optional(),
});

export const webhooksRoutes: FastifyPluginAsync<WebhooksRouteOptions> = async (
  fastify: FastifyInstance,
  opts: WebhooksRouteOptions
) => {
  const { webhookDispatcher } = opts;

  // GET /api/v1/webhooks
  fastify.get('/webhooks', async (request, reply) => {
    const orgId = request.auth!.orgId;
    const hooks: WebhookRegistration[] = [];
    for (const h of registeredWebhooks.values()) {
      if (h.orgId === orgId) {
        hooks.push(h);
      }
    }
    return reply.send({ total: hooks.length, webhooks: hooks });
  });

  // POST /api/v1/webhooks
  fastify.post(
    '/webhooks',
    { preHandler: [requireRole([UserRole.ADMIN, UserRole.SUPERVISOR])] },
    async (request, reply) => {
      const orgId = request.auth!.orgId;
      const body = RegisterWebhookBodySchema.parse(request.body);

      const webhookId = `wh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const registration: WebhookRegistration = {
        webhookId,
        orgId,
        url: body.url,
        events: body.events,
        secretKey: body.secretKey,
        active: true,
        createdAt: new Date(),
      };

      registeredWebhooks.set(`${orgId}:${webhookId}`, registration);

      return reply.status(201).send(registration);
    }
  );

  // DELETE /api/v1/webhooks/:webhookId
  fastify.delete(
    '/webhooks/:webhookId',
    { preHandler: [requireRole([UserRole.ADMIN, UserRole.SUPERVISOR])] },
    async (request, reply) => {
      const orgId = request.auth!.orgId;
      const { webhookId } = request.params as { webhookId: string };

      const key = `${orgId}:${webhookId}`;
      if (!registeredWebhooks.has(key)) {
        return reply.status(404).send({ error: 'WEBHOOK_NOT_FOUND', message: `Webhook ${webhookId} not found` });
      }

      registeredWebhooks.delete(key);
      return reply.send({ message: `Webhook ${webhookId} deleted successfully` });
    }
  );

  // GET /api/v1/webhooks/deliveries (Inspection of recent delivery logs)
  fastify.get('/webhooks/deliveries', async (request, reply) => {
    const orgId = request.auth!.orgId;
    const logs = webhookDispatcher.deliveryLogs.filter(l => l.orgId === orgId);
    return reply.send({ total: logs.length, deliveries: logs.slice(-50) });
  });
};
