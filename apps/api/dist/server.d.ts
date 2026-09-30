import { FastifyInstance } from 'fastify';
import { InMemoryRepositories, IObjectStorage } from '@pack-manager/database';
import { VisionProvider } from '@pack-manager/vision';
import { IVerificationQueue, WebhookDispatcher } from '@pack-manager/worker';
export interface ServerOptions {
    repos?: InMemoryRepositories;
    storage?: IObjectStorage;
    visionProvider?: VisionProvider;
    queue?: IVerificationQueue;
    webhookDispatcher?: WebhookDispatcher;
}
export declare function buildServer(options?: ServerOptions): FastifyInstance;
//# sourceMappingURL=server.d.ts.map