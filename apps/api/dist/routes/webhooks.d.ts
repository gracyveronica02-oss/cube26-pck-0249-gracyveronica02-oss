import { FastifyPluginAsync } from 'fastify';
import { WebhookDispatcher } from '@pack-manager/worker';
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
export declare const webhooksRoutes: FastifyPluginAsync<WebhooksRouteOptions>;
//# sourceMappingURL=webhooks.d.ts.map