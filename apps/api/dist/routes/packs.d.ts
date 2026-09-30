import { FastifyPluginAsync } from 'fastify';
import { InMemoryRepositories, IObjectStorage } from '@pack-manager/database';
import { IVerificationQueue } from '@pack-manager/worker';
export interface PacksRouteOptions {
    repos: InMemoryRepositories;
    storage: IObjectStorage;
    queue: IVerificationQueue;
}
export declare const packsRoutes: FastifyPluginAsync<PacksRouteOptions>;
//# sourceMappingURL=packs.d.ts.map