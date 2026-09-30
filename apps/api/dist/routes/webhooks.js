"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhooksRoutes = void 0;
const zod_1 = require("zod");
const shared_1 = require("@pack-manager/shared");
const auth_js_1 = require("../middleware/auth.js");
const registeredWebhooks = new Map();
const RegisterWebhookBodySchema = zod_1.z.object({
    url: zod_1.z.string().url(),
    events: zod_1.z.array(zod_1.z.string()).default(['pack.verification.completed']),
    secretKey: zod_1.z.string().optional(),
});
const webhooksRoutes = async (fastify, opts) => {
    const { webhookDispatcher } = opts;
    // GET /api/v1/webhooks
    fastify.get('/webhooks', async (request, reply) => {
        const orgId = request.auth.orgId;
        const hooks = [];
        for (const h of registeredWebhooks.values()) {
            if (h.orgId === orgId) {
                hooks.push(h);
            }
        }
        return reply.send({ total: hooks.length, webhooks: hooks });
    });
    // POST /api/v1/webhooks
    fastify.post('/webhooks', { preHandler: [(0, auth_js_1.requireRole)([shared_1.UserRole.ADMIN, shared_1.UserRole.SUPERVISOR])] }, async (request, reply) => {
        const orgId = request.auth.orgId;
        const body = RegisterWebhookBodySchema.parse(request.body);
        const webhookId = `wh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const registration = {
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
    });
    // DELETE /api/v1/webhooks/:webhookId
    fastify.delete('/webhooks/:webhookId', { preHandler: [(0, auth_js_1.requireRole)([shared_1.UserRole.ADMIN, shared_1.UserRole.SUPERVISOR])] }, async (request, reply) => {
        const orgId = request.auth.orgId;
        const { webhookId } = request.params;
        const key = `${orgId}:${webhookId}`;
        if (!registeredWebhooks.has(key)) {
            return reply.status(404).send({ error: 'WEBHOOK_NOT_FOUND', message: `Webhook ${webhookId} not found` });
        }
        registeredWebhooks.delete(key);
        return reply.send({ message: `Webhook ${webhookId} deleted successfully` });
    });
    // GET /api/v1/webhooks/deliveries (Inspection of recent delivery logs)
    fastify.get('/webhooks/deliveries', async (request, reply) => {
        const orgId = request.auth.orgId;
        const logs = webhookDispatcher.deliveryLogs.filter(l => l.orgId === orgId);
        return reply.send({ total: logs.length, deliveries: logs.slice(-50) });
    });
};
exports.webhooksRoutes = webhooksRoutes;
//# sourceMappingURL=webhooks.js.map